"""Signed, short-lived URLs for serving private proof-of-work media.

Images/videos for a proof-of-work gallery are visibility-scoped (employees and
the owning client only), so they cannot be served from a public static folder.
Rather than putting the user's JWTs in ``<img src>`` query strings (which leak
via referrer/logs), the listing endpoint issues a short-lived signed URL per
media item. The raw serving endpoint trusts only the signature + max age, which
are both useless once expired.
"""
from flask import current_app
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

SALT = 'proof-of-work-media-v1'
DEFAULT_TTL = 900  # 15 minutes


def _serializer():
    key = current_app.config['SECRET_KEY']
    if not key:
        raise RuntimeError('SECRET_KEY is not configured')
    return URLSafeTimedSerializer(key, salt=SALT)


def sign_media_url(media_id, size='thumb', ttl=DEFAULT_TTL):
    """Return a relative path that serves ``media_id`` for ``size``.

    ``size`` is one of ``thumb`` (image thumbnail / video poster) or
    ``original`` (the uploaded file itself).
    """
    token = _serializer().dumps({'m': int(media_id), 's': size, 'ttl': int(ttl)})
    return f'/api/proof-of-work/media/{int(media_id)}/raw/{size}/{token}'


def verify_media_sig(media_id, size, token, ttl=DEFAULT_TTL):
    """Validate a signed-media token. Returns True if valid & fresh."""
    try:
        data = _serializer().loads(token, max_age=ttl)
    except SignatureExpired:
        return False
    except BadSignature:
        return False
    return (
        data.get('m') == int(media_id)
        and data.get('s') == size
    )
