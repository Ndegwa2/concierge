from app import db
from datetime import datetime
import bcrypt

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(64), nullable=False)
    phone = db.Column(db.String(20))
    address = db.Column(db.String(255))
    role = db.Column(db.String(20), default='customer')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vehicles = db.relationship('Vehicle', backref='owner', lazy=True)
    appointments = db.relationship('Appointment', backref='customer', lazy=True)
    payment_methods = db.relationship('PaymentMethod', backref='user', lazy=True)
    notifications = db.relationship('Notification', backref='user', lazy=True)
    service_history = db.relationship('ServiceHistory', backref='customer', lazy=True)
    
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
            'phone': self.phone,
            'address': self.address,
            'role': self.role,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

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
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Appointment(db.Model):
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    appointment_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='scheduled')
    notes = db.Column(db.Text)
    total_amount = db.Column(db.Numeric(10, 2))
    payment_status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    service_history = db.relationship('ServiceHistory', backref='appointment', lazy=True, uselist=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'vehicle_id': self.vehicle_id,
            'service_id': self.service_id,
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
    password_hash = db.Column(db.String(64), nullable=False)
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