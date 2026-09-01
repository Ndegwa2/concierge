"""
PDF Generation Tasks for AutoConcierge
=======================================
Offloads CPU-intensive PDF generation from Gunicorn workers.
"""
import logging
from app.celery import celery

logger = logging.getLogger(__name__)


@celery.task(name='app.tasks.pdf_tasks.generate_invoice_pdf', bind=True, max_retries=2, default_retry_delay=10)
def generate_invoice_pdf(self, appointment_id, customer_id, vehicle_id, service_id, invoice_number):
    """Generate invoice PDF asynchronously."""
    from app.services.auth.models import User
    from app.services.catalog.models import Service
    from app.services.vehicles.models import Vehicle
    from app.services.appointments.models import Appointment
    from app.services.invoices.pdf_generator import generate_invoice_pdf as _generate

    appointment = Appointment.query.get(appointment_id)
    customer = User.query.get(customer_id)
    vehicle = Vehicle.query.get(vehicle_id)
    service = Service.query.get(service_id)

    if not all([appointment, customer, vehicle, service]):
        raise ValueError('Missing required entities for PDF generation')

    try:
        pdf_path = _generate(appointment, customer, vehicle, service, invoice_number)
        logger.info('Invoice PDF generated: %s', pdf_path)
        return pdf_path
    except Exception as exc:
        logger.error('PDF generation failed: %s', exc)
        raise self.retry(exc=exc)


@celery.task(name='app.tasks.pdf_tasks.generate_fleet_invoice_pdf', bind=True, max_retries=2, default_retry_delay=10)
def generate_fleet_invoice_pdf(self, invoice_id):
    """Generate fleet invoice PDF asynchronously."""
    from app.services.fleets.models import Invoice, Company
    from app.utils.fleet_invoice import generate_fleet_invoice_pdf as _generate

    invoice = Invoice.query.get(invoice_id)
    if not invoice or not invoice.company:
        raise ValueError('Fleet invoice not found')

    try:
        pdf_path = _generate(invoice, invoice.company, invoice.line_items)
        logger.info('Fleet invoice PDF generated: %s', pdf_path)
        return pdf_path
    except Exception as exc:
        logger.error('Fleet PDF generation failed: %s', exc)
        raise self.retry(exc=exc)
