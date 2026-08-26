from app import db
from sqlalchemy import func, CheckConstraint


class Appointment(db.Model):
    __tablename__ = 'appointments'
    __table_args__ = (
        CheckConstraint("status IN ('scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rescheduled', 'overdue')"),
        CheckConstraint("payment_status IN ('pending', 'paid', 'refunded', 'failed')"),
    )

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

    customer = db.relationship('User', backref='appointments', lazy=True)
    vehicle = db.relationship('Vehicle', backref='appointments', lazy=True)
    service = db.relationship('Service', backref='appointments', lazy=True)

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
