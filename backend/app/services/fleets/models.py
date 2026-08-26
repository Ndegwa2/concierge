from app import db
from sqlalchemy import func, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB


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

    company = db.relationship('Company', backref='invoices', lazy=True)
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
