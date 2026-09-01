"""
Appointment Notification Tasks for AutoConcierge
=================================================
Replaces the threading-based scheduler with Celery beat periodic tasks.
"""
import logging
from datetime import datetime, timedelta, timezone
from app.celery import celery
from app import db

logger = logging.getLogger(__name__)

REMINDER_HOURS_BEFORE = 24
OVERDUE_GRACE_MINUTES = 60


@celery.task(name='app.tasks.appointment_tasks.check_upcoming_appointments')
def check_upcoming_appointments():
    """Check for upcoming and overdue appointments and send notifications.
    Called by Celery beat every 5 minutes.
    """
    from app.services.appointments.models import Appointment

    now = datetime.now(timezone.utc)

    _process_upcoming_appointments(now)
    _process_overdue_appointments(now)


def _process_upcoming_appointments(now):
    """Send reminders for appointments happening within 24 hours."""
    from app.services.appointments.models import Appointment

    reminder_window_start = now + timedelta(hours=REMINDER_HOURS_BEFORE)
    reminder_window_end = now + timedelta(hours=REMINDER_HOURS_BEFORE + 1)

    upcoming = Appointment.query.filter(
        Appointment.appointment_date >= reminder_window_start,
        Appointment.appointment_date < reminder_window_end,
        Appointment.status.in_(['scheduled', 'confirmed']),
        Appointment.reminder_sent == False,
    ).all()

    for appointment in upcoming:
        _send_upcoming_notification(appointment)


def _process_overdue_appointments(now):
    """Send alerts for overdue appointments."""
    from app.services.appointments.models import Appointment

    overdue_threshold = now - timedelta(minutes=OVERDUE_GRACE_MINUTES)

    overdue = Appointment.query.filter(
        Appointment.appointment_date < overdue_threshold,
        Appointment.status.in_(['scheduled', 'confirmed', 'in-progress']),
        Appointment.overdue_notified == False,
    ).all()

    for appointment in overdue:
        appointment.status = 'overdue'
        _send_overdue_notification(appointment)

    if overdue:
        db.session.commit()


def _send_upcoming_notification(appointment):
    """Send upcoming appointment notification to customer and admins."""
    from app.services.auth.models import User
    from app.services.notifications.models import Notification
    from app.tasks.email_tasks import send_appointment_reminder, send_appointment_reminder_admin

    user = User.query.get(appointment.user_id)
    if not user:
        return

    service = appointment.service
    service_name = service.name if service else 'Appointment'
    appointment_time = appointment.appointment_date.strftime('%Y-%m-%d %H:%M') if appointment.appointment_date else 'N/A'

    # Create in-app notification
    notification = Notification(
        user_id=user.id,
        title='Upcoming Appointment Reminder',
        message=f"Your {service_name} is scheduled for {appointment_time}. Please arrive 10 minutes early.",
        notification_type='appointment_reminder',
        is_read=False,
    )
    db.session.add(notification)

    # Send email asynchronously
    body = f"Dear {user.name},\n\nYour {service_name} is scheduled for {appointment_time}. Please arrive 10 minutes early.\n\nThank you for choosing AutoConcierge."
    send_appointment_reminder.delay(user.id, 'AutoConcierge: Upcoming Appointment Reminder', body)

    # Notify admins
    admins = User.query.filter_by(role='admin', is_active=True).all()
    for admin in admins:
        admin_notification = Notification(
            user_id=admin.id,
            title='Upcoming Appointment (Admin)',
            message=f"{user.name} has an upcoming {service_name} at {appointment_time}.",
            notification_type='admin_appointment_reminder',
            is_read=False,
        )
        db.session.add(admin_notification)
        admin_body = f"Dear Admin,\n\n{user.name} has an upcoming {service_name} at {appointment_time}."
        send_appointment_reminder_admin.delay(admin.id, 'AutoConcierge: Upcoming Appointment (Admin)', admin_body)

    appointment.reminder_sent = True
    db.session.commit()


def _send_overdue_notification(appointment):
    """Send overdue appointment notification to customer and admins."""
    from app.services.auth.models import User
    from app.services.notifications.models import Notification
    from app.tasks.email_tasks import send_appointment_reminder, send_appointment_reminder_admin

    user = User.query.get(appointment.user_id)
    if not user:
        return

    service = appointment.service
    service_name = service.name if service else 'Appointment'
    appointment_time = appointment.appointment_date.strftime('%Y-%m-%d %H:%M') if appointment.appointment_date else 'N/A'

    # Create in-app notification
    notification = Notification(
        user_id=user.id,
        title='Overdue Appointment Alert',
        message=f"Your {service_name} scheduled for {appointment_time} is overdue. Please contact us immediately to reschedule.",
        notification_type='overdue_alert',
        is_read=False,
    )
    db.session.add(notification)

    # Send email asynchronously
    body = f"Dear {user.name},\n\nYour {service_name} scheduled for {appointment_time} is overdue. Please contact us immediately to reschedule.\n\nBest regards,\nAutoConcierge Team"
    send_appointment_reminder.delay(user.id, 'AutoConcierge: Overdue Appointment Alert', body)

    # Notify admins
    admins = User.query.filter_by(role='admin', is_active=True).all()
    for admin in admins:
        admin_notification = Notification(
            user_id=admin.id,
            title='Overdue Appointment (Admin)',
            message=f"{user.name}'s {service_name} scheduled for {appointment_time} is overdue. Please follow up immediately.",
            notification_type='admin_overdue_alert',
            is_read=False,
        )
        db.session.add(admin_notification)
        admin_body = f"Dear Admin,\n\n{user.name}'s {service_name} scheduled for {appointment_time} is overdue. Please follow up immediately."
        send_appointment_reminder_admin.delay(admin.id, 'AutoConcierge: Overdue Appointment (Admin)', admin_body)

    appointment.overdue_notified = True
    db.session.commit()
