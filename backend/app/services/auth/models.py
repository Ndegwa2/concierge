from app import db
from sqlalchemy import func
from sqlalchemy.orm import validates
from app.core.types import EncryptedString
import hashlib
import bcrypt


def mask_phone(phone: str) -> str:
    if not phone:
        return None
    digits = phone.replace('+', '').replace('-', '').replace(' ', '')
    if len(digits) <= 4:
        return '****'
    return f'****{digits[-4:]}'


def mask_email(email: str) -> str:
    if not email:
        return None
    parts = email.split('@', 1)
    if len(parts) != 2:
        return '*****'
    local, domain = parts
    if len(local) <= 2:
        masked_local = '*' * len(local)
    else:
        masked_local = local[0] + '*' * (len(local) - 2) + local[-1]
    domain_parts = domain.split('.')
    if len(domain_parts) > 1:
        domain_parts[-2] = '*' * len(domain_parts[-2]) if domain_parts[-2] else '*'
    masked_domain = '.'.join(domain_parts)
    return f'{masked_local}@{masked_domain}'


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(EncryptedString(255))
    phone_search_token = db.Column(db.String(64), index=True)
    address = db.Column(EncryptedString(255))
    role = db.Column(db.String(20), default='customer', index=True)
    is_admin = db.Column(db.Boolean, default=False, index=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @staticmethod
    def _normalize_phone(phone):
        if not phone:
            return None
        return phone.replace(" ", "").replace("-", "")

    @staticmethod
    def _compute_phone_search_token(phone):
        normalized = User._normalize_phone(phone)
        if not normalized:
            return None
        return hashlib.sha256(normalized.encode('utf-8')).hexdigest()

    @validates('phone')
    def _update_phone_search_token(self, key, phone):
        self.phone_search_token = User._compute_phone_search_token(phone)
        return phone

    def set_password(self, password):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self, include_employee=False, mask_sensitive=True):
        result = {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'is_admin': self.is_admin,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

        if mask_sensitive:
            result['phone'] = mask_phone(self.phone) if self.phone else None
            result['address'] = None if self.address else None
        else:
            result['phone'] = self.phone
            result['address'] = self.address

        if include_employee and self.employee_profile:
            result['employee'] = self.employee_profile.to_dict(mask_sensitive=mask_sensitive)

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
