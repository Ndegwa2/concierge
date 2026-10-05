"""
Redis Cache Utility Module for AutoConcierge

Provides caching layer for database queries and computed data.
Supports per-user and global cache keys with TTL.
"""
import json
import os
import time
import logging
from functools import wraps
from typing import Any, Optional, Callable
from flask import current_app, g, request
import redis as redis_lib

logger = logging.getLogger(__name__)

_redis_client: Optional[redis_lib.Redis] = None

# In-memory fallback used only when Redis is unreachable. Entries are stored as
# ``key -> (value, expires_at)`` so that the fallback honours TTLs: the previous
# implementation kept values forever, which both broke revocation TTL semantics
# and grew without bound on long-lived workers.
_fallback_cache: dict[str, tuple[Any, float]] = {}
FALLBACK_MAX_ENTRIES = 5000

REDIS_DEFAULT_TTL = 300
REDIS_LONG_TTL = 1800
REDIS_SHORT_TTL = 60


def init_redis(app) -> redis_lib.Redis:
    global _redis_client
    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    try:
        _redis_client = redis_lib.from_url(redis_url, decode_responses=True)
        _redis_client.ping()
        logger.info("Redis connected successfully")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}. Falling back to in-memory cache.")
        _redis_client = None
    app.extensions['redis'] = _redis_client
    return _redis_client


def get_redis() -> Optional[redis_lib.Redis]:
    global _redis_client
    if _redis_client is not None:
        try:
            _redis_client.ping()
            return _redis_client
        except Exception:
            logger.warning("Redis ping failed. Falling back to in-memory cache.")
            return None
    return None


def _cache_key(prefix: str, *args) -> str:
    key_parts = [prefix]
    for arg in args:
        key_parts.append(str(arg))
    return ':'.join(key_parts)


def cache_get(key: str) -> Optional[Any]:
    r = get_redis()
    if r is not None:
        try:
            cached = r.get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Cache get error for key {key}: {e}")
    return _fallback_get(key)


def cache_set(key: str, value: Any, ttl: int = REDIS_DEFAULT_TTL) -> bool:
    r = get_redis()
    try:
        serialized = json.dumps(value, default=str)
        if r is not None:
            return r.setex(key, ttl, serialized)
        _fallback_set(key, value, ttl)
        return True
    except Exception as e:
        logger.warning(f"Cache set error for key {key}: {e}")
        return False


def cache_delete(key: str) -> bool:
    r = get_redis()
    try:
        if r is not None:
            return r.delete(key) > 0
        return _fallback_delete(key)
    except Exception as e:
        logger.warning(f"Cache delete error for key {key}: {e}")
        return False


def cache_delete_pattern(pattern: str) -> int:
    """Delete every key matching ``pattern``.

    Uses ``SCAN``/``scan_iter`` rather than ``KEYS``: ``KEYS`` is O(N) over the
    whole keyspace and blocks the single-threaded Redis server, which stalls
    every other request in production.
    """
    r = get_redis()
    deleted = 0
    try:
        if r is not None:
            batch = []
            for key in r.scan_iter(match=pattern, count=500):
                batch.append(key)
                if len(batch) >= 500:
                    deleted += r.delete(*batch)
                    batch = []
            if batch:
                deleted += r.delete(*batch)
        else:
            prefix = pattern.replace('*', '')
            for k in list(_fallback_cache.keys()):
                if k.startswith(prefix):
                    if _fallback_delete(k):
                        deleted += 1
    except Exception as e:
        logger.warning(f"Cache delete pattern error for {pattern}: {e}")
    return deleted


def _fallback_get(key: str) -> Optional[Any]:
    entry = _fallback_cache.get(key)
    if entry is None:
        return None
    value, expires_at = entry
    if expires_at and expires_at <= time.time():
        _fallback_cache.pop(key, None)
        return None
    return value


def _fallback_set(key: str, value: Any, ttl: int) -> None:
    if len(_fallback_cache) >= FALLBACK_MAX_ENTRIES:
        _prune_fallback_cache()
    expires_at = (time.time() + ttl) if ttl else 0
    _fallback_cache[key] = (value, expires_at)


def _fallback_delete(key: str) -> bool:
    entry = _fallback_cache.pop(key, None)
    if entry is None:
        return False
    value, expires_at = entry
    return not expires_at or expires_at > time.time()


def _prune_fallback_cache() -> None:
    """Drop expired entries first, then the oldest ones we still hold."""
    now = time.time()
    for k in [k for k, (_, exp) in _fallback_cache.items() if exp and exp <= now]:
        _fallback_cache.pop(k, None)
    if len(_fallback_cache) >= FALLBACK_MAX_ENTRIES:
        overflow = len(_fallback_cache) - FALLBACK_MAX_ENTRIES + 1
        for k in list(_fallback_cache.keys())[:overflow]:
            _fallback_cache.pop(k, None)


def cached(prefix: str, ttl: int = REDIS_DEFAULT_TTL, key_builder: Optional[Callable] = None):
    """
    Decorator for caching function results.
    
    Args:
        prefix: Cache key prefix
        ttl: Time-to-live in seconds
        key_builder: Optional function to build cache key from args/kwargs
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                skip_first = args and hasattr(args[0], '__dict__') and not isinstance(args[0], (str, int, type(None)))
                key_args = args[1:] if skip_first else args
                cache_key = _cache_key(prefix, *key_args)
                for k, v in sorted(kwargs.items()):
                    cache_key += f":{k}:{v}"

            cached_result = cache_get(cache_key)
            if cached_result is not None:
                return cached_result

            result = func(*args, **kwargs)
            if result is not None:
                cache_set(cache_key, result, ttl)
            return result

        wrapper._cache_invalidate = lambda pattern=None: (
            cache_delete_pattern(f"{prefix}:*") if pattern is None
            else cache_delete_pattern(f"{prefix}:{pattern}*")
        )
        wrapper._cache_delete_key = cache_delete
        wrapper._cache_prefix = prefix

        return wrapper
    return decorator


def cache_invalidate(prefix: str, pattern: Optional[str] = None) -> int:
    if pattern:
        return cache_delete_pattern(f"{prefix}:{pattern}*")
    return cache_delete_pattern(f"{prefix}:*")


def get_cache_key(prefix: str, *args) -> str:
    return _cache_key(prefix, *args)


BLOCKLIST_PREFIX = "bl:jti:"
USER_REVOCATION_PREFIX = "bl:user:"


def add_jti_to_blocklist(jti: str, ttl_seconds: int) -> bool:
    r = get_redis()
    try:
        if r is not None:
            return r.setex(f"{BLOCKLIST_PREFIX}{jti}", ttl_seconds, "1")
        _fallback_set(f"{BLOCKLIST_PREFIX}{jti}", "1", ttl_seconds)
        return True
    except Exception as e:
        logger.warning(f"Blocklist add error for jti {jti}: {e}")
        return False


def is_jti_revoked(jti: str) -> bool:
    r = get_redis()
    if r is not None:
        try:
            return r.exists(f"{BLOCKLIST_PREFIX}{jti}") > 0
        except Exception as e:
            logger.warning(f"Blocklist check error for jti {jti}: {e}")
    return bool(_fallback_get(f"{BLOCKLIST_PREFIX}{jti}"))


def revoke_all_user_tokens(user_id, issued_before: Optional[float] = None,
                           ttl_seconds: int = 7 * 24 * 3600) -> bool:
    """Invalidate **every** token a user already holds.

    Used after credential changes (password reset, email change, logout
    everywhere). Tokens carry an ``iat`` claim; any token issued at or before
    this marker is treated as revoked by :func:`is_token_revoked`, so refresh
    tokens stolen before a password change stop working - something a
    per-``jti`` blocklist cannot express, because the server never saw the
    attacker's token.
    """
    marker = float(issued_before if issued_before is not None else time.time())
    key = f"{USER_REVOCATION_PREFIX}{user_id}"
    r = get_redis()
    try:
        if r is not None:
            # Keep the newest (highest) marker so concurrent revocations never
            # un-revoke an older one.
            existing = r.get(key)
            if existing is None or float(existing) < marker:
                r.set(key, marker, ex=ttl_seconds)
            return True
        _fallback_set(key, marker, ttl_seconds)
        return True
    except Exception as e:
        logger.warning(f"User token revocation error for user {user_id}: {e}")
        return False


def user_tokens_revoked_at(user_id) -> Optional[float]:
    r = get_redis()
    if r is not None:
        try:
            value = r.get(f"{USER_REVOCATION_PREFIX}{user_id}")
            return float(value) if value is not None else None
        except Exception as e:
            logger.warning(f"User revocation lookup error for user {user_id}: {e}")
    value = _fallback_get(f"{USER_REVOCATION_PREFIX}{user_id}")
    return float(value) if value is not None else None


def is_token_revoked(jti: str, user_id=None, issued_at=None) -> bool:
    """Single entry point used by the JWT ``token_in_blocklist_loader``.

    Checks both the per-token blocklist and the per-user revocation marker in
    one call so authenticated requests cost a single cache round trip.
    """
    if is_jti_revoked(jti):
        return True
    if user_id is not None:
        revoked_at = user_tokens_revoked_at(user_id)
        if revoked_at is not None and issued_at is not None:
            try:
                return float(issued_at) <= float(revoked_at)
            except (TypeError, ValueError):
                return False
    return False
