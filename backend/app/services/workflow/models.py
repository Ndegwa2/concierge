from app import db
from sqlalchemy import func, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB


class VehicleChecklist(db.Model):
    __tablename__ = 'vehicle_checklists'
    __table_args__ = (
        CheckConstraint("overall_condition IN ('excellent', 'good', 'fair', 'poor')"),
    )

    id = db.Column(db.BigInteger, primary_key=True)
    assignment_id = db.Column(db.BigInteger, db.ForeignKey('assignments.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    appointment_id = db.Column(db.BigInteger, db.ForeignKey('appointments.id', ondelete='CASCADE'), nullable=False, index=True)
    employee_id = db.Column(db.BigInteger, db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    items = db.Column(JSONB, nullable=False, default=lambda: [])
    overall_condition = db.Column(db.String(20), nullable=False, index=True)
    notes = db.Column(db.Text)
    photos = db.Column(JSONB, default=lambda: [])
    submitted_at = db.Column(db.DateTime(timezone=True), index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    assignment = db.relationship('Assignment', backref=db.backref('checklist', uselist=False, cascade='all, delete-orphan'), lazy=True)
    appointment = db.relationship('Appointment', backref=db.backref('checklists', cascade='all, delete-orphan'), lazy=True)
    employee = db.relationship('Employee', backref=db.backref('checklists', cascade='all, delete-orphan'), lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'assignment_id': self.assignment_id,
            'appointment_id': self.appointment_id,
            'employee_id': self.employee_id,
            'items': self.items or [],
            'overall_condition': self.overall_condition,
            'notes': self.notes,
            'photos': self.photos or [],
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class WorkRecord(db.Model):
    __tablename__ = 'work_records'
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'submitted', 'verified', 'invoiced')"),
    )

    id = db.Column(db.BigInteger, primary_key=True)
    assignment_id = db.Column(db.BigInteger, db.ForeignKey('assignments.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    appointment_id = db.Column(db.BigInteger, db.ForeignKey('appointments.id', ondelete='CASCADE'), nullable=False, index=True)
    employee_id = db.Column(db.BigInteger, db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    customer_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    items = db.Column(JSONB, nullable=False, default=lambda: [])
    overall_notes = db.Column(db.Text)
    labor_hours = db.Column(db.Numeric(5, 2))
    labor_rate = db.Column(db.Numeric(10, 2))
    subtotal = db.Column(db.Numeric(10, 2), default=0)
    tax_amount = db.Column(db.Numeric(10, 2), default=0)
    total_amount = db.Column(db.Numeric(10, 2), default=0)
    status = db.Column(db.String(20), default='draft', nullable=False, index=True)
    submitted_at = db.Column(db.DateTime(timezone=True), index=True)
    verified_at = db.Column(db.DateTime(timezone=True), index=True)
    verified_by = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'), index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    assignment = db.relationship('Assignment', backref=db.backref('work_record', uselist=False, cascade='all, delete-orphan'), lazy=True)
    appointment = db.relationship('Appointment', backref=db.backref('work_records', cascade='all, delete-orphan'), lazy=True)
    employee = db.relationship('Employee', backref=db.backref('work_records', cascade='all, delete-orphan'), lazy=True)
    customer = db.relationship('User', backref=db.backref('work_records', cascade='all, delete-orphan'), lazy=True, foreign_keys=[customer_id])
    verifier = db.relationship('User', backref=db.backref('verified_work_records', cascade='all, delete-orphan'), lazy=True, foreign_keys=[verified_by])

    def to_dict(self):
        return {
            'id': self.id,
            'assignment_id': self.assignment_id,
            'appointment_id': self.appointment_id,
            'employee_id': self.employee_id,
            'customer_id': self.customer_id,
            'items': self.items or [],
            'overall_notes': self.overall_notes,
            'labor_hours': float(self.labor_hours) if self.labor_hours else None,
            'labor_rate': float(self.labor_rate) if self.labor_rate else None,
            'subtotal': float(self.subtotal) if self.subtotal else 0,
            'tax_amount': float(self.tax_amount) if self.tax_amount else 0,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'status': self.status,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'verified_by': self.verified_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
