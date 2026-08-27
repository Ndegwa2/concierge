from app import db
from app.services.auth.models import User
from app.services.catalog.models import Service, DiscountCode
from app.services.vehicles.models import Vehicle
from app.services.appointments.models import Appointment, ServiceHistory
from app.services.notifications.models import Notification
from sqlalchemy.orm import joinedload
from datetime import datetime, timezone


def get_dashboard_stats():
    current_user = get_current_user()
    
    total_users = User.query.count()
    total_services = Service.query.count()
    total_vehicles = Vehicle.query.count()
    total_appointments = Appointment.query.count()
    
    active_appointments = Appointment.query.filter(Appointment.status.in_(['scheduled', 'confirmed'])).count()
    completed_appointments = Appointment.query.filter_by(status='completed').count()
    
    total_revenue = db.session.query(db.func.sum(Appointment.total_amount)).filter(
        Appointment.payment_status == 'paid'
    ).scalar() or 0
    
    recent_appointments = Appointment.query.order_by(Appointment.created_at.desc()).limit(10).all()
    
    return {
        'success': True,
        'data': {
            'statistics': {
                'total_users': total_users,
                'total_services': total_services,
                'total_vehicles': total_vehicles,
                'total_appointments': total_appointments,
                'active_appointments': active_appointments,
                'completed_appointments': completed_appointments,
                'total_revenue': float(total_revenue)
            },
            'recent_appointments': [appointment.to_dict() for appointment in recent_appointments]
        }
    }


def get_all_users_query():
    return User.query.all()


def get_user_by_id(user_id):
    user = User.query.get(user_id)
    
    if not user:
        raise ValueError('User not found')
    
    return user


def get_all_appointments_query(status=None):
    query = Appointment.query.options(
        joinedload(Appointment.vehicle),
        joinedload(Appointment.service),
        joinedload(Appointment.customer),
    )
    
    if status:
        query = query.filter_by(status=status)
    
    appointments = query.all()
    
    return {
        'success': True,
        'data': {
            'appointments': [appointment.to_dict() for appointment in appointments],
            'count': len(appointments)
        }
    }


def get_service_history_query():
    return ServiceHistory.query.all()


def create_notification(data):
    notification = Notification()
    notification.user_id = data['user_id']
    notification.title = data['title']
    notification.message = data['message']
    notification.notification_type = data.get('notification_type', 'info')
    notification.is_read = False
    
    db.session.add(notification)
    db.session.commit()
    return notification


def create_discount(data):
    existing = DiscountCode.query.filter_by(code=data['code'].upper()).first()
    if existing:
        raise ValueError('Discount code already exists')
    
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
        discount.start_date = datetime.now(timezone.utc)
        
    if 'end_date' in data:
        discount.end_date = datetime.fromisoformat(data['end_date'])
    
    discount.is_active = data.get('is_active', True)
    
    db.session.add(discount)
    db.session.commit()
    return discount


def get_current_user():
    try:
        from app.utils.decorators import get_current_user as _get_current_user
        return _get_current_user()
    except RuntimeError:
        return None