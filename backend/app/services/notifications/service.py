from app import db
from app.services.notifications.models import Notification


def get_user_notifications(user_id, unread_only=False):
    query = Notification.query.filter_by(user_id=user_id)
    if unread_only:
        query = query.filter_by(is_read=False)
    
    notifications = query.order_by(Notification.created_at.desc()).limit(50).all()
    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    
    return [n.to_dict() for n in notifications], unread_count


def mark_notification_read(notification_id, user_id):
    notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    
    if not notification:
        raise ValueError('Notification not found')
    
    notification.is_read = True
    db.session.commit()
    return notification


def mark_all_notifications_read(user_id):
    result = Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return result