from app import db
from sqlalchemy import func, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import TypeDecorator, String as SQLString, Date as SQLDate
import bcrypt
import uuid
import os
import base64
from cryptography.fernet import Fernet


class EncryptedString(TypeDecorator):
    impl = SQLString
    cache_ok = True

    def __init__(self, length=255, **kwargs):
        super().__init__(length=length, **kwargs)
        key = os.environ.get('ENCRYPTION_KEY')
        if not key:
            raise RuntimeError(
                "ENCRYPTION_KEY environment variable must be set. "
                "Generate with: python -c 'import base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())'"
            )
        self._fernet = Fernet(key.encode() if isinstance(key, str) else key)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return self._fernet.encrypt(value.encode()).decode()

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        try:
            return self._fernet.decrypt(value.encode()).decode()
        except Exception:
            return value


class EncryptedDate(TypeDecorator):
    impl = SQLDate
    cache_ok = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        key = os.environ.get('ENCRYPTION_KEY')
        if not key:
            raise RuntimeError(
                "ENCRYPTION_KEY environment variable must be set. "
                "Generate with: python -c 'import base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())'"
            )
        self._fernet = Fernet(key.encode() if isinstance(key, str) else key)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return self._fernet.encrypt(value.isoformat().encode()).decode()

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        from datetime import datetime
        return datetime.strptime(self._fernet.decrypt(value.encode()).decode(), '%Y-%m-%d').date()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(EncryptedString(20))
    address = db.Column(EncryptedString(255))
    role = db.Column(db.String(20), default='customer', index=True)
    is_admin = db.Column(db.Boolean, default=False, index=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    vehicles = db.relationship('Vehicle', backref='owner', lazy=True)
    appointments = db.relationship('Appointment', backref='customer', lazy=True)
    payment_methods = db.relationship('PaymentMethod', backref='user', lazy=True)
    notifications = db.relationship('Notification', backref='user', lazy=True)
    service_history = db.relationship('ServiceHistory', backref='customer', lazy=True)
    employee_profile = db.relationship('Employee', backref='user', uselist=False, lazy='joined')
    audit_logs = db.relationship('AuditLog', back_populates='user', lazy=True, foreign_keys='AuditLog.user_id')
    admin_audit_logs = db.relationship('AuditLog', back_populates='admin', lazy=True, foreign_keys='AuditLog.admin_id')
    activities = db.relationship('ActivityTracker', back_populates='user', lazy=True, foreign_keys='ActivityTracker.user_id')
    admin_activities = db.relationship('ActivityTracker', back_populates='admin', lazy=True, foreign_keys='ActivityTracker.admin_id')

    def set_password(self, password):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self, include_employee=False):
        result = {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'role': self.role,
            'is_admin': self.is_admin,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

        if include_employee and self.employee_profile:
            result['employee'] = self.employee_profile.to_dict()

        return result


class Service(db.Model):
    __tablename__ = 'services'

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    description = db.Column(db.Text)
    price = db.Column(db.Numeric(10, 2))
    duration = db.Column(db.Integer)
    category = db.Column(db.String(50), index=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    appointments = db.relationship('Appointment', backref='service', lazy=True)
    service_history = db.relationship('ServiceHistory', backref='service', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': float(self.price) if self.price else None,
            'duration': self.duration,
            'category': self.category,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Vehicle(db.Model):
    __tablename__ = 'vehicles'

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    make = db.Column(db.String(50), nullable=False, index=True)
    model = db.Column(db.String(50), nullable=False, index=True)
    year = db.Column(db.Integer)
    color = db.Column(db.String(30))
    license_plate = db.Column(db.String(20))
    vin = db.Column(db.String(17))
    odometer = db.Column(db.Integer)
    current_mileage = db.Column(db.Integer)
    last_service_mileage = db.Column(db.Integer)
    next_service_mileage = db.Column(db.Integer)
    insurance_expiry_date = db.Column(db.Date)
    estimated_monthly_maintenance = db.Column(db.Numeric(10, 2))
    total_maintenance_ytd = db.Column(db.Numeric(10, 2), default=0.0)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    appointments = db.relationship('Appointment', backref='vehicle', lazy=True)
    service_history = db.relationship('ServiceHistory', backref='vehicle', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'make': self.make,
            'model': self.model,
            'year': self.year,
            'color': self.color,
            'license_plate': self.license_plate,
            'vin': self.vin,
            'odometer': self.odometer,
            'current_mileage': self.current_mileage,
            'last_service_mileage': self.last_service_mileage,
            'next_service_mileage': self.next_service_mileage,
            'insurance_expiry_date': self.insurance_expiry_date.isoformat() if self.insurance_expiry_date else None,
            'estimated_monthly_maintenance': float(self.estimated_monthly_maintenance) if self.estimated_monthly_maintenance else None,
            'total_maintenance_ytd': float(self.total_maintenance_ytd) if self.total_maintenance_ytd else 0.0,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Appointment(db.Model):
    __tablename__ = 'appointments'
    __table_args__ = (CheckConstraint("status IN ('scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rescheduled', 'overdue')"),)

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    vehicle_id = db.Column(db.BigInteger, db.ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False, index=True)
    service_id = db.Column(db.BigInteger, db.ForeignKey('services.id', ondelete='CASCADE'), nullable=False, index=True)
    partner_id = db.Column(db.BigInteger, db.ForeignKey('service_partners.id', ondelete='SET NULL'), index=True)
    appointment_date = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    status = db.Column(db.String(20), default='scheduled', index=True)
    notes = db.Column(db.Text)
    total_amount = db.Column(db.Numeric(10, 2))
    payment_status = db.Column(db.String(20), default='pending', index=True)
    reminder_sent = db.Column(db.Boolean, default=False, index=True)
    overdue_notified = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    service_history = db.relationship('ServiceHistory', backref='appointment', lazy=True, uselist=False)
    partner = db.relationship('ServicePartner', backref='appointments', lazy=True)

    def to_dict(self):
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'vehicle_id': self.vehicle_id,
            'service_id': self.service_id,
            'partner_id': self.partner_id,
            'appointment_date': self.appointment_date.isoformat() if self.appointment_date else None,
            'status': self.status,
            'notes': self.notes,
            'total_amount': float(self.total_amount) if self.total_amount else None,
            'payment_status': self.payment_status,
            'reminder_sent': self.reminder_sent,
            'overdue_notified': self.overdue_notified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

        if self.vehicle:
            result['vehicle'] = self.vehicle.to_dict()

        if self.service:
            result['service'] = self.service.to_dict()

        if self.customer:
            result['customer'] = {
                'id': self.customer.id,
                'name': self.customer.name,
                'phone': self.customer.phone,
                'email': self.customer.email,
            }

        return result


class ServiceHistory(db.Model):
    __tablename__ = 'service_history'
    __table_args__ = (CheckConstraint("rating >= 0 AND rating <= 5"),)

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    vehicle_id = db.Column(db.BigInteger, db.ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False, index=True)
    service_id = db.Column(db.BigInteger, db.ForeignKey('services.id', ondelete='CASCADE'), nullable=False, index=True)
    appointment_id = db.Column(db.BigInteger, db.ForeignKey('appointments.id', ondelete='SET NULL'), index=True)
    completed_date = db.Column(db.DateTime(timezone=True))
    notes = db.Column(db.Text)
    cost = db.Column(db.Numeric(10, 2))
    rating = db.Column(db.Integer)
    review = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'vehicle_id': self.vehicle_id,
            'service_id': self.service_id,
            'appointment_id': self.appointment_id,
            'completed_date': self.completed_date.isoformat() if self.completed_date else None,
            'notes': self.notes,
            'cost': float(self.cost) if self.cost else None,
            'rating': self.rating,
            'review': self.review,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text)
    notification_type = db.Column(db.String(50), default='info', index=True)
    is_read = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'notification_type': self.notification_type,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class TimestampMixin:
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Employee(TimestampMixin, db.Model):
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

    assignments = db.relationship('Assignment', backref='assigned_employee', lazy='selectin')
    documents = db.relationship('EmployeeDocument', backref='employee', lazy='selectin')
    manager = db.relationship('Employee', remote_side=[id], backref='subordinates', lazy='joined')

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
            'health_plan_tier': self.health_plan_tier,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
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


class Assignment(db.Model):
    __tablename__ = 'assignments'
    __table_args__ = (CheckConstraint("status IN ('assigned', 'in-progress', 'completed', 'cancelled')"),)

    id = db.Column(db.BigInteger, primary_key=True)
    appointment_id = db.Column(db.BigInteger, db.ForeignKey('appointments.id', ondelete='CASCADE'), nullable=False, index=True)
    employee_id = db.Column(db.BigInteger, db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    status = db.Column(db.String(20), default='assigned', index=True)
    assigned_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), index=True)
    started_at = db.Column(db.DateTime(timezone=True))
    completed_at = db.Column(db.DateTime(timezone=True))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'appointment_id': self.appointment_id,
            'employee_id': self.employee_id,
            'status': self.status,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class ServicePartner(db.Model):
    __tablename__ = 'service_partners'
    __table_args__ = (CheckConstraint("rating >= 0.00 AND rating <= 5.00"),)

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    contact_name = db.Column(db.String(100))
    email = db.Column(db.String(120), index=True)
    phone = db.Column(db.String(20))
    address = db.Column(JSONB)
    services_offered = db.Column(JSONB)
    rating = db.Column(db.Numeric(3, 2), default=0.0)
    total_services = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'contact_name': self.contact_name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address or {},
            'services_offered': self.services_offered or [],
            'rating': float(self.rating) if self.rating else 0.0,
            'total_services': self.total_services,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


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

    user = db.relationship('User', back_populates='audit_logs', lazy=True, foreign_keys=[user_id])
    admin = db.relationship('User', back_populates='admin_audit_logs', lazy=True, foreign_keys=[admin_id])

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

    user = db.relationship('User', back_populates='activities', lazy=True, foreign_keys=[user_id])
    admin = db.relationship('User', back_populates='admin_activities', lazy=True, foreign_keys=[admin_id])

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


class PaymentMethod(db.Model):
    __tablename__ = 'payment_methods'

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    payment_token = db.Column(db.String(255))
    card_brand = db.Column(db.String(50))
    last_four_digits = db.Column(db.String(4))
    cardholder_name = db.Column(db.String(100))
    expiry_date = db.Column(db.Date)
    is_default = db.Column(db.Boolean, default=False, index=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'card_brand': self.card_brand,
            'last_four_digits': self.last_four_digits,
            'cardholder_name': self.cardholder_name,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'is_default': self.is_default,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class DiscountCode(db.Model):
    __tablename__ = 'discount_codes'

    id = db.Column(db.BigInteger, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    discount_type = db.Column(db.String(20), default='percentage')
    value = db.Column(db.Numeric(10, 2), nullable=False)
    minimum_spend = db.Column(db.Numeric(10, 2))
    max_uses = db.Column(db.Integer)
    used_count = db.Column(db.Integer, default=0)
    start_date = db.Column(db.DateTime(timezone=True))
    end_date = db.Column(db.DateTime(timezone=True))
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'discount_type': self.discount_type,
            'value': float(self.value),
            'minimum_spend': float(self.minimum_spend) if self.minimum_spend else None,
            'max_uses': self.max_uses,
            'used_count': self.used_count,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
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

    employee = db.relationship('Employee', backref='time_logs', lazy=True)

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

    employee = db.relationship('Employee', backref='time_off_requests', lazy=True)

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

    employee = db.relationship('Employee', backref='issue_reports', lazy=True)
    appointment = db.relationship('Appointment', backref='issue_reports', lazy=True)

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


class Company(db.Model):
    __tablename__ = 'companies'
    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(255), nullable=False, index=True)
    contact_name = db.Column(db.String(255))
    email = db.Column(db.String(255))
    phone = db.Column(db.String(50))
    address = db.Column(JSONB)
    billing_address = db.Column(JSONB)
    payment_terms = db.Column(db.String(100), default='Net 30')
    is_active = db.Column(db.Boolean, default=True, index=True)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    vehicles = db.relationship('FleetVehicle', backref='company', lazy=True)
    fleet_expenses = db.relationship('FleetExpense', backref='company', lazy=True)
    invoices = db.relationship('Invoice', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'contact_name': self.contact_name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'billing_address': self.billing_address,
            'payment_terms': self.payment_terms,
            'is_active': self.is_active,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class FleetVehicle(db.Model):
    __tablename__ = 'fleet_vehicles'
    id = db.Column(db.BigInteger, primary_key=True)
    company_id = db.Column(db.BigInteger, db.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    make = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer)
    license_plate = db.Column(db.String(50), unique=True, index=True)
    vin = db.Column(db.String(50), unique=True, index=True)
    status = db.Column(db.String(50), default='active', index=True)
    assigned_employee_id = db.Column(db.BigInteger, db.ForeignKey('employees.id'), index=True)
    last_service_date = db.Column(db.DateTime(timezone=True))
    mileage_km = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    assigned_employee = db.relationship('Employee', lazy=True)

    def to_dict(self):
        result = {
            'id': self.id,
            'company_id': self.company_id,
            'make': self.make,
            'model': self.model,
            'year': self.year,
            'license_plate': self.license_plate,
            'vin': self.vin,
            'status': self.status,
            'assigned_employee_id': self.assigned_employee_id,
            'last_service_date': self.last_service_date.isoformat() if self.last_service_date else None,
            'mileage_km': self.mileage_km,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if self.assigned_employee:
            result['assigned_employee'] = {
                'id': self.assigned_employee.id,
                'employee_id': self.assigned_employee.employee_id,
                'name': self.assigned_employee.user.name if self.assigned_employee.user else None,
                'status': self.assigned_employee.status,
            }
        return result


class FleetExpense(db.Model):
    __tablename__ = 'fleet_expenses'
    id = db.Column(db.BigInteger, primary_key=True)
    company_id = db.Column(db.BigInteger, db.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    vehicle_id = db.Column(db.BigInteger, db.ForeignKey('fleet_vehicles.id', ondelete='SET NULL'), index=True)
    expense_type = db.Column(db.String(50), nullable=False, index=True)
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    incurred_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    created_by = db.Column(db.BigInteger, db.ForeignKey('users.id'))

    vehicle = db.relationship('FleetVehicle', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'vehicle_id': self.vehicle_id,
            'expense_type': self.expense_type,
            'description': self.description,
            'amount': float(self.amount),
            'incurred_at': self.incurred_at.isoformat() if self.incurred_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class InvoiceLineItem(db.Model):
    __tablename__ = 'invoice_line_items'
    id = db.Column(db.BigInteger, primary_key=True)
    invoice_id = db.Column(db.BigInteger, db.ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False, index=True)
    description = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    total_price = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'invoice_id': self.invoice_id,
            'description': self.description,
            'quantity': self.quantity,
            'unit_price': float(self.unit_price),
            'total_price': float(self.total_price),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Invoice(db.Model):
    __tablename__ = 'invoices'
    __table_args__ = (CheckConstraint("status IN ('draft', 'sent', 'paid', 'void')"),)

    id = db.Column(db.BigInteger, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    appointment_id = db.Column(db.BigInteger, db.ForeignKey('appointments.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    company_id = db.Column(db.BigInteger, db.ForeignKey('companies.id', ondelete='SET NULL'), index=True)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(20), default='draft', nullable=False, index=True)
    invoice_type = db.Column(db.String(20), default='appointment')
    tax_amount = db.Column(db.Numeric(10, 2), default=0)
    currency = db.Column(db.String(3), default='KES')
    due_date = db.Column(db.DateTime(timezone=True))
    notes = db.Column(db.Text)
    pdf_path = db.Column(db.String(255))
    sent_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    appointment = db.relationship('Appointment', backref=db.backref('invoice', uselist=False), lazy=True)
    customer = db.relationship('User', backref='invoices', lazy=True)
    company = db.relationship('Company', lazy=True, overlaps="invoices")
    line_items = db.relationship('InvoiceLineItem', backref='invoice', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        result = {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'appointment_id': self.appointment_id,
            'user_id': self.user_id,
            'company_id': self.company_id,
            'total_amount': float(self.total_amount),
            'status': self.status,
            'invoice_type': self.invoice_type,
            'tax_amount': float(self.tax_amount),
            'currency': self.currency,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'notes': self.notes,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if self.company:
            result['company'] = self.company.to_dict()
        if self.line_items:
            result['line_items'] = [item.to_dict() for item in self.line_items]
        return result
