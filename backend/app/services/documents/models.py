from app import db
from sqlalchemy import func, CheckConstraint
from app.core.types import BigId, JSONType
from datetime import datetime, timezone


class Document(db.Model):
    __tablename__ = 'documents'
    __table_args__ = (
                CheckConstraint(
            "doc_type IN ('work_order', 'service_agreement', 'invoice', 'other', 'onboarding')"
        ),
        CheckConstraint(
            "status IN ('pending', 'sent', 'signed', 'declined', 'cancelled', 'expired')"
        ),
    )

    id = db.Column(BigId, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    doc_type = db.Column(db.String(30), nullable=False, index=True)
    description = db.Column(db.Text)
    reference_id = db.Column(db.BigInteger, nullable=True, index=True)
    reference_type = db.Column(db.String(30), nullable=True, index=True)
    file_path = db.Column(db.String(500), nullable=True)
    file_name = db.Column(db.String(255), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    mime_type = db.Column(db.String(100), nullable=True)
    status = db.Column(
        db.String(20), default='pending', nullable=False, index=True
    )
    expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_by = db.Column(
        db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=False, index=True
    )
    signed_by = db.Column(
        db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True
    )
    signed_at = db.Column(db.DateTime(timezone=True), nullable=True, index=True)
    declined_at = db.Column(db.DateTime(timezone=True), nullable=True)
    decline_reason = db.Column(db.Text, nullable=True)
    sent_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    creator = db.relationship('User', foreign_keys=[created_by], lazy='joined')
    signer = db.relationship('User', foreign_keys=[signed_by], lazy='joined')

    def to_dict(self, include_file=False):
        result = {
            'id': self.id,
            'title': self.title,
            'doc_type': self.doc_type,
            'description': self.description,
            'reference_id': self.reference_id,
            'reference_type': self.reference_type,
            'status': self.status,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_by': self.created_by,
            'signed_by': self.signed_by,
            'signed_at': self.signed_at.isoformat() if self.signed_at else None,
            'declined_at': self.declined_at.isoformat() if self.declined_at else None,
            'decline_reason': self.decline_reason,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_file:
            result['file_path'] = self.file_path
            result['file_name'] = self.file_name
            result['file_size'] = self.file_size
            result['mime_type'] = self.mime_type
        return result


class Signature(db.Model):
    __tablename__ = 'signatures'
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'captured', 'verified', 'rejected')"
        ),
    )

    id = db.Column(BigId, primary_key=True, autoincrement=True)
    document_id = db.Column(
        db.BigInteger, db.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True
    )
    signer_name = db.Column(db.String(255), nullable=False)
    signer_email = db.Column(db.String(255), nullable=True, index=True)
    signer_id = db.Column(
        db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True
    )
    signature_image_path = db.Column(db.String(500), nullable=True)
    signature_image_name = db.Column(db.String(255), nullable=True)
    signature_hash = db.Column(db.String(64), nullable=True, index=True)
    signature_data = db.Column(db.Text, nullable=True)
    signer_ip = db.Column(db.String(45), nullable=True)
    signer_user_agent = db.Column(db.Text, nullable=True)
    signer_location = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default='captured', nullable=False, index=True)
    verified_at = db.Column(db.DateTime(timezone=True), nullable=True)
    verified_by = db.Column(
        db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True
    )
    rejection_reason = db.Column(db.Text, nullable=True)
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    document = db.relationship('Document', backref=db.backref('signatures', lazy='dynamic', cascade='all, delete-orphan'))
    signer = db.relationship('User', foreign_keys=[signer_id], lazy='joined')
    verifier = db.relationship('User', foreign_keys=[verified_by], lazy='joined')

    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'signer_name': self.signer_name,
            'signer_email': self.signer_email,
            'signer_id': self.signer_id,
            'signature_image_path': self.signature_image_path,
            'signature_image_name': self.signature_image_name,
            'signature_hash': self.signature_hash,
            'signature_data': self.signature_data,
            'signer_ip': self.signer_ip,
            'signer_user_agent': self.signer_user_agent,
            'signer_location': self.signer_location,
            'status': self.status,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'verified_by': self.verified_by,
            'rejection_reason': self.rejection_reason,
            'note': self.note,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def compute_hash(self):
        import hashlib
        if self.signature_data:
            return hashlib.sha256(self.signature_data.encode('utf-8')).hexdigest()
        return None


class SignatureAuditLog(db.Model):
    __tablename__ = 'signature_audit_logs'

    id = db.Column(BigId, primary_key=True, autoincrement=True)
    document_id = db.Column(
        db.BigInteger, db.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True
    )
    event_type = db.Column(db.String(50), nullable=False, index=True)
    actor_id = db.Column(
        db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True
    )
    actor_type = db.Column(db.String(20), nullable=False)
    actor_name = db.Column(db.String(255), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)
    details = db.Column(JSONType, nullable=True, default=lambda: {})
    document_hash = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), index=True)

    document = db.relationship('Document', backref=db.backref('audit_logs', lazy='dynamic', cascade='all, delete-orphan'))
    actor = db.relationship('User', lazy='joined')

    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'event_type': self.event_type,
            'actor_id': self.actor_id,
            'actor_type': self.actor_type,
            'actor_name': self.actor_name,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'details': self.details,
            'document_hash': self.document_hash,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

