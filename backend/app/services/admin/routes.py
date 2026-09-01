from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload
from app import db
from app.services.auth.models import User, PaymentMethod
from app.services.catalog.models import Service, DiscountCode
from app.services.vehicles.models import Vehicle
from app.services.appointments.models import Appointment, ServiceHistory
from app.services.notifications.models import Notification
from app.utils.decorators import admin_required, role_required, get_current_user
from app.utils.cache import cache_get, cache_set, cache_delete_pattern, REDIS_SHORT_TTL, REDIS_DEFAULT_TTL
from .service import (
    get_dashboard_stats,
    get_all_users_query,
    get_user_by_id,
    get_all_appointments_query,
    get_service_history_query,
    create_notification as svc_create_notification,
    create_discount as svc_create_discount,
)
from datetime import datetime, timezone

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@admin_required
def get_dashboard():
    try:
        cache_key = "admin:dashboard:stats"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        result = get_dashboard_stats()

        cache_set(cache_key, result, REDIS_SHORT_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get dashboard data',
            'error': str(e)
        }), 500


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required
def get_all_users():
    try:
        cache_key = f"admin:users:{request.args.get('status','')}:{request.args.get('role','')}:{request.args.get('search','')}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        users = get_all_users_query()

        result = {
            'success': True,
            'data': {
                'users': [user.to_dict() for user in users],
                'count': len(users)
            }
        }

        cache_set(cache_key, result, REDIS_SHORT_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get users',
            'error': str(e)
        }), 500


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_user(user_id):
    try:
        cache_key = f"admin:user:{user_id}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        user = get_user_by_id(user_id)

        result = {
            'success': True,
            'data': {
                'user': user.to_dict()
            }
        }

        cache_set(cache_key, result, REDIS_SHORT_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get user',
            'error': str(e)
        }), 500


@admin_bp.route('/appointments', methods=['GET'])
@jwt_required()
@admin_required
def get_all_appointments():
    try:
        status = request.args.get('status')
        cache_key = f"admin:appointments:{status or 'all'}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        result = get_all_appointments_query(status)

        cache_set(cache_key, result, REDIS_SHORT_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get appointments',
            'error': str(e)
        }), 500


@admin_bp.route('/service-history', methods=['GET'])
@jwt_required()
@admin_required
def get_service_history():
    try:
        cache_key = f"admin:service-history:{request.args.get('limit','')}:{request.args.get('service_id','')}:{request.args.get('start_date','')}:{request.args.get('end_date','')}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        history = get_service_history_query()

        result = {
            'success': True,
            'data': {
                'service_history': [record.to_dict() for record in history],
                'count': len(history)
            }
        }

        cache_set(cache_key, result, REDIS_SHORT_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get service history',
            'error': str(e)
        }), 500


@admin_bp.route('/notifications', methods=['POST'])
@jwt_required()
@admin_required
def create_notification():
    try:
        data = request.get_json()
        
        if not all(key in data for key in ['user_id', 'title', 'message']):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        notification = svc_create_notification(data)
        cache_delete_pattern("notifications:*")
        
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
@admin_required
def create_discount():
    try:
        data = request.get_json()
        
        if not all(key in data for key in ['code', 'discount_type', 'value']):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        discount = svc_create_discount(data)

        cache_delete_pattern("services:discounts")

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