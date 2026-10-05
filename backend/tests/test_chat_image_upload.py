"""End-to-end tests for the AI-chat image attachment endpoints.

Covers:
  * successful upload (201 + signed URL)
  * validation failures (bad type, oversized file, missing file)
  * user-scoped access (stranger cannot read / list / delete another user's images)
  * signed-URL serving with signature + expiry verification
  * 30-day retention cleanup
"""
import io
import os
import struct
import zlib

import pytest

from app import db
from app.services.ai_chat.models import ChatImage
from app.services.ai_chat.service import MAX_IMAGE_BYTES, delete_expired_chat_images
from app.utils.chat_image_signing import sign_chat_image_url


# ---------------------------------------------------------------------------
# Helpers — build a minimal valid PNG in-memory.
# ---------------------------------------------------------------------------

def _minimal_png():
    """Return bytes for a valid 1x1 white PNG."""
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
    ihdr = _chunk(b'IHDR', ihdr_data)
    raw = b'\x00\xff\xff\xff'
    idat = _chunk(b'IDAT', zlib.compress(raw))
    iend = _chunk(b'IEND', b'')
    return sig + ihdr + idat + iend


def _chunk(chunk_type, data):
    chunk = chunk_type + data
    crc = struct.pack('>I', zlib.crc32(chunk) & 0xFFFFFFFF)
    return struct.pack('>I', len(data)) + chunk + crc


@pytest.fixture()
def png_bytes():
    return _minimal_png()


@pytest.fixture()
def owner(make_user):
    return make_user(role='customer', email='owner@example.com')


@pytest.fixture()
def stranger(make_user):
    return make_user(role='customer', email='stranger@example.com')


@pytest.fixture()
def uploaded_image(png_bytes, owner, client, auth_headers):
    """Upload one real image owned by *owner* and return the ChatImage row."""
    resp = client.post(
        '/api/ai-chat/images',
        data={'file': (io.BytesIO(png_bytes), 'myphoto.png')},
        content_type='multipart/form-data',
        headers=auth_headers(owner),
    )
    assert resp.status_code == 201, resp.get_json()
    data = resp.get_json()['data']['image']
    row = ChatImage.query.get(data['id'])
    assert row is not None
    return row


# ---------------------------------------------------------------------------
# Upload + validation
# ---------------------------------------------------------------------------

class TestUploadImage:
    def test_valid_upload(self, client, auth_headers, owner, png_bytes):
        headers = auth_headers(owner)
        resp = client.post(
            '/api/ai-chat/images',
            data={'file': (io.BytesIO(png_bytes), 'my_photo.png')},
            content_type='multipart/form-data',
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert data['success'] is True
        assert 'image' in data['data']
        img = data['data']['image']
        assert img['original_filename'] == 'my_photo.png'
        assert img['mime_type'] == 'image/png'
        assert img['width'] == 1
        assert img['height'] == 1
        assert 'url' in img

    def test_missing_file(self, client, auth_headers, owner):
        resp = client.post('/api/ai-chat/images', headers=auth_headers(owner))
        assert resp.status_code == 400
        assert resp.get_json()['success'] is False

    def test_invalid_mime_type(self, client, auth_headers, owner, png_bytes):
        resp = client.post(
            '/api/ai-chat/images',
            data={'file': (io.BytesIO(png_bytes), 'doc.txt')},
            content_type='multipart/form-data',
            headers=auth_headers(owner),
        )
        assert resp.status_code == 400
        body = resp.get_json()
        assert body['success'] is False
        assert 'Unsupported' in body['message']

    def test_oversized_file(self, client, auth_headers, owner):
        """A file whose on-disk size exceeds the limit is rejected."""
        big_data = b'\x00' * (MAX_IMAGE_BYTES + 1)
        resp = client.post(
            '/api/ai-chat/images',
            data={'file': (io.BytesIO(big_data), 'big.png')},
            content_type='multipart/form-data',
            headers=auth_headers(owner),
        )
        assert resp.status_code == 400
        body = resp.get_json()
        assert body['success'] is False
        assert 'MB' in body['message']


# ---------------------------------------------------------------------------
# Ownership / scoping
# ---------------------------------------------------------------------------

class TestImageOwnership:
    def test_stranger_cannot_list(self, client, auth_headers, uploaded_image, stranger):
        resp = client.get('/api/ai-chat/images', headers=auth_headers(stranger))
        assert resp.status_code == 200
        images = resp.get_json()['data']['images']
        assert all(img['id'] != uploaded_image.id for img in images)

    def test_owner_can_list(self, client, auth_headers, uploaded_image, owner):
        resp = client.get('/api/ai-chat/images', headers=auth_headers(owner))
        assert resp.status_code == 200
        images = resp.get_json()['data']['images']
        assert any(img['id'] == uploaded_image.id for img in images)

    def test_stranger_cannot_get_image(self, client, auth_headers, uploaded_image, stranger):
        resp = client.get(f'/api/ai-chat/images/{uploaded_image.id}', headers=auth_headers(stranger))
        assert resp.status_code in (403, 404)

    def test_stranger_cannot_delete_image(self, client, auth_headers, uploaded_image, stranger):
        resp = client.delete(f'/api/ai-chat/images/{uploaded_image.id}', headers=auth_headers(stranger))
        assert resp.status_code in (403, 404)
        assert ChatImage.query.get(uploaded_image.id) is not None

    def test_owner_can_delete_image(self, client, auth_headers, uploaded_image, owner):
        resp = client.delete(f'/api/ai-chat/images/{uploaded_image.id}', headers=auth_headers(owner))
        assert resp.status_code == 200
        assert ChatImage.query.get(uploaded_image.id) is None


# ---------------------------------------------------------------------------
# Signed-URL serving
# ---------------------------------------------------------------------------

class TestSignedUrlServing:
    def test_signed_url_serves_file(self, client, auth_headers, uploaded_image, owner):
        resp = client.get(
            f'/api/ai-chat/images/{uploaded_image.id}/signed',
            headers=auth_headers(owner),
        )
        assert resp.status_code == 200
        signed_url = resp.get_json()['data']['url']
        assert f'/images/{uploaded_image.id}/raw/' in signed_url

        # Follow it — no auth header needed (JWT checked at signing time)
        serve = client.get(signed_url)
        assert serve.status_code == 200
        assert serve.mimetype == 'image/png'

    def test_tampered_token_rejected(self, client, uploaded_image):
        bad_url = f'/api/ai-chat/images/{uploaded_image.id}/raw/not-a-real-token'
        resp = client.get(bad_url)
        assert resp.status_code == 403

    def test_nonexistent_image(self, client, app):
        with app.app_context():
            url = sign_chat_image_url(99999)
        resp = client.get(url)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Retention cleanup
# ---------------------------------------------------------------------------

class TestRetentionCleanup:
    def test_delete_expired_chat_images(self, app, png_bytes, owner):
        from datetime import datetime, timedelta, timezone
        from app.services.ai_chat.service import _upload_folder

        upload_dir = _upload_folder()
        os.makedirs(upload_dir, exist_ok=True)

        old_image = ChatImage()
        old_image.user_id = owner.id
        old_image.original_filename = 'old.png'
        old_image.file_path = 'chat_test_old.png'
        old_image.file_size = len(png_bytes)
        old_image.mime_type = 'image/png'
        old_image.alt_text = 'old image'
        old_image.created_at = datetime.now(timezone.utc) - timedelta(days=31)
        db.session.add(old_image)
        db.session.commit()

        deleted = delete_expired_chat_images()
        assert deleted == 1
        assert ChatImage.query.get(old_image.id) is None
