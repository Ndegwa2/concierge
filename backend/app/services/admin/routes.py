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
    create_pos_checkout as svc_create_pos_checkout,
    get_pending_verification_invoices as svc_get_pending_invoices,
    verify_invoice_and_email as svc_verify_invoice,
    update_user_status,
    resend_onboarding_email,
    delete_user,
)
from datetime import datetime, timezone


import logging
logger = logging.getLogger(__name__)
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
        logger.error(str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to get dashboard data',
            'error': 'An internal server error occurred.'
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

        users = get_all_users_query(search=request.args.get('search'))

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
        logger.error(str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to get users',
            'error': 'An internal server error occurred.'
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
        logger.error(str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to get user',
            'error': 'An internal server error occurred.'
        }), 500


@admin_bp.route('/appointments', methods=['GET'])
@jwt_required()
@admin_required
def get_all_appointments():
    try:
        status = request.args.get('status')
        page = max(int(request.args.get('page', 1)), 1)
        per_page = min(max(int(request.args.get('per_page', 20)), 1), 100)
        cache_key = f"admin:appointments:{status or 'all'}:page:{page}:per_page:{per_page}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        result = get_all_appointments_query(status, page=page, per_page=per_page)

        cache_set(cache_key, result, REDIS_SHORT_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        logger.error(str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to get appointments',
            'error': 'An internal server error occurred.'
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
        logger.error(str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to get service history',
            'error': 'An internal server error occurred.'
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
        logger.error(str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to create notification',
            'error': 'An internal server error occurred.'
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
        logger.error(str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to create discount',
            'error': 'An internal server error occurred.'
        }), 500


@admin_bp.route('/pos/checkout', methods=['POST'])
@jwt_required()
@admin_required
def pos_checkout():
    try:
        current_user = get_current_user()
        data = request.get_json(silent=True) or {}
        invoice = svc_create_pos_checkout(
            data,
            processed_by_user_id=current_user['id'] if current_user else None,
            send_email_to_customer=True,
        )

        return jsonify({
            'success': True,
            'message': 'POS checkout completed',
            'data': {'invoice': invoice.to_dict()},
        }), 201

    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error('POS checkout failed: %s', e, exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to complete checkout',
            'error': 'An internal server error occurred.'
        }), 500


@admin_bp.route('/pos/invoices/pending', methods=['GET'])
@jwt_required()
@admin_required
def list_pending_invoices():
    try:
        invoices = svc_get_pending_invoices()
        return jsonify({
            'success': True,
            'data': {
                'invoices': [inv.to_dict() for inv in invoices],
                'count': len(invoices),
            },
        }), 200
    except Exception as e:
        logger.error('List pending invoices failed: %s', e, exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to load pending invoices',
        }), 500


@admin_bp.route('/pos/invoices/<int:invoice_id>/verify', methods=['POST'])
@jwt_required()
@admin_required
def verify_invoice(invoice_id):
    try:
        current_user = get_current_user()
        invoice = svc_verify_invoice(invoice_id, current_user['id'])

        cache_delete_pattern('admin:dashboard:*')
        cache_delete_pattern('appointments:*')

        return jsonify({
            'success': True,
            'message': 'Invoice verified and emailed to customer',
            'data': {'invoice': invoice.to_dict()},
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error('Verify invoice failed: %s', e, exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to verify invoice',
        }), 500


@admin_bp.route('/users/<int:user_id>/status', methods=['PUT'])
@jwt_required()
@admin_required
def update_user_status_route(user_id):
    try:
        current_user = get_current_user()
        data = request.get_json(silent=True) or {}
        
        if 'is_active' not in data:
            return jsonify({
                'success': False,
                'message': 'Missing required field: is_active'
            }), 400
        
        is_active = bool(data['is_active'])
        user = update_user_status(user_id, is_active, current_user['id'])
        
        return jsonify({
            'success': True,
            'message': f'User {"activated" if is_active else "deactivated"} successfully',
            'data': {'user': user.to_dict()}
        }), 200
        
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error('Update user status failed: %s', e, exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to update user status',
        }), 500


@admin_bp.route('/users/<int:user_id>/onboarding', methods=['POST'])
@jwt_required()
@admin_required
def resend_onboarding_email_route(user_id):
    try:
        current_user = get_current_user()
        result = resend_onboarding_email(user_id, current_user['id'])
        
        return jsonify(result), 200
        
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error('Resend onboarding email failed: %s', e, exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to resend onboarding email',
        }), 500


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user_route(user_id):
    try:
        current_user = get_current_user()
        result = delete_user(user_id, current_user['id'])
        
        return jsonify(result), 200
        
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error('Delete user failed: %s', e, exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to delete user',
        }), 500