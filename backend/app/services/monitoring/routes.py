from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.services.auth.models import User
from app.services.catalog.models import Service
from app.services.employees.models import Employee
from app.services.appointments.models import Appointment
from app.services.admin.models import AuditLog, SystemMetric, ActivityTracker
from app.utils.decorators import admin_required, get_current_user
from app.utils.audit import log_audit, track_activity
from .service import (
    get_audit_logs_query,
    get_audit_log_by_id,
    get_audit_actions_query,
    get_activities_query,
    get_online_users_query,
    get_system_metrics_query,
    get_dashboard_metrics,
    get_revenue_metrics,
    get_performance_metrics,
    health_check as svc_health_check,
    detailed_health_check as svc_detailed_health_check,
)
from datetime import datetime, timedelta, timezone

monitoring_bp = Blueprint('monitoring', __name__)


@monitoring_bp.route('/audit-logs', methods=['GET'])
@jwt_required()
@admin_required
def get_audit_logs():
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        
        result = get_audit_logs_query(
            page=page,
            per_page=per_page,
            user_id=request.args.get('user_id'),
            action=request.args.get('action'),
            entity_type=request.args.get('entity_type'),
            status=request.args.get('status'),
            start_date=request.args.get('start_date'),
            end_date=request.args.get('end_date'),
            search=request.args.get('search'),
        )
        
        return jsonify(result), 200
        
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
    try:
        log = get_audit_log_by_id(log_id)
        
        return jsonify({
            'success': True,
            'data': {
                'audit_log': log.to_dict()
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
    try:
        result = get_audit_actions_query()
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get audit actions',
            'error': str(e)
        }), 500


@monitoring_bp.route('/activities', methods=['GET'])
@jwt_required()
@admin_required
def get_activities():
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        
        result = get_activities_query(
            page=page,
            per_page=per_page,
            user_id=request.args.get('user_id'),
            activity_type=request.args.get('activity_type'),
            start_date=request.args.get('start_date'),
            end_date=request.args.get('end_date'),
        )
        
        return jsonify(result), 200
        
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
    try:
        online_users = get_online_users_query()
        
        return jsonify({
            'success': True,
            'data': {
                'online_users': online_users,
                'count': len(online_users)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get online users',
            'error': str(e)
        }), 500


@monitoring_bp.route('/metrics', methods=['GET'])
@jwt_required()
@admin_required
def get_system_metrics():
    try:
        result = get_system_metrics_query(
            start_date=request.args.get('start_date'),
            end_date=request.args.get('end_date'),
            metric_type=request.args.get('metric_type'),
        )
        
        return jsonify(result), 200
        
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
    try:
        result = get_dashboard_metrics()
        return jsonify(result), 200
        
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
    try:
        result = get_revenue_metrics(
            start_date=request.args.get('start_date'),
            end_date=request.args.get('end_date'),
            group_by=request.args.get('group_by', 'day'),
        )
        
        return jsonify(result), 200
        
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
    try:
        result = get_performance_metrics()
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get performance metrics',
            'error': str(e)
        }), 500


@monitoring_bp.route('/health', methods=['GET'])
def health_check():
    try:
        result = svc_health_check()
        status_code = 200 if result['success'] else 503
        return jsonify(result), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'error': str(e)
        }), 503


@monitoring_bp.route('/health/detailed', methods=['GET'])
@jwt_required()
@admin_required
def detailed_health_check():
    try:
        result = svc_detailed_health_check()
        status_code = 200 if result['success'] else 503
        return jsonify(result), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 503