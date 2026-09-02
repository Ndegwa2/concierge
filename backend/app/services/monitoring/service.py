from app import db
from app.services.auth.models import User
from app.services.catalog.models import Service
from app.services.employees.models import Employee
from app.services.appointments.models import Appointment
from app.services.admin.models import AuditLog, SystemMetric, ActivityTracker
from app.utils.db_router import get_read_model_query, get_read_session
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)


def get_audit_logs_query(page=1, per_page=50, user_id=None, action=None, entity_type=None, status=None, start_date=None, end_date=None, search=None):
    query = get_read_model_query(AuditLog)
    
    if user_id:
        query = query.filter(
            db.or_(
                AuditLog.user_id == user_id,
                AuditLog.admin_id == user_id
            )
        )
    
    if action:
        query = query.filter(AuditLog.action == action)
    
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    
    if status:
        query = query.filter(AuditLog.status == status)
    
    if start_date:
        query = query.filter(AuditLog.created_at >= datetime.fromisoformat(start_date))
    
    if end_date:
        query = query.filter(AuditLog.created_at <= datetime.fromisoformat(end_date))
    
    if search:
        query = query.filter(
            db.or_(
                AuditLog.description.ilike(f'%{search}%'),
                AuditLog.entity_type.ilike(f'%{search}%')
            )
        )
    
    query = query.order_by(AuditLog.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return {
        'success': True,
        'data': {
            'audit_logs': [log.to_dict() for log in pagination.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }
    }


def get_audit_log_by_id(log_id):
    audit_log = get_read_model_query(AuditLog).get(log_id)
    
    if not audit_log:
        raise ValueError('Audit log not found')
    
    return audit_log


def get_audit_actions_query():
    actions = get_read_session().query(AuditLog.action).distinct().all()
    entity_types = get_read_session().query(AuditLog.entity_type).distinct().all()
    
    return {
        'success': True,
        'data': {
            'actions': [a[0] for a in actions if a[0]],
            'entity_types': [e[0] for e in entity_types if e[0]]
        }
    }


def get_activities_query(page=1, per_page=50, user_id=None, activity_type=None, start_date=None, end_date=None):
    query = get_read_model_query(ActivityTracker)
    
    if user_id:
        query = query.filter(
            db.or_(
                ActivityTracker.user_id == user_id,
                ActivityTracker.admin_id == user_id
            )
        )
    
    if activity_type:
        query = query.filter(ActivityTracker.activity_type == activity_type)
    
    if start_date:
        query = query.filter(ActivityTracker.created_at >= datetime.fromisoformat(start_date))
    
    if end_date:
        query = query.filter(ActivityTracker.created_at <= datetime.fromisoformat(end_date))
    
    query = query.order_by(ActivityTracker.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return {
        'success': True,
        'data': {
            'activities': [activity.to_dict() for activity in pagination.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }
    }


def get_online_users_query():
    threshold = datetime.now(timezone.utc) - timedelta(minutes=15)
    
    online_users = get_read_session().query(
        ActivityTracker.user_id,
        ActivityTracker.admin_id,
        func.max(ActivityTracker.created_at).label('last_activity')
    ).filter(
        ActivityTracker.created_at >= threshold
    ).group_by(
        ActivityTracker.user_id,
        ActivityTracker.admin_id
    ).all()
    
    result = []
    for user_activity in online_users:
        user_id = user_activity.user_id or user_activity.admin_id
        user = get_read_session().query(User).get(user_id)
        
        if user:
            result.append({
                'user_id': user_id,
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'last_activity': user_activity.last_activity.isoformat()
            })
    
    return result


def get_system_metrics_query(start_date=None, end_date=None, metric_type=None):
    end_date_dt = datetime.now(timezone.utc)
    start_date_dt = end_date_dt - timedelta(days=30)
    
    if start_date:
        start_date_dt = datetime.fromisoformat(start_date)
    if end_date:
        end_date_dt = datetime.fromisoformat(end_date)
    
    query = get_read_model_query(SystemMetric).filter(
        SystemMetric.period_start >= start_date_dt,
        SystemMetric.period_end <= end_date_dt
    )
    
    if metric_type:
        query = query.filter(SystemMetric.metric_type == metric_type)
    
    metrics = query.order_by(SystemMetric.period_start).all()
    
    return {
        'success': True,
        'data': {
            'metrics': [metric.to_dict() for metric in metrics]
        }
    }


def get_dashboard_metrics():
    today = datetime.now(timezone.utc).date()
    start_of_month = datetime(today.year, today.month, 1)
    start_of_week = datetime.now(timezone.utc) - timedelta(days=7)
    
    total_users = get_read_model_query(User).filter_by(is_active=True).count()
    new_users_this_month = get_read_model_query(User).filter(
        User.created_at >= start_of_month
    ).count()
    
    total_appointments = get_read_model_query(Appointment).count()
    appointments_this_month = get_read_model_query(Appointment).filter(
        Appointment.created_at >= start_of_month
    ).count()
    appointments_this_week = get_read_model_query(Appointment).filter(
        Appointment.created_at >= start_of_week
    ).count()
    
    status_counts = get_read_session().query(
        Appointment.status,
        func.count(Appointment.id)
    ).group_by(Appointment.status).all()
    
    status_breakdown = {status: count for status, count in status_counts}
    
    revenue_result = get_read_session().query(
        func.sum(Appointment.total_amount)
    ).filter(
        Appointment.payment_status == 'paid',
        Appointment.created_at >= start_of_month
    ).scalar()
    
    monthly_revenue = float(revenue_result) if revenue_result else 0.0
    
    total_employees = get_read_model_query(Employee).filter_by(status='active').count()
    
    total_services = get_read_model_query(Service).filter_by(is_active=True).count()
    
    activity_threshold = datetime.now(timezone.utc) - timedelta(hours=24)
    api_calls_24h = get_read_model_query(ActivityTracker).filter(
        ActivityTracker.created_at >= activity_threshold,
        ActivityTracker.activity_type == 'api_call'
    ).count()
    
    actions_24h = get_read_model_query(AuditLog).filter(
        AuditLog.created_at >= activity_threshold
    ).count()
    failed_actions_24h = get_read_model_query(AuditLog).filter(
        AuditLog.created_at >= activity_threshold,
        AuditLog.status == 'failed'
    ).count()
    
    return {
        'success': True,
        'data': {
            'users': {
                'total': total_users,
                'new_this_month': new_users_this_month
            },
            'appointments': {
                'total': total_appointments,
                'this_month': appointments_this_month,
                'this_week': appointments_this_week,
                'status_breakdown': status_breakdown
            },
            'revenue': {
                'monthly': monthly_revenue
            },
            'employees': {
                'total': total_employees
            },
            'services': {
                'total': total_services
            },
            'activity': {
                'api_calls_24h': api_calls_24h,
                'actions_24h': actions_24h,
                'failed_actions_24h': failed_actions_24h
            }
        }
    }


def get_revenue_metrics(start_date=None, end_date=None, group_by='day'):
    end_date_dt = datetime.now(timezone.utc)
    start_date_dt = end_date_dt - timedelta(days=30)
    
    if start_date:
        start_date_dt = datetime.fromisoformat(start_date)
    if end_date:
        end_date_dt = datetime.fromisoformat(end_date)
    
    if group_by == 'day':
        date_trunc = func.date(Appointment.created_at)
    elif group_by == 'week':
        date_trunc = func.date_trunc('week', Appointment.created_at)
    else:
        date_trunc = func.date_trunc('month', Appointment.created_at)
    
    revenue_data = get_read_session().query(
        date_trunc.label('date'),
        func.sum(Appointment.total_amount).label('revenue'),
        func.count(Appointment.id).label('appointments')
    ).filter(
        Appointment.payment_status == 'paid',
        Appointment.created_at >= start_date_dt,
        Appointment.created_at <= end_date_dt
    ).group_by(date_trunc).order_by(date_trunc).all()
    
    return {
        'success': True,
        'data': {
            'revenue': [
                {
                    'date': str(r.date),
                    'revenue': float(r.revenue) if r.revenue else 0.0,
                    'appointments': r.appointments
                }
                for r in revenue_data
            ]
        }
    }


def get_performance_metrics():
    threshold = datetime.now(timezone.utc) - timedelta(hours=24)
    
    performance_data = get_read_session().query(
        ActivityTracker.activity_details['endpoint'].astext.label('endpoint'),
        func.avg(ActivityTracker.duration_ms).label('avg_duration'),
        func.count(ActivityTracker.id).label('call_count'),
        func.max(ActivityTracker.duration_ms).label('max_duration'),
        func.min(ActivityTracker.duration_ms).label('min_duration')
    ).filter(
        ActivityTracker.created_at >= threshold,
        ActivityTracker.activity_type == 'api_call'
    ).group_by(
        ActivityTracker.activity_details['endpoint'].astext
    ).all()
    
    return {
        'success': True,
        'data': {
            'performance': [
                {
                    'endpoint': p.endpoint,
                    'avg_duration_ms': float(p.avg_duration) if p.avg_duration else 0,
                    'call_count': p.call_count,
                    'max_duration_ms': p.max_duration,
                    'min_duration_ms': p.min_duration
                }
                for p in performance_data if p.endpoint
            ]
        }
    }


def health_check():
    get_read_session().execute(db.text('SELECT 1'))
    
    return {
        'success': True,
        'status': 'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'services': {
            'database': 'healthy'
        }
    }


def detailed_health_check():
    health_status = {
        'database': 'healthy',
        'cache': 'unknown',
        'timestamp': datetime.now(timezone.utc).isoformat()
    }

    try:
        get_read_session().execute(db.text('SELECT 1'))
    except Exception as e:
        logger.error(str(e), exc_info=True)
        health_status['database'] = 'unhealthy'

    try:
        from app.utils.cache import get_redis
        r = get_redis()
        if r is not None:
            r.ping()
            health_status['cache'] = 'healthy'
        else:
            health_status['cache'] = 'degraded (using in-memory fallback)'
    except Exception as e:
        logger.error(str(e), exc_info=True)
        health_status['cache'] = 'unhealthy'
    
    health_status['counts'] = {
        'users': get_read_model_query(User).count(),
        'appointments': get_read_model_query(Appointment).count(),
        'services': get_read_model_query(Service).count(),
        'employees': get_read_model_query(Employee).count()
    }
    
    recent_errors = get_read_model_query(AuditLog).filter(
        AuditLog.status == 'error',
        AuditLog.created_at >= datetime.now(timezone.utc) - timedelta(hours=1)
    ).count()
    
    health_status['recent_errors_1h'] = recent_errors
    
    overall_status = 'healthy' if health_status['database'] == 'healthy' else 'unhealthy'
    
    return {
        'success': True,
        'status': overall_status,
        'data': health_status
    }