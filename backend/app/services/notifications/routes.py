from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.services.auth.models import User
from app.services.notifications.models import Notification
from app.utils.decorators import get_current_user
from .service import get_user_notifications, mark_notification_read, mark_all_notifications_read

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
        notifications, unread_count = get_user_notifications(current_user['id'], unread_only)

        return jsonify({
            'success': True,
            'data': {
                'notifications': notifications,
                'unread_count': unread_count
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to fetch notifications',
            'error': str(e)
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
        
        return jsonify({
            'success': True,
            'message': 'Notification marked as read',
            'data': {'notification': notification.to_dict()}
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update notification',
            'error': str(e)
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

        return jsonify({
            'success': True,
            'message': 'All notifications marked as read'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update notifications',
            'error': str(e)
        }), 500