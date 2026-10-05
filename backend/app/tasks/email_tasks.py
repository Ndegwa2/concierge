"""
Email Tasks for AutoConcierge
==============================
Offloads SMTP email sending from Gunicorn workers.
"""
import logging
from app.celery import celery
from app import db

logger = logging.getLogger(__name__)


@celery.task(name='app.tasks.email_tasks.send_email', bind=True, max_retries=3, default_retry_delay=60)
def send_email(self, to, subject, body):
    """Send plain email asynchronously."""
    from app.utils.email import send_email as _send_email
    try:
        _send_email(to=to, subject=subject, body=body)
        logger.info('Email sent to %s', to)
    except Exception as exc:
        logger.error('Email task failed for %s: %s', to, exc)
        raise self.retry(exc=exc)


@celery.task(name='app.tasks.email_tasks.send_email_with_attachment', bind=True, max_retries=3, default_retry_delay=60)
def send_email_with_attachment(self, to, subject, body, attachment_path, attachment_filename):
    """Send email with attachment asynchronously."""
    from app.utils.email import send_email_with_attachment as _send
    try:
        _send(
            to=to,
            subject=subject,
            body=body,
            attachment_path=attachment_path,
            attachment_filename=attachment_filename,
        )
        logger.info('Email with attachment sent to %s', to)
    except Exception as exc:
        logger.error('Email with attachment task failed for %s: %s', to, exc)
        raise self.retry(exc=exc)


@celery.task(name='app.tasks.email_tasks.send_customer_onboarding_email', bind=True, max_retries=3, default_retry_delay=60)
def send_customer_onboarding_email(self, user_id, document_ids=None):
    """Send the one-time onboarding email after customer registration.

    If *document_ids* is provided, the corresponding onboarding documents
    (created during registration) are attached alongside the generated
    welcome pack PDF.
    """
    from flask import current_app
    from pathlib import Path
    from app.services.auth.models import User
    from app.utils.email import send_email, send_email_with_attachments
    from app.utils.onboarding import (
        build_onboarding_email,
        generate_welcome_pack_pdf,
        resolve_welcome_pack,
    )

    user = User.query.get(user_id)
    if not user or user.role != 'customer' or not user.email:
        logger.warning('Skipping onboarding email for user %s', user_id)
        return

    document_ids = document_ids or []
    subject, body = build_onboarding_email(
        user, current_app.config, document_count=len(document_ids)
    )
    attachment_path, generated_attachment = resolve_welcome_pack(current_app.config, user.id)
    attachment_path = Path(attachment_path)
    attachments = []
    generated_paths = []

    try:
        if generated_attachment:
            generate_welcome_pack_pdf(user, current_app.config, attachment_path)
        if attachment_path.is_file():
            attachments.append((str(attachment_path), attachment_path.name))
            generated_paths.append(attachment_path)

        # Attach uploaded onboarding documents
        if document_ids:
            from app.services.documents.models import Document
            docs = Document.query.filter(Document.id.in_(document_ids)).all()
            root = current_app.root_path
            for doc in docs:
                if doc.file_path:
                    full = Path(root) / doc.file_path
                    if full.is_file():
                        attachments.append((str(full), doc.file_name or doc.title))

        if attachments:
            send_email_with_attachments(
                to=user.email,
                subject=subject,
                body=body,
                attachments=attachments,
            )
        else:
            send_email(to=user.email, subject=subject, body=body)

        logger.info(
            'Customer onboarding email sent to %s with %d attachment(s)',
            user.email, len(attachments),
        )
    except Exception as exc:
        logger.error('Customer onboarding email failed for %s: %s', user.email, exc)
        raise self.retry(exc=exc)
    finally:
        for p in generated_paths:
            try:
                p.unlink()
            except OSError:
                pass


@celery.task(name='app.tasks.email_tasks.send_payment_receipt', bind=True, max_retries=3, default_retry_delay=60)
def send_payment_receipt(self, payment_id):
    """Send payment receipt email after successful M-Pesa payment."""
    from app.services.auth.models import User
    from app.services.payments.models import Payment
    from app.services.fleets.models import Invoice

    payment = Payment.query.get(payment_id)
    if not payment:
        logger.warning('Payment %s not found for receipt', payment_id)
        return

    user = User.query.get(payment.user_id)
    if not user or not user.email:
        logger.info('No email for payment receipt: payment %s', payment_id)
        return

    invoice = payment.invoice
    subject = f'Payment Receipt - {payment.payment_reference}'
    body = (
        f"Dear {user.name},\n\n"
        f"Thank you for your payment.\n\n"
        f"Payment Reference: {payment.payment_reference}\n"
        f"Invoice Number: {invoice.invoice_number if invoice else 'N/A'}\n"
        f"Amount Paid: {payment.currency} {float(payment.amount):,.2f}\n"
        f"Payment Method: M-Pesa\n"
    )

    if payment.mpesa_receipt_number:
        body += f"M-Pesa Receipt: {payment.mpesa_receipt_number}\n"

    body += (
        f"Date: {payment.paid_at.strftime('%Y-%m-%d %H:%M') if payment.paid_at else 'N/A'}\n\n"
        f"Thank you for choosing AutoConcierge.\n"
    )

    from app.utils.email import send_email as _send_email
    try:
        _send_email(to=user.email, subject=subject, body=body)
        logger.info('Payment receipt sent to %s', user.email)
    except Exception as exc:
        logger.error('Failed to send payment receipt: %s', exc)
        raise self.retry(exc=exc)


@celery.task(name='app.tasks.email_tasks.send_appointment_reminder', bind=True, max_retries=2, default_retry_delay=30)
def send_appointment_reminder(self, user_id, subject, body):
    """Send appointment reminder email."""
    from app.services.auth.models import User
    from app.utils.email import send_email as _send_email

    user = User.query.get(user_id)
    if not user or not user.email:
        return

    try:
        _send_email(to=user.email, subject=subject, body=body)
    except Exception as exc:
        logger.error('Failed to send appointment reminder: %s', exc)
        raise self.retry(exc=exc)


@celery.task(name='app.tasks.email_tasks.send_appointment_reminder_admin', bind=True, max_retries=2, default_retry_delay=30)
def send_appointment_reminder_admin(self, admin_id, subject, body):
    """Send appointment reminder email to admin."""
    from app.services.auth.models import User
    from app.utils.email import send_email as _send_email

    admin = User.query.get(admin_id)
    if not admin or not admin.email:
        return

    try:
        _send_email(to=admin.email, subject=subject, body=body)
    except Exception as exc:
        logger.error('Failed to send admin appointment reminder: %s', exc)


@celery.task(name='app.tasks.email_tasks.send_fleet_invoice_email', bind=True, max_retries=3, default_retry_delay=60)
def send_fleet_invoice_email(self, to, contact_name, invoice_number, total_amount, currency, due_date_iso, attachment_path, attachment_filename):
    """Send fleet invoice email asynchronously."""
    from datetime import datetime
    from app.utils.email import send_fleet_invoice_email as _send

    try:
        due_date = datetime.fromisoformat(due_date_iso) if isinstance(due_date_iso, str) else due_date_iso
        _send(
            to=to,
            contact_name=contact_name,
            invoice_number=invoice_number,
            total_amount=total_amount,
            currency=currency,
            due_date=due_date,
            attachment_path=attachment_path,
            attachment_filename=attachment_filename,
        )
        logger.info('Fleet invoice email sent to %s', to)
    except Exception as exc:
        logger.error('Failed to send fleet invoice email to %s: %s', to, exc)
        raise self.retry(exc=exc)


@celery.task(name='app.tasks.email_tasks.send_new_appointment_notifications', bind=True, max_retries=3, default_retry_delay=60)
def send_new_appointment_notifications(self, admin_emails, customer_name, service_name, vehicle_label, scheduled, total_amount, appointment_id):
    """Send batch admin notification emails for a new appointment."""
    from app.utils.email import send_email as _send_email

    subject = f'[AutoConcierge] New appointment #{appointment_id} awaiting assignment'
    body = (
        f"Hi Admin,\n\n"
        f"A new appointment has just been booked and is waiting to be assigned to an employee.\n\n"
        f"  Customer:   {customer_name}\n"
        f"  Service:    {service_name}\n"
        f"  Vehicle:    {vehicle_label}\n"
        f"  Date/Time:  {scheduled}\n"
        f"  Total:      KES {total_amount:,.2f}\n"
        f"  Appointment ID: {appointment_id}\n\n"
        f"Open the admin dashboard to assign an employee.\n\n"
        f"AutoConcierge"
    )

    failures = []
    for email in admin_emails:
        try:
            _send_email(to=email, subject=subject, body=body)
            logger.info('New appointment notification sent to %s', email)
        except Exception as exc:
            logger.error('Failed to send new appointment notification to %s: %s', email, exc)
            failures.append(email)

    if failures and len(failures) == len(admin_emails):
        raise self.retry(exc=Exception(f'All {len(failures)} admin emails failed'))

