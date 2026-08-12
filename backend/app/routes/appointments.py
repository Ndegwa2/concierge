from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Appointment, User, Vehicle, Service, DiscountCode, Invoice, ServiceHistory
from app.utils.decorators import admin_required, role_required, get_current_user, get_current_user_id, is_admin
from app.utils.invoice import generate_invoice_pdf
from app.utils.email import send_email_with_attachment
from app.utils.cache import cache_get, cache_set, cache_delete_pattern, REDIS_SHORT_TTL
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)

appointments_bp = Blueprint('appointments', __name__)

@appointments_bp.route('/', methods=['GET'])
@jwt_required()
@role_required('admin', 'customer', 'employee')
def get_appointments():
    """Get user's appointments"""
    try:
        current_user = get_current_user()
        
        cache_key = f"appointments:{current_user['id']}:{current_user['role']}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200
        
        if current_user['role'] == 'admin':
            # Admin gets all appointments
            appointments = Appointment.query.all()
        elif current_user['role'] == 'employee':
            # Employee gets assigned appointments (will implement with Assignment model)
            appointments = Appointment.query.all()
        else:
            # Regular user gets their own appointments
            appointments = Appointment.query.filter_by(user_id=current_user['id']).all()
        
        result = {
            'success': True,
            'data': {
                'appointments': [appointment.to_dict() for appointment in appointments],
                'count': len(appointments)
            }
        }

        cache_set(cache_key, result, REDIS_SHORT_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get appointments',
            'error': str(e)
        }), 500

@appointments_bp.route('/<int:appointment_id>', methods=['GET'])
@jwt_required()
@role_required('admin', 'customer', 'employee')
def get_appointment(appointment_id):
    """Get a single appointment"""
    try:
        current_user = get_current_user()
        appointment = Appointment.query.get(appointment_id)
        
        if not appointment:
            return jsonify({
                'success': False,
                'message': 'Appointment not found'
            }), 404
        
        # Check access - admin and employee can view all, customer only their own
        if current_user['role'] == 'customer' and appointment.user_id != current_user['id']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        return jsonify({
            'success': True,
            'data': {
                'appointment': appointment.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get appointment',
            'error': str(e)
        }), 500

def validate_appointment_date(date_str):
    """
    Validate and parse appointment date string.
    
    Returns:
        tuple: (datetime object, error message or None)
    """
    if not date_str or not isinstance(date_str, str):
        return None, "Appointment date is required"
    
    try:
        appointment_date = datetime.fromisoformat(date_str)
    except (ValueError, TypeError):
        return None, "Invalid date format. Use ISO 8601 format (e.g., 2024-01-15T10:00:00)"
    
    if appointment_date.tzinfo is None:
        appointment_date = appointment_date.replace(tzinfo=timezone.utc)
    
    # Ensure date is in the future (with 1 hour buffer)
    if appointment_date < datetime.now(timezone.utc) + timedelta(hours=1):
        return None, "Appointment must be scheduled at least 1 hour in the future"
    
    # Limit to reasonable future date (max 1 year)
    if appointment_date > datetime.now(timezone.utc) + timedelta(days=365):
        return None, "Appointment cannot be scheduled more than 1 year in advance"
    
    return appointment_date, None


def apply_discount_safely(discount_code, total_amount):
    """
    Apply discount code with proper validation and race condition handling.
    
    Returns:
        tuple: (discount_amount, new_total, error_message or None)
    """
    if not discount_code:
        return 0.0, total_amount, None
    
    discount = DiscountCode.query.filter_by(code=discount_code.upper()).first()
    
    if not discount or not discount.is_active:
        return 0.0, total_amount, "Invalid discount code"
    
    current_date = datetime.now(timezone.utc)
    
    # Validate date range
    if discount.start_date and current_date < discount.start_date:
        return 0.0, total_amount, "Discount code is not yet valid"
    
    if discount.end_date and current_date > discount.end_date:
        return 0.0, total_amount, "Discount code has expired"
    
    # Check usage limit with row-level locking to prevent race conditions
    # Using with_for_update() to lock the row during transaction
    discount = DiscountCode.query.filter_by(code=discount_code.upper()).with_for_update().first()
    
    if not discount or discount.used_count >= discount.max_uses:
        return 0.0, total_amount, "Discount code has reached maximum usage"
    
    # Check minimum spend
    if discount.minimum_spend and total_amount < discount.minimum_spend:
        return 0.0, total_amount, f"Minimum spend of {discount.minimum_spend} required"
    
    # Calculate discount
    if discount.discount_type == 'percentage':
        discount_amount = float(total_amount) * (float(discount.value) / 100)
    else:
        discount_amount = float(discount.value)
    
    # Apply discount
    new_total = max(0, float(total_amount) - discount_amount)
    
    # Increment usage count atomically
    discount.used_count = DiscountCode.used_count + 1
    
    return discount_amount, new_total, None


@appointments_bp.route('/', methods=['POST'])
@jwt_required()
@role_required('customer', 'admin')
def create_appointment():
    """Create a new appointment"""
    request_id = g.get('request_id', 'unknown')
    try:
        current_user = get_current_user()
        if not current_user:
            logger.error(f"[{request_id}] No current user found")
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Invalid JSON data'
            }), 400
        
        # Validate required fields
        required_fields = ['vehicle_id', 'service_id', 'appointment_date']
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Validate appointment date
        appointment_date, date_error = validate_appointment_date(data['appointment_date'])
        if date_error:
            return jsonify({
                'success': False,
                'message': date_error
            }), 400
        
        # Check if vehicle belongs to user
        vehicle = Vehicle.query.get(data['vehicle_id'])
        if not vehicle:
            return jsonify({
                'success': False,
                'message': 'Vehicle not found'
            }), 404
        
        if vehicle.user_id != current_user['id']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access to vehicle'
            }), 403
        
        # Check if service exists
        service = Service.query.get(data['service_id'])
        if not service or not service.is_active:
            return jsonify({
                'success': False,
                'message': 'Service not found or inactive'
            }), 404
        
        # Calculate total amount
        total_amount = float(service.price) if service.price else 0.0
        
        # Apply discount if provided
        discount_code = data.get('discount_code')
        discount_amount = 0.0
        
        if discount_code:
            discount_amount, total_amount, discount_error = apply_discount_safely(discount_code, total_amount)
            if discount_error:
                return jsonify({
                    'success': False,
                    'message': discount_error
                }), 400
        
        # Create appointment
        appointment = Appointment()
        appointment.user_id = current_user['id']
        appointment.vehicle_id = data['vehicle_id']
        appointment.service_id = data['service_id']
        appointment.appointment_date = appointment_date
        appointment.notes = data.get('notes', '')[:5000]  # Limit notes length
        appointment.total_amount = total_amount
        appointment.status = 'scheduled'
        appointment.payment_status = 'pending'
        
        db.session.add(appointment)
        db.session.commit()
        
        cache_delete_pattern("appointments:*")
        cache_delete_pattern("admin:appointments:*")
        cache_delete_pattern("admin:dashboard:*")
        cache_delete_pattern("employee:dashboard:*")
        
        logger.info(f"[{request_id}] Appointment created: {appointment.id} by user {current_user['id']}")
        
        return jsonify({
            'success': True,
            'message': 'Appointment created successfully',
            'data': {
                'appointment': appointment.to_dict()
            }
        }), 201
        
    except ValueError as e:
        db.session.rollback()
        logger.warning(f"[{request_id}] Validation error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Invalid input data'
        }), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"[{request_id}] Unexpected error creating appointment: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'An internal error occurred'
        }), 500

@appointments_bp.route('/<int:appointment_id>', methods=['PUT'])
@jwt_required()
@role_required('admin', 'customer', 'employee')
def update_appointment(appointment_id):
    """Update an appointment"""
    try:
        current_user = get_current_user()
        appointment = Appointment.query.get(appointment_id)
        
        if not appointment:
            return jsonify({
                'success': False,
                'message': 'Appointment not found'
            }), 404
        
        # Check access - admin and employee can update all, customer only their own
        if current_user['role'] == 'customer' and appointment.user_id != current_user['id']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        data = request.get_json()
        original_status = appointment.status
        
        if 'vehicle_id' in data:
            vehicle = Vehicle.query.get(data['vehicle_id'])
            if not vehicle:
                return jsonify({
                    'success': False,
                    'message': 'Vehicle not found'
                }), 404
            
            if vehicle.user_id != appointment.user_id:
                return jsonify({
                    'success': False,
                    'message': 'Unauthorized access to vehicle'
                }), 403
            
            appointment.vehicle_id = data['vehicle_id']
        
        if 'service_id' in data:
            service = Service.query.get(data['service_id'])
            if not service or not service.is_active:
                return jsonify({
                    'success': False,
                    'message': 'Service not found'
                }), 404
            
            appointment.service_id = data['service_id']
        
        if 'appointment_date' in data:
            parsed_date, date_error = validate_appointment_date(data['appointment_date'])
            if date_error:
                return jsonify({
                    'success': False,
                    'message': date_error
                }), 400
            appointment.appointment_date = parsed_date
        
        if 'notes' in data:
            appointment.notes = data['notes']
        
        if 'status' in data:
            appointment.status = data['status']
        
        if 'payment_status' in data:
            appointment.payment_status = data['payment_status']
        
        db.session.commit()

        cache_delete_pattern("appointments:*")
        cache_delete_pattern("admin:appointments:*")
        cache_delete_pattern("admin:dashboard:*")
        cache_delete_pattern("employee:dashboard:*")

        if original_status != 'completed' and appointment.status == 'completed':
            try:
                _auto_send_invoice(appointment)
            except Exception as exc:
                logger.warning('Auto invoice failed for appointment %s: %s', appointment.id, exc)
        
        return jsonify({
            'success': True,
            'message': 'Appointment updated successfully',
            'data': {
                'appointment': appointment.to_dict()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update appointment',
            'error': str(e)
        }), 500

@appointments_bp.route('/<int:appointment_id>', methods=['DELETE'])
@jwt_required()
@role_required('admin', 'customer')
def delete_appointment(appointment_id):
    """Delete an appointment"""
    try:
        current_user = get_current_user()
        appointment = Appointment.query.get(appointment_id)
        
        if not appointment:
            return jsonify({
                'success': False,
                'message': 'Appointment not found'
            }), 404
        
        # Check access - admin can delete all, customer only their own
        if current_user['role'] == 'customer' and appointment.user_id != current_user['id']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        db.session.delete(appointment)
        db.session.commit()
        
        cache_delete_pattern("appointments:*")
        cache_delete_pattern("admin:appointments:*")
        cache_delete_pattern("admin:dashboard:*")
        
        return jsonify({
            'success': True,
            'message': 'Appointment deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to delete appointment',
            'error': str(e)
        }), 500


@appointments_bp.route('/<int:appointment_id>/confirm-return', methods=['POST'])
@jwt_required()
@role_required('customer', 'admin')
def confirm_vehicle_return(appointment_id):
    """Confirm vehicle return and submit ratings/review"""
    request_id = g.get('request_id', 'unknown')
    try:
        current_user = get_current_user()
        appointment = Appointment.query.get(appointment_id)
        
        if not appointment:
            return jsonify({
                'success': False,
                'message': 'Appointment not found'
            }), 404
        
        if current_user['role'] == 'customer' and appointment.user_id != current_user['id']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Invalid request data'
            }), 400
        
        service_rating = data.get('service_rating')
        condition_rating = data.get('condition_rating')
        review = data.get('review', '')
        
        if not service_rating or not condition_rating:
            return jsonify({
                'success': False,
                'message': 'Service rating and condition rating are required'
            }), 400
        
        if not (1 <= service_rating <= 5) or not (1 <= condition_rating <= 5):
            return jsonify({
                'success': False,
                'message': 'Ratings must be between 1 and 5'
            }), 400
        
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
        
        logger.info(f"[{request_id}] Vehicle return confirmed for appointment {appointment.id} by user {current_user['id']}")
        
        return jsonify({
            'success': True,
            'message': 'Vehicle return confirmed and ratings submitted successfully',
            'data': {
                'service_history': service_history.to_dict()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"[{request_id}] Error confirming vehicle return: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to confirm vehicle return',
            'error': str(e)
        }), 500


def _auto_send_invoice(appointment):
    from app.utils.invoice import _generate_invoice_number
    from app.utils.email import send_email_with_attachment
    from datetime import datetime, timezone

    customer = User.query.get(appointment.user_id)
    vehicle = Vehicle.query.get(appointment.vehicle_id)
    service = Service.query.get(appointment.service_id)

    if not all([customer, vehicle, service]) or not customer.email:
        logger.warning('Skipping auto-invoice for appointment %s: missing data', appointment.id)
        return

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
    send_email_with_attachment(
        to=customer.email,
        subject=subject,
        body=body,
        attachment_path=pdf_path,
        attachment_filename=f'{invoice_number}.pdf',
    )