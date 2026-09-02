from flask import Blueprint, request, jsonify, g, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from app import db, limiter
from app.services.auth.models import User
from app.services.employees.models import Employee
from app.services.admin.models import AuditLog
from app.utils.decorators import admin_required, role_required, get_current_user, get_current_user_id, is_admin
from app.utils.cache import cache_get, cache_set, cache_delete_pattern, REDIS_SHORT_TTL, add_jti_to_blocklist
from datetime import datetime, timedelta, timezone
import re
import logging
from functools import wraps

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)


def validate_password(password):
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"


def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False, "Invalid email format"
    return True, "Email is valid"


def validate_phone(phone):
    if not phone:
        return True, "Phone is optional"
    phone = phone.replace(" ", "").replace("-", "")
    pattern = r'^(\+254|254|0)[17]\d{8}$'
    if not re.match(pattern, phone):
        return False, "Invalid Kenyan phone number format"
    return True, "Phone is valid"


def log_audit(action, entity_type, entity_id, old_values=None, new_values=None, status='success', error_message=None, user_id=None, admin_id=None):
    try:
        audit = AuditLog(
            user_id=user_id,
            admin_id=admin_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', '')[:255],
            status=status,
            error_message=error_message
        )
        db.session.add(audit)
        db.session.commit()
    except Exception as e:
        logger.error(f"Audit log error: {str(e)}")


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    request_id = g.get('request_id', 'unknown')
    try:
        data = request.get_json()
        
        required_fields = ['name', 'email', 'password', 'role']
        missing_fields = [f for f in required_fields if f not in data or not data[f]]
        if missing_fields:
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        allowed_roles = ['customer', 'employee']
        role = data['role'].lower().strip()
        if role not in allowed_roles:
            return jsonify({
                'success': False,
                'message': 'Invalid role. Only customer and employee roles can be registered.'
            }), 400
        
        email_valid, email_msg = validate_email(data['email'])
        if not email_valid:
            return jsonify({
                'success': False,
                'message': email_msg
            }), 400
        
        pwd_valid, pwd_msg = validate_password(data['password'])
        if not pwd_valid:
            return jsonify({
                'success': False,
                'message': pwd_msg
            }), 400
        
        if 'phone' in data and data['phone']:
            phone_valid, phone_msg = validate_phone(data['phone'])
            if not phone_valid:
                return jsonify({
                    'success': False,
                    'message': phone_msg
                }), 400
        
        if User.query.filter_by(email=data['email'].lower()).first():
            return jsonify({
                'success': False,
                'message': 'Email already registered'
            }), 409
        
        user = User()
        user.name = data['name'].strip()
        user.email = data['email'].lower().strip()
        user.set_password(data['password'])
        user.role = role
        
        if 'phone' in data:
            user.phone = data['phone'].strip()
        
        if 'address' in data:
            user.address = data['address'].strip()
        
        if role == 'employee':
            user.is_active = False
        else:
            user.is_active = True
        
        db.session.add(user)
        db.session.flush()
        
        if role == 'employee':
            employee = Employee()
            employee.user_id = user.id
            employee.status = 'pending'
            employee.location = data.get('location', '')
            employee.specialties = data.get('specialties', [])
            db.session.add(employee)
        
        db.session.commit()
        
        log_audit('REGISTER', 'User', user.id, new_values={'email': user.email, 'name': user.name, 'role': user.role}, user_id=user.id)
        
        if role == 'customer':
            access_token = create_access_token(identity=str(user.id))
            refresh_token = create_refresh_token(identity=str(user.id))
            
            return jsonify({
                'success': True,
                'message': 'Registration successful',
                'data': {
                    'user': user.to_dict(),
                    'access_token': access_token,
                    'refresh_token': refresh_token
                }
            }), 201
        else:
            return jsonify({
                'success': True,
                'message': 'Registration submitted successfully. Your account is pending admin approval. You will be notified once approved.',
                'data': {
                    'user': user.to_dict(),
                    'requires_approval': True
                }
            }), 201
        
    except ValueError as e:
        db.session.rollback()
        logger.warning(f"[{request_id}] Registration validation error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Invalid registration data'
        }), 400
    except Exception as e:
        db.session.rollback()
        log_audit('REGISTER', 'User', None, status='failed', error_message='Internal error')
        logger.error(f"[{request_id}] Registration error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Registration failed'
        }), 500


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    request_id = g.get('request_id', 'unknown')
    try:
        data = request.get_json()

        if not all(key in data for key in ['email', 'password']):
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400

        email = data['email'].lower().strip()
        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(data['password']):
            log_audit('LOGIN', 'User', None, status='failed', error_message='Invalid credentials')
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401

        if user.role != 'customer':
            log_audit('LOGIN', 'User', user.id, status='failed', error_message='Wrong portal for role')
            return jsonify({
                'success': False,
                'message': 'This account cannot sign in from the customer portal. Please use the correct sign-in tab.'
            }), 403

        if not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Account is deactivated. Please contact support.'
            }), 403

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={'role': user.role}
        )
        refresh_token = create_refresh_token(
            identity=str(user.id),
            additional_claims={'role': user.role}
        )

        log_audit('LOGIN', 'User', user.id, new_values={'login_method': 'email'}, user_id=user.id)

        return jsonify({
            'success': True,
            'message': 'Login successful',
            'data': {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user.to_dict(include_employee=True)
            }
        }), 200

    except Exception as e:
        log_audit('LOGIN', 'User', None, status='failed', error_message='Internal error')
        logger.error(f"[{request_id}] Login error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Login failed'
        }), 500


@auth_bp.route('/employee/login', methods=['POST'])
@limiter.limit("10 per minute")
def employee_login():
    request_id = g.get('request_id', 'unknown')
    try:
        data = request.get_json()

        if not all(key in data for key in ['email', 'password']):
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400

        email = data['email'].lower().strip()
        user = User.query.filter_by(email=email).first()

        if not user or user.role not in ['employee', 'concierge']:
            log_audit('LOGIN', 'Employee', None, status='failed', error_message='Invalid employee credentials')
            return jsonify({
                'success': False,
                'message': 'Invalid employee credentials'
            }), 401

        if not user.check_password(data['password']):
            log_audit('LOGIN', 'Employee', None, status='failed', error_message='Invalid password')
            return jsonify({
                'success': False,
                'message': 'Invalid employee credentials'
            }), 401

        if not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Account is deactivated. Please contact admin.'
            }), 403

        if user.employee_profile and user.employee_profile.status in ('suspended', 'terminated', 'rejected'):
            return jsonify({
                'success': False,
                'message': f'Employee account is {user.employee_profile.status}. Please contact admin.'
            }), 403

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={'role': user.role}
        )
        refresh_token = create_refresh_token(
            identity=str(user.id),
            additional_claims={'role': user.role}
        )

        log_audit('LOGIN', 'Employee', user.id, new_values={'login_method': 'employee_portal'}, user_id=user.id)

        return jsonify({
            'success': True,
            'message': 'Employee login successful',
            'data': {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user.to_dict(include_employee=True)
            }
        }), 200

    except Exception as e:
        log_audit('LOGIN', 'Employee', None, status='failed', error_message='Internal error')
        logger.error(f"[{request_id}] Employee login error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Login failed'
        }), 500


@auth_bp.route('/admin/login', methods=['POST'])
@limiter.limit("10 per minute")
def admin_login():
    request_id = g.get('request_id', 'unknown')
    try:
        data = request.get_json()

        if not all(key in data for key in ['email', 'password']):
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400

        email = data['email'].lower().strip()
        user = User.query.filter_by(email=email, role='admin').first()

        if not user or not user.check_password(data['password']):
            log_audit('LOGIN', 'User', None, status='failed', error_message='Invalid admin credentials', user_id=None, admin_id=None)
            return jsonify({
                'success': False,
                'message': 'Invalid admin credentials'
            }), 401

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={'role': user.role}
        )
        refresh_token = create_refresh_token(
            identity=str(user.id),
            additional_claims={'role': user.role}
        )

        log_audit('LOGIN', 'User', user.id, new_values={'login_method': 'admin_portal'}, user_id=user.id, admin_id=user.id)

        return jsonify({
            'success': True,
            'message': 'Admin login successful',
            'data': {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user.to_dict()
            }
        }), 200

    except Exception as e:
        log_audit('LOGIN', 'User', None, status='failed', error_message='Internal error', user_id=None, admin_id=None)
        logger.error(f"[{request_id}] Admin login error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Login failed'
        }), 500


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
@limiter.limit("10 per minute")
def refresh():
    try:
        current_user = get_current_user()
        
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'Invalid token',
                'error': 'INVALID_TOKEN'
            }), 401
        
        jti = get_jwt()['jti']
        exp = get_jwt().get('exp')
        now_ts = datetime.now(timezone.utc).timestamp()
        ttl_seconds = max(int(exp - now_ts), 60) if exp else 604800
        
        add_jti_to_blocklist(jti, ttl_seconds)
        
        access_token = create_access_token(
            identity=str(current_user['id']),
            additional_claims={'role': current_user.get('role', 'customer')}
        )
        new_refresh_token = create_refresh_token(
            identity=str(current_user['id']),
            additional_claims={'role': current_user.get('role', 'customer')}
        )
        
        return jsonify({
            'success': True,
            'message': 'Token refreshed successfully',
            'data': {
                'access_token': access_token,
                'refresh_token': new_refresh_token
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Token refresh error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Token refresh failed'
        }), 500


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        jti = get_jwt()['jti']
        current_user = get_current_user()
        
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'Invalid token',
                'error': 'INVALID_TOKEN'
            }), 401
        
        exp = get_jwt().get('exp')
        now_ts = datetime.now(timezone.utc).timestamp()
        ttl_seconds = max(int(exp - now_ts), 60) if exp else 86400
        
        add_jti_to_blocklist(jti, ttl_seconds)
        
        user_id = current_user['id'] if current_user.get('role') != 'admin' else None
        admin_id = current_user['id'] if current_user.get('role') == 'admin' else None
        log_audit('LOGOUT', 'User', current_user['id'], user_id=user_id, admin_id=admin_id)
        
        return jsonify({
            'success': True,
            'message': 'Successfully logged out'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Logout error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Logout failed'
        }), 500


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
@limiter.limit("5 per minute")
def change_password():
    try:
        current_user = get_current_user()
        
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'Invalid token',
                'error': 'INVALID_TOKEN'
            }), 401
        
        data = request.get_json()
        
        if not all(key in data for key in ['current_password', 'new_password']):
            return jsonify({
                'success': False,
                'message': 'Current password and new password are required'
            }), 400
        
        pwd_valid, pwd_msg = validate_password(data['new_password'])
        if not pwd_valid:
            return jsonify({
                'success': False,
                'message': pwd_msg
            }), 400
        
        user = User.query.get(current_user['id'])

        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        if not user.check_password(data['current_password']):
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect'
            }), 401

        user.set_password(data['new_password'])
        db.session.commit()

        log_audit('CHANGE_PASSWORD', 'User', user.id, user_id=user.id, admin_id=user.id if user.is_admin else None)
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to change password',
            'error': str(e)
        }), 500


@auth_bp.route('/verify-token', methods=['GET'])
@jwt_required()
def verify_token():
    try:
        current_user = get_current_user()
        
        user = User.query.get(current_user['id'])

        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        return jsonify({
            'success': True,
            'message': 'Token is valid',
            'data': {
                'user': user.to_dict(include_employee=True) if hasattr(user, 'employee_profile') else user.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Token verification failed',
            'error': str(e)
        }), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        current_user = get_current_user()
        
        user = User.query.get(current_user['id'])

        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        return jsonify({
            'success': True,
            'data': {
                'user': user.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get profile',
            'error': str(e)
        }), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        current_user = get_current_user()
        data = request.get_json()
        
        user = User.query.get(current_user['id'])

        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        if 'name' in data:
            user.name = data['name']
        
        if 'email' in data:
            user.email = data['email']
        
        if 'phone' in data:
            user.phone = data['phone']
        
        if 'address' in data:
            user.address = data['address']
        
        if 'password' in data:
            user.set_password(data['password'])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'data': {
                'user': user.to_dict()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update profile',
            'error': str(e)
        }), 500


@auth_bp.route('/admin/create', methods=['POST'])
@jwt_required()
def create_admin():
    try:
        current_user = get_current_user()
        
        if current_user['role'] not in ['admin', 'super_admin']:
            return jsonify({
                'success': False,
                'message': 'Only Super Admin can create new admin accounts'
            }), 403
        
        data = request.get_json()
        
        required_fields = ['name', 'email', 'password']
        missing_fields = [f for f in required_fields if f not in data or not data[f]]
        if missing_fields:
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        email_valid, email_msg = validate_email(data['email'])
        if not email_valid:
            return jsonify({
                'success': False,
                'message': email_msg
            }), 400
        
        pwd_valid, pwd_msg = validate_password(data['password'])
        if not pwd_valid:
            return jsonify({
                'success': False,
                'message': pwd_msg
            }), 400
        
        if User.query.filter_by(email=data['email'].lower(), is_admin=True).first():
            return jsonify({
                'success': False,
                'message': 'Admin with this email already exists'
            }), 409

        user = User()
        user.name = data['name'].strip()
        user.email = data['email'].lower().strip()
        user.set_password(data['password'])
        user.role = data.get('role', 'admin')
        user.is_admin = True

        db.session.add(user)
        db.session.commit()

        cache_delete_pattern("employees:*")
        cache_delete_pattern("admin:users")

        log_audit('CREATE_ADMIN', 'User', user.id, new_values={'email': user.email, 'name': user.name, 'role': user.role}, user_id=user.id, admin_id=user.id)

        return jsonify({
            'success': True,
            'message': 'Admin account created successfully',
            'data': {
                'admin': user.to_dict()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to create admin account',
            'error': str(e)
        }), 500


@auth_bp.route('/admin/pending-employees', methods=['GET'])
@jwt_required()
def get_pending_employees():
    try:
        current_user = get_current_user()
        
        if current_user['role'] not in ['admin', 'super_admin']:
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        cache_key = "admin:pending_employees"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached), 200

        pending_employees = db.session.query(User, Employee).join(
            Employee, User.id == Employee.user_id
        ).filter(
            Employee.status == 'pending'
        ).all()
        
        result = []
        for user, employee in pending_employees:
            result.append({
                'user': user.to_dict(),
                'employee': employee.to_dict()
            })

        response = {
            'success': True,
            'data': {
                'pending_employees': result,
                'count': len(result)
            }
        }

        cache_set(cache_key, response, REDIS_SHORT_TTL)

        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to fetch pending employees',
            'error': str(e)
        }), 500


@auth_bp.route('/admin/approve-employee/<int:user_id>', methods=['POST'])
@jwt_required()
def approve_employee(user_id):
    try:
        current_user = get_current_user()
        
        if current_user['role'] not in ['admin', 'super_admin']:
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        data = request.get_json()
        action = data.get('action', 'approve')
        
        user = User.query.get(user_id)
        if not user or user.role != 'employee':
            return jsonify({
                'success': False,
                'message': 'Employee not found'
            }), 404
        
        employee = Employee.query.filter_by(user_id=user_id).first()
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee profile not found'
            }), 404
        
        if action == 'approve':
            user.is_active = True
            employee.status = 'active'
            message = 'Employee approved successfully'
        elif action == 'reject':
            user.is_active = False
            employee.status = 'rejected'
            message = 'Employee registration rejected'
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid action. Use "approve" or "reject"'
            }), 400
        
        db.session.commit()

        cache_delete_pattern("employees:*")
        cache_delete_pattern("admin:users")

        admin_id = current_user['id'] if current_user['role'] in ['admin', 'super_admin'] else None
        log_audit(
            f'EMPLOYEE_{action.upper()}',
            'Employee',
            user_id,
            new_values={'status': employee.status},
            admin_id=admin_id
        )
        
        return jsonify({
            'success': True,
            'message': message,
            'data': {
                'user': user.to_dict(),
                'employee': employee.to_dict()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to process employee approval',
            'error': str(e)
        }), 500


@auth_bp.route('/admin/employees/<int:user_id>/status', methods=['PUT'])
@jwt_required()
def update_employee_status(user_id):
    try:
        current_user = get_current_user()
        
        if current_user['role'] not in ['admin', 'super_admin']:
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['active', 'off-duty', 'suspended']:
            return jsonify({
                'success': False,
                'message': 'Invalid status. Use "active", "off-duty", or "suspended"'
            }), 400
        
        user = User.query.get(user_id)
        if not user or user.role != 'employee':
            return jsonify({
                'success': False,
                'message': 'Employee not found'
            }), 404
        
        employee = Employee.query.filter_by(user_id=user_id).first()
        if not employee:
            return jsonify({
                'success': False,
                'message': 'Employee profile not found'
            }), 404
        
        old_status = employee.status
        employee.status = new_status
        if new_status in ('suspended', 'terminated'):
            user.is_active = False
        elif old_status in ('suspended', 'terminated') and new_status == 'active':
            user.is_active = True

        db.session.commit()

        cache_delete_pattern("employees:*")
        cache_delete_pattern("admin:users")

        admin_id = current_user['id'] if current_user['role'] in ['admin', 'super_admin'] else None
        log_audit(
            'UPDATE_EMPLOYEE_STATUS',
            'Employee',
            user_id,
            old_values={'status': old_status},
            new_values={'status': new_status},
            admin_id=admin_id
        )
        
        return jsonify({
            'success': True,
            'message': f'Employee status updated to {new_status}',
            'data': {
                'user': user.to_dict(),
                'employee': employee.to_dict()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to update employee status',
            'error': str(e)
        }), 500