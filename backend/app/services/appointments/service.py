from app import db
from app.services.auth.models import User
from app.services.catalog.models import Service, DiscountCode
from app.services.vehicles.models import Vehicle
from app.services.appointments.models import Appointment, ServiceHistory
from datetime import datetime, timedelta, timezone


def get_appointments_query(current_user):
    if current_user['role'] == 'admin':
        appointments = Appointment.query.all()
    elif current_user['role'] == 'employee':
        from app.services.employees.models import Employee
        appointments = Appointment.query.join(Assignment).filter(
            Assignment.employee_id == Employee.query.filter_by(
                user_id=current_user['id']
            ).with_entities(Employee.id).scalar_subquery()
        ).all()
    else:
        appointments = Appointment.query.filter_by(user_id=current_user['id']).all()
    return appointments


def get_appointment_by_id(appointment_id, current_user):
    appointment = Appointment.query.get(appointment_id)
    
    if not appointment:
        raise ValueError('Appointment not found')
    
    if current_user['role'] == 'customer' and appointment.user_id != current_user['id']:
        raise ValueError('Unauthorized access')
    
    return appointment


def validate_appointment_date(date_str):
    if not date_str or not isinstance(date_str, str):
        return None, "Appointment date is required"
    
    try:
        appointment_date = datetime.fromisoformat(date_str)
    except (ValueError, TypeError):
        return None, "Invalid date format. Use ISO 8601 format (e.g., 2024-01-15T10:00:00)"
    
    if appointment_date.tzinfo is None:
        appointment_date = appointment_date.replace(tzinfo=timezone.utc)
    
    if appointment_date < datetime.now(timezone.utc) + timedelta(hours=1):
        return None, "Appointment must be scheduled at least 1 hour in the future"
    
    if appointment_date > datetime.now(timezone.utc) + timedelta(days=365):
        return None, "Appointment cannot be scheduled more than 1 year in advance"
    
    return appointment_date, None


def apply_discount_safely(discount_code, total_amount):
    if not discount_code:
        return 0.0, total_amount, None
    
    discount = DiscountCode.query.filter_by(code=discount_code.upper()).first()
    
    if not discount or not discount.is_active:
        return 0.0, total_amount, "Invalid discount code"
    
    current_date = datetime.now(timezone.utc)
    
    if discount.start_date and current_date < discount.start_date:
        return 0.0, total_amount, "Discount code is not yet valid"
    
    if discount.end_date and current_date > discount.end_date:
        return 0.0, total_amount, "Discount code has expired"
    
    discount = DiscountCode.query.filter_by(code=discount_code.upper()).with_for_update().first()
    
    if not discount or discount.used_count >= discount.max_uses:
        return 0.0, total_amount, "Discount code has reached maximum usage"
    
    if discount.minimum_spend and total_amount < discount.minimum_spend:
        return 0.0, total_amount, f"Minimum spend of {discount.minimum_spend} required"
    
    if discount.discount_type == 'percentage':
        discount_amount = float(total_amount) * (float(discount.value) / 100)
    else:
        discount_amount = float(discount.value)
    
    new_total = max(0, float(total_amount) - discount_amount)
    discount.used_count = DiscountCode.used_count + 1
    
    return discount_amount, new_total, None


def create_appointment(current_user, data):
    appointment_date, date_error = validate_appointment_date(data['appointment_date'])
    if date_error:
        raise ValueError(date_error)
    
    vehicle = Vehicle.query.get(data['vehicle_id'])
    if not vehicle:
        raise ValueError('Vehicle not found')
    
    if vehicle.user_id != current_user['id']:
        raise ValueError('Unauthorized access to vehicle')
    
    service = Service.query.get(data['service_id'])
    if not service or not service.is_active:
        raise ValueError('Service not found or inactive')
    
    total_amount = float(service.price) if service.price else 0.0
    discount_code = data.get('discount_code')
    discount_amount = 0.0
    
    if discount_code:
        discount_amount, total_amount, discount_error = apply_discount_safely(discount_code, total_amount)
        if discount_error:
            raise ValueError(discount_error)
    
    appointment = Appointment()
    appointment.user_id = current_user['id']
    appointment.vehicle_id = data['vehicle_id']
    appointment.service_id = data['service_id']
    appointment.appointment_date = appointment_date
    appointment.notes = data.get('notes', '')[:5000]
    appointment.total_amount = total_amount
    appointment.status = 'scheduled'
    appointment.payment_status = 'pending'

    db.session.add(appointment)
    db.session.commit()

    _notify_admins_new_booking(appointment)

    return appointment


def _notify_admins_new_booking(appointment):
    """Create an in-app Notification for every admin and queue an email.

    The work is queued via Celery so the customer-facing POST /appointments
    response is not blocked by SMTP I/O. Each admin gets a separate
    Notification row so the bell badge count and per-admin
    read/unread state work correctly.
    """
    from app.services.notifications.models import Notification
    from app.services.vehicles.models import Vehicle
    from app.services.auth.models import User

    admins = User.query.filter(
        (User.role.in_(['admin', 'super_admin'])) | (User.is_admin.is_(True))
    ).all()

    if not admins:
        return

    customer = User.query.get(appointment.user_id)
    vehicle = Vehicle.query.get(appointment.vehicle_id)
    service = Service.query.get(appointment.service_id)

    customer_name = customer.name if customer else f'Customer #{appointment.user_id}'
    vehicle_label = (
        f'{vehicle.make} {vehicle.model} ({vehicle.year})' if vehicle
        else f'Vehicle #{appointment.vehicle_id}'
    )
    service_name = service.name if service else f'Service #{appointment.service_id}'
    scheduled = appointment.appointment_date.strftime('%Y-%m-%d %H:%M') if appointment.appointment_date else 'unscheduled'

    title = 'New appointment booked'
    message = (
        f'{customer_name} booked {service_name} for {vehicle_label} on {scheduled}. '
        f'Appointment #{appointment.id} is awaiting assignment.'
    )

    for admin in admins:
        try:
            note = Notification(
                user_id=admin.id,
                title=title,
                message=message,
                notification_type='info',
            )
            db.session.add(note)
        except Exception as exc:
            current_app_logger = None
            import logging
            logging.getLogger(__name__).warning('Failed to enqueue admin notification: %s', exc)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return

    for admin in admins:
        if not admin.email:
            continue
        try:
            from app.tasks.email_tasks import send_email
            email_subject = f'[AutoConcierge] New appointment #{appointment.id} awaiting assignment'
            email_body = (
                f"Hi {admin.name},\n\n"
                f"A new appointment has just been booked and is waiting to be assigned to an employee.\n\n"
                f"  Customer:   {customer_name}\n"
                f"  Service:    {service_name}\n"
                f"  Vehicle:    {vehicle_label}\n"
                f"  Date/Time:  {scheduled}\n"
                f"  Total:      KES {float(appointment.total_amount or 0):,.2f}\n"
                f"  Appointment ID: {appointment.id}\n\n"
                f"Open the admin dashboard to assign an employee.\n\n"
                f"AutoConcierge"
            )
            send_email.delay(admin.email, email_subject, email_body)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning('Failed to enqueue admin email: %s', exc)


def update_appointment(appointment_id, current_user, data):
    appointment = Appointment.query.get(appointment_id)
    
    if not appointment:
        raise ValueError('Appointment not found')
    
    if current_user['role'] == 'customer' and appointment.user_id != current_user['id']:
        raise ValueError('Unauthorized access')
    
    original_status = appointment.status
    
    if 'vehicle_id' in data:
        vehicle = Vehicle.query.get(data['vehicle_id'])
        if not vehicle:
            raise ValueError('Vehicle not found')
        
        if vehicle.user_id != appointment.user_id:
            raise ValueError('Unauthorized access to vehicle')
        
        appointment.vehicle_id = data['vehicle_id']
    
    if 'service_id' in data:
        service = Service.query.get(data['service_id'])
        if not service or not service.is_active:
            raise ValueError('Service not found')
        
        appointment.service_id = data['service_id']
    
    if 'appointment_date' in data:
        parsed_date, date_error = validate_appointment_date(data['appointment_date'])
        if date_error:
            raise ValueError(date_error)
        appointment.appointment_date = parsed_date
    
    if 'notes' in data:
        appointment.notes = data['notes']
    
    if 'status' in data:
        appointment.status = data['status']
    
    if 'payment_status' in data:
        appointment.payment_status = data['payment_status']
    
    db.session.commit()
    return appointment, original_status


def delete_appointment(appointment_id, current_user):
    appointment = Appointment.query.get(appointment_id)
    
    if not appointment:
        raise ValueError('Appointment not found')
    
    if current_user['role'] == 'customer' and appointment.user_id != current_user['id']:
        raise ValueError('Unauthorized access')
    
    db.session.delete(appointment)
    db.session.commit()


def confirm_vehicle_return(appointment_id, current_user, data):
    appointment = Appointment.query.get(appointment_id)
    
    if not appointment:
        raise ValueError('Appointment not found')
    
    if current_user['role'] == 'customer' and appointment.user_id != current_user['id']:
        raise ValueError('Unauthorized access')
    
    service_rating = data.get('service_rating')
    condition_rating = data.get('condition_rating')
    review = data.get('review', '')
    
    if not service_rating or not condition_rating:
        raise ValueError('Service rating and condition rating are required')
    
    if not (1 <= service_rating <= 5) or not (1 <= condition_rating <= 5):
        raise ValueError('Ratings must be between 1 and 5')
    
    service = Service.query.get(appointment.service_id)
    vehicle = Vehicle.query.get(appointment.vehicle_id)
    
    service_history = ServiceHistory()
    service_history.user_id = appointment.user_id
    service_history.vehicle_id = appointment.vehicle_id
    service_history.service_id = appointment.service_id
    service_history.appointment_id = appointment.id
    service_history.completed_date = datetime.now(timezone.utc)
    service_history.notes = appointment.notes or ''
    service_history.cost = appointment.total_amount
    service_history.rating = service_rating
    service_history.review = review[:2000] if review else None
    
    db.session.add(service_history)
    
    if appointment.status != 'completed':
        appointment.status = 'completed'
    
    db.session.commit()
    return service_history