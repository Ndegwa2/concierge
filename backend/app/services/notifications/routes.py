from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.services.auth.models import User
from app.services.notifications.models import Notification
from app.utils.decorators import get_current_user
from app.utils.cache import cache_get, cache_set, cache_delete_pattern, REDIS_SHORT_TTL
from .service import get_user_notifications, mark_notification_read, mark_all_notifications_read


import logging
logger = logging.getLogger(__name__)
notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'Authentication required',
                'error': 'MISSING_TOKEN'
            }), 401

        unread_only = request.args.get('unread_only', 'false').lower() == 'true'

        cache_key = f"notifications:{current_user['id']}:{unread_only}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        notifications, unread_count = get_user_notifications(current_user['id'], unread_only)

        result = {
            'success': True,
            'data': {
                'notifications': notifications,
                'unread_count': unread_count
            }
        }

        cache_set(cache_key, result, REDIS_SHORT_TTL)

        return jsonify(result), 200

    except Exception as e:
        logger.error(str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to fetch notifications',
            'error': 'An internal server error occurred.'
        }), 500


@notifications_bp.route('/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notification_id):
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'Authentication required',
                'error': 'MISSING_TOKEN'
            }), 401

        notification = mark_notification_read(notification_id, current_user['id'])

        cache_delete_pattern(f"notifications:{current_user['id']}:*")
        
        return jsonify({
            'success': True,
            'message': 'Notification marked as read',
            'data': {'notification': notification.to_dict()}
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to update notification',
            'error': 'An internal server error occurred.'
        }), 500


@notifications_bp.route('/read-all', methods=['PUT'])
@jwt_required()
def mark_all_notifications_read():
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'Authentication required',
                'error': 'MISSING_TOKEN'
            }), 401

        count = mark_all_notifications_read(current_user['id'])

        cache_delete_pattern(f"notifications:{current_user['id']}:*")

        return jsonify({
            'success': True,
            'message': 'All notifications marked as read'
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to update notifications',
            'error': 'An internal server error occurred.'
        }), 500