"""
Proof-of-Work Media Processing Tasks for AutoConcierge
======================================================

Generates image thumbnails / video posters and extracts media metadata
(dimensions, duration) asynchronously after an upload. Runs on the Celery
worker; the worker must have Pillow installed and (optionally) ffmpeg to
produce video posters.
"""
import logging
import os
import shutil

from app.celery import celery
from app import db

logger = logging.getLogger(__name__)


def _upload_folder():
    from flask import current_app
    return current_app.config.get('PROOF_OF_WORK_UPLOAD_FOLDER') or os.path.join(
        os.getcwd(), 'uploads', 'proof_of_work'
    )


def process_proof_of_work_media_sync(media_id):
    """Synchronous processing entry point.

    Kept free of Celery decorators so it can be invoked directly (e.g. from
    tests / management commands) outside a worker. The Celery task below simply
    delegates to this.
    """
    from app.services.proof_of_work.models import ProofOfWorkMedia

    media = db.session.get(ProofOfWorkMedia, media_id)
    if media is None:
        logger.warning('process_proof_of_work_media: media %s not found', media_id)
        return

    upload_dir = _upload_folder()
    src = os.path.join(upload_dir, media.file_path)
    if not os.path.exists(src):
        logger.error('process_proof_of_work_media: source file missing for %s (%s)', media_id, media.file_path)
        return

    try:
        if media.media_type == 'image':
            _process_image(media, src, upload_dir)
        elif media.media_type == 'video':
            _process_video(media, src, upload_dir)
        else:
            logger.warning('process_proof_of_work_media: unknown media_type %s for %s', media.media_type, media_id)
    finally:
        try:
            db.session.commit()
        except Exception as exc:  # noqa: BLE001
            db.session.rollback()
            logger.error('Failed to persist media processing results for %s: %s', media_id, exc)


@celery.task(name='app.tasks.media_tasks.process_proof_of_work_media')
def process_proof_of_work_media(media_id):
    process_proof_of_work_media_sync(media_id)


def _process_image(media, src, upload_dir):
    from PIL import Image

    thumbs_dir = os.path.join(upload_dir, 'thumbs')
    os.makedirs(thumbs_dir, exist_ok=True)

    with Image.open(src) as img:
        media.width = img.width
        media.height = img.height
        thumb_name = f"{os.path.splitext(media.file_path)[0]}.webp"
        thumb_path = os.path.join(thumbs_dir, thumb_name)
        # Convert to RGB (drops alpha/cmyk) and downscale for the gallery grid.
        img.convert('RGB').thumbnail((480, 360))
        img.save(thumb_path, 'WEBP', quality=82, method=6)
    media.thumbnail_path = f'thumbs/{thumb_name}'


def _process_video(media, src, upload_dir):
    ffprobe = shutil.which('ffprobe')
    ffmpeg = shutil.which('ffmpeg')

    if ffprobe:
        import json
        import subprocess
        try:
            cmd = [
                ffprobe, '-v', 'error', '-select_streams', 'v:0',
                '-show_entries', 'stream=width,height:format=duration',
                '-of', 'json', src,
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            data = json.loads(result.stdout or '{}')
            streams = data.get('streams') or []
            fmt = data.get('format') or {}
            if streams:
                st = streams[0]
                media.width = st.get('width')
                media.height = st.get('height')
            duration = fmt.get('duration')
            if duration is not None:
                try:
                    media.duration_seconds = int(float(duration))
                except (TypeError, ValueError):
                    media.duration_seconds = None
        except Exception as exc:  # noqa: BLE001
            logger.warning('ffprobe metadata extraction failed for %s: %s', src, exc)

    if ffmpeg:
        import subprocess
        posters_dir = os.path.join(upload_dir, 'posters')
        os.makedirs(posters_dir, exist_ok=True)
        poster_name = f"{os.path.splitext(media.file_path)[0]}.jpg"
        poster_path = os.path.join(posters_dir, poster_name)
        try:
            cmd = [
                ffmpeg, '-y', '-i', src,
                '-ss', '1', '-frames:v', '1', '-q:v', '2',
                '-vf', 'scale=480:-2', poster_path,
            ]
            subprocess.run(cmd, capture_output=True, timeout=120)
            if os.path.exists(poster_path):
                media.poster_path = f'posters/{poster_name}'
        except Exception as exc:  # noqa: BLE001
            logger.warning('ffmpeg poster extraction failed for %s: %s', src, exc)
    else:
        logger.info(
            'ffmpeg not installed; skipping video poster/duration for %s '
            '(thumbnails/posters require ffmpeg on the worker).', src
        )
