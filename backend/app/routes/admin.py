from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import (User, Service, Vehicle, Appointment, 
                     ServiceHistory, Notification, Admin, PaymentMethod, DiscountCode)
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """Get admin dashboard statistics"""
    try:
        current_user = get_jwt_identity()
        
        if current_user['role'] != 'admin':
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        # Calculate statistics
        total_users = User.query.count()
        total_services = Service.query.count()
        total_vehicles = Vehicle.query.count()
        total_appointments = Appointment.query.count()
        
        # Active appointments (scheduled or confirmed)
        active_appointments = Appointment.query.filter(Appointment.status.in_(['scheduled', 'confirmed'])).count()
        
        # Completed appointments
        completed_appointments = Appointment.query.filter_by(status='completed').count()
        
        # Total revenue
        total_revenue = db.session.query(db.func.sum(Appointment.total_amount)).filter_by(payment_status='paid').scalar()
        total_revenue = float(total_revenue) if total_revenue else 0.0
        
        # Recent appointments
        recent_appointments = Appointment.query.order_by(Appointment.appointment_date.desc()).limit(5).all()
        
        return jsonify({
            'success': True,
            'data': {
                'statistics': {
                    'total_users': total_users,
                    'total_services': total_services,
                    'total_vehicles': total_vehicles,
                    'total_appointments': total_appointments,
                    'active_appointments': active_appointments,
                    'completed_appointments': completed_appointments,
                    'total_revenue': total_revenue
                },
                'recent_appointments': [appointment.to_dict() for appointment in recent_appointments]
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get dashboard data',
            'error': str(e)
        }), 500

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    """Get all users"""
    try:
        current_user = get_jwt_identity()
        
        if current_user['role'] != 'admin':
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        users = User.query.all()
        
        return jsonify({
            'success': True,
            'data': {
                'users': [user.to_dict() for user in users],
                'count': len(users)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get users',
            'error': str(e)
        }), 500

@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    """Get a single user"""
    try:
        current_user = get_jwt_identity()
        
        if current_user['role'] != 'admin':
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': {
                'user': user.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get user',
            'error': str(e)
        }), 500

@admin_bp.route('/appointments', methods=['GET'])
@jwt_required()
def get_all_appointments():
    """Get all appointments"""
    try:
        current_user = get_jwt_identity()
        
        if current_user['role'] != 'admin':
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        status = request.args.get('status')
        query = Appointment.query
        
        if status:
            query = query.filter_by(status=status)
        
        appointments = query.all()
        
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

@admin_bp.route('/service-history', methods=['GET'])
@jwt_required()
def get_service_history():
    """Get all service history records"""
    try:
        current_user = get_jwt_identity()
        
        if current_user['role'] != 'admin':
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        history = ServiceHistory.query.all()
        
        return jsonify({
            'success': True,
            'data': {
                'service_history': [record.to_dict() for record in history],
                'count': len(history)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get service history',
            'error': str(e)
        }), 500

@admin_bp.route('/notifications', methods=['POST'])
@jwt_required()
def create_notification():
    """Create a notification"""
    try:
        current_user = get_jwt_identity()
        
        if current_user['role'] != 'admin':
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        data = request.get_json()
        
        if not all(key in data for key in ['user_id', 'title', 'message']):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        notification = Notification()
        notification.user_id = data['user_id']
        notification.title = data['title']
        notification.message = data['message']
        notification.is_read = False
        
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Notification created successfully',
            'data': {
                'notification': notification.to_dict()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to create notification',
            'error': str(e)
        }), 500

@admin_bp.route('/discounts', methods=['POST'])
@jwt_required()
def create_discount():
    """Create a discount code"""
    try:
        current_user = get_jwt_identity()
        
        if current_user['role'] != 'admin':
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        data = request.get_json()
        
        if not all(key in data for key in ['code', 'discount_type', 'value']):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        # Check if discount code already exists
        existing = DiscountCode.query.filter_by(code=data['code'].upper()).first()
        if existing:
            return jsonify({
                'success': False,
                'message': 'Discount code already exists'
            }), 409
        
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
            discount.start_date = datetime.utcnow()
            
        if 'end_date' in data:
            discount.end_date = datetime.fromisoformat(data['end_date'])
        
        discount.is_active = data.get('is_active', True)
        
        db.session.add(discount)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Discount code created successfully',
            'data': {
                'discount': discount.to_dict()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to create discount',
            'error': str(e)
        }), 500