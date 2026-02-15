from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Appointment, User, Vehicle, Service, DiscountCode
from datetime import datetime

appointments_bp = Blueprint('appointments', __name__)

@appointments_bp.route('/', methods=['GET'])
@jwt_required()
def get_appointments():
    """Get user's appointments"""
    try:
        current_user = get_jwt_identity()
        
        if current_user['role'] == 'admin':
            # Admin gets all appointments
            appointments = Appointment.query.all()
        else:
            # Regular user gets their own appointments
            appointments = Appointment.query.filter_by(user_id=current_user['id']).all()
        
        return jsonify({
            'success': True,
            'data': {
                'appointments': [appointment.to_dict() for appointment in appointments],
                'count': len(appointments)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get appointments',
            'error': str(e)
        }), 500

@appointments_bp.route('/<int:appointment_id>', methods=['GET'])
@jwt_required()
def get_appointment(appointment_id):
    """Get a single appointment"""
    try:
        current_user = get_jwt_identity()
        appointment = Appointment.query.get(appointment_id)
        
        if not appointment:
            return jsonify({
                'success': False,
                'message': 'Appointment not found'
            }), 404
        
        # Check access
        if current_user['role'] != 'admin' and appointment.user_id != current_user['id']:
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

@appointments_bp.route('/', methods=['POST'])
@jwt_required()
def create_appointment():
    """Create a new appointment"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        # Validate input
        if not all(key in data for key in ['vehicle_id', 'service_id', 'appointment_date']):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
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
                'message': 'Service not found'
            }), 404
        
        # Calculate total amount
        total_amount = service.price
        discount_amount = 0.0
        
        if 'discount_code' in data:
            discount = DiscountCode.query.filter_by(code=data['discount_code'].upper()).first()
            if discount and discount.is_active:
                # Check discount validity
                current_date = datetime.utcnow()
                if discount.start_date <= current_date <= discount.end_date and discount.used_count < discount.max_uses:
                    if discount.discount_type == 'percentage':
                        discount_amount = total_amount * (discount.value / 100)
                    else:
                        discount_amount = discount.value
                    
                    # Apply minimum spend if required
                    if discount.minimum_spend and total_amount < discount.minimum_spend:
                        discount_amount = 0.0
                    
                    # Apply discount
                    total_amount = max(0, total_amount - discount_amount)
        
        # Create appointment
        appointment = Appointment()
        appointment.user_id = current_user['id']
        appointment.vehicle_id = data['vehicle_id']
        appointment.service_id = data['service_id']
        appointment.appointment_date = datetime.fromisoformat(data['appointment_date'])
        appointment.notes = data.get('notes', '')
        appointment.total_amount = total_amount
        appointment.status = 'scheduled'
        appointment.payment_status = 'pending'
        
        db.session.add(appointment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Appointment created successfully',
            'data': {
                'appointment': appointment.to_dict()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to create appointment',
            'error': str(e)
        }), 500

@appointments_bp.route('/<int:appointment_id>', methods=['PUT'])
@jwt_required()
def update_appointment(appointment_id):
    """Update an appointment"""
    try:
        current_user = get_jwt_identity()
        appointment = Appointment.query.get(appointment_id)
        
        if not appointment:
            return jsonify({
                'success': False,
                'message': 'Appointment not found'
            }), 404
        
        # Check access
        if current_user['role'] != 'admin' and appointment.user_id != current_user['id']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        data = request.get_json()
        
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
            appointment.appointment_date = datetime.fromisoformat(data['appointment_date'])
        
        if 'notes' in data:
            appointment.notes = data['notes']
        
        if 'status' in data:
            appointment.status = data['status']
        
        if 'payment_status' in data:
            appointment.payment_status = data['payment_status']
        
        db.session.commit()
        
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
def delete_appointment(appointment_id):
    """Delete an appointment"""
    try:
        current_user = get_jwt_identity()
        appointment = Appointment.query.get(appointment_id)
        
        if not appointment:
            return jsonify({
                'success': False,
                'message': 'Appointment not found'
            }), 404
        
        # Check access
        if current_user['role'] != 'admin' and appointment.user_id != current_user['id']:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        db.session.delete(appointment)
        db.session.commit()
        
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