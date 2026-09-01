from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.services.auth.models import User
from app.services.catalog.models import Service, DiscountCode
from app.services.vehicles.models import Vehicle
from app.services.appointments.models import Appointment, ServiceHistory
from app.services.fleets.models import Invoice
from app.utils.decorators import admin_required, role_required, get_current_user, get_current_user_id, is_admin
from app.utils.invoice import generate_invoice_pdf
from app.utils.email import send_email_with_attachment
from app.utils.cache import cache_get, cache_set, cache_delete_pattern, REDIS_SHORT_TTL, REDIS_DEFAULT_TTL
from .service import (
    get_appointments_query,
    get_appointment_by_id,
    validate_appointment_date,
    apply_discount_safely,
    create_appointment as svc_create_appointment,
    update_appointment as svc_update_appointment,
    delete_appointment as svc_delete_appointment,
    confirm_vehicle_return as svc_confirm_vehicle_return,
)
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)

appointments_bp = Blueprint('appointments', __name__)


@appointments_bp.route('/', methods=['GET'])
@jwt_required()
@role_required('admin', 'customer', 'employee')
def get_appointments():
    try:
        current_user = get_current_user()
        
        cache_key = f"appointments:{current_user['id']}:{current_user['role']}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200
        
        appointments = get_appointments_query(current_user)
        
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
    try:
        current_user = get_current_user()
        appointment = get_appointment_by_id(appointment_id, current_user)
        
        return jsonify({
            'success': True,
            'data': {
                'appointment': appointment.to_dict()
            }
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 404 if 'not found' in str(e) else 403
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get appointment',
            'error': str(e)
        }), 500


@appointments_bp.route('/', methods=['POST'])
@jwt_required()
@role_required('customer', 'admin')
def create_appointment():
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
        
        appointment = svc_create_appointment(current_user, data)
        
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
    try:
        current_user = get_current_user()
        data = request.get_json()
        
        appointment, original_status = svc_update_appointment(appointment_id, current_user, data)

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
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 404 if 'not found' in str(e) else 403
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
    try:
        current_user = get_current_user()
        svc_delete_appointment(appointment_id, current_user)

        cache_delete_pattern("appointments:*")
        cache_delete_pattern("admin:appointments:*")
        cache_delete_pattern("admin:dashboard:*")
        cache_delete_pattern("employee:dashboard:*")
        
        return jsonify({
            'success': True,
            'message': 'Appointment deleted successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 404 if 'not found' in str(e) else 403
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
    request_id = g.get('request_id', 'unknown')
    try:
        current_user = get_current_user()
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Invalid request data'
            }), 400
        
        service_history = svc_confirm_vehicle_return(appointment_id, current_user, data)

        cache_delete_pattern("appointments:*")
        cache_delete_pattern("admin:appointments:*")
        cache_delete_pattern("admin:dashboard:*")
        cache_delete_pattern("employee:dashboard:*")
        
        logger.info(f"[{request_id}] Vehicle return confirmed for appointment {appointment_id} by user {current_user['id']}")
        
        return jsonify({
            'success': True,
            'message': 'Vehicle return confirmed and ratings submitted successfully',
            'data': {
                'service_history': service_history.to_dict()
            }
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 404 if 'not found' in str(e) else 403
    except Exception as e:
        db.session.rollback()
        logger.error(f"[{request_id}] Error confirming vehicle return: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to confirm vehicle return',
            'error': str(e)
        }), 500


def _auto_send_invoice(appointment):
    from app.services.invoices.service import _generate_invoice_number
    from app.services.invoices.pdf_generator import generate_invoice_pdf
    from app.tasks.email_tasks import send_email_with_attachment
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
    send_email_with_attachment.delay(
        to=customer.email,
        subject=subject,
        body=body,
        attachment_path=pdf_path,
        attachment_filename=f'{invoice_number}.pdf',
    )