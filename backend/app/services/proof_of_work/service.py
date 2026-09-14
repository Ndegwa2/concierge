"""Service layer for the Proof-of-Work gallery.

Responsibilities:
  * validate uploaded media (type + size)
  * persist originals to disk and metadata to the DB
  * enforce per-role visibility (employees/admin see all; a customer only sees
    media for work done on their own appointments)
  * resolve on-disk paths for serving and clean up files on delete
"""
import os
import uuid

from flask import current_app
from werkzeug.utils import secure_filename

from app import db
from app.utils.decorators import get_current_user
from app.utils.media_signing import sign_media_url
from app.services.proof_of_work.models import ProofOfWorkMedia
from app.services.appointments.models import Assignment, Appointment

ALLOWED_IMAGE_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'}
ALLOWED_VIDEO_EXT = {'.mp4', '.webm', '.mov'}

IMAGE_MIME = {'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'}
VIDEO_MIME = {'video/mp4', 'video/webm', 'video/quicktime'}
ALLOWED_MIME = IMAGE_MIME | VIDEO_MIME

MAX_IMAGE_BYTES = 10 * 1024 * 1024      # 10 MB
MAX_VIDEO_BYTES = 100 * 1024 * 1024     # 100 MB

VIEWING_ROLES = {'employee', 'concierge', 'admin', 'super_admin'}
UPLOADING_ROLES = {'employee', 'concierge', 'admin', 'super_admin'}


def _upload_folder():
    return current_app.config.get('PROOF_OF_WORK_UPLOAD_FOLDER') or os.path.join(
        os.getcwd(), 'uploads', 'proof_of_work'
    )


def _size_limit_for_mime(mime):
    return MAX_IMAGE_BYTES if mime in IMAGE_MIME else MAX_VIDEO_BYTES


def _validate_file(file_storage):
    if file_storage is None or not file_storage.filename:
        raise ValueError('No file provided')

    mime = (file_storage.mimetype or '').lower()
    if mime not in ALLOWED_MIME:
        raise ValueError(f'Unsupported media type: {mime or "unknown"}')

    ext = os.path.splitext(file_storage.filename)[1].lower()
    if ext not in (ALLOWED_IMAGE_EXT | ALLOWED_VIDEO_EXT):
        raise ValueError('File extension not allowed')

    # content_length is unreliable for streams; re-checked after save.
    if file_storage.content_length:
        if file_storage.content_length > _size_limit_for_mime(mime):
            raise ValueError('File exceeds maximum allowed size')


def _resolve_assignment(assignment_id):
    assignment = Assignment.query.get(assignment_id)
    if assignment is None:
        raise ValueError('Assignment not found')
    appointment = Appointment.query.get(assignment.appointment_id)
    client_id = appointment.user_id if appointment else None
    return assignment, client_id


def upload_proof_of_work(file_storages, assignment_id, caption='', is_public=False):
    """Persist one or more uploaded media files for an assignment.

    Only employees (concierges) and admins may upload. ``file_storages`` can be
    a single ``FileStorage`` or a list of them.
    """
    user = get_current_user()
    if user is None:
        raise PermissionError('Authentication required')
    role = user.get('role')
    if role not in UPLOADING_ROLES:
        raise PermissionError('Only employees can upload proof of work')

    assignment, client_id = _resolve_assignment(assignment_id)

    if not isinstance(file_storages, (list, tuple)):
        file_storages = [file_storages]

    upload_dir = _upload_folder()
    os.makedirs(upload_dir, exist_ok=True)

    created = []
    for file_storage in file_storages:
        _validate_file(file_storage)
        mime = file_storage.mimetype.lower()
        ext = os.path.splitext(file_storage.filename)[1].lower()
        if not ext:
            ext = '.bin'
        unique_name = f"pofw_{uuid.uuid4().hex}{ext}"
        dest = os.path.join(upload_dir, unique_name)
        file_storage.save(dest)

        file_size = os.path.getsize(dest)
        if file_size > _size_limit_for_mime(mime):
            os.remove(dest)
            raise ValueError('File exceeds maximum allowed size')

        media = ProofOfWorkMedia()
        media.assignment_id = assignment_id
        media.client_id = client_id
        media.uploaded_by = user.get('id')
        media.media_type = 'image' if mime in IMAGE_MIME else 'video'
        media.mime_type = mime
        media.original_filename = secure_filename(file_storage.filename) or file_storage.filename
        media.file_path = unique_name
        media.file_size = file_size
        media.caption = caption
        media.is_public = bool(is_public)

        db.session.add(media)
        created.append(media)

    # Flush to assign ids, then commit BEFORE dispatching so the worker never
    # queries an uncommitted row (avoids a flush -> delay -> commit race).
    db.session.flush()
    db.session.commit()
    from app.tasks.media_tasks import process_proof_of_work_media
    for media in created:
        process_proof_of_work_media.delay(media.id)
    return created


def _visible_query(user):
    role = user.get('role')
    if role in VIEWING_ROLES:
        return ProofOfWorkMedia.query
    # A customer only ever sees proof of work for their own jobs.
    return ProofOfWorkMedia.query.filter(ProofOfWorkMedia.client_id == user.get('id'))


def _apply_scope(query, assignment_id, appointment_id):
    if assignment_id:
        query = query.filter(ProofOfWorkMedia.assignment_id == assignment_id)
    if appointment_id:
        query = (
            query.join(Assignment, ProofOfWorkMedia.assignment_id == Assignment.id)
            .join(Appointment, Assignment.appointment_id == Appointment.id)
            .filter(Appointment.id == appointment_id)
        )
    return query


def list_proof_of_work(user, assignment_id=None, appointment_id=None):
    query = _apply_scope(_visible_query(user), assignment_id, appointment_id)
    return query.order_by(ProofOfWorkMedia.created_at.desc()).all()


def get_proof_of_work(user, media_id):
    item = _apply_scope(_visible_query(user), None, None).filter(ProofOfWorkMedia.id == media_id).first()
    if item is None:
        raise PermissionError('Media not found or access denied')
    return item


def serialize_for_api(media):
    data = media.to_dict()
    data['thumbnail_url'] = sign_media_url(media.id, 'thumb')
    data['original_url'] = sign_media_url(media.id, 'original')
    return data


def resolve_media_path(media_id, size):
    """Return (absolute_disk_path, mime_type, as_attachment) for the raw endpoint.

    ``size`` is 'thumb' or 'original'. For images the thumb is a webp; for
    videos the thumb is the extracted poster. Raises ValueError if the
    requested derivative does not exist.
    """
    if size not in ('thumb', 'original'):
        raise ValueError('Invalid size')

    media = ProofOfWorkMedia.query.get(media_id)
    if media is None:
        raise ValueError('Media not found')

    upload_dir = _upload_folder()

    if size == 'thumb':
        if media.media_type == 'image':
            rel = media.thumbnail_path or f'thumbs/{os.path.splitext(media.file_path)[0]}.webp'
            mime = 'image/webp'
        else:
            rel = media.poster_path or f'posters/{os.path.splitext(media.file_path)[0]}.jpg'
            mime = 'image/jpeg'
        if not rel or not (rel.startswith('thumbs/') or rel.startswith('posters/')):
            raise ValueError('Thumbnail not available yet')
    else:
        rel = media.file_path
        mime = media.mime_type or 'application/octet-stream'

    disk_path = os.path.join(upload_dir, rel)
    if not os.path.exists(disk_path):
        raise ValueError('File not available on disk')

    return disk_path, mime, media.original_filename


def delete_proof_of_work(user, media_id):
    user_id = user.get('id')
    role = user.get('role')

    # Visibility filter still applies so a customer can never even see another
    # client's media to delete it.
    item = _visible_query(user).filter(ProofOfWorkMedia.id == media_id).first()
    if item is None:
        raise PermissionError('Media not found or access denied')

    # Only the uploader or an admin may delete.
    if role not in {'admin', 'super_admin'} and item.uploaded_by != user_id:
        raise PermissionError('You can only delete media you uploaded')

    upload_dir = _upload_folder()
    for rel in (item.file_path, item.thumbnail_path, item.poster_path):
        if not rel:
            continue
        path = os.path.join(upload_dir, rel)
        try:
            if os.path.exists(path):
                os.remove(path)
        except OSError as exc:
            current_app.logger.warning('Failed to remove %s: %s', path, exc)

    db.session.delete(item)
    db.session.commit()
    return item
