"""
Employee Routes for AutoConcierge

This module handles employee management and employee portal endpoints.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import User, Employee, Appointment, Assignment, Service
from app.utils.decorators import admin_required, employee_required, role_required, get_current_user
from datetime import datetime

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
        employee.employee_id = Employee.generate_employee_id()
        employee.location = data['location']
        employee.specialties = data.get('specialties', [])
        employee.status = data.get('status', 'active')
        
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
        existing = Assignment.query.filter_by(
            appointment_id=appointment_id,
            status__in=['assigned', 'in-progress']
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
        employee = Employee.query.filter_by(user_id=current_user['id']).first()
        
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee profile not found'
            }), 404
        
        # Get statistics
        total_assignments = Assignment.query.filter_by(employee_id=employee.id).count()
        active_assignments = Assignment.query.filter_by(
            employee_id=employee.id,
            status__in=['assigned', 'in-progress']
        ).count()
        completed_assignments = Assignment.query.filter_by(
            employee_id=employee.id,
            status='completed'
        ).count()
        
        # Today's assignments
        today = datetime.utcnow().date()
        today_assignments = Assignment.query.filter(
            Assignment.employee_id == employee.id,
            db.func.date(Assignment.assigned_at) == today
        ).count()
        
        return jsonify({
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
        }), 200
        
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
        
        return jsonify({
            'success': True,
            'data': {
                'assignments': enriched_assignments,
                'count': len(enriched_assignments)
            }
        }), 200
        
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
            assignment.started_at = datetime.utcnow()
            assignment.appointment.status = 'in-progress'
        
        elif new_status == 'completed':
            assignment.completed_at = datetime.utcnow()
            assignment.appointment.status = 'completed'
            
            # Update employee stats
            employee.total_services += 1
        
        elif new_status == 'cancelled':
            assignment.appointment.status = 'scheduled'  # Reset appointment
        
        if 'notes' in data:
            assignment.notes = data['notes']
        
        db.session.commit()
        
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