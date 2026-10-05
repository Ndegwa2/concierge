"""Signed, short-lived URLs for serving private chat images.

Chat images are visibility-scoped to the uploading user, so they cannot be
served from a public static folder.  Rather than putting the user's JWTs in
``<img src>`` query strings (which leak via referrer/logs), the listing endpoint
issues a short-lived signed URL per image.  The raw serving endpoint trusts only
the signature + max age, which are both useless once the URL expires.

This mirrors the pattern established in ``media_signing.py`` for proof-of-work
media but uses a dedicated salt so the two URL spaces are independent.
"""
from flask import current_app
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

SALT = 'chat-image-v1'
DEFAULT_TTL = 900  # 15 minutes


def _serializer():
    key = current_app.config['SECRET_KEY']
    if not key:
        raise RuntimeError('SECRET_KEY is not configured')
    return URLSafeTimedSerializer(key, salt=SALT)


def sign_chat_image_url(image_id, ttl=DEFAULT_TTL):
    """Return a relative path that serves ``image_id`` when freshly signed.

    The returned URL is consumed by a ``<img src>`` and routed to
    ``serve_raw_chat_image`` below.
    """
    token = _serializer().dumps({'i': int(image_id), 'ttl': int(ttl)})
    return f'/api/ai-chat/images/{int(image_id)}/raw/{token}'


def verify_chat_image_sig(image_id, token, ttl=DEFAULT_TTL):
    """Validate a signed-chat-image token. Returns True if valid & fresh."""
    try:
        data = _serializer().loads(token, max_age=ttl)
    except SignatureExpired:
        return False
    except BadSignature:
        return False
    return data.get('i') == int(image_id)
