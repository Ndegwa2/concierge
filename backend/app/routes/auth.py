from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from app import db
from app.models import User, Admin, Employee, AuditLog
from datetime import timedelta
import re
from functools import wraps

auth_bp = Blueprint('auth', __name__)

# Token blacklist for logout (in production, use Redis)
token_blacklist = set()

def validate_password(password):
    """Validate password strength"""
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
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False, "Invalid email format"
    return True, "Email is valid"

def validate_phone(phone):
    """Validate phone number (Kenyan format)"""
    if not phone:
        return True, "Phone is optional"
    # Remove spaces and dashes
    phone = phone.replace(" ", "").replace("-", "")
    # Kenyan phone formats: +2547XXXXXXXX, 2547XXXXXXXX, 07XXXXXXXX
    pattern = r'^(\+254|254|0)[17]\d{8}$'
    if not re.match(pattern, phone):
        return False, "Invalid Kenyan phone number format"
    return True, "Phone is valid"

def role_required(*allowed_roles):
    """Decorator to check if user has required role"""
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            current_user = get_jwt_identity()
            if current_user['role'] not in allowed_roles:
                return jsonify({
                    'success': False,
                    'message': 'Insufficient permissions'
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def log_audit(action, entity_type, entity_id, old_values=None, new_values=None, status='success', error_message=None, user_id=None, admin_id=None):
    """Log audit trail"""
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
        print(f"Audit log error: {e}")


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user (Customer or Employee with approval workflow)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email', 'password', 'role']
        missing_fields = [f for f in required_fields if f not in data or not data[f]]
        if missing_fields:
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Validate role - only customer and employee allowed for registration
        allowed_roles = ['customer', 'employee']
        role = data['role'].lower().strip()
        if role not in allowed_roles:
            return jsonify({
                'success': False,
                'message': 'Invalid role. Only customer and employee roles can be registered.'
            }), 400
        
        # Validate email format
        email_valid, email_msg = validate_email(data['email'])
        if not email_valid:
            return jsonify({
                'success': False,
                'message': email_msg
            }), 400
        
        # Validate password strength
        pwd_valid, pwd_msg = validate_password(data['password'])
        if not pwd_valid:
            return jsonify({
                'success': False,
                'message': pwd_msg
            }), 400
        
        # Validate phone if provided
        if 'phone' in data and data['phone']:
            phone_valid, phone_msg = validate_phone(data['phone'])
            if not phone_valid:
                return jsonify({
                    'success': False,
                    'message': phone_msg
                }), 400
        
        # Check if user already exists
        if User.query.filter_by(email=data['email'].lower()).first():
            return jsonify({
                'success': False,
                'message': 'Email already registered'
            }), 409
        
        # Create new user
        user = User()
        user.name = data['name'].strip()
        user.email = data['email'].lower().strip()
        user.set_password(data['password'])
        user.role = role
        
        if 'phone' in data:
            user.phone = data['phone'].strip()
        
        if 'address' in data:
            user.address = data['address'].strip()
        
        # For employees, set is_active to False pending approval
        # For customers, set is_active to True immediately
        if role == 'employee':
            user.is_active = False  # Requires admin approval
        else:
            user.is_active = True  # Customers are active immediately
        
        db.session.add(user)
        db.session.flush()  # Get user.id before creating employee profile
        
        # If employee, create employee profile with pending status
        if role == 'employee':
            employee = Employee()
            employee.user_id = user.id
            employee.status = 'pending'  # Pending approval
            employee.location = data.get('location', '')
            employee.specialties = data.get('specialties', [])
            db.session.add(employee)
        
        db.session.commit()
        
        # Log audit
        log_audit('REGISTER', 'User', user.id, new_values={'email': user.email, 'name': user.name, 'role': user.role}, user_id=user.id)
        
        # For customers: auto-login with tokens
        # For employees: return success message about approval
        if role == 'customer':
            access_token = create_access_token(
                identity={
                    'id': user.id,
                    'email': user.email,
                    'role': user.role
                },
                expires_delta=timedelta(hours=24)
            )
            refresh_token = create_refresh_token(
                identity={
                    'id': user.id,
                    'email': user.email,
                    'role': user.role
                }
            )
            
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
            # Employee registration - needs approval
            return jsonify({
                'success': True,
                'message': 'Registration submitted successfully. Your account is pending admin approval. You will be notified once approved.',
                'data': {
                    'user': user.to_dict(),
                    'requires_approval': True
                }
            }), 201
        
    except Exception as e:
        db.session.rollback()
        log_audit('REGISTER', 'User', None, status='failed', error_message=str(e))
        return jsonify({
            'success': False,
            'message': 'Registration failed',
            'error': str(e)
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login for customers and employees"""
    try:
        data = request.get_json()
        
        # Validate input
        if not all(key in data for key in ['email', 'password']):
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        email = data['email'].lower().strip()
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        # Check if user exists and password is correct
        if not user or not user.check_password(data['password']):
            log_audit('LOGIN', 'User', None, status='failed', error_message='Invalid credentials')
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        # Check if user is active
        if not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Account is deactivated. Please contact support.'
            }), 403
        
        # Create tokens
        access_token = create_access_token(
            identity={
                'id': user.id,
                'email': user.email,
                'role': user.role
            },
            expires_delta=timedelta(hours=24)
        )
        refresh_token = create_refresh_token(
            identity={
                'id': user.id,
                'email': user.email,
                'role': user.role
            }
        )
        
        # Log audit
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
        log_audit('LOGIN', 'User', None, status='failed', error_message=str(e))
        return jsonify({
            'success': False,
            'message': 'Login failed',
            'error': str(e)
        }), 500


@auth_bp.route('/employee/login', methods=['POST'])
def employee_login():
    """Employee login endpoint"""
    try:
        data = request.get_json()
        
        # Validate input
        if not all(key in data for key in ['email', 'password']):
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        email = data['email'].lower().strip()
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        # Check if user exists and has employee role
        if not user or user.role not in ['employee', 'concierge']:
            log_audit('LOGIN', 'Employee', None, status='failed', error_message='Invalid employee credentials')
            return jsonify({
                'success': False,
                'message': 'Invalid employee credentials'
            }), 401
        
        # Check password
        if not user.check_password(data['password']):
            log_audit('LOGIN', 'Employee', None, status='failed', error_message='Invalid password')
            return jsonify({
                'success': False,
                'message': 'Invalid employee credentials'
            }), 401
        
        # Check if user is active
        if not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Account is deactivated. Please contact admin.'
            }), 403
        
        # Check employee profile status
        if user.employee_profile and user.employee_profile.status != 'active':
            return jsonify({
                'success': False,
                'message': f'Employee status is {user.employee_profile.status}. Please contact admin.'
            }), 403
        
        # Create tokens
        access_token = create_access_token(
            identity={
                'id': user.id,
                'email': user.email,
                'role': user.role
            },
            expires_delta=timedelta(hours=24)
        )
        refresh_token = create_refresh_token(
            identity={
                'id': user.id,
                'email': user.email,
                'role': user.role
            }
        )
        
        # Log audit
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
        log_audit('LOGIN', 'Employee', None, status='failed', error_message=str(e))
        return jsonify({
            'success': False,
            'message': 'Login failed',
            'error': str(e)
        }), 500


@auth_bp.route('/admin/login', methods=['POST'])
def admin_login():
    """Admin login endpoint"""
    try:
        data = request.get_json()
        
        # Validate input
        if not all(key in data for key in ['email', 'password']):
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        email = data['email'].lower().strip()
        
        # Find admin by email
        admin = Admin.query.filter_by(email=email).first()
        
        # Check if admin exists and password is correct
        if not admin or not admin.check_password(data['password']):
            log_audit('LOGIN', 'Admin', None, status='failed', error_message='Invalid admin credentials')
            return jsonify({
                'success': False,
                'message': 'Invalid admin credentials'
            }), 401
        
        # Create tokens
        access_token = create_access_token(
            identity={
                'id': admin.id,
                'email': admin.email,
                'role': admin.role
            },
            expires_delta=timedelta(hours=8)  # Shorter expiry for admin
        )
        refresh_token = create_refresh_token(
            identity={
                'id': admin.id,
                'email': admin.email,
                'role': admin.role
            }
        )
        
        # Log audit
        log_audit('LOGIN', 'Admin', admin.id, new_values={'login_method': 'admin_portal'}, admin_id=admin.id)
        
        return jsonify({
            'success': True,
            'message': 'Admin login successful',
            'data': {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': admin.to_dict()
            }
        }), 200
        
    except Exception as e:
        log_audit('LOGIN', 'Admin', None, status='failed', error_message=str(e))
        return jsonify({
            'success': False,
            'message': 'Login failed',
            'error': str(e)
        }), 500


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        current_user = get_jwt_identity()
        
        # Check if token is blacklisted
        jti = get_jwt()['jti']
        if jti in token_blacklist:
            return jsonify({
                'success': False,
                'message': 'Token has been revoked'
            }), 401
        
        # Create new access token
        access_token = create_access_token(
            identity=current_user,
            expires_delta=timedelta(hours=24)
        )
        
        return jsonify({
            'success': True,
            'message': 'Token refreshed successfully',
            'data': {
                'access_token': access_token
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Token refresh failed',
            'error': str(e)
        }), 500


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user by blacklisting token"""
    try:
        jti = get_jwt()['jti']
        token_blacklist.add(jti)
        
        current_user = get_jwt_identity()
        user_id = current_user['id'] if current_user['role'] != 'admin' else None
        admin_id = current_user['id'] if current_user['role'] == 'admin' else None
        log_audit('LOGOUT', 'User', current_user['id'], user_id=user_id, admin_id=admin_id)
        
        return jsonify({
            'success': True,
            'message': 'Successfully logged out'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Logout failed',
            'error': str(e)
        }), 500


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        # Validate input
        if not all(key in data for key in ['current_password', 'new_password']):
            return jsonify({
                'success': False,
                'message': 'Current password and new password are required'
            }), 400
        
        # Validate new password strength
        pwd_valid, pwd_msg = validate_password(data['new_password'])
        if not pwd_valid:
            return jsonify({
                'success': False,
                'message': pwd_msg
            }), 400
        
        # Get user
        if current_user['role'] == 'admin':
            user = Admin.query.get(current_user['id'])
        else:
            user = User.query.get(current_user['id'])
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Verify current password
        if not user.check_password(data['current_password']):
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect'
            }), 401
        
        # Update password
        user.set_password(data['new_password'])
        db.session.commit()
        
        user_id = current_user['id'] if current_user['role'] != 'admin' else None
        admin_id = current_user['id'] if current_user['role'] == 'admin' else None
        log_audit('CHANGE_PASSWORD', 'User', user.id, user_id=user_id, admin_id=admin_id)
        
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
    """Verify if current token is valid"""
    try:
        current_user = get_jwt_identity()
        
        # Get user details
        if current_user['role'] == 'admin':
            user = Admin.query.get(current_user['id'])
        else:
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
    """Get user profile"""
    try:
        current_user = get_jwt_identity()
        
        if current_user['role'] == 'admin':
            user = Admin.query.get(current_user['id'])
        else:
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
    """Update user profile"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        if current_user['role'] == 'admin':
            user = Admin.query.get(current_user['id'])
        else:
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


# ============================================================
# ADMIN MANAGEMENT ENDPOINTS (Super Admin Only)
# ============================================================

@auth_bp.route('/admin/create', methods=['POST'])
@jwt_required()
def create_admin():
    """Create a new admin account (Super Admin only)"""
    try:
        current_user = get_jwt_identity()
        
        # Only super_admin can create new admin accounts
        if current_user['role'] != 'super_admin':
            return jsonify({
                'success': False,
                'message': 'Only Super Admin can create new admin accounts'
            }), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email', 'password']
        missing_fields = [f for f in required_fields if f not in data or not data[f]]
        if missing_fields:
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Validate email format
        email_valid, email_msg = validate_email(data['email'])
        if not email_valid:
            return jsonify({
                'success': False,
                'message': email_msg
            }), 400
        
        # Validate password strength
        pwd_valid, pwd_msg = validate_password(data['password'])
        if not pwd_valid:
            return jsonify({
                'success': False,
                'message': pwd_msg
            }), 400
        
        # Check if admin already exists
        if Admin.query.filter_by(email=data['email'].lower()).first():
            return jsonify({
                'success': False,
                'message': 'Admin with this email already exists'
            }), 409
        
        # Create new admin
        admin = Admin()
        admin.name = data['name'].strip()
        admin.email = data['email'].lower().strip()
        admin.set_password(data['password'])
        admin.role = data.get('role', 'admin')  # Default to 'admin', can be 'super_admin'
        
        db.session.add(admin)
        db.session.commit()
        
        log_audit('CREATE_ADMIN', 'Admin', admin.id, new_values={'email': admin.email, 'name': admin.name, 'role': admin.role}, admin_id=current_user['id'])
        
        return jsonify({
            'success': True,
            'message': 'Admin account created successfully',
            'data': {
                'admin': admin.to_dict()
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
    """Get list of pending employee registrations (Admin only)"""
    try:
        current_user = get_jwt_identity()
        
        # Only admin can view pending employees
        if current_user['role'] not in ['admin', 'super_admin']:
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        # Get pending employees
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
        
        return jsonify({
            'success': True,
            'data': {
                'pending_employees': result,
                'count': len(result)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to fetch pending employees',
            'error': str(e)
        }), 500


@auth_bp.route('/admin/approve-employee/<int:user_id>', methods=['POST'])
@jwt_required()
def approve_employee(user_id):
    """Approve or reject an employee registration (Admin only)"""
    try:
        current_user = get_jwt_identity()
        
        # Only admin can approve employees
        if current_user['role'] not in ['admin', 'super_admin']:
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        data = request.get_json()
        action = data.get('action', 'approve')  # 'approve' or 'reject'
        
        # Get user and employee
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
            # Activate user and employee
            user.is_active = True
            employee.status = 'active'
            message = 'Employee approved successfully'
        elif action == 'reject':
            # Deactivate and mark as rejected
            user.is_active = False
            employee.status = 'rejected'
            message = 'Employee registration rejected'
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid action. Use "approve" or "reject"'
            }), 400
        
        db.session.commit()
        
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
    """Update employee status - activate/deactivate/suspend (Admin only)"""
    try:
        current_user = get_jwt_identity()
        
        # Only admin can update employee status
        if current_user['role'] not in ['admin', 'super_admin']:
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        data = request.get_json()
        new_status = data.get('status')  # 'active', 'off-duty', 'suspended'
        
        if new_status not in ['active', 'off-duty', 'suspended']:
            return jsonify({
                'success': False,
                'message': 'Invalid status. Use "active", "off-duty", or "suspended"'
            }), 400
        
        # Get user and employee
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
        
        # Also update user is_active based on status
        user.is_active = new_status == 'active'
        
        db.session.commit()
        
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