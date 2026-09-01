"""
Celery Configuration for AutoConcierge
=======================================
Handles background task processing for blocking operations:
- AI chat completions (Google GenAI)
- M-Pesa payment processing
- Email sending (SMTP)
- PDF generation (fpdf2)
- Appointment notification scheduling
"""
import os
from celery import Celery
from celery.schedules import crontab


def make_celery(app=None):
    """Create and configure Celery instance."""
    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

    celery = Celery(
        'autoconcierge',
        broker=redis_url,
        backend=redis_url,
        include=[
            'app.tasks.email_tasks',
            'app.tasks.ai_tasks',
            'app.tasks.payment_tasks',
            'app.tasks.pdf_tasks',
            'app.tasks.appointment_tasks',
        ]
    )

    celery.conf.update(
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
        task_track_started=True,
        task_time_limit=300,
        task_soft_time_limit=240,
        worker_prefetch_multiplier=1,
        worker_max_tasks_per_child=1000,
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        task_default_queue='default',
        task_queues={
            'default': {'exchange': 'default', 'routing_key': 'default'},
            'emails': {'exchange': 'emails', 'routing_key': 'emails'},
            'ai': {'exchange': 'ai', 'routing_key': 'ai'},
            'payments': {'exchange': 'payments', 'routing_key': 'payments'},
            'pdf': {'exchange': 'pdf', 'routing_key': 'pdf'},
            'notifications': {'exchange': 'notifications', 'routing_key': 'notifications'},
        },
        task_routes={
            'app.tasks.email_tasks.*': {'queue': 'emails'},
            'app.tasks.ai_tasks.*': {'queue': 'ai'},
            'app.tasks.payment_tasks.*': {'queue': 'payments'},
            'app.tasks.pdf_tasks.*': {'queue': 'pdf'},
            'app.tasks.appointment_tasks.*': {'queue': 'notifications'},
        },
        beat_schedule={
            'check-upcoming-appointments': {
                'task': 'app.tasks.appointment_tasks.check_upcoming_appointments',
                'schedule': crontab(minute='*/5'),
            },
        },
    )

    if app is not None:
        class ContextTask(celery.Task):
            """Ensure tasks run within Flask app context."""
            def __call__(self, *args, **kwargs):
                with app.app_context():
                    return self.run(*args, **kwargs)

        celery.Task = ContextTask

    return celery


celery = make_celery()
