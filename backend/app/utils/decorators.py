"""
RBAC Decorators for AutoConcierge

This module provides role-based access control decorators for Flask routes.
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request


def role_required(*allowed_roles):
    """
    Decorator to check if the current user has one of the required roles.
    
    Usage:
        @app.route('/admin/endpoint')
        @jwt_required()
        @role_required('admin')
        def admin_only():
            return {'message': 'Welcome admin'}
        
        @app.route('/manager/endpoint')
        @jwt_required()
        @role_required('admin', 'manager')
        def admin_or_manager():
            return {'message': 'Welcome'}
    
    Args:
        *allowed_roles: Variable number of role strings that are allowed access
    
    Returns:
        Decorated function or error response
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            current_user = get_jwt_identity()
            
            if not current_user:
                return jsonify({
                    'success': False,
                    'message': 'Authentication required',
                    'error': 'MISSING_TOKEN'
                }), 401
            
            user_role = current_user.get('role')
            
            if user_role not in allowed_roles:
                return jsonify({
                    'success': False,
                    'message': 'You do not have permission to access this resource',
                    'error': 'INSUFFICIENT_PERMISSIONS',
                    'required_roles': list(allowed_roles),
                    'current_role': user_role
                }), 403
            
            return fn(*args, **kwargs)
        
        return wrapper
    return decorator


def admin_required(fn):
    """
    Decorator that requires admin role.
    Shortcut for @role_required('admin')
    
    Usage:
        @app.route('/admin/endpoint')
        @jwt_required()
        @admin_required
        def admin_endpoint():
            return {'message': 'Admin access granted'}
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        current_user = get_jwt_identity()
        
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'Authentication required',
                'error': 'MISSING_TOKEN'
            }), 401
        
        user_role = current_user.get('role')
        
        if user_role != 'admin':
            return jsonify({
                'success': False,
                'message': 'Admin access required',
                'error': 'ADMIN_REQUIRED'
            }), 403
        
        return fn(*args, **kwargs)
    
    return wrapper


def employee_required(fn):
    """
    Decorator that requires employee role.
    Shortcut for @role_required('employee')
    
    Usage:
        @app.route('/employee/endpoint')
        @jwt_required()
        @employee_required
        def employee_endpoint():
            return {'message': 'Employee access granted'}
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        current_user = get_jwt_identity()
        
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'Authentication required',
                'error': 'MISSING_TOKEN'
            }), 401
        
        user_role = current_user.get('role')
        
        if user_role != 'employee':
            return jsonify({
                'success': False,
                'message': 'Employee access required',
                'error': 'EMPLOYEE_REQUIRED'
            }), 403
        
        return fn(*args, **kwargs)
    
    return wrapper


def customer_required(fn):
    """
    Decorator that requires customer role.
    Shortcut for @role_required('customer')
    
    Usage:
        @app.route('/customer/endpoint')
        @jwt_required()
        @customer_required
        def customer_endpoint():
            return {'message': 'Customer access granted'}
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        current_user = get_jwt_identity()
        
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'Authentication required',
                'error': 'MISSING_TOKEN'
            }), 401
        
        user_role = current_user.get('role')
        
        if user_role != 'customer':
            return jsonify({
                'success': False,
                'message': 'Customer access required',
                'error': 'CUSTOMER_REQUIRED'
            }), 403
        
        return fn(*args, **kwargs)
    
    return wrapper


def owner_or_admin_required(get_resource_user_id):
    """
    Decorator that allows access if the user is the owner of the resource or an admin.
    
    Usage:
        @app.route('/appointments/<int:appointment_id>')
        @jwt_required()
        @owner_or_admin_required(lambda appointment_id: Appointment.query.get(appointment_id).user_id)
        def get_appointment(appointment_id):
            return {'message': 'Access granted'}
    
    Args:
        get_resource_user_id: A function that takes the route parameters and returns the user_id of the resource owner
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            current_user = get_jwt_identity()
            
            if not current_user:
                return jsonify({
                    'success': False,
                    'message': 'Authentication required',
                    'error': 'MISSING_TOKEN'
                }), 401
            
            user_id = current_user.get('id')
            user_role = current_user.get('role')
            
            # Admins have access to everything
            if user_role == 'admin':
                return fn(*args, **kwargs)
            
            # Check if user is the owner of the resource
            try:
                resource_user_id = get_resource_user_id(*args, **kwargs)
                if user_id == resource_user_id:
                    return fn(*args, **kwargs)
            except Exception:
                pass
            
            return jsonify({
                'success': False,
                'message': 'You do not have permission to access this resource',
                'error': 'ACCESS_DENIED'
            }), 403
        
        return wrapper
    return decorator


def get_current_user():
    """
    Helper function to get the current authenticated user's identity.
    
    Returns:
        dict: User identity containing id, email, and role
        None: If no user is authenticated
    """
    try:
        verify_jwt_in_request()
        return get_jwt_identity()
    except Exception:
        return None


def get_current_user_id():
    """
    Helper function to get the current authenticated user's ID.
    
    Returns:
        int: User ID
        None: If no user is authenticated or ID is missing
    """
    user = get_current_user()
    if user is None:
        return None
    return user.get('id')


def get_current_user_role():
    """
    Helper function to get the current authenticated user's role.
    
    Returns:
        str: User role ('admin', 'employee', 'customer')
        None: If no user is authenticated or role is missing
    """
    user = get_current_user()
    if user is None:
        return None
    return user.get('role')


def is_admin():
    """
    Helper function to check if the current user is an admin.
    
    Returns:
        bool: True if admin, False otherwise
    """
    return get_current_user_role() == 'admin'


def is_employee():
    """
    Helper function to check if the current user is an employee.
    
    Returns:
        bool: True if employee, False otherwise
    """
    return get_current_user_role() == 'employee'


def is_customer():
    """
    Helper function to check if the current user is a customer.
    
    Returns:
        bool: True if customer, False otherwise
    """
    return get_current_user_role() == 'customer'