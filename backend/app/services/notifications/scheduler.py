"""
Notification Scheduler for AutoConcierge
=========================================
Uses Celery beat for periodic task scheduling instead of threading.
The actual task logic is in app.tasks.appointment_tasks.
"""
import logging

logger = logging.getLogger(__name__)


def start_scheduler(app):
    """Start the notification scheduler.
    
    With Celery beat configured in app/celery.py, this function
    is a no-op as scheduling is handled by the beat service.
    Kept for backward compatibility.
    """
    logger.info('Notification scheduling handled by Celery beat (every 5 minutes)')
