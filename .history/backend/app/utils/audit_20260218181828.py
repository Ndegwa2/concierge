"""
Audit Logging Utility for AutoConcierge

This module provides audit logging functionality for tracking all system activities.
"""
from functools import wraps
from flask import request, g
from app import db
from app.models import AuditLog, ActivityTracker
from datetime import datetime
import time
import json


def get_client_ip():
    """Get client IP address from request"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr or 'unknown'


def get_user_agent():
    """Get user agent from request"""
    return request.headers.get('User-Agent', 'unknown')[:255]


def log_audit(
    action: str,
    entity_type: str,
    entity_id: int = None,
    old_values: dict = None,
    new_values: dict = None,
    description: str = None,
    status: str = 'success',
    error_message: str = None
):
    """
    Create an audit log entry.
    
    Args:
        action: The action performed (CREATE, UPDATE, DELETE, LOGIN, etc.)
        entity_type: The type of entity affected (User, Appointment, Vehicle, etc.)
        entity_id: The ID of the entity affected
        old_values: Previous state of the entity
        new_values: New state of the entity
        description: Human-readable description of the action
        status: Status of the action (success, failed, error)
        error_message: Error message if action failed
    """
    try:
        # Get current user info from flask g object
        user_id = getattr(g, 'user_id', None)
        admin_id = getattr(g, 'admin_id', None)
        
        audit_log = AuditLog()
        audit_log.user_id = user_id
        audit_log.admin_id = admin_id
        audit_log.action = action
        audit_log.entity_type = entity_type
        audit_log.entity_id = entity_id
        audit_log.old_values = old_values
        audit_log.new_values = new_values
        audit_log.ip_address = get_client_ip()
        audit_log.user_agent = get_user_agent()
        audit_log.description = description
        audit_log.status = status
        audit_log.error_message = error_message
        
        db.session.add(audit_log)
        db.session.commit()
        
        return audit_log
        
    except Exception as e:
        db.session.rollback()
        print(f"Failed to create audit log: {e}")
        return None


def track_activity(
    activity_type: str,
    activity_details: dict = None,
    duration_ms: int = None
):
    """
    Track user activity for monitoring.
    
    Args:
        activity_type: Type of activity (page_view, api_call, login, etc.)
        activity_details: Additional details about the activity
        duration_ms: Duration of the activity in milliseconds
    """
    try:
        user_id = getattr(g, 'user_id', None)
        admin_id = getattr(g, 'admin_id', None)
        session_id = getattr(g, 'session_id', None)
        
        activity = ActivityTracker()
        activity.user_id = user_id
        activity.admin_id = admin_id
        activity.activity_type = activity_type
        activity.activity_details = activity_details
        activity.session_id = session_id
        activity.ip_address = get_client_ip()
        activity.user_agent = get_user_agent()
        activity.duration_ms = duration_ms
        
        db.session.add(activity)
        db.session.commit()
        
        return activity
        
    except Exception as e:
        db.session.rollback()
        print(f"Failed to track activity: {e}")
        return None


def audit_log_decorator(entity_type: str, action: str):
    """
    Decorator to automatically log audit events for API endpoints.
    
    Usage:
        @audit_log_decorator('Appointment', 'CREATE')
        def create_appointment():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            start_time = time.time()
            old_values = None
            new_values = None
            entity_id = None
            error_message = None
            status = 'success'
            
            try:
                # Execute the function
                result = f(*args, **kwargs)
                
                # Try to extract entity_id and values from result
                if isinstance(result, tuple):
                    response_data, status_code = result
                else:
                    response_data = result
                    status_code = 200
                
                if isinstance(response_data, dict):
                    if response_data.get('success') and response_data.get('data'):
                        data = response_data['data']
                        if isinstance(data, dict):
                            entity_id = data.get('id')
                            new_values = data
                
                # Calculate duration
                duration_ms = int((time.time() - start_time) * 1000)
                
                # Track activity
                track_activity(
                    activity_type='api_call',
                    activity_details={
                        'endpoint': request.endpoint,
                        'method': request.method,
                        'entity_type': entity_type,
                        'action': action
                    },
                    duration_ms=duration_ms
                )
                
                return result
                
            except Exception as e:
                status = 'error'
                error_message = str(e)
                duration_ms = int((time.time() - start_time) * 1000)
                
                # Track failed activity
                track_activity(
                    activity_type='api_call',
                    activity_details={
                        'endpoint': request.endpoint,
                        'method': request.method,
                        'entity_type': entity_type,
                        'action': action,
                        'error': error_message
                    },
                    duration_ms=duration_ms
                )
                
                raise
            
            finally:
                # Log audit
                log_audit(
                    action=action,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    old_values=old_values,
                    new_values=new_values,
                    description=f"{action} {entity_type}",
                    status=status,
                    error_message=error_message
                )
        
        return decorated_function
    return decorator


class AuditLogger:
    """
    Context manager for audit logging with before/after state capture.
    
    Usage:
        with AuditLogger('UPDATE', 'Appointment', appointment_id) as audit:
            audit.set_old_values(appointment.to_dict())
            # ... perform update ...
            audit.set_new_values(updated_appointment.to_dict())
    """
    
    def __init__(self, action: str, entity_type: str, entity_id: int = None):
        self.action = action
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.old_values = None
        self.new_values = None
        self.status = 'success'
        self.error_message = None
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.status = 'error'
            self.error_message = str(exc_val)
        
        log_audit(
            action=self.action,
            entity_type=self.entity_type,
            entity_id=self.entity_id,
            old_values=self.old_values,
            new_values=self.new_values,
            description=f"{self.action} {self.entity_type}",
            status=self.status,
            error_message=self.error_message
        )
        
        return False  # Don't suppress exceptions
    
    def set_old_values(self, values: dict):
        """Set the old/previous values"""
        self.old_values = values
    
    def set_new_values(self, values: dict):
        """Set the new/updated values"""
        self.new_values = values
    
    def set_entity_id(self, entity_id: int):
        """Set the entity ID"""
        self.entity_id = entity_id


def log_login(user_id: int, user_type: str = 'user', success: bool = True, error: str = None):
    """Log a login attempt"""
    log_audit(
        action='LOGIN',
        entity_type='Session',
        description=f"User login ({user_type})",
        status='success' if success else 'failed',
        error_message=error,
        new_values={'user_id': user_id, 'user_type': user_type}
    )


def log_logout(user_id: int, user_type: str = 'user'):
    """Log a logout event"""
    log_audit(
        action='LOGOUT',
        entity_type='Session',
        description=f"User logout ({user_type})",
        new_values={'user_id': user_id, 'user_type': user_type}
    )


def log_failed_login(email: str, reason: str):
    """Log a failed login attempt"""
    log_audit(
        action='LOGIN',
        entity_type='Session',
        description=f"Failed login attempt for {email}",
        status='failed',
        error_message=reason,
        new_values={'email': email}
    )