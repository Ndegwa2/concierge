import logging
import threading
import time
from datetime import datetime, timedelta, timezone
from flask import current_app
from app import db
from app.models import Appointment, Notification, User
from app.utils.email import send_email

logger = logging.getLogger(__name__)

CHECK_INTERVAL_SECONDS = 60
REMINDER_HOURS_BEFORE = 24
OVERDUE_GRACE_MINUTES = 60


def _send_appointment_email(user: User, subject: str, body: str):
    if not user or not user.email:
        return
    try:
        send_email(to=user.email, subject=subject, body=body)
    except Exception as exc:
        logger.error('Failed to send appointment email to %s: %s', user.email, exc)


def _create_notification(user_id: int, title: str, message: str, notification_type: str = 'appointment_reminder'):
    try:
        notification = Notification()
        notification.user_id = user_id
        notification.title = title
        notification.message = message
        notification.notification_type = notification_type
        notification.is_read = False
        db.session.add(notification)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to create notification for user %s: %s', user_id, exc)


def _notify_upcoming_appointment(appointment: Appointment):
    user = User.query.get(appointment.user_id)
    if not user:
        return

    service = appointment.service
    service_name = service.name if service else 'Appointment'
    appointment_time = appointment.appointment_date.strftime('%Y-%m-%d %H:%M') if appointment.appointment_date else 'N/A'

    title = 'Upcoming Appointment Reminder'
    message = (
        f"Your {service_name} is scheduled for {appointment_time}. "
        "Please arrive 10 minutes early."
    )

    _create_notification(user.id, title, message, 'appointment_reminder')
    _send_appointment_email(
        user,
        subject='AutoConcierge: Upcoming Appointment Reminder',
        body=f"Dear {user.name},\n\n{message}\n\nThank you for choosing AutoConcierge.",
    )

    appointment.reminder_sent = True
    db.session.commit()


def _notify_overdue_appointment(appointment: Appointment):
    user = User.query.get(appointment.user_id)
    if not user:
        return

    service = appointment.service
    service_name = service.name if service else 'Appointment'
    appointment_time = appointment.appointment_date.strftime('%Y-%m-%d %H:%M') if appointment.appointment_date else 'N/A'

    title = 'Overdue Appointment Alert'
    message = (
        f"Your {service_name} scheduled for {appointment_time} is overdue. "
        "Please contact us immediately to reschedule."
    )

    _create_notification(user.id, title, message, 'overdue_alert')
    _send_appointment_email(
        user,
        subject='AutoConcierge: Overdue Appointment Alert',
        body=f"Dear {user.name},\n\n{message}\n\nBest regards,\nAutoConcierge Team",
    )

    appointment.overdue_notified = True
    db.session.commit()


def _notify_admins_of_upcoming(appointment: Appointment):
    admins = User.query.filter_by(role='admin', is_active=True).all()
    service = appointment.service
    service_name = service.name if service else 'Appointment'
    appointment_time = appointment.appointment_date.strftime('%Y-%m-%d %H:%M') if appointment.appointment_date else 'N/A'
    customer = User.query.get(appointment.user_id)
    customer_name = customer.name if customer else 'Unknown Customer'

    for admin in admins:
        title = 'Upcoming Appointment (Admin)'
        message = (
            f"{customer_name} has an upcoming {service_name} at {appointment_time}."
        )
        _create_notification(admin.id, title, message, 'admin_appointment_reminder')
        try:
            _send_appointment_email(
                admin,
                subject='AutoConcierge: Upcoming Appointment (Admin)',
                body=f"Dear Admin,\n\n{message}\n",
            )
        except Exception:
            pass


def _notify_admins_of_overdue(appointment: Appointment):
    admins = User.query.filter_by(role='admin', is_active=True).all()
    service = appointment.service
    service_name = service.name if service else 'Appointment'
    appointment_time = appointment.appointment_date.strftime('%Y-%m-%d %H:%M') if appointment.appointment_date else 'N/A'
    customer = User.query.get(appointment.user_id)
    customer_name = customer.name if customer else 'Unknown Customer'

    for admin in admins:
        title = 'Overdue Appointment (Admin)'
        message = (
            f"{customer_name}'s {service_name} scheduled for {appointment_time} is overdue. "
            "Please follow up immediately."
        )
        _create_notification(admin.id, title, message, 'admin_overdue_alert')
        try:
            _send_appointment_email(
                admin,
                subject='AutoConcierge: Overdue Appointment (Admin)',
                body=f"Dear Admin,\n\n{message}\n",
            )
        except Exception:
            pass


def check_appointments(app):
    with app.app_context():
        try:
            now = datetime.now(timezone.utc)
            reminder_window_start = now + timedelta(hours=REMINDER_HOURS_BEFORE)
            reminder_window_end = now + timedelta(hours=REMINDER_HOURS_BEFORE + 1)

            upcoming = Appointment.query.filter(
                Appointment.appointment_date >= reminder_window_start,
                Appointment.appointment_date < reminder_window_end,
                Appointment.status.in_(['scheduled', 'confirmed']),
                Appointment.reminder_sent == False,  # noqa: E712
            ).all()

            for appointment in upcoming:
                _notify_upcoming_appointment(appointment)
                _notify_admins_of_upcoming(appointment)

            overdue_threshold = now - timedelta(minutes=OVERDUE_GRACE_MINUTES)
            overdue = Appointment.query.filter(
                Appointment.appointment_date < overdue_threshold,
                Appointment.status.in_(['scheduled', 'confirmed', 'in-progress']),
                Appointment.overdue_notified == False,  # noqa: E712
            ).all()

            for appointment in overdue:
                appointment.status = 'overdue'
                _notify_overdue_appointment(appointment)
                _notify_admins_of_overdue(appointment)

            if upcoming or overdue:
                db.session.commit()
        except Exception as exc:
            logger.error('Appointment notification check failed: %s', exc)


def start_scheduler(app):
    def run():
        while True:
            check_appointments(app)
            time.sleep(CHECK_INTERVAL_SECONDS)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    logger.info('Appointment notification scheduler started')
