from app import db
from sqlalchemy import func
from app.core.types import EncryptedString
import bcrypt


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(EncryptedString(255))
    address = db.Column(EncryptedString(255))
    role = db.Column(db.String(20), default='customer', index=True)
    is_admin = db.Column(db.Boolean, default=False, index=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
