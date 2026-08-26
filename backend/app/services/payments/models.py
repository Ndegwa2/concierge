from app import db
from sqlalchemy import func, CheckConstraint
from datetime import datetime, timezone


class Payment(db.Model):
    __tablename__ = 'payments'
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')"),
        CheckConstraint("method IN ('mpesa', 'card', 'cash', 'bank_transfer')"),
    )

    id = db.Column(db.BigInteger, primary_key=True)
    payment_reference = db.Column(db.String(50), unique=True, nullable=False, index=True)
    invoice_id = db.Column(db.BigInteger, db.ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False, index=True)
    appointment_id = db.Column(db.BigInteger, db.ForeignKey('appointments.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='KES')
    method = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False, index=True)

    mpesa_receipt_number = db.Column(db.String(50))
    mpesa_phone_number = db.Column(db.String(20))
    mpesa_transaction_date = db.Column(db.DateTime(timezone=True))

    card_last_four = db.Column(db.String(4))
    card_brand = db.Column(db.String(50))

    merchant_request_id = db.Column(db.String(100))
    checkout_request_id = db.Column(db.String(100))

    failure_reason = db.Column(db.Text)
    notes = db.Column(db.Text)

    paid_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    invoice = db.relationship('Invoice', backref='payments', lazy=True)
    appointment = db.relationship('Appointment', backref='payments', lazy=True)
    user = db.relationship('User', backref='payments', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'payment_reference': self.payment_reference,
            'invoice_id': self.invoice_id,
            'appointment_id': self.appointment_id,
            'user_id': self.user_id,
            'amount': float(self.amount),
            'currency': self.currency,
            'method': self.method,
            'status': self.status,
            'mpesa_receipt_number': self.mpesa_receipt_number,
            'mpesa_phone_number': self.mpesa_phone_number,
            'mpesa_transaction_date': self.mpesa_transaction_date.isoformat() if self.mpesa_transaction_date else None,
            'card_last_four': self.card_last_four,
            'card_brand': self.card_brand,
            'failure_reason': self.failure_reason,
            'notes': self.notes,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
