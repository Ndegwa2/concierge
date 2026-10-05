"""
Chat Tasks for AutoConcierge
=============================

Periodic maintenance task for the AI-chat image attachment system:
purges images that have exceeded their 30-day retention window.
"""
import logging

from app.celery import celery

logger = logging.getLogger(__name__)


@celery.task(name='app.tasks.chat_tasks.cleanup_expired_chat_images')
def cleanup_expired_chat_images():
    """Remove chat images older than the retention window (30 days).

    Scheduled via Celery Beat; runs once daily.  Deletes both the DB row
    and the on-disk file.  Failures on individual rows are logged but do
    not abort the run — the next scheduled execution will retry.
    """
    from app.services.ai_chat.service import delete_expired_chat_images

    try:
        deleted = delete_expired_chat_images()
        logger.info('cleanup_expired_chat_images: purged %d image(s)', deleted)
        return deleted
    except Exception as exc:  # noqa: BLE001
        logger.error('cleanup_expired_chat_images failed: %s', exc, exc_info=True)
        raise
