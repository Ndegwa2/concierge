"""
Notification Routes for AutoConcierge

This module handles notification retrieval and management for users.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Notification, User
from app.utils.decorators import get_current_user

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get current user's notifications"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'Authentication required',
                'error': 'MISSING_TOKEN'
            }), 401

        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        query = Notification.query.filter_by(user_id=current_user['id'])
        if unread_only:
            query = query.filter_by(is_read=False)

        notifications = query.order_by(Notification.created_at.desc()).limit(50).all()

        return jsonify({
            'success': True,
            'data': {
                'notifications': [n.to_dict() for n in notifications],
                'unread_count': Notification.query.filter_by(user_id=current_user['id'], is_read=False).count()
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
    """Mark a notification as read"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'Authentication required',
                'error': 'MISSING_TOKEN'
            }), 401

        notification = Notification.query.filter_by(id=notification_id, user_id=current_user['id']).first()
        if not notification:
            return jsonify({
                'success': False,
                'message': 'Notification not found'
            }), 404

        notification.is_read = True
        db.session.commit()

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
    """Mark all user notifications as read"""
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'Authentication required',
                'error': 'MISSING_TOKEN'
            }), 401

        Notification.query.filter_by(user_id=current_user['id'], is_read=False).update({'is_read': True})
        db.session.commit()

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
