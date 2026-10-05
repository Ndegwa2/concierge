"""Service layer for AI-chat image attachments.

Responsibilities:
  * validate uploaded images (MIME + extension + size, max 10 MB)
  * persist originals to the chat-image upload folder with UUID names
  * extract dimensions for display/layout
  * generate descriptive alt text (filename-based heuristic; can be extended
    with a multimodal model later)
  * issue short-lived signed URLs for secure display
  * clean up images older than the retention window (30 days)
"""
import os
import uuid
import logging
from datetime import datetime, timedelta, timezone

from werkzeug.utils import secure_filename
from flask import current_app

from app import db
from app.utils.decorators import get_current_user
from app.utils.chat_image_signing import sign_chat_image_url
from app.services.ai_chat.models import ChatImage

logger = logging.getLogger(__name__)

# ---- Constants ---------------------------------------------------------------

ALLOWED_MIME = {
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
}

ALLOWED_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'}

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB — matches the product requirement

RETENTION_DAYS = 30


def _upload_folder():
    return current_app.config.get('CHAT_IMAGE_UPLOAD_FOLDER') or os.path.join(
        os.getcwd(), 'uploads', 'chat_images'
    )


def _validate_image(file_storage):
    """Raise ``ValueError`` with a user-facing message when the file is invalid."""
    if file_storage is None or not file_storage.filename:
        raise ValueError('No file provided')

    mime = (file_storage.mimetype or '').lower()
    if mime not in ALLOWED_MIME:
        raise ValueError(
            f'Unsupported image type: {mime or "unknown"}. '
            f'Accepted formats: JPEG, PNG, WEBP, HEIC.'
        )

    ext = os.path.splitext(file_storage.filename)[1].lower()
    if ext not in ALLOWED_EXT:
        raise ValueError(
            f'File extension "{ext}" is not allowed. '
            f'Accepted extensions: .jpg, .jpeg, .png, .webp, .heic.'
        )

    # content_length is a hint; we re-check on disk (more accurate for streams).
    if file_storage.content_length and file_storage.content_length > MAX_IMAGE_BYTES:
        raise ValueError(
            f'Image exceeds the {MAX_IMAGE_BYTES // (1024 * 1024)} MB size limit. '
            f'Please choose a smaller image and try again.'
        )


def _generate_alt_text(filename):
    """Best-effort descriptive alt text derived from the filename.

    Strips common camera prefixes and file extensions, then humanises the
    remainder.  This is a fallback — a production deployment may replace this
    with an image-description model (e.g. Cohere's vision endpoint).
    """
    cleaned = secure_filename(filename) or filename
    name, _ = os.path.splitext(cleaned)
    # Remove leading IMG_/DSC_ prefixes that cameras add.
    for prefix in ('IMG_', 'DSC_', 'PXL_', 'Screenshot_', 'Screen Shot'):
        if name.upper().startswith(prefix):
            name = name[len(prefix):]
    name = name.strip('_').replace('_', ' ').replace('-', ' ')
    name = ' '.join(name.split())  # collapse whitespace
    if not name:
        name = 'uploaded image'
    return name[:200]


def _extract_dimensions(file_path, mime_type):
    """Best-effort dimension extraction using Pillow (no-op if unavailable)."""
    try:
        from PIL import Image  # imported lazily; Pillow is optional at import

        with Image.open(file_path) as img:
            return img.width, img.height
    except Exception as exc:  # noqa: BLE001
        logger.debug('Dimension extraction failed for %s: %s', file_path, exc)
        return None, None


def upload_chat_image(file_storage):
    """Validate, save, and return metadata for a single chat image upload."""
    _validate_image(file_storage)

    user = get_current_user()
    if user is None:
        raise PermissionError('Authentication required')

    user_id = user.get('id')
    mime = (file_storage.mimetype or '').lower()
    ext = os.path.splitext(file_storage.filename)[1].lower() or '.bin'
    unique_name = f'chat_{uuid.uuid4().hex}{ext}'

    upload_dir = _upload_folder()
    os.makedirs(upload_dir, exist_ok=True)

    dest = os.path.join(upload_dir, unique_name)

    # werkzeug's FileStorage.save() writes to disk but the in-memory buffer is
    # the full file, so we check the on-disk size for accuracy.
    file_storage.save(dest)

    file_size = os.path.getsize(dest)
    if file_size > MAX_IMAGE_BYTES:
        try:
            os.remove(dest)
        except OSError:
            pass
        raise ValueError(
            f'Image exceeds the {MAX_IMAGE_BYTES // (1024 * 1024)} MB size limit. '
            f'Please choose a smaller image and try again.'
        )

    # Only HEIC/HEIF may not be readable by Pillow without the libheif
    # plugin; dimensions are best-effort.
    width, height = None, None
    if mime in ('image/jpeg', 'image/png', 'image/webp', 'image/gif'):
        width, height = _extract_dimensions(dest, mime)

    alt_text = _generate_alt_text(file_storage.filename)

    image = ChatImage()
    image.user_id = user_id
    image.original_filename = secure_filename(file_storage.filename) or file_storage.filename
    image.file_path = unique_name
    image.file_size = file_size
    image.mime_type = mime
    image.width = width
    image.height = height
    image.alt_text = alt_text

    db.session.add(image)
    db.session.flush()
    db.session.commit()

    logger.info('chat image uploaded: id=%s user=%s size=%d', image.id, user_id, file_size)

    return image


def get_chat_image(user, image_id):
    """Return the image record if it belongs to ``user`` (or user is admin)."""
    query = ChatImage.query.filter_by(id=image_id)
    role = user.get('role') if user else None
    if role not in ('admin', 'super_admin'):
        query = query.filter_by(user_id=user.get('id'))
    item = query.first()
    if item is None:
        raise PermissionError('Image not found or access denied')
    return item


def list_chat_images(user, limit=50):
    """Return the user's own images, newest first."""
    role = user.get('role')
    query = ChatImage.query
    if role not in ('admin', 'super_admin'):
        query = query.filter_by(user_id=user.get('id'))
    return query.order_by(ChatImage.created_at.desc()).limit(limit).all()


def delete_chat_image(user, image_id):
    image = get_chat_image(user, image_id)
    upload_dir = _upload_folder()
    disk_path = os.path.join(upload_dir, image.file_path)
    try:
        if os.path.exists(disk_path):
            os.remove(disk_path)
    except OSError as exc:
        current_app.logger.warning('Failed to remove chat image %s: %s', disk_path, exc)

    db.session.delete(image)
    db.session.commit()
    return image


def delete_expired_chat_images(cutoff=None):
    """Purge chat images older than ``RETENTION_DAYS``.

    Called by a scheduled Celery task.  ``cutoff`` defaults to 30 days ago.
    Returns the number of deleted records.
    """
    if cutoff is None:
        cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)

    upload_dir = _upload_folder()
    expired = ChatImage.query.filter(ChatImage.created_at < cutoff).all()
    deleted = 0
    for image in expired:
        disk_path = os.path.join(upload_dir, image.file_path)
        try:
            if os.path.exists(disk_path):
                os.remove(disk_path)
        except OSError as exc:
            logger.warning('Failed to remove expired chat image %s: %s', disk_path, exc)
        db.session.delete(image)
        deleted += 1

    db.session.commit()
    if deleted:
        logger.info('Purged %d expired chat image(s)', deleted)
    return deleted


def serialize_for_api(image):
    """Return a dict suitable for the JSON response, including a signed URL."""
    data = image.to_dict()
    data['url'] = sign_chat_image_url(image.id)
    return data


def resolve_image_path(image_id):
    """Return (absolute_disk_path, mime_type, original_filename) for serving."""
    image = ChatImage.query.get(image_id)
    if image is None:
        raise ValueError('Image not found')

    upload_dir = _upload_folder()
    disk_path = os.path.join(upload_dir, image.file_path)
    if not os.path.exists(disk_path):
        raise ValueError('Image file not available on disk')

    return disk_path, image.mime_type or 'application/octet-stream', image.original_filename