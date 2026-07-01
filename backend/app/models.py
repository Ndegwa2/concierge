from app import db
from datetime import datetime
import bcrypt
import uuid
from sqlalchemy import CheckConstraint

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)  # Increased for bcrypt
    phone = db.Column(db.String(20))
    address = db.Column(db.String(255))
    role = db.Column(db.String(20), default='customer')  # 'customer', 'employee', 'admin'
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vehicles = db.relationship('Vehicle', backref='owner', lazy=True)
    appointments = db.relationship('Appointment', backref='customer', lazy=True)
    payment_methods = db.relationship('PaymentMethod', backref='user', lazy=True)
    notifications = db.relationship('Notification', backref='user', lazy=True)
    service_history = db.relationship('ServiceHistory', backref='customer', lazy=True)
    # Relationship to Employee (for users who are employees)
    employee_profile = db.relationship('Employee', backref='user', uselist=False)
     
    def set_password(self, password):
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password):
        """Verify password against bcrypt hash"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self, include_employee=False):
        result = {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        if include_employee and self.employee_profile:
            result['employee'] = self.employee_profile.to_dict()
        
        return result

class Service(db.Model):
    __tablename__ = 'services'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Numeric(10, 2))
    duration = db.Column(db.Integer)
    category = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Vehicle(db.Model):
    __tablename__ = 'vehicles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    make = db.Column(db.String(50), nullable=False)
    model = db.Column(db.String(50), nullable=False)
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
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Appointment(db.Model):
    __tablename__ = 'appointments'
    __table_args__ = (CheckConstraint("status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')"),)
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    partner_id = db.Column(db.Integer, db.ForeignKey('service_partners.id'), nullable=True)
    appointment_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='scheduled')
    notes = db.Column(db.Text)
    total_amount = db.Column(db.Numeric(10, 2))
    payment_status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    service_history = db.relationship('ServiceHistory', backref='appointment', lazy=True, uselist=False)
    partner = db.relationship('ServicePartner', backref='appointments', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'vehicle_id': self.vehicle_id,
            'service_id': self.service_id,
            'partner_id': self.partner_id,
            'appointment_date': self.appointment_date.isoformat(),
            'status': self.status,
            'notes': self.notes,
            'total_amount': float(self.total_amount) if self.total_amount else None,
            'payment_status': self.payment_status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class ServiceHistory(db.Model):
    __tablename__ = 'service_history'
    __table_args__ = (CheckConstraint("rating >= 0 AND rating <= 5"),)
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'))
    completed_date = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    cost = db.Column(db.Numeric(10, 2))
    rating = db.Column(db.Integer)
    review = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
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
            'created_at': self.created_at.isoformat()
        }

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat()
        }

class Admin(db.Model):
    __tablename__ = 'admins'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)  # Increased for bcrypt
    role = db.Column(db.String(20), default='admin')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_password(self, password):
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password):
        """Verify password against bcrypt hash"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class TimestampMixin:
    """Mixin for timestamp fields"""
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Employee(TimestampMixin, db.Model):
    """Employee model for concierge staff"""
    __tablename__ = 'employees'
    __table_args__ = (CheckConstraint("status IN ('active', 'off-duty', 'suspended', 'terminated', 'pending', 'rejected')"),
                      CheckConstraint("rating >= 0.00 AND rating <= 5.00"))
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    employee_id = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    location = db.Column(db.String(100))  # Nairobi CBD, Westlands, etc.
    specialties = db.Column(db.JSON)  # ['Luxury Vehicles', 'Detailing']
    rating = db.Column(db.Numeric(3, 2), default=0.0)
    total_services = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='active')  # active, off-duty, suspended
    hired_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    assignments = db.relationship('Assignment', backref='assigned_employee', lazy=True)
    
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
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @property
    def specialty_list(self):
        """Return specialties as a list, handling None case"""
        return self.specialties if isinstance(self.specialties, list) else []
    
    @specialty_list.setter
    def specialty_list(self, value):
        """Set specialties ensuring it's a list"""
        if value is None:
            self.specialties = []
        elif isinstance(value, list):
            self.specialties = value
        else:
            raise ValueError("Specialties must be a list or None")
    
    def update_rating(self, new_rating):
        """Update rating with bounds checking"""
        rating_val = float(new_rating)
        if not 0 <= rating_val <= 5:
            raise ValueError("Rating must be between 0 and 5")
        self.rating = round(rating_val, 2)
    
    def increment_services(self):
        """Atomically increment service count"""
        self.total_services += 1
    
    def set_status(self, new_status):
        """Set employee status with validation"""
        valid_statuses = ['active', 'off-duty', 'suspended', 'terminated']
        if new_status not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")
        self.status = new_status


class Assignment(db.Model):
    """Assignment model linking employees to appointments"""
    __tablename__ = 'assignments'
    __table_args__ = (CheckConstraint("status IN ('assigned', 'in-progress', 'completed', 'cancelled')"),)
    
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    status = db.Column(db.String(20), default='assigned')  # assigned, in-progress, completed, cancelled
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class ServicePartner(db.Model):
    """Service Partner model for garages, car washes, etc."""
    __tablename__ = 'service_partners'
    __table_args__ = (CheckConstraint("rating >= 0.00 AND rating <= 5.00"),)
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    contact_name = db.Column(db.String(100))
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    address = db.Column(db.JSON)  # {street, city, country}
    services_offered = db.Column(db.JSON)  # ['Oil Change', 'Tire Rotation']
    rating = db.Column(db.Numeric(3, 2), default=0.0)
    total_services = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class AuditLog(db.Model):
    """Audit Log model for tracking all system activities"""
    __tablename__ = 'audit_logs'
    __table_args__ = (CheckConstraint("status IN ('success', 'failed', 'error')"),)
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=True)
    action = db.Column(db.String(50), nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    entity_type = db.Column(db.String(50), nullable=False)  # User, Appointment, Vehicle, etc.
    entity_id = db.Column(db.Integer, nullable=True)
    old_values = db.Column(db.JSON)  # Previous state
    new_values = db.Column(db.JSON)  # New state
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(255))
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='success')  # success, failed, error
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='audit_logs', lazy=True)
    admin = db.relationship('Admin', backref='audit_logs', lazy=True)
    
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
            'created_at': self.created_at.isoformat(),
            'user_name': self.user.name if self.user else None,
            'admin_name': self.admin.name if self.admin else None
        }


class SystemMetric(db.Model):
    """System Metrics model for monitoring system health"""
    __tablename__ = 'system_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    metric_type = db.Column(db.String(50), nullable=False)  # appointments, users, revenue, etc.
    metric_name = db.Column(db.String(100), nullable=False)
    metric_value = db.Column(db.Numeric(15, 2), nullable=False)
    metric_unit = db.Column(db.String(20))  # count, ksh, hours, etc.
    period_start = db.Column(db.DateTime, nullable=False)
    period_end = db.Column(db.DateTime, nullable=False)
    extra_data = db.Column(db.JSON)  # Additional context (renamed from metadata - reserved word)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'metric_type': self.metric_type,
            'metric_name': self.metric_name,
            'metric_value': float(self.metric_value),
            'metric_unit': self.metric_unit,
            'period_start': self.period_start.isoformat(),
            'period_end': self.period_end.isoformat(),
            'extra_data': self.extra_data,
            'created_at': self.created_at.isoformat()
        }


class ActivityTracker(db.Model):
    """Activity Tracker for real-time user activity monitoring"""
    __tablename__ = 'activity_tracker'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=True)
    activity_type = db.Column(db.String(50), nullable=False)  # page_view, api_call, login, etc.
    activity_details = db.Column(db.JSON)
    session_id = db.Column(db.String(100))
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(255))
    duration_ms = db.Column(db.Integer)  # Response time in milliseconds
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='activities', lazy=True)
    admin = db.relationship('Admin', backref='activities', lazy=True)
    
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
            'created_at': self.created_at.isoformat(),
            'user_name': self.user.name if self.user else None,
            'admin_name': self.admin.name if self.admin else None
        }

class PaymentMethod(db.Model):
    __tablename__ = 'payment_methods'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    card_number = db.Column(db.String(255), nullable=False)
    cardholder_name = db.Column(db.String(100), nullable=False)
    expiry_date = db.Column(db.String(10), nullable=False)
    last_four_digits = db.Column(db.String(4))
    is_default = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'card_number': self.card_number,
            'cardholder_name': self.cardholder_name,
            'expiry_date': self.expiry_date,
            'last_four_digits': self.last_four_digits,
            'is_default': self.is_default,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class DiscountCode(db.Model):
    __tablename__ = 'discount_codes'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    discount_type = db.Column(db.String(20), default='percentage')
    value = db.Column(db.Numeric(10, 2), nullable=False)
    minimum_spend = db.Column(db.Numeric(10, 2))
    max_uses = db.Column(db.Integer)
    used_count = db.Column(db.Integer, default=0)
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }