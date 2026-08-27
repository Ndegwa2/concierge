from app import db
from sqlalchemy import func, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import backref
import uuid
from app.core.types import EncryptedString


class Employee(db.Model):
    __tablename__ = 'employees'
    __table_args__ = (CheckConstraint("status IN ('active', 'off-duty', 'suspended', 'terminated', 'pending', 'rejected')"),
                      CheckConstraint("rating >= 0.00 AND rating <= 5.00"),
                      CheckConstraint("employment_type IN ('full_time', 'part_time', 'contractor')"),
                      CheckConstraint("account_status IN ('active', 'onboarding', 'suspended', 'terminated')"))

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    employee_id = db.Column(db.String(36), unique=True, nullable=False, index=True, default=lambda: str(uuid.uuid4()))
    location = db.Column(db.String(100), index=True)
    specialties = db.Column(JSONB)
    rating = db.Column(db.Numeric(3, 2), default=0.0)
    total_services = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='active', index=True)
    hired_at = db.Column(db.DateTime(timezone=True))

    department = db.Column(db.String(100), index=True)
    title = db.Column(db.String(100))
    employment_type = db.Column(db.String(20), default='full_time', index=True)
    start_date = db.Column(db.DateTime(timezone=True))
    manager_id = db.Column(db.BigInteger, db.ForeignKey('employees.id', ondelete='SET NULL'), index=True)

    account_status = db.Column(db.String(20), default='onboarding', index=True)
    exit_notes = db.Column(db.Text)
    offboarding_checklist_completed = db.Column(db.Boolean, default=False)

    base_salary = db.Column(db.Numeric(10, 2))
    hourly_rate = db.Column(db.Numeric(10, 2))
    pay_frequency = db.Column(db.String(20))
    bank_account_number = db.Column(EncryptedString(50))
    bank_name = db.Column(db.String(100))
    health_plan_tier = db.Column(db.String(20))

    user = db.relationship('User', backref=backref('employee_profile', uselist=False), uselist=False, lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'employee_id': self.employee_id,
            'location': self.location,
            'specialties': self.specialties or [],
            'rating': float(self.rating) if self.rating else 0.0,
            'total_services': self.total_services,
            'status': self.status,
            'hired_at': self.hired_at.isoformat() if self.hired_at else None,
            'department': self.department,
            'title': self.title,
            'employment_type': self.employment_type,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'manager_id': self.manager_id,
            'account_status': self.account_status,
            'exit_notes': self.exit_notes,
            'offboarding_checklist_completed': self.offboarding_checklist_completed,
            'base_salary': float(self.base_salary) if self.base_salary else None,
            'hourly_rate': float(self.hourly_rate) if self.hourly_rate else None,
            'pay_frequency': self.pay_frequency,
            'bank_account_number': self.bank_account_number,
            'bank_name': self.bank_name,
            'health_plan_tier': self.health_plan_tier
        }

    @property
    def specialty_list(self):
        return self.specialties if isinstance(self.specialties, list) else []

    @specialty_list.setter
    def specialty_list(self, value):
        if value is None:
            self.specialties = []
        elif isinstance(value, list):
            self.specialties = value
        else:
            raise ValueError("Specialties must be a list or None")

    def update_rating(self, new_rating):
        rating_val = float(new_rating)
        if not 0 <= rating_val <= 5:
            raise ValueError("Rating must be between 0 and 5")
        self.rating = round(rating_val, 2)

    def increment_services(self):
        self.total_services += 1

    def set_status(self, new_status):
        valid_statuses = ['active', 'off-duty', 'suspended', 'terminated']
        if new_status not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")
        self.status = new_status


class EmployeeDocument(db.Model):
    __tablename__ = 'employee_documents'
    __table_args__ = (
        CheckConstraint("doc_type IN ('id_proof', 'tax_form', 'certification', 'contract', 'other')"),
    )

    id = db.Column(db.BigInteger, primary_key=True)
    employee_id = db.Column(db.BigInteger, db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    document_name = db.Column(db.String(255), nullable=False)
    doc_type = db.Column(db.String(50), nullable=False, index=True)
    file_path = db.Column(db.String(500))
    file_name = db.Column(db.String(255))
    file_size = db.Column(db.Integer)
    mime_type = db.Column(db.String(100))
    uploaded_by = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'), index=True)
    is_verified = db.Column(db.Boolean, default=False, index=True)
    verified_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'document_name': self.document_name,
            'doc_type': self.doc_type,
            'file_name': self.file_name,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'is_verified': self.is_verified,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class EmployeeTimeLog(db.Model):
    __tablename__ = 'employee_time_logs'
    __table_args__ = (CheckConstraint("action IN ('in', 'out')"),)

    id = db.Column(db.BigInteger, primary_key=True)
    employee_id = db.Column(db.BigInteger, db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    action = db.Column(db.String(10), nullable=False)
    timestamp = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'action': self.action,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class TimeOffRequest(db.Model):
    __tablename__ = 'time_off_requests'
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'approved', 'rejected', 'cancelled')"),
        CheckConstraint("request_type IN ('vacation', 'sick', 'personal', 'other')"),
    )

    id = db.Column(db.BigInteger, primary_key=True)
    employee_id = db.Column(db.BigInteger, db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    request_type = db.Column(db.String(20), nullable=False)
    start_date = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    end_date = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    reason = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending', nullable=False, index=True)
    admin_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'request_type': self.request_type,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'reason': self.reason,
            'status': self.status,
            'admin_notes': self.admin_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class IssueReport(db.Model):
    __tablename__ = 'issue_reports'
    __table_args__ = (
        CheckConstraint("priority IN ('low', 'medium', 'high', 'urgent')"),
        CheckConstraint("status IN ('open', 'in-progress', 'resolved', 'closed')"),
    )

    id = db.Column(db.BigInteger, primary_key=True)
    employee_id = db.Column(db.BigInteger, db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    appointment_id = db.Column(db.BigInteger, db.ForeignKey('appointments.id', ondelete='SET NULL'), index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), default='medium', nullable=False, index=True)
    status = db.Column(db.String(20), default='open', nullable=False, index=True)
    resolution_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'appointment_id': self.appointment_id,
            'title': self.title,
            'description': self.description,
            'priority': self.priority,
            'status': self.status,
            'resolution_notes': self.resolution_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
