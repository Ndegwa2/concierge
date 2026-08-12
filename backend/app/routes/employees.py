"""
Employee Routes for AutoConcierge

This module handles employee management and employee portal endpoints.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import User, Employee, EmployeeDocument, EmployeeTimeLog, TimeOffRequest, IssueReport, Appointment, Assignment, Service
from app.utils.decorators import admin_required, employee_required, role_required, get_current_user
from app.utils.cache import cache_get, cache_set, cache_delete_pattern, REDIS_SHORT_TTL
from datetime import datetime, timezone, timedelta
from io import StringIO
import csv
import os

employees_bp = Blueprint('employees', __name__)


# ============================================================
# ADMIN ENDPOINTS - Employee Management
# ============================================================

@employees_bp.route('/admin/employees', methods=['POST'])
@jwt_required()
@admin_required
def register_employee():
    """Register a new employee (admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email', 'password', 'location']
        if not all(key in data for key in required_fields):
            return jsonify({
                'success': False,
                'message': 'Missing required fields',
                'required': required_fields
            }), 400
        
        # Check if email already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({
                'success': False,
                'message': 'Email already registered'
            }), 409
        
        # Create user account with employee role
        user = User()
        user.name = data['name']
        user.email = data['email']
        user.set_password(data['password'])
        user.phone = data.get('phone', '')
        user.address = data.get('address', '')
        user.role = 'employee'
        user.is_active = True
        
        db.session.add(user)
        db.session.flush()  # Get user.id
        
         # Create employee profile
        employee = Employee()
        employee.user_id = user.id
        employee.location = data['location']
        employee.specialties = data.get('specialties', [])
        employee.status = data.get('status', 'active')
        
        # Employment details
        employee.department = data.get('department', 'Operations')
        employee.title = data.get('title', 'Concierge')
        employee.employment_type = data.get('employment_type', 'full_time')
        if data.get('start_date'):
            employee.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        employee.account_status = data.get('account_status', 'onboarding')
        
        # Compensation & benefits
        if 'base_salary' in data:
            employee.base_salary = data['base_salary']
        if 'hourly_rate' in data:
            employee.hourly_rate = data['hourly_rate']
        if 'pay_frequency' in data:
            employee.pay_frequency = data['pay_frequency']
        if 'bank_account_number' in data:
            employee.bank_account_number = data['bank_account_number']
        if 'bank_name' in data:
            employee.bank_name = data['bank_name']
        if 'health_plan_tier' in data:
            employee.health_plan_tier = data['health_plan_tier']
        
        db.session.add(employee)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Employee registered successfully',
            'data': {
                'user': user.to_dict(include_employee=True),
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
    """Get all employees (admin only)"""
    try:
        # Query parameters
        status = request.args.get('status')
        location = request.args.get('location')
        search = request.args.get('search')
        
        # Build query
        query = Employee.query.join(User)
        
        if status:
            query = query.filter(Employee.status == status)
        
        if location:
            query = query.filter(Employee.location.ilike(f'%{location}%'))
        
        if search:
            query = query.filter(
                db.or_(
                    User.name.ilike(f'%{search}%'),
                    Employee.employee_id.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%')
                )
            )
        
        employees = query.all()
        
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
    """Get a single employee by ID (admin only)"""
    try:
        employee = Employee.query.get(employee_id)
        
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee not found'
            }), 404
        
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
    """Update an employee (admin only)"""
    try:
        employee = Employee.query.get(employee_id)
        
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee not found'
            }), 404
        
        data = request.get_json()
        user = employee.user
        
        # Update user fields
        if 'name' in data:
            user.name = data['name']
        
        if 'email' in data:
            # Check if email is taken by another user
            existing = User.query.filter_by(email=data['email']).first()
            if existing and existing.id != user.id:
                return jsonify({
                    'success': False,
                    'message': 'Email already in use'
                }), 409
            user.email = data['email']
        
        if 'phone' in data:
            user.phone = data['phone']
        
        if 'address' in data:
            user.address = data['address']
        
        if 'password' in data:
            user.set_password(data['password'])
        
         # Update employee fields
        if 'location' in data:
            employee.location = data['location']
        
        if 'specialties' in data:
            employee.specialties = data['specialties']
        
        if 'status' in data:
            employee.status = data['status']
        
        # Employment details
        if 'department' in data:
            employee.department = data['department']
        
        if 'title' in data:
            employee.title = data['title']
        
        if 'employment_type' in data:
            employee.employment_type = data['employment_type']
        
        if 'start_date' in data:
            employee.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00')) if data['start_date'] else employee.start_date
        
        if 'manager_id' in data:
            employee.manager_id = data['manager_id']
        
        # Account status / onboarding / offboarding
        if 'account_status' in data:
            employee.account_status = data['account_status']
        
        if 'exit_notes' in data:
            employee.exit_notes = data['exit_notes']
        
        if 'offboarding_checklist_completed' in data:
            employee.offboarding_checklist_completed = data['offboarding_checklist_completed']
        
        # Compensation & benefits
        if 'base_salary' in data:
            employee.base_salary = data['base_salary']
        
        if 'hourly_rate' in data:
            employee.hourly_rate = data['hourly_rate']
        
        if 'pay_frequency' in data:
            employee.pay_frequency = data['pay_frequency']
        
        if 'bank_account_number' in data:
            employee.bank_account_number = data['bank_account_number']
        
        if 'bank_name' in data:
            employee.bank_name = data['bank_name']
        
        if 'health_plan_tier' in data:
            employee.health_plan_tier = data['health_plan_tier']
        
        db.session.commit()
        
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
    """Deactivate an employee (admin only)"""
    try:
        employee = Employee.query.get(employee_id)
        
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee not found'
            }), 404
        
        # Soft delete - deactivate user account
        employee.user.is_active = False
        employee.status = 'suspended'
        
        db.session.commit()
        
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
    """Update employee status (admin only)"""
    try:
        employee = Employee.query.get(employee_id)
        
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee not found'
            }), 404
        
        data = request.get_json()
        
        if 'status' not in data:
            return jsonify({
                'success': False,
                'message': 'Status is required'
            }), 400
        
        valid_statuses = ['active', 'off-duty', 'suspended']
        if data['status'] not in valid_statuses:
            return jsonify({
                'success': False,
                'message': f'Invalid status. Valid options: {valid_statuses}'
            }), 400
        
        employee.status = data['status']
        
        # Also update user active status
        if data['status'] == 'suspended':
            employee.user.is_active = False
        else:
            employee.user.is_active = True
        
        db.session.commit()
        
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


# ============================================================
# ADMIN ENDPOINTS - Employee Documents
# ============================================================

@employees_bp.route('/admin/employees/<int:employee_id>/documents', methods=['POST'])
@jwt_required()
@admin_required
def upload_employee_document(employee_id):
    """Upload a document for an employee (admin only)"""
    try:
        employee = Employee.query.get(employee_id)
        
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee not found'
            }), 404
        
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        doc_type = request.form.get('doc_type', 'other')
        document_name = request.form.get('document_name', file.filename)
        is_verified = request.form.get('is_verified', 'false').lower() == 'true'
        
        # Save file to a secure location
        upload_dir = os.path.join(os.getcwd(), 'uploads', 'employee_documents')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        ext = os.path.splitext(file.filename)[1]
        unique_filename = f"doc_{employee_id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}{ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)
        
        file_size = os.path.getsize(file_path)
        
        document = EmployeeDocument()
        document.employee_id = employee.id
        document.document_name = document_name
        document.doc_type = doc_type
        document.file_path = unique_filename
        document.file_name = file.filename
        document.file_size = file_size
        document.mime_type = file.mimetype
        document.is_verified = is_verified
        document.verified_at = datetime.now(timezone.utc) if is_verified else None
        
        current_user = get_current_user()
        if current_user:
            document.uploaded_by = current_user.get('id')
        
        db.session.add(document)
        db.session.commit()
        
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
    """Get all documents for an employee (admin only)"""
    try:
        employee = Employee.query.get(employee_id)
        
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee not found'
            }), 404
        
        documents = EmployeeDocument.query.filter_by(employee_id=employee.id).all()
        
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
    """Delete a document for an employee (admin only)"""
    try:
        document = EmployeeDocument.query.get(doc_id)
        
        if not document or document.employee_id != employee_id:
            return jsonify({
                'success': False,
                'message': 'Document not found'
            }), 404
        
        # Delete file from filesystem
        if document.file_path:
            upload_dir = os.path.join(os.getcwd(), 'uploads', 'employee_documents')
            file_path = os.path.join(upload_dir, document.file_path)
            if os.path.exists(file_path):
                os.remove(file_path)
        
        db.session.delete(document)
        db.session.commit()
        
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


# ============================================================
# ADMIN ENDPOINTS - Employee Export
# ============================================================

@employees_bp.route('/admin/employees/export/csv', methods=['GET'])
@jwt_required()
@admin_required
def export_employees_csv():
    """Export all employees as CSV (admin only)"""
    try:
        status = request.args.get('status')
        location = request.args.get('location')
        search = request.args.get('search')
        
        query = Employee.query.join(User)
        
        if status:
            query = query.filter(Employee.status == status)
        
        if location:
            query = query.filter(Employee.location.ilike(f'%{location}%'))
        
        if search:
            query = query.filter(
                db.or_(
                    User.name.ilike(f'%{search}%'),
                    Employee.employee_id.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%')
                )
            )
        
        employees = query.all()
        
        # Build CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            'Employee ID', 'Name', 'Email', 'Phone', 'Address',
            'Location', 'Department', 'Title', 'Employment Type',
            'Start Date', 'Status', 'Account Status', 'Rating',
            'Total Services', 'Base Salary', 'Hourly Rate',
            'Pay Frequency', 'Bank Name', 'Health Plan Tier'
        ])
        
        # Rows
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
        
        # Return as downloadable attachment
        from flask import Response
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
    """Update employee account status for onboarding / offboarding (admin only)"""
    try:
        employee = Employee.query.get(employee_id)

        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee not found'
            }), 404

        data = request.get_json()

        if 'account_status' not in data:
            return jsonify({
                'success': False,
                'message': 'account_status is required'
            }), 400

        valid_statuses = ['active', 'onboarding', 'suspended', 'terminated']
        if data['account_status'] not in valid_statuses:
            return jsonify({
                'success': False,
                'message': f'Invalid account_status. Valid options: {valid_statuses}'
            }), 400

        employee.account_status = data['account_status']

        if 'exit_notes' in data:
            employee.exit_notes = data['exit_notes']

        if 'offboarding_checklist_completed' in data:
            employee.offboarding_checklist_completed = data['offboarding_checklist_completed']

        # Sync user active flag
        if data['account_status'] == 'terminated':
            employee.user.is_active = False
            employee.status = 'suspended'
        elif data['account_status'] == 'suspended':
            employee.user.is_active = False
        else:
            employee.user.is_active = True

        db.session.commit()

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
    """Download a document file (admin only)"""
    try:
        document = EmployeeDocument.query.get(document_id)

        if not document:
            return jsonify({
                'success': False,
                'message': 'Document not found'
            }), 404

        upload_dir = os.path.join(os.getcwd(), 'uploads', 'employee_documents')
        file_path = os.path.join(upload_dir, document.file_path)

        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'message': 'File not found on disk'
            }), 404

        from flask import send_file
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
    """Get list of all departments (admin only)"""
    try:
        departments = db.session.query(Employee.department).filter(Employee.department.isnot(None)).distinct().all()
        dept_list = [d[0] for d in departments]
        # Ensure defaults are present
        defaults = ['Operations', 'Customer Service', 'Maintenance', 'Detailing', 'Administration']
        for d in defaults:
            if d not in dept_list:
                dept_list.append(d)
        return jsonify({
            'success': True,
            'data': {
                'departments': dept_list
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
    """Get list of manager / supervisor employees (admin only)"""
    try:
        employees = Employee.query.filter(Employee.title.in_(['Manager', 'Supervisor', 'Team Lead', 'Head of Operations'])).all()
        managers = [
            {
                'id': emp.id,
                'name': emp.user.name,
                'employee_id': emp.employee_id
            }
            for emp in employees
        ]
        # If no managers exist yet, return an empty list with a note
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


# ============================================================
# ADMIN ENDPOINTS - Assignment Management
# ============================================================

@employees_bp.route('/admin/appointments/<int:appointment_id>/assign', methods=['POST'])
@jwt_required()
@admin_required
def assign_employee_to_appointment(appointment_id):
    """Assign an employee to an appointment (admin only)"""
    try:
        appointment = Appointment.query.get(appointment_id)
        
        if not appointment:
            return jsonify({
                'success': False,
                'message': 'Appointment not found'
            }), 404
        
        data = request.get_json()
        
        if 'employee_id' not in data:
            return jsonify({
                'success': False,
                'message': 'employee_id is required'
            }), 400
        
        employee = Employee.query.get(data['employee_id'])
        
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee not found'
            }), 404
        
        if employee.status != 'active':
            return jsonify({
                'success': False,
                'message': 'Employee is not available for assignment'
            }), 400
        
        # Check if already assigned
        existing = Assignment.query.filter(
            Assignment.appointment_id == appointment_id,
            Assignment.status.in_(['assigned', 'in-progress'])
        ).first()
        
        if existing:
            return jsonify({
                'success': False,
                'message': 'Appointment already has an active assignment'
            }), 409
        
        # Create assignment
        assignment = Assignment()
        assignment.appointment_id = appointment_id
        assignment.employee_id = employee.id
        assignment.status = 'assigned'
        assignment.notes = data.get('notes', '')
        
        # Update appointment status
        appointment.status = 'confirmed'
        
        db.session.add(assignment)
        db.session.commit()
        
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


# ============================================================
# EMPLOYEE PORTAL ENDPOINTS
# ============================================================

@employees_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@employee_required
def get_employee_dashboard():
    """Get employee dashboard statistics"""
    try:
        current_user = get_current_user()
        cache_key = f"employee:dashboard:{current_user['id']}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        employee = Employee.query.filter_by(user_id=current_user['id']).first()
        
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee profile not found'
            }), 404
        
        # Get statistics
        total_assignments = Assignment.query.filter_by(employee_id=employee.id).count()
        active_assignments = Assignment.query.filter(
            Assignment.employee_id == employee.id,
            Assignment.status.in_(['assigned', 'in-progress'])
        ).count()
        completed_assignments = Assignment.query.filter_by(
            employee_id=employee.id,
            status='completed'
        ).count()
        
        # Today's assignments
        today = datetime.now(timezone.utc).date()
        today_assignments = Assignment.query.filter(
            Assignment.employee_id == employee.id,
            db.func.date(Assignment.assigned_at) == today
        ).count()
        
        result = {
            'success': True,
            'data': {
                'employee': employee.to_dict(),
                'statistics': {
                    'total_assignments': total_assignments,
                    'active_assignments': active_assignments,
                    'completed_assignments': completed_assignments,
                    'today_assignments': today_assignments,
                    'rating': float(employee.rating) if employee.rating else 0.0
                }
            }
        }

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
    """Get employee's assignments"""
    try:
        current_user = get_current_user()
        
        # Query parameters
        status = request.args.get('status')
        
        cache_key = f"employee:assignments:{current_user['id']}:{status or 'all'}"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        employee = Employee.query.filter_by(user_id=current_user['id']).first()
        
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee profile not found'
            }), 404
        
        # Query parameters
        status = request.args.get('status')
        
        query = Assignment.query.filter_by(employee_id=employee.id)
        
        if status:
            query = query.filter_by(status=status)
        
        assignments = query.order_by(Assignment.assigned_at.desc()).all()
        
        # Enrich with appointment and customer details
        enriched_assignments = []
        for assignment in assignments:
            appointment = assignment.appointment
            customer = appointment.customer
            vehicle = appointment.vehicle
            service = appointment.service
            
            enriched_assignments.append({
                **assignment.to_dict(),
                'appointment': {
                    **appointment.to_dict(),
                    'customer': {
                        'id': customer.id,
                        'name': customer.name,
                        'phone': customer.phone
                    },
                    'vehicle': vehicle.to_dict() if vehicle else None,
                    'service': service.to_dict() if service else None
                }
            })
        
        result = {
            'success': True,
            'data': {
                'assignments': enriched_assignments,
                'count': len(enriched_assignments)
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
    """Update assignment status (employee only)"""
    try:
        current_user = get_current_user()
        employee = Employee.query.filter_by(user_id=current_user['id']).first()
        
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee profile not found'
            }), 404
        
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment:
            return jsonify({
                'success': False,
                'message': 'Assignment not found'
            }), 404
        
        # Verify ownership
        if assignment.employee_id != employee.id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        data = request.get_json()
        
        if 'status' not in data:
            return jsonify({
                'success': False,
                'message': 'Status is required'
            }), 400
        
        valid_transitions = {
            'assigned': ['in-progress', 'cancelled'],
            'in-progress': ['completed', 'cancelled'],
            'completed': [],
            'cancelled': []
        }
        
        current_status = assignment.status
        new_status = data['status']
        
        if new_status not in valid_transitions.get(current_status, []):
            return jsonify({
                'success': False,
                'message': f'Cannot transition from {current_status} to {new_status}'
            }), 400
        
        assignment.status = new_status
        
        # Update timestamps
        if new_status == 'in-progress':
            assignment.started_at = datetime.now(timezone.utc)
            assignment.appointment.status = 'in-progress'
        
        elif new_status == 'completed':
            assignment.completed_at = datetime.now(timezone.utc)
            assignment.appointment.status = 'completed'
            
            # Update employee stats
            employee.total_services += 1
        
        elif new_status == 'cancelled':
            assignment.appointment.status = 'scheduled'  # Reset appointment
        
        if 'notes' in data:
            assignment.notes = data['notes']
        
        db.session.commit()

        cache_delete_pattern(f"employee:assignments:{employee.user_id}:*")
        cache_delete_pattern(f"employee:dashboard:{employee.user_id}")
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
    """Get employee's schedule"""
    try:
        current_user = get_current_user()
        employee = Employee.query.filter_by(user_id=current_user['id']).first()
        
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee profile not found'
            }), 404
        
        # Query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = Assignment.query.filter_by(employee_id=employee.id)
        
        if start_date:
            query = query.filter(Assignment.assigned_at >= datetime.fromisoformat(start_date))
        
        if end_date:
            query = query.filter(Assignment.assigned_at <= datetime.fromisoformat(end_date))
        
        assignments = query.order_by(Assignment.assigned_at).all()
        
        # Group by date
        schedule = {}
        for assignment in assignments:
            date_key = assignment.assigned_at.date().isoformat()
            if date_key not in schedule:
                schedule[date_key] = []
            
            appointment = assignment.appointment
            schedule[date_key].append({
                'assignment_id': assignment.id,
                'appointment_id': appointment.id,
                'time': assignment.assigned_at.strftime('%H:%M'),
                'status': assignment.status,
                'service': appointment.service.name if appointment.service else None,
                'customer': {
                    'name': appointment.customer.name,
                    'phone': appointment.customer.phone
                }
            })
        
        return jsonify({
            'success': True,
            'data': {
                'schedule': schedule,
                'employee': employee.to_dict()
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
    """Get employee profile"""
    try:
        current_user = get_current_user()
        employee = Employee.query.filter_by(user_id=current_user['id']).first()
        
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee profile not found'
            }), 404
        
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
    """Update employee profile"""
    try:
        current_user = get_current_user()
        employee = Employee.query.filter_by(user_id=current_user['id']).first()
        
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee profile not found'
            }), 404
        
        data = request.get_json()
        user = employee.user
        
        # Update allowed user fields
        if 'name' in data:
            user.name = data['name']
        
        if 'phone' in data:
            user.phone = data['phone']
        
        if 'address' in data:
            user.address = data['address']
        
        if 'password' in data:
            user.set_password(data['password'])
        
        # Update allowed employee fields
        if 'location' in data:
            employee.location = data['location']
        
        if 'specialties' in data:
            employee.specialties = data['specialties']
        
        db.session.commit()
        
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


# ============================================================
# EMPLOYEE TIME TRACKING & SUPPORT ENDPOINTS
# ============================================================

@employees_bp.route('/clock', methods=['POST'])
@jwt_required()
@employee_required
def clock_in_out():
    """Clock in or out for the current employee"""
    try:
        current_user = get_current_user()
        employee = Employee.query.filter_by(user_id=current_user['id']).first()

        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee profile not found'
            }), 404

        data = request.get_json()
        action = data.get('action')

        if action not in ('in', 'out'):
            return jsonify({
                'success': False,
                'message': "Action must be 'in' or 'out'"
            }), 400

        # Check last time log
        last_log = EmployeeTimeLog.query.filter_by(
            employee_id=employee.id
        ).order_by(EmployeeTimeLog.timestamp.desc()).first()

        if action == 'in':
            if last_log and last_log.action == 'in' and not last_log.notes.startswith('clocked_out'):
                # Check if there's a clock-out after the last clock-in
                has_clock_out = EmployeeTimeLog.query.filter(
                    EmployeeTimeLog.employee_id == employee.id,
                    EmployeeTimeLog.timestamp > last_log.timestamp,
                    EmployeeTimeLog.action == 'out'
                ).first()
                if not has_clock_out:
                    return jsonify({
                        'success': False,
                        'message': 'You are already clocked in'
                    }), 400

            time_log = EmployeeTimeLog()
            time_log.employee_id = employee.id
            time_log.action = 'in'
            time_log.notes = data.get('notes', '')

            # Update employee status to active
            employee.status = 'active'
            db.session.add(time_log)
            db.session.commit()

            cache_delete_pattern(f"employee:time_logs:{employee.id}:*")

            return jsonify({
                'success': True,
                'message': 'Clocked in successfully',
                'data': {
                    'time_log': time_log.to_dict(),
                    'status': employee.status
                }
            }), 201

        else:  # clock out
            if not last_log or last_log.action == 'out':
                has_clock_in = EmployeeTimeLog.query.filter(
                    EmployeeTimeLog.employee_id == employee.id,
                    EmployeeTimeLog.action == 'in'
                ).order_by(EmployeeTimeLog.timestamp.desc()).first()
                if not has_clock_in:
                    clock_in_count = EmployeeTimeLog.query.filter_by(
                        employee_id=employee.id,
                        action='in'
                    ).count()
                    if clock_in_count == 0:
                        return jsonify({
                            'success': False,
                            'message': 'You must clock in first'
                        }), 400

            # Find the matching clock-in (last 'in' without matching 'out')
            clock_in_logs = EmployeeTimeLog.query.filter_by(
                employee_id=employee.id,
                action='in'
            ).order_by(EmployeeTimeLog.timestamp.desc()).all()

            matched_clock_in = None
            for clk_in in clock_in_logs:
                matching_out = EmployeeTimeLog.query.filter(
                    EmployeeTimeLog.employee_id == employee.id,
                    EmployeeTimeLog.action == 'out',
                    EmployeeTimeLog.timestamp > clk_in.timestamp
                ).first()
                if not matching_out:
                    matched_clock_in = clk_in
                    break

            if not matched_clock_in:
                return jsonify({
                    'success': False,
                    'message': 'No active clock-in session found'
                }), 400

            time_log = EmployeeTimeLog()
            time_log.employee_id = employee.id
            time_log.action = 'out'
            time_log.notes = data.get('notes', '')
            time_log.timestamp = datetime.now(timezone.utc)

            # Update employee status to off-duty
            employee.status = 'off-duty'
            db.session.add(time_log)
            db.session.commit()

            cache_delete_pattern(f"employee:time_logs:{employee.id}:*")

            return jsonify({
                'success': True,
                'message': 'Clocked out successfully',
                'data': {
                    'time_log': time_log.to_dict(),
                    'status': employee.status
                }
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
    """Get employee time logs for the current day"""
    try:
        current_user = get_current_user()
        employee = Employee.query.filter_by(user_id=current_user['id']).first()

        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee profile not found'
            }), 404

        today = datetime.now(timezone.utc).date()
        today_start = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
        today_end = datetime.combine(today + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)

        logs = EmployeeTimeLog.query.filter(
            EmployeeTimeLog.employee_id == employee.id,
            EmployeeTimeLog.timestamp >= today_start,
            EmployeeTimeLog.timestamp < today_end
        ).order_by(EmployeeTimeLog.timestamp).all()

        # Determine clock status
        is_clocked_in = False
        last_action = None

        if logs:
            last_log = logs[-1]
            if last_log.action == 'in':
                is_clocked_in = True
            last_action = last_log.action

        # Calculate total hours today
        total_seconds = 0
        clock_in_time = None
        for log in logs:
            if log.action == 'in':
                clock_in_time = log.timestamp
            elif log.action == 'out' and clock_in_time:
                total_seconds += (log.timestamp - clock_in_time).total_seconds()
                clock_in_time = None

        if clock_in_time:
            total_seconds += (datetime.now(timezone.utc) - clock_in_time).total_seconds()

        total_hours = round(total_seconds / 3600, 2)

        return jsonify({
            'success': True,
            'data': {
                'logs': [log.to_dict() for log in logs],
                'is_clocked_in': is_clocked_in,
                'total_hours': total_hours,
                'current_status': employee.status,
                'last_action': last_action
            }
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
    """Submit a time-off request"""
    try:
        current_user = get_current_user()
        employee = Employee.query.filter_by(user_id=current_user['id']).first()

        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee profile not found'
            }), 404

        data = request.get_json()

        required_fields = ['request_type', 'start_date', 'end_date']
        if not all(key in data for key in required_fields):
            return jsonify({
                'success': False,
                'message': 'Missing required fields',
                'required': required_fields
            }), 400

        valid_types = ['vacation', 'sick', 'personal', 'other']
        if data['request_type'] not in valid_types:
            return jsonify({
                'success': False,
                'message': f'Invalid request_type. Valid options: {valid_types}'
            }), 400

        try:
            start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'message': 'Invalid date format. Use ISO 8601 format.'
            }), 400

        if end_date < start_date:
            return jsonify({
                'success': False,
                'message': 'End date must be after or equal to start date'
            }), 400

        time_off = TimeOffRequest()
        time_off.employee_id = employee.id
        time_off.request_type = data['request_type']
        time_off.start_date = start_date
        time_off.end_date = end_date
        time_off.reason = data.get('reason', '')
        time_off.status = 'pending'

        db.session.add(time_off)
        db.session.commit()

        cache_delete_pattern(f"employee:time_off:{employee.id}:*")

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
    """Get employee's time-off requests"""
    try:
        current_user = get_current_user()
        employee = Employee.query.filter_by(user_id=current_user['id']).first()

        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee profile not found'
            }), 404

        requests = TimeOffRequest.query.filter_by(
            employee_id=employee.id
        ).order_by(TimeOffRequest.created_at.desc()).all()

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
    """Report an issue"""
    try:
        current_user = get_current_user()
        employee = Employee.query.filter_by(user_id=current_user['id']).first()

        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee profile not found'
            }), 404

        data = request.get_json()

        required_fields = ['title', 'description']
        if not all(key in data for key in required_fields):
            return jsonify({
                'success': False,
                'message': 'Missing required fields',
                'required': required_fields
            }), 400

        valid_priorities = ['low', 'medium', 'high', 'urgent']
        priority = data.get('priority', 'medium')
        if priority not in valid_priorities:
            return jsonify({
                'success': False,
                'message': f'Invalid priority. Valid options: {valid_priorities}'
            }), 400

        issue = IssueReport()
        issue.employee_id = employee.id
        issue.title = data['title']
        issue.description = data['description']
        issue.priority = priority
        issue.appointment_id = data.get('appointment_id')
        issue.status = 'open'

        db.session.add(issue)
        db.session.commit()

        cache_delete_pattern(f"employee:issues:{employee.id}:*")

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
    """Get employee's reported issues"""
    try:
        current_user = get_current_user()
        employee = Employee.query.filter_by(user_id=current_user['id']).first()

        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee profile not found'
            }), 404

        issues = IssueReport.query.filter_by(
            employee_id=employee.id
        ).order_by(IssueReport.created_at.desc()).all()

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