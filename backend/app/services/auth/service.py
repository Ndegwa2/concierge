from app import db
from app.services.auth.models import User
from app.services.employees.models import Employee
from app.services.admin.models import AuditLog
from datetime import datetime, timedelta, timezone


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
            ip_address=None,
            user_agent=None,
            status=status,
            error_message=error_message
        )
        db.session.add(audit)
        db.session.commit()
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Audit log error: {str(e)}")