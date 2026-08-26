"""
RBAC Decorators for AutoConcierge

This module provides role-based access control decorators for Flask routes.
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request, get_jwt

from app.services.auth.models import User
from app.services.employees.models import Employee


def role_required(*allowed_roles):
    """
    Decorator to check if the current user has one of the required roles.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            current_user = get_current_user()
            
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
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        current_user = get_current_user()
        
        if not current_user:
            return jsonify({
                'success': False,
                'message': 'Authentication required',
                'error': 'MISSING_TOKEN'
            }), 401
        
        user_role = current_user.get('role')
        
        if user_role not in ['admin', 'super_admin']:
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
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        current_user = get_current_user()
        
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
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        current_user = get_current_user()
        
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
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            current_user = get_current_user()
            
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
    try:
        verify_jwt_in_request()
        identity = get_jwt_identity()
        claims = get_jwt()

        if not identity:
            return None

        user_id = str(identity)
        role = claims.get('role')

        user = User.query.get(user_id)
        if user:
            return user.to_dict()

        return None
    except Exception:
        return None


def get_current_user_id():
    """
    Helper function to get the current authenticated user's ID.
    """
    user = get_current_user()
    if user is None:
        return None
    return user.get('id')


def get_current_user_role():
    """
    Helper function to get the current authenticated user's role.
    """
    user = get_current_user()
    if user is None:
        return None
    return user.get('role')


def is_admin():
    """
    Helper function to check if the current user is an admin.
    """
    return get_current_user_role() == 'admin'


def is_employee():
    """
    Helper function to check if the current user is an employee.
    """
    return get_current_user_role() == 'employee'


def is_customer():
    """
    Helper function to check if the current user is a customer.
    """
    return get_current_user_role() == 'customer'