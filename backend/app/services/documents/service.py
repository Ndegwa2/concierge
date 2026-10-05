import os
import hashlib
import uuid
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

from app import db
from app.services.documents.models import Document, Signature, SignatureAuditLog
from flask import current_app

UPLOAD_FOLDER = 'uploads/documents'


def _document_upload_folder():
    base = current_app.config.get('DOCUMENT_UPLOAD_FOLDER', UPLOAD_FOLDER)
    return base


def _save_signature_image(data_url):
    if not data_url:
        return None, None, None
    prefix, _, b64 = data_url.partition(',')
    if not b64:
        return None, None, None
    import base64 as b64mod
    import mimetypes
    fmt = prefix.split('/')[-1].split(';')[0].lower()
    mime = f'image/{fmt}' if fmt in ('png', 'jpeg', 'jpg', 'webp', 'gif') else 'image/png'
    ext = fmt if fmt in ('png', 'jpeg', 'jpg', 'webp', 'gif') else 'png'
    name = f'{uuid.uuid4().hex}.{ext}'
    folder = os.path.join(_document_upload_folder(), 'signatures')
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, name)
    full_path = os.path.join(current_app.root_path, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'wb') as f:
        f.write(b64mod.b64decode(b64))
    return path, name, mime


# --- Onboarding document uploads -------------------------------------------

ONBOARDING_DOC_ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}
ONBOARDING_DOC_ALLOWED_MIME = {
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}
ONBOARDING_DOC_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


def save_onboarding_document(file_storage, user_id, title, doc_type='onboarding'):
    """Persist an uploaded onboarding document and create a ``Document`` row.

    The file is stored under ``<DOCUMENT_UPLOAD_FOLDER>/onboarding/<user_id>/``
    and a ``Document`` record with ``doc_type='onboarding'`` is created but
    **not** committed — the caller is responsible for the transaction.

    Parameters
    ----------
    file_storage:
        A ``werkzeug.datastructures.FileStorage`` instance (``request.files``).
    user_id:
        The id of the user who uploaded the document (also used as
        ``reference_id`` / ``reference_type='user'``).
    title:
        Human-readable title for the document.
    doc_type:
        Defaults to ``'onboarding'``; any value allowed by the model
        ``CheckConstraint`` is accepted.

    Raises
    ------
    ValueError
        If the file is missing, empty, has a disallowed extension or MIME type,
        or exceeds the size limit.
    """
    from werkzeug.utils import secure_filename

    if file_storage is None or not file_storage.filename:
        raise ValueError('No file selected')

    ext = os.path.splitext(file_storage.filename)[1].lower()
    if ext not in ONBOARDING_DOC_ALLOWED_EXTENSIONS:
        raise ValueError(
            'File type not allowed. Accepted: PDF, JPG, PNG, DOC, DOCX'
        )

    mime = (file_storage.mimetype or '').lower()
    if mime not in ONBOARDING_DOC_ALLOWED_MIME:
        raise ValueError('Invalid file type detected')

    if file_storage.content_length and file_storage.content_length > ONBOARDING_DOC_MAX_BYTES:
        raise ValueError(f'File size exceeds {ONBOARDING_DOC_MAX_BYTES // (1024 * 1024)} MB limit')

    # Generate a deterministic-yet-unique filename per user.
    unique_name = f"onboarding_{user_id}_{uuid.uuid4().hex}{ext}"
    rel_folder = os.path.join(_document_upload_folder(), 'onboarding', str(user_id))
    full_folder = os.path.join(current_app.root_path, rel_folder)
    os.makedirs(full_folder, exist_ok=True)

    full_path = os.path.join(full_folder, unique_name)
    file_storage.save(full_path)

    file_size = os.path.getsize(full_path)
    rel_path = os.path.join(rel_folder, unique_name)

    return create_document(
        title=title,
        doc_type=doc_type,
        description=f'Onboarding document uploaded during registration',
        reference_id=user_id,
        reference_type='user',
        created_by=user_id,
        file_path=rel_path,
        file_name=secure_filename(file_storage.filename) or file_storage.filename,
        file_size=file_size,
        mime_type=file_storage.mimetype,
    ), full_path


def create_document(title, doc_type, description, reference_id, reference_type,
                    created_by, expires_days=30, file_path=None, file_name=None,
                    file_size=None, mime_type=None):
    document = Document(
        title=title,
        doc_type=doc_type,
        description=description,
        reference_id=reference_id,
        reference_type=reference_type,
        file_path=file_path,
        file_name=file_name,
        file_size=file_size,
        mime_type=mime_type,
        status='pending',
        created_by=created_by,
        expires_at=datetime.now(timezone.utc) + timedelta(days=expires_days),
    )
    db.session.add(document)
    db.session.flush()
    _log_event(document, 'document_created', created_by, 'user')
    return document


def get_document(document_id):
    return Document.query.get(document_id)


def list_documents(reference_id=None, reference_type=None, doc_type=None,
                   status=None, created_by=None, signer_id=None,
                   limit=None, offset=0):
    q = apply_document_filters(
        Document.query, reference_id=reference_id, reference_type=reference_type,
        doc_type=doc_type, status=status, created_by=created_by, signer_id=signer_id,
    )
    q = q.order_by(Document.created_at.desc())
    if offset:
        q = q.offset(offset)
    if limit:
        q = q.limit(limit)
    return q.all()


def apply_document_filters(q, reference_id=None, reference_type=None, doc_type=None,
                           status=None, created_by=None, signer_id=None):
    if reference_id is not None:
        q = q.filter(Document.reference_id == reference_id)
    if reference_type is not None:
        q = q.filter(Document.reference_type == reference_type)
    if doc_type is not None:
        q = q.filter(Document.doc_type == doc_type)
    if status is not None:
        q = q.filter(Document.status == status)
    if created_by is not None:
        q = q.filter(Document.created_by == created_by)
    if signer_id is not None:
        q = q.filter(Document.signed_by == signer_id)
    return q


def list_documents_for_user(user_id, reference_id=None, reference_type=None,
                            doc_type=None, status=None, limit=None, offset=0):
    """Documents a non-privileged user is entitled to see.

    Scoped server-side to documents they authored, signed, or that were raised
    against them - the caller cannot widen this by passing query parameters.
    """
    from sqlalchemy import select
    from app.services.documents.models import Signature

    signed_document_ids = select(Signature.document_id).where(Signature.signer_id == user_id)

    q = Document.query.filter(
        db.or_(
            Document.created_by == user_id,
            Document.signed_by == user_id,
            Document.id.in_(signed_document_ids),
            db.and_(Document.reference_type == 'user', Document.reference_id == user_id),
        )
    )
    q = apply_document_filters(
        q, reference_id=reference_id, reference_type=reference_type,
        doc_type=doc_type, status=status,
    )
    q = q.order_by(Document.created_at.desc())
    if offset:
        q = q.offset(offset)
    if limit:
        q = q.limit(limit)
    return q.all()


def get_signature(signature_id):
    return Signature.query.get(signature_id)


def send_document(document_id, actor_id):
    document = get_document(document_id)
    if not document:
        return None
    if document.status not in ('pending',):
        return None
    document.status = 'sent'
    document.sent_at = datetime.now(timezone.utc)
    db.session.flush()
    _log_event(document, 'document_sent', actor_id, 'user')
    return document


def capture_signature(document_id, signer_name, signer_email, signer_id,
                       signature_data, signer_ip=None, signer_user_agent=None,
                       signer_location=None, note=None):
    document = get_document(document_id)
    if not document or document.status not in ('pending', 'sent'):
        return None

    sig_image_path, sig_image_name, sig_mime = _save_signature_image(signature_data)
    sig_hash = hashlib.sha256(signature_data.encode('utf-8') if isinstance(signature_data, str) else signature_data).hexdigest()

    signature = Signature(
        document_id=document_id,
        signer_name=signer_name,
        signer_email=signer_email,
        signer_id=signer_id,
        signature_image_path=sig_image_path,
        signature_image_name=sig_image_name,
        signature_hash=sig_hash,
        signature_data=signature_data[:500000] if signature_data else None,
        signer_ip=signer_ip,
        signer_user_agent=signer_user_agent,
        signer_location=signer_location,
        status='captured',
        note=note,
    )
    db.session.add(signature)
    db.session.flush()

    document.status = 'signed'
    document.signed_by = signer_id or signer_email
    document.signed_at = datetime.now(timezone.utc)
    db.session.flush()

    _log_event(document, 'signature_captured', signer_id or 0, 'user',
               ip_address=signer_ip, user_agent=signer_user_agent,
               details={'signer_name': signer_name, 'signer_email': signer_email})
    return signature


def decline_document(document_id, actor_id, reason):
    document = get_document(document_id)
    if not document or document.status not in ('pending', 'sent'):
        return None
    document.status = 'declined'
    document.declined_at = datetime.now(timezone.utc)
    document.decline_reason = reason
    db.session.flush()
    _log_event(document, 'document_declined', actor_id, 'user',
               details={'reason': reason})
    return document


def verify_signature(signature_id, verifier_id):
    signature = Signature.query.get(signature_id)
    if not signature or signature.status != 'captured':
        return None
    stored_hash = signature.signature_hash
    computed_hash = signature.compute_hash()
    if not stored_hash or stored_hash != computed_hash:
        signature.status = 'rejected'
        _log_event(signature.document, 'signature_rejected', verifier_id, 'user',
                   details={'reason': 'Hash mismatch - possible tampering'})
        db.session.flush()
        return None
    signature.status = 'verified'
    signature.verified_at = datetime.now(timezone.utc)
    signature.verified_by = verifier_id
    db.session.flush()
    _log_event(signature.document, 'signature_verified', verifier_id, 'user',
               details={'signer': signature.signer_name})
    return signature


def cancel_document(document_id, actor_id):
    document = get_document(document_id)
    if not document or document.status not in ('pending', 'sent'):
        return None
    document.status = 'cancelled'
    db.session.flush()
    _log_event(document, 'document_cancelled', actor_id, 'user')
    return document


def get_audit_trail(document_id):
    return SignatureAuditLog.query.filter_by(document_id=document_id).order_by(SignatureAuditLog.created_at.asc()).all()


def _log_event(document, event_type, actor_id, actor_type,
               ip_address=None, user_agent=None, details=None):
    log = SignatureAuditLog(
        document_id=document.id,
        event_type=event_type,
        actor_id=actor_id,
        actor_type=actor_type,
        actor_name=document.creator.name if document.creator else None,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details or {},
        document_hash=document.compute_hash() if hasattr(document, 'compute_hash') else None,
    )
    db.session.add(log)
    db.session.flush()
