from app import db
from sqlalchemy import func, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    __table_args__ = (CheckConstraint("status IN ('success', 'failed', 'error')"),)

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'), index=True)
    admin_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'), index=True)
    action = db.Column(db.String(50), nullable=False, index=True)
    entity_type = db.Column(db.String(50), nullable=False, index=True)
    entity_id = db.Column(db.Integer, index=True)
    old_values = db.Column(JSONB)
    new_values = db.Column(JSONB)
    ip_address = db.Column(db.String(45), index=True)
    user_agent = db.Column(db.String(255))
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='success', index=True)
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'admin_id': self.admin_id,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'description': self.description,
            'status': self.status,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'user_name': self.user.name if self.user else None,
            'admin_name': self.admin.name if self.admin else None
        }


class SystemMetric(db.Model):
    __tablename__ = 'system_metrics'

    id = db.Column(db.BigInteger, primary_key=True)
    metric_type = db.Column(db.String(50), nullable=False, index=True)
    metric_name = db.Column(db.String(100), nullable=False)
    metric_value = db.Column(db.Numeric(15, 2), nullable=False)
    metric_unit = db.Column(db.String(20))
    period_start = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    period_end = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    extra_data = db.Column(JSONB)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'metric_type': self.metric_type,
            'metric_name': self.metric_name,
            'metric_value': float(self.metric_value),
            'metric_unit': self.metric_unit,
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'extra_data': self.extra_data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ActivityTracker(db.Model):
    __tablename__ = 'activity_tracker'

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'), index=True)
    admin_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'), index=True)
    activity_type = db.Column(db.String(50), nullable=False, index=True)
    activity_details = db.Column(JSONB)
    session_id = db.Column(db.String(100), index=True)
    ip_address = db.Column(db.String(45), index=True)
    user_agent = db.Column(db.String(255))
    duration_ms = db.Column(db.Integer)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'admin_id': self.admin_id,
            'activity_type': self.activity_type,
            'activity_details': self.activity_details,
            'session_id': self.session_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'duration_ms': self.duration_ms,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'user_name': self.user.name if self.user else None,
            'admin_name': self.admin.name if self.admin else None
        }
