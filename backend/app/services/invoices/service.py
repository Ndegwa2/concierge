from app import db
from app.services.auth.models import User
from app.services.catalog.models import Service
from app.services.vehicles.models import Vehicle
from app.services.appointments.models import Appointment
from app.services.fleets.models import Invoice
from datetime import datetime, timezone
from pathlib import Path


def _generate_invoice_number(appointment_id, created_at=None):
    created_at = created_at or datetime.now(timezone.utc)
    date_part = created_at.strftime('%Y%m%d')
    seq_part = f"{appointment_id:04d}"
    return f"INV-{date_part}-{seq_part}"


def _assert_appointment_access(appointment, current_user):
    if current_user['role'] == 'customer' and appointment.user_id != current_user['id']:
        raise PermissionError('Unauthorized access to appointment')


def _load_appointment_entities(appointment):
    customer = User.query.get(appointment.user_id)
    vehicle = Vehicle.query.get(appointment.vehicle_id)
    service = Service.query.get(appointment.service_id)
    if not all([customer, vehicle, service]):
        raise ValueError('Appointment references missing related data')
    return customer, vehicle, service


def send_invoice(appointment_id, current_user):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        raise ValueError('Appointment not found')
    
    _assert_appointment_access(appointment, current_user)
    
    if appointment.status != 'completed':
        raise ValueError('Appointment must be completed before sending invoice')
    
    customer, vehicle, service = _load_appointment_entities(appointment)
    
    if not customer.email:
        raise ValueError('Customer email is missing')
    
    invoice = Invoice.query.filter_by(appointment_id=appointment.id).first()
    created = False
    if not invoice:
        invoice_number = _generate_invoice_number(appointment.id, appointment.updated_at)
        invoice = Invoice(
            invoice_number=invoice_number,
            appointment_id=appointment.id,
            user_id=customer.id,
            total_amount=appointment.total_amount or 0,
            status='draft',
        )
        db.session.add(invoice)
        db.session.flush()
        created = True
    
    from app.services.invoices.pdf_generator import generate_invoice_pdf
    pdf_path = generate_invoice_pdf(appointment, customer, vehicle, service, invoice.invoice_number)
    invoice.pdf_path = pdf_path
    invoice.status = 'sent'
    invoice.sent_at = datetime.now(timezone.utc)
    db.session.commit()
    
    subject = f'Invoice {invoice.invoice_number} - Ndegwa Auto Concierge'
    body = (
        f"Dear {customer.name},\n\n"
        f"Please find your invoice for the completed service attached.\n\n"
        f"Invoice Number: {invoice.invoice_number}\n"
        f"Total Amount: KSh {float(invoice.total_amount):,.2f}\n\n"
        f"Thank you for choosing Ndegwa Auto Concierge.\n"
    )
    
    from app.tasks.email_tasks import send_email_with_attachment
    send_email_with_attachment.delay(
        to=customer.email,
        subject=subject,
        body=body,
        attachment_path=pdf_path,
        attachment_filename=f'{invoice.invoice_number}.pdf',
    )
    
    return {
        'invoice': invoice.to_dict(),
        'created': created,
    }


def get_invoice_by_appointment(appointment_id, current_user):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        raise ValueError('Appointment not found')
    
    _assert_appointment_access(appointment, current_user)
    
    invoice = Invoice.query.filter_by(appointment_id=appointment.id).first()
    if not invoice:
        raise ValueError('Invoice not found')
    
    return invoice


def download_invoice_pdf_file(pdf_path):
    path = Path(pdf_path)
    if not path.exists():
        raise ValueError('Invoice file is missing')
    return path
