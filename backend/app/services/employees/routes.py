from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
from app import db
from app.services.auth.models import User
from app.services.employees.models import Employee, EmployeeDocument, EmployeeTimeLog, TimeOffRequest, IssueReport
from app.services.appointments.models import Appointment, Assignment
from app.services.catalog.models import Service
from app.utils.decorators import admin_required, employee_required, role_required, get_current_user
from app.utils.cache import cache_get, cache_set, cache_delete_pattern, REDIS_SHORT_TTL
from .service import (
    register_employee as svc_register_employee,
    get_all_employees_query,
    get_employee_by_id,
    update_employee as svc_update_employee,
    deactivate_employee as svc_deactivate_employee,
    update_employee_status as svc_update_employee_status,
    upload_employee_document as svc_upload_employee_document,
    get_employee_documents_query,
    delete_employee_document as svc_delete_employee_document,
    export_employees_csv_query,
    update_employee_account_status as svc_update_employee_account_status,
    get_departments_query,
    get_managers_query,
    assign_employee_to_appointment as svc_assign_employee_to_appointment,
    get_employee_dashboard,
    get_my_assignments_query,
    update_assignment_status as svc_update_assignment_status,
    get_my_schedule_query,
    get_my_profile,
    update_my_profile as svc_update_my_profile,
    clock_in_out as svc_clock_in_out,
    get_time_logs_query,
    request_time_off as svc_request_time_off,
    get_time_off_requests_query,
    report_issue as svc_report_issue,
    get_issue_reports_query,
    download_employee_document_file,
)
from datetime import datetime, timezone, timedelta
from io import StringIO
import csv
import os

employees_bp = Blueprint('employees', __name__)


@employees_bp.route('/admin/employees', methods=['POST'])
@jwt_required()
@admin_required
def register_employee():
    try:
        data = request.get_json()
        employee = svc_register_employee(data)
        
        return jsonify({
            'success': True,
            'message': 'Employee registered successfully',
            'data': {
                'user': employee.user.to_dict(include_employee=True),
                'employee_id': employee.employee_id
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to register employee',
            'error': str(e)
        }), 500


@employees_bp.route('/admin/employees', methods=['GET'])
@jwt_required()
@admin_required
def get_all_employees():
    try:
        status = request.args.get('status')
        location = request.args.get('location')
        search = request.args.get('search')
        
        employees = get_all_employees_query(status, location, search)
        
        return jsonify({
            'success': True,
            'data': {
                'employees': [
                    {
                        **emp.user.to_dict(),
                        'employee': emp.to_dict()
                    } for emp in employees
                ],
                'count': len(employees)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get employees',
            'error': str(e)
        }), 500


@employees_bp.route('/admin/employees/<int:employee_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_employee(employee_id):
    try:
        employee = get_employee_by_id(employee_id)
        
        return jsonify({
            'success': True,
            'data': {
                'user': employee.user.to_dict(include_employee=True),
                'employee': employee.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get employee',
            'error': str(e)
        }), 500


@employees_bp.route('/admin/employees/<int:employee_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_employee(employee_id):
    try:
        data = request.get_json()
        user = svc_update_employee(employee_id, data)
        
        return jsonify({
            'success': True,
            'message': 'Employee updated successfully',
            'data': {
                'user': user.to_dict(include_employee=True)
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update employee',
            'error': str(e)
        }), 500


@employees_bp.route('/admin/employees/<int:employee_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def deactivate_employee(employee_id):
    try:
        svc_deactivate_employee(employee_id)
        
        return jsonify({
            'success': True,
            'message': 'Employee deactivated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to deactivate employee',
            'error': str(e)
        }), 500


@employees_bp.route('/admin/employees/<int:employee_id>/status', methods=['PUT'])
@jwt_required()
@admin_required
def update_employee_status(employee_id):
    try:
        data = request.get_json()
        employee = svc_update_employee_status(employee_id, data)
        
        return jsonify({
            'success': True,
            'message': 'Employee status updated',
            'data': {
                'status': employee.status
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update status',
            'error': str(e)
        }), 500


@employees_bp.route('/admin/employees/<int:employee_id>/documents', methods=['POST'])
@jwt_required()
@admin_required
def upload_employee_document(employee_id):
    try:
        file = request.files['file']
        doc_type = request.form.get('doc_type', 'other')
        document_name = request.form.get('document_name', file.filename)
        is_verified = request.form.get('is_verified', 'false').lower() == 'true'
        
        document = svc_upload_employee_document(employee_id, file, doc_type, document_name, is_verified)
        
        return jsonify({
            'success': True,
            'message': 'Document uploaded successfully',
            'data': {
                'document': document.to_dict()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to upload document',
            'error': str(e)
        }), 500


@employees_bp.route('/admin/employees/<int:employee_id>/documents', methods=['GET'])
@jwt_required()
@admin_required
def get_employee_documents(employee_id):
    try:
        documents = get_employee_documents_query(employee_id)
        
        return jsonify({
            'success': True,
            'data': {
                'documents': [doc.to_dict() for doc in documents],
                'count': len(documents)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get documents',
            'error': str(e)
        }), 500


@employees_bp.route('/admin/employees/<int:employee_id>/documents/<int:doc_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_employee_document(employee_id, doc_id):
    try:
        svc_delete_employee_document(employee_id, doc_id)
        
        return jsonify({
            'success': True,
            'message': 'Document deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to delete document',
            'error': str(e)
        }), 500


@employees_bp.route('/admin/employees/export/csv', methods=['GET'])
@jwt_required()
@admin_required
def export_employees_csv():
    try:
        status = request.args.get('status')
        location = request.args.get('location')
        search = request.args.get('search')
        
        employees = export_employees_csv_query(status, location, search)
        
        output = StringIO()
        writer = csv.writer(output)
        
        writer.writerow([
            'Employee ID', 'Name', 'Email', 'Phone', 'Address',
            'Location', 'Department', 'Title', 'Employment Type',
            'Start Date', 'Status', 'Account Status', 'Rating',
            'Total Services', 'Base Salary', 'Hourly Rate',
            'Pay Frequency', 'Bank Name', 'Health Plan Tier'
        ])
        
        for emp in employees:
            user = emp.user
            writer.writerow([
                emp.employee_id,
                user.name,
                user.email,
                user.phone or '',
                user.address or '',
                emp.location or '',
                emp.department or '',
                emp.title or '',
                emp.employment_type or '',
                emp.start_date.strftime('%Y-%m-%d') if emp.start_date else '',
                emp.status or '',
                emp.account_status or '',
                emp.rating or 0,
                emp.total_services or 0,
                emp.base_salary or '',
                emp.hourly_rate or '',
                emp.pay_frequency or '',
                emp.bank_name or '',
                emp.health_plan_tier or ''
            ])
        
        csv_data = output.getvalue()
        
        return Response(
            csv_data,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename=employees_export_{datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")}.csv'
            }
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to export employees',
            'error': str(e)
        }), 500


@employees_bp.route('/admin/employees/<int:employee_id>/account-status', methods=['PUT'])
@jwt_required()
@admin_required
def update_employee_account_status(employee_id):
    try:
        data = request.get_json()
        employee = svc_update_employee_account_status(employee_id, data)
        
        return jsonify({
            'success': True,
            'message': 'Employee account status updated',
            'data': {
                'account_status': employee.account_status
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update account status',
            'error': str(e)
        }), 500


@employees_bp.route('/admin/employees/documents/<int:document_id>/download', methods=['GET'])
@jwt_required()
@admin_required
def download_employee_document(document_id):
    try:
        file_path = download_employee_document_file(document_id)
        
        from flask import send_file
        document = EmployeeDocument.query.get(document_id)
        return send_file(
            file_path,
            as_attachment=True,
            download_name=document.file_name or document.document_name
        )

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to download document',
            'error': str(e)
        }), 500


@employees_bp.route('/admin/departments', methods=['GET'])
@jwt_required()
@admin_required
def get_departments():
    try:
        departments = get_departments_query()
        
        return jsonify({
            'success': True,
            'data': {
                'departments': departments
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get departments',
            'error': str(e)
        }), 500


@employees_bp.route('/admin/managers', methods=['GET'])
@jwt_required()
@admin_required
def get_managers():
    try:
        managers = get_managers_query()
        
        if not managers:
            return jsonify({
                'success': True,
                'data': {
                    'managers': [],
                    'message': 'No managers configured. Set employee titles to Manager/Supervisor to populate.'
                }
            }), 200

        return jsonify({
            'success': True,
            'data': {
                'managers': managers
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get managers',
            'error': str(e)
        }), 500


@employees_bp.route('/admin/appointments/<int:appointment_id>/assign', methods=['POST'])
@jwt_required()
@admin_required
def assign_employee_to_appointment(appointment_id):
    try:
        assignment = svc_assign_employee_to_appointment(appointment_id)
        
        return jsonify({
            'success': True,
            'message': 'Employee assigned successfully',
            'data': {
                'assignment': assignment.to_dict()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to assign employee',
            'error': str(e)
        }), 500


@employees_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@employee_required
def get_employee_dashboard():
    try:
        current_user = get_current_user()
        cache_key = f"employee:dashboard:{current_user['id']}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        result = get_employee_dashboard(current_user)

        cache_set(cache_key, result, REDIS_SHORT_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get dashboard data',
            'error': str(e)
        }), 500


@employees_bp.route('/assignments', methods=['GET'])
@jwt_required()
@employee_required
def get_my_assignments():
    try:
        current_user = get_current_user()
        
        cache_key = f"employee:assignments:{current_user['id']}:{request.args.get('status') or 'all'}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        assignments = get_my_assignments_query(current_user)
        
        result = {
            'success': True,
            'data': {
                'assignments': assignments,
                'count': len(assignments)
            }
        }

        cache_set(cache_key, result, REDIS_SHORT_TTL)

        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get assignments',
            'error': str(e)
        }), 500


@employees_bp.route('/assignments/<int:assignment_id>', methods=['PUT'])
@jwt_required()
@employee_required
def update_assignment_status(assignment_id):
    try:
        current_user = get_current_user()
        data = request.get_json()
        
        assignment = svc_update_assignment_status(assignment_id, current_user, data)

        cache_delete_pattern(f"employee:assignments:{current_user['id']}:*")
        cache_delete_pattern(f"employee:dashboard:{current_user['id']}")
        cache_delete_pattern("admin:dashboard:*")
        cache_delete_pattern("appointments:*")
        
        return jsonify({
            'success': True,
            'message': 'Assignment status updated',
            'data': {
                'assignment': assignment.to_dict()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update assignment',
            'error': str(e)
        }), 500


@employees_bp.route('/schedule', methods=['GET'])
@jwt_required()
@employee_required
def get_my_schedule():
    try:
        current_user = get_current_user()
        
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        schedule = get_my_schedule_query(current_user, start_date, end_date)
        
        return jsonify({
            'success': True,
            'data': {
                'schedule': schedule,
                'employee': get_my_profile(current_user)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get schedule',
            'error': str(e)
        }), 500


@employees_bp.route('/profile', methods=['GET'])
@jwt_required()
@employee_required
def get_my_profile():
    try:
        current_user = get_current_user()
        employee = get_my_profile(current_user)
        
        return jsonify({
            'success': True,
            'data': {
                'user': employee.user.to_dict(include_employee=True)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get profile',
            'error': str(e)
        }), 500


@employees_bp.route('/profile', methods=['PUT'])
@jwt_required()
@employee_required
def update_my_profile():
    try:
        current_user = get_current_user()
        data = request.get_json()
        user = svc_update_my_profile(current_user, data)
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'data': {
                'user': user.to_dict(include_employee=True)
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update profile',
            'error': str(e)
        }), 500


@employees_bp.route('/clock', methods=['POST'])
@jwt_required()
@employee_required
def clock_in_out():
    try:
        current_user = get_current_user()
        data = request.get_json()
        action = data.get('action')
        
        if action not in ('in', 'out'):
            return jsonify({
                'success': False,
                'message': "Action must be 'in' or 'out'"
            }), 400

        result = svc_clock_in_out(current_user, action, data.get('notes', ''))
        
        cache_delete_pattern(f"employee:time_logs:{result['time_log'].employee_id}:*")

        return jsonify({
            'success': True,
            'message': f'Clocked {action} successfully',
            'data': result
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to clock in/out',
            'error': str(e)
        }), 500


@employees_bp.route('/time-logs', methods=['GET'])
@jwt_required()
@employee_required
def get_time_logs():
    try:
        current_user = get_current_user()
        result = get_time_logs_query(current_user)
        
        return jsonify({
            'success': True,
            'data': result
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get time logs',
            'error': str(e)
        }), 500


@employees_bp.route('/time-off', methods=['POST'])
@jwt_required()
@employee_required
def request_time_off():
    try:
        current_user = get_current_user()
        data = request.get_json()
        
        time_off = svc_request_time_off(current_user, data)
        
        cache_delete_pattern(f"employee:time_off:{time_off.employee_id}:*")

        return jsonify({
            'success': True,
            'message': 'Time-off request submitted successfully',
            'data': {
                'time_off_request': time_off.to_dict()
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to submit time-off request',
            'error': str(e)
        }), 500


@employees_bp.route('/time-off', methods=['GET'])
@jwt_required()
@employee_required
def get_time_off_requests():
    try:
        current_user = get_current_user()
        requests = get_time_off_requests_query(current_user)
        
        return jsonify({
            'success': True,
            'data': {
                'requests': [req.to_dict() for req in requests],
                'count': len(requests),
                'pending_count': sum(1 for r in requests if r.status == 'pending')
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get time-off requests',
            'error': str(e)
        }), 500


@employees_bp.route('/issues', methods=['POST'])
@jwt_required()
@employee_required
def report_issue():
    try:
        current_user = get_current_user()
        data = request.get_json()
        
        issue = svc_report_issue(current_user, data)
        
        cache_delete_pattern(f"employee:issues:{issue.employee_id}:*")

        return jsonify({
            'success': True,
            'message': 'Issue reported successfully',
            'data': {
                'issue': issue.to_dict()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to report issue',
            'error': str(e)
        }), 500


@employees_bp.route('/issues', methods=['GET'])
@jwt_required()
@employee_required
def get_issue_reports():
    try:
        current_user = get_current_user()
        issues = get_issue_reports_query(current_user)
        
        return jsonify({
            'success': True,
            'data': {
                'issues': [issue.to_dict() for issue in issues],
                'count': len(issues),
                'open_count': sum(1 for i in issues if i.status in ('open', 'in-progress'))
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get issues',
            'error': str(e)
        }), 500