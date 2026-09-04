from app import db
from app.services.auth.models import User
from app.services.catalog.models import Service, DiscountCode
from app.services.vehicles.models import Vehicle
from app.services.appointments.models import Appointment, ServiceHistory
from app.services.notifications.models import Notification
from sqlalchemy.orm import joinedload
from datetime import datetime, timezone


def get_dashboard_stats():
    current_user = get_current_user()
    
    total_users = User.query.count()
    total_services = Service.query.count()
    total_vehicles = Vehicle.query.count()
    total_appointments = Appointment.query.count()
    
    active_appointments = Appointment.query.filter(Appointment.status.in_(['scheduled', 'confirmed'])).count()
    completed_appointments = Appointment.query.filter_by(status='completed').count()
    
    total_revenue = db.session.query(db.func.sum(Appointment.total_amount)).filter(
        Appointment.payment_status == 'paid'
    ).scalar() or 0
    
    recent_appointments = Appointment.query.order_by(Appointment.created_at.desc()).limit(10).all()
    
    return {
        'success': True,
        'data': {
            'statistics': {
                'total_users': total_users,
                'total_services': total_services,
                'total_vehicles': total_vehicles,
                'total_appointments': total_appointments,
                'active_appointments': active_appointments,
                'completed_appointments': completed_appointments,
                'total_revenue': float(total_revenue)
            },
            'recent_appointments': [appointment.to_dict() for appointment in recent_appointments]
        }
    }


def get_all_users_query(search=None):
    query = User.query
    
    if search:
        search_token = User._compute_phone_search_token(search)
        query = query.filter(
            db.or_(
                User.name.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%'),
                User.phone_search_token == search_token
            )
        )
    
    return query.all()


def get_user_by_id(user_id):
    user = User.query.get(user_id)
    
    if not user:
        raise ValueError('User not found')
    
    return user


def get_all_appointments_query(status=None, page=1, per_page=20):
    query = Appointment.query.options(
        joinedload(Appointment.vehicle),
        joinedload(Appointment.service),
        joinedload(Appointment.customer),
    )
    
    if status:
        query = query.filter_by(status=status)
    
    total = query.count()
    appointments = query.order_by(Appointment.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    
    return {
        'success': True,
        'data': {
            'appointments': [appointment.to_dict() for appointment in appointments],
            'total': total,
            'page': page,
            'per_page': per_page,
        }
    }


def get_service_history_query():
    return ServiceHistory.query.all()


def create_notification(data):
    notification = Notification()
    notification.user_id = data['user_id']
    notification.title = data['title']
    notification.message = data['message']
    notification.notification_type = data.get('notification_type', 'info')
    notification.is_read = False
    
    db.session.add(notification)
    db.session.commit()
    return notification


def create_discount(data):
    existing = DiscountCode.query.filter_by(code=data['code'].upper()).first()
    if existing:
        raise ValueError('Discount code already exists')
    
    discount = DiscountCode()
    discount.code = data['code'].upper()
    discount.discount_type = data['discount_type']
    discount.value = data['value']
    discount.minimum_spend = data.get('minimum_spend')
    discount.max_uses = data.get('max_uses', 100)
    discount.used_count = 0
    
    if 'start_date' in data:
        discount.start_date = datetime.fromisoformat(data['start_date'])
    else:
        discount.start_date = datetime.now(timezone.utc)
        
    if 'end_date' in data:
        discount.end_date = datetime.fromisoformat(data['end_date'])
    
    discount.is_active = data.get('is_active', True)
    
    db.session.add(discount)
    db.session.commit()
    return discount


def create_pos_checkout(data, processed_by_user_id=None, appointment_id=None, customer_user_id=None, send_email_to_customer=False):
    from app.services.fleets.models import Invoice, InvoiceLineItem
    from app.services.invoices.service import _generate_invoice_number
    from app.services.invoices.pdf_generator import generate_invoice_pdf
    from app.tasks.email_tasks import send_email_with_attachment

    customer_name = (data.get('customer_name') or 'Walk-in Customer').strip()
    customer_email = data.get('customer_email')
    customer_phone = data.get('customer_phone')
    payment_method = data.get('payment_method', 'cash')
    line_items_data = data.get('line_items', [])
    discount_amount = float(data.get('discount_amount') or 0)
    tax_amount = float(data.get('tax_amount') or 0)
    notes = data.get('notes')
    cash_tendered = data.get('cash_tendered')

    if not line_items_data:
        raise ValueError('At least one line item is required')

    subtotal = sum(float(item.get('total_price') or 0) for item in line_items_data)
    total = subtotal - discount_amount + tax_amount
    total = max(0, total)

    if payment_method == 'cash' and cash_tendered is not None and float(cash_tendered) < total:
        raise ValueError('Cash tendered is less than total amount')

    invoice_number = _generate_invoice_number(0, datetime.now(timezone.utc))
    invoice = Invoice(
        invoice_number=invoice_number,
        user_id=customer_user_id,
        appointment_id=appointment_id,
        processed_by_user_id=processed_by_user_id,
        total_amount=total,
        status='pending_verification',
        invoice_type='pos',
        tax_amount=tax_amount,
        currency='KES',
        payment_method=payment_method,
        notes=notes,
    )
    db.session.add(invoice)
    db.session.flush()

    for item_data in line_items_data:
        line = InvoiceLineItem(
            invoice_id=invoice.id,
            description=item_data.get('description') or '',
            quantity=int(item_data.get('quantity') or 1),
            unit_price=float(item_data.get('unit_price') or 0),
            total_price=float(item_data.get('total_price') or 0),
        )
        db.session.add(line)

    db.session.commit()

    pdf_path = generate_invoice_pdf(None, None, None, None, invoice.invoice_number, invoice=invoice)
    invoice.pdf_path = pdf_path
    db.session.commit()

    if send_email_to_customer and customer_email:
        subject = f'Receipt {invoice_number} - AutoConcierge'
        body = (
            f"Dear {customer_name},\n\n"
            f"Thank you for your purchase.\n\n"
            f"Invoice/Receipt Number: {invoice.invoice_number}\n"
            f"Total Amount: KES {total:,.2f}\n"
            f"Payment Method: {payment_method}\n\n"
            f"Thank you for choosing AutoConcierge.\n"
        )
        send_email_with_attachment.delay(
            to=customer_email,
            subject=subject,
            body=body,
            attachment_path=pdf_path,
            attachment_filename=f'{invoice_number}.pdf',
        )

    return invoice


def get_pending_verification_invoices():
    from app.services.fleets.models import Invoice
    invoices = (
        Invoice.query
        .filter(Invoice.status == 'pending_verification')
        .order_by(Invoice.created_at.desc())
        .all()
    )
    return invoices


def verify_invoice_and_email(invoice_id, verified_by_user_id):
    from app.services.fleets.models import Invoice
    from app.services.auth.models import User
    from app.services.appointments.models import Appointment
    from app.tasks.email_tasks import send_email_with_attachment

    invoice = Invoice.query.get(invoice_id)
    if not invoice:
        raise ValueError('Invoice not found')

    if invoice.status not in ('pending_verification', 'sent', 'paid'):
        raise ValueError(f'Invoice in status "{invoice.status}" cannot be verified')

    customer = User.query.get(invoice.user_id) if invoice.user_id else None
    appointment = Appointment.query.get(invoice.appointment_id) if invoice.appointment_id else None

    invoice.status = 'verified'
    invoice.verified_by_user_id = verified_by_user_id
    invoice.verified_at = datetime.now(timezone.utc)
    invoice.sent_at = datetime.now(timezone.utc)
    db.session.commit()

    customer_email = customer.email if customer else None
    if appointment and appointment.customer and getattr(appointment.customer, 'email', None):
        customer_email = appointment.customer.email

    if customer_email and invoice.pdf_path:
        subject = f'Verified Invoice {invoice.invoice_number} - AutoConcierge'
        body = (
            f"Dear {customer.name if customer else 'Customer'},\n\n"
            f"Your invoice has been verified by our team and is ready for your records.\n\n"
            f"Invoice Number: {invoice.invoice_number}\n"
            f"Total Amount: KES {float(invoice.total_amount):,.2f}\n"
            f"Payment Method: {invoice.payment_method or 'N/A'}\n\n"
            f"Please find the invoice attached.\n\n"
            f"Thank you for choosing AutoConcierge.\n"
        )
        send_email_with_attachment.delay(
            to=customer_email,
            subject=subject,
            body=body,
            attachment_path=invoice.pdf_path,
            attachment_filename=f'{invoice.invoice_number}.pdf',
        )

    return invoice


def get_current_user():
    try:
        from app.utils.decorators import get_current_user as _get_current_user
        return _get_current_user()
    except RuntimeError:
        return None