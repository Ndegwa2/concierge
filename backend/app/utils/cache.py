"""
Redis Cache Utility Module for AutoConcierge

Provides caching layer for database queries and computed data.
Supports per-user and global cache keys with TTL.
"""
import json
import os
import logging
from functools import wraps
from typing import Any, Optional, Callable
from flask import current_app, g, request
import redis as redis_lib

logger = logging.getLogger(__name__)

_redis_client: Optional[redis_lib.Redis] = None
_fallback_cache: dict[str, Any] = {}

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
    return _fallback_cache.get(key)


def cache_set(key: str, value: Any, ttl: int = REDIS_DEFAULT_TTL) -> bool:
    r = get_redis()
    try:
        serialized = json.dumps(value, default=str)
        if r is not None:
            return r.setex(key, ttl, serialized)
        _fallback_cache[key] = value
        return True
    except Exception as e:
        logger.warning(f"Cache set error for key {key}: {e}")
        return False


def cache_delete(key: str) -> bool:
    r = get_redis()
    try:
        if r is not None:
            return r.delete(key) > 0
        return _fallback_cache.pop(key, None) is not None
    except Exception as e:
        logger.warning(f"Cache delete error for key {key}: {e}")
        return False


def cache_delete_pattern(pattern: str) -> int:
    r = get_redis()
    deleted = 0
    try:
        if r is not None:
            keys = r.keys(pattern)
            if keys:
                deleted = r.delete(*keys)
        else:
            prefix = pattern.replace('*', '')
            for k in list(_fallback_cache.keys()):
                if k.startswith(prefix):
                    del _fallback_cache[k]
                    deleted += 1
    except Exception as e:
        logger.warning(f"Cache delete pattern error for {pattern}: {e}")
    return deleted


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


def add_jti_to_blocklist(jti: str, ttl_seconds: int) -> bool:
    r = get_redis()
    try:
        if r is not None:
            return r.setex(f"{BLOCKLIST_PREFIX}{jti}", ttl_seconds, "1")
        _fallback_cache[f"{BLOCKLIST_PREFIX}{jti}"] = "1"
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
    return f"{BLOCKLIST_PREFIX}{jti}" in _fallback_cache
