from app import db
from sqlalchemy import func


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
