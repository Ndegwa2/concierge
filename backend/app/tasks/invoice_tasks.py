"""
Invoice Tasks for AutoConcierge
 ================================
 Offloads PDF generation and email sending from Gunicorn workers.
 """
import logging
from app.celery import celery
from app import db

logger = logging.getLogger(__name__)


@celery.task(name='app.tasks.invoice_tasks.auto_send_invoice', bind=True, max_retries=3, default_retry_delay=60)
def auto_send_invoice(self, appointment_id):
    """Generate invoice PDF and send email asynchronously."""
    from app.services.auth.models import User
    from app.services.catalog.models import Service
    from app.services.vehicles.models import Vehicle
    from app.services.appointments.models import Appointment
    from app.services.fleets.models import Invoice
    from app.services.invoices.service import _generate_invoice_number
    from app.services.invoices.pdf_generator import generate_invoice_pdf
    from app.tasks.email_tasks import send_email_with_attachment
    from datetime import datetime, timezone

    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        logger.warning('Appointment %s not found for auto-invoice', appointment_id)
        return

    customer = User.query.get(appointment.user_id)
    vehicle = Vehicle.query.get(appointment.vehicle_id)
    service = Service.query.get(appointment.service_id)

    if not all([customer, vehicle, service]) or not customer.email:
        logger.warning('Skipping auto-invoice for appointment %s: missing data', appointment.id)
        return

    try:
        invoice_number = _generate_invoice_number(appointment.id, appointment.updated_at)
        pdf_path = generate_invoice_pdf(appointment, customer, vehicle, service, invoice_number)

        invoice = Invoice(
            invoice_number=invoice_number,
            appointment_id=appointment.id,
            user_id=customer.id,
            total_amount=appointment.total_amount or 0,
            status='sent',
            pdf_path=pdf_path,
            sent_at=datetime.now(timezone.utc),
        )
        db.session.add(invoice)
        db.session.commit()

        subject = f'Invoice {invoice_number} - Ndegwa Auto Concierge'
        body = (
            f"Dear {customer.name},\n\n"
            f"Please find your invoice for the completed service attached.\n\n"
            f"Invoice Number: {invoice_number}\n"
            f"Total Amount: KSh {float(invoice.total_amount):,.2f}\n\n"
            f"Thank you for choosing Ndegwa Auto Concierge.\n"
        )
        send_email_with_attachment.delay(
            to=customer.email,
            subject=subject,
            body=body,
            attachment_path=pdf_path,
            attachment_filename=f'{invoice_number}.pdf',
        )
        logger.info('Auto-invoice queued for appointment %s', appointment_id)

    except Exception as exc:
        db.session.rollback()
        logger.exception('Auto-invoice failed for appointment %s: %s', appointment_id, exc)
        raise self.retry(exc=exc)


@celery.task(name='app.tasks.invoice_tasks.generate_fleet_invoice_pdf', bind=True, max_retries=3, default_retry_delay=60)
def generate_fleet_invoice_pdf(self, invoice_id):
    """Generate fleet invoice PDF asynchronously."""
    from app.services.fleets.models import Invoice, Company
    from app.utils.fleet_invoice import generate_fleet_invoice_pdf

    invoice = Invoice.query.get(invoice_id)
    if not invoice or not invoice.company:
        logger.warning('Fleet invoice %s not found for PDF generation', invoice_id)
        return

    try:
        pdf_path = generate_fleet_invoice_pdf(invoice, invoice.company, invoice.line_items)
        invoice.pdf_path = pdf_path
        db.session.commit()
        logger.info('Fleet invoice PDF generated for invoice %s', invoice_id)

    except Exception as exc:
        db.session.rollback()
        logger.exception('Fleet invoice PDF generation failed for invoice %s: %s', invoice_id, exc)
        raise self.retry(exc=exc)
