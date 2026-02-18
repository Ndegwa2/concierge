"""
Monitoring Routes for AutoConcierge

This module provides endpoints for audit logs, system metrics, and activity monitoring.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import AuditLog, SystemMetric, ActivityTracker, User, Appointment, Service, Employee
from app.utils.decorators import admin_required, get_current_user
from app.utils.audit import log_audit, track_activity
from datetime import datetime, timedelta
from sqlalchemy import func

monitoring_bp = Blueprint('monitoring', __name__)


# ============================================================
# AUDIT LOG ENDPOINTS
# ============================================================

@monitoring_bp.route('/audit-logs', methods=['GET'])
@jwt_required()
@admin_required
def get_audit_logs():
    """Get audit logs with filtering (admin only)"""
    try:
        # Query parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        user_id = request.args.get('user_id')
        action = request.args.get('action')
        entity_type = request.args.get('entity_type')
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        search = request.args.get('search')
        
        # Build query
        query = AuditLog.query
        
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
        
        # Order by most recent first
        query = query.order_by(AuditLog.created_at.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
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
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get audit logs',
            'error': str(e)
        }), 500


@monitoring_bp.route('/audit-logs/<int:log_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_audit_log(log_id):
    """Get a single audit log entry (admin only)"""
    try:
        audit_log = AuditLog.query.get(log_id)
        
        if not audit_log:
            return jsonify({
                'success': False,
                'message': 'Audit log not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': {
                'audit_log': audit_log.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get audit log',
            'error': str(e)
        }), 500


@monitoring_bp.route('/audit-logs/actions', methods=['GET'])
@jwt_required()
@admin_required
def get_audit_actions():
    """Get list of available audit actions (admin only)"""
    try:
        actions = db.session.query(AuditLog.action).distinct().all()
        entity_types = db.session.query(AuditLog.entity_type).distinct().all()
        
        return jsonify({
            'success': True,
            'data': {
                'actions': [a[0] for a in actions if a[0]],
                'entity_types': [e[0] for e in entity_types if e[0]]
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get audit actions',
            'error': str(e)
        }), 500


# ============================================================
# ACTIVITY TRACKING ENDPOINTS
# ============================================================

@monitoring_bp.route('/activities', methods=['GET'])
@jwt_required()
@admin_required
def get_activities():
    """Get user activities with filtering (admin only)"""
    try:
        # Query parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        user_id = request.args.get('user_id')
        activity_type = request.args.get('activity_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build query
        query = ActivityTracker.query
        
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
        
        # Order by most recent first
        query = query.order_by(ActivityTracker.created_at.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
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
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get activities',
            'error': str(e)
        }), 500


@monitoring_bp.route('/activities/online-users', methods=['GET'])
@jwt_required()
@admin_required
def get_online_users():
    """Get currently online users (active in last 15 minutes)"""
    try:
        threshold = datetime.utcnow() - timedelta(minutes=15)
        
        # Get unique users with recent activity
        online_users = db.session.query(
            ActivityTracker.user_id,
            ActivityTracker.admin_id,
            func.max(ActivityTracker.created_at).label('last_activity')
        ).filter(
            ActivityTracker.created_at >= threshold
        ).group_by(
            ActivityTracker.user_id,
            ActivityTracker.admin_id
        ).all()
        
        # Enrich with user details
        result = []
        for user_activity in online_users:
            user_id = user_activity.user_id or user_activity.admin_id
            is_admin = user_activity.admin_id is not None
            
            if is_admin:
                user = db.session.query(User).get(user_id)
            else:
                user = db.session.query(User).get(user_id)
            
            if user:
                result.append({
                    'user_id': user_id,
                    'name': user.name,
                    'email': user.email,
                    'role': 'admin' if is_admin else user.role,
                    'last_activity': user_activity.last_activity.isoformat()
                })
        
        return jsonify({
            'success': True,
            'data': {
                'online_users': result,
                'count': len(result)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get online users',
            'error': str(e)
        }), 500


# ============================================================
# SYSTEM METRICS ENDPOINTS
# ============================================================

@monitoring_bp.route('/metrics', methods=['GET'])
@jwt_required()
@admin_required
def get_system_metrics():
    """Get system metrics (admin only)"""
    try:
        # Get date range (default to last 30 days)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        metric_type = request.args.get('metric_type')
        
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str)
        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str)
        
        query = SystemMetric.query.filter(
            SystemMetric.period_start >= start_date,
            SystemMetric.period_end <= end_date
        )
        
        if metric_type:
            query = query.filter(SystemMetric.metric_type == metric_type)
        
        metrics = query.order_by(SystemMetric.period_start).all()
        
        return jsonify({
            'success': True,
            'data': {
                'metrics': [metric.to_dict() for metric in metrics]
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get metrics',
            'error': str(e)
        }), 500


@monitoring_bp.route('/metrics/dashboard', methods=['GET'])
@jwt_required()
@admin_required
def get_dashboard_metrics():
    """Get dashboard statistics (admin only)"""
    try:
        today = datetime.utcnow().date()
        start_of_month = datetime(today.year, today.month, 1)
        start_of_week = datetime.utcnow() - timedelta(days=7)
        
        # User statistics
        total_users = User.query.filter_by(is_active=True).count()
        new_users_this_month = User.query.filter(
            User.created_at >= start_of_month
        ).count()
        
        # Appointment statistics
        total_appointments = Appointment.query.count()
        appointments_this_month = Appointment.query.filter(
            Appointment.created_at >= start_of_month
        ).count()
        appointments_this_week = Appointment.query.filter(
            Appointment.created_at >= start_of_week
        ).count()
        
        # Status breakdown
        status_counts = db.session.query(
            Appointment.status,
            func.count(Appointment.id)
        ).group_by(Appointment.status).all()
        
        status_breakdown = {status: count for status, count in status_counts}
        
        # Revenue statistics
        revenue_result = db.session.query(
            func.sum(Appointment.total_amount)
        ).filter(
            Appointment.payment_status == 'paid',
            Appointment.created_at >= start_of_month
        ).scalar()
        
        monthly_revenue = float(revenue_result) if revenue_result else 0.0
        
        # Employee statistics
        total_employees = Employee.query.filter_by(status='active').count()
        
        # Service statistics
        total_services = Service.query.filter_by(is_active=True).count()
        
        # Activity statistics (last 24 hours)
        activity_threshold = datetime.utcnow() - timedelta(hours=24)
        api_calls_24h = ActivityTracker.query.filter(
            ActivityTracker.created_at >= activity_threshold,
            ActivityTracker.activity_type == 'api_call'
        ).count()
        
        # Audit log statistics (last 24 hours)
        actions_24h = AuditLog.query.filter(
            AuditLog.created_at >= activity_threshold
        ).count()
        failed_actions_24h = AuditLog.query.filter(
            AuditLog.created_at >= activity_threshold,
            AuditLog.status == 'failed'
        ).count()
        
        return jsonify({
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
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get dashboard metrics',
            'error': str(e)
        }), 500


@monitoring_bp.route('/metrics/revenue', methods=['GET'])
@jwt_required()
@admin_required
def get_revenue_metrics():
    """Get revenue metrics over time (admin only)"""
    try:
        # Get date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        group_by = request.args.get('group_by', 'day')  # day, week, month
        
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str)
        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str)
        
        # Query revenue grouped by date
        if group_by == 'day':
            date_trunc = func.date(Appointment.created_at)
        elif group_by == 'week':
            date_trunc = func.date_trunc('week', Appointment.created_at)
        else:
            date_trunc = func.date_trunc('month', Appointment.created_at)
        
        revenue_data = db.session.query(
            date_trunc.label('date'),
            func.sum(Appointment.total_amount).label('revenue'),
            func.count(Appointment.id).label('appointments')
        ).filter(
            Appointment.payment_status == 'paid',
            Appointment.created_at >= start_date,
            Appointment.created_at <= end_date
        ).group_by(date_trunc).order_by(date_trunc).all()
        
        return jsonify({
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
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get revenue metrics',
            'error': str(e)
        }), 500


@monitoring_bp.route('/metrics/performance', methods=['GET'])
@jwt_required()
@admin_required
def get_performance_metrics():
    """Get API performance metrics (admin only)"""
    try:
        # Get average response times by endpoint
        threshold = datetime.utcnow() - timedelta(hours=24)
        
        performance_data = db.session.query(
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
        
        return jsonify({
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
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get performance metrics',
            'error': str(e)
        }), 500


# ============================================================
# HEALTH CHECK ENDPOINTS
# ============================================================

@monitoring_bp.route('/health', methods=['GET'])
def health_check():
    """Public health check endpoint"""
    try:
        # Check database connection
        db.session.execute(db.text('SELECT 1'))
        
        return jsonify({
            'success': True,
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'services': {
                'database': 'healthy'
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e)
        }), 503


@monitoring_bp.route('/health/detailed', methods=['GET'])
@jwt_required()
@admin_required
def detailed_health_check():
    """Detailed health check for admins"""
    try:
        health_status = {
            'database': 'healthy',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Check database
        try:
            db.session.execute(db.text('SELECT 1'))
        except Exception as e:
            health_status['database'] = f'unhealthy: {str(e)}'
        
        # Get counts
        health_status['counts'] = {
            'users': User.query.count(),
            'appointments': Appointment.query.count(),
            'services': Service.query.count(),
            'employees': Employee.query.count()
        }
        
        # Get recent errors
        recent_errors = AuditLog.query.filter(
            AuditLog.status == 'error',
            AuditLog.created_at >= datetime.utcnow() - timedelta(hours=1)
        ).count()
        
        health_status['recent_errors_1h'] = recent_errors
        
        overall_status = 'healthy' if health_status['database'] == 'healthy' else 'unhealthy'
        
        return jsonify({
            'success': True,
            'status': overall_status,
            'data': health_status
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 503