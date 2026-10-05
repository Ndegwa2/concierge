"""Document / e-signature HTTP API.

Every endpoint resolves a capability through
``app.services.documents.policies`` before touching a row. The module used to
rely on ``@jwt_required()`` alone, which let any authenticated user read, edit,
audit and *sign* any other user's document by id.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timezone
import hashlib
import hmac
import logging

from app import db, limiter
from app.services.auth.models import User
from app.services.documents.models import Document, Signature, SignatureAuditLog
from app.services.documents.policies import (
    PRIVILEGED_ROLES,
    can_manage_document,
    can_sign_document,
    can_view_document,
    current_role,
    current_user_id,
    is_privileged,
)
from app.services.documents.service import (
    create_document, get_document, list_documents, list_documents_for_user,
    send_document, capture_signature, decline_document, verify_signature,
    cancel_document, get_audit_trail,
)

logger = logging.getLogger(__name__)

bp = Blueprint('documents_bp', 'documents', url_prefix='/api/documents')


DOC_TYPE_LABELS = {
    'work_order': 'Work Order',
    'service_agreement': 'Service Agreement',
    'invoice': 'Invoice',
    'other': 'Other Document',
    'onboarding': 'Onboarding Document',
}

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


def _auth_error():
    return jsonify({
        'success': False,
        'message': 'Authentication required',
        'error': 'MISSING_TOKEN',
    }), 401


def _not_found():
    # A 404 (rather than 403) for rows the caller may not see avoids confirming
    # that a document id exists at all.
    return jsonify({'success': False, 'message': 'Document not found'}), 404


def _forbidden(message='You do not have permission to access this document'):
    return jsonify({'success': False, 'message': message, 'error': 'ACCESS_DENIED'}), 403


def _pagination():
    try:
        limit = int(request.args.get('limit', DEFAULT_PAGE_SIZE))
        offset = int(request.args.get('offset', 0))
    except (TypeError, ValueError):
        limit, offset = DEFAULT_PAGE_SIZE, 0
    limit = max(1, min(limit, MAX_PAGE_SIZE))
    return limit, max(offset, 0)


def _load_document(document_id, capability):
    """Fetch a document the caller is allowed to act on.

    Returns ``(document, error_response)`` - exactly one of which is None.
    """
    user_id = current_user_id()
    if user_id is None:
        return None, _auth_error()

    document = get_document(document_id)
    if not document:
        return None, _not_found()

    role = current_role()
    allowed = {
        'view': lambda: can_view_document(user_id, document, role),
        'manage': lambda: can_manage_document(user_id, document, role),
    }.get(capability)
    if allowed is None:
        raise ValueError(f'Unknown capability {capability!r}')
    if not allowed():
        return None, _forbidden()
    return document, None


@bp.route('/', methods=['POST'])
@jwt_required()
@limiter.limit("30 per minute")
def create_doc():
    user_id = current_user_id()
    if user_id is None:
        return _auth_error()

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'success': False, 'message': 'Request body must be a JSON object'}), 400

    # File metadata is never accepted from the client: it used to be persisted
    # verbatim (file_path/file_name/mime_type), which let a caller point a
    # document at an arbitrary path. Files arrive through the upload endpoints.
    allowed_fields = {'title', 'doc_type', 'description', 'reference_id',
                      'reference_type', 'expires_days'}
    rejected = sorted(set(data) - allowed_fields)
    if rejected:
        return jsonify({
            'success': False,
            'message': f"Unsupported field(s): {', '.join(rejected)}",
        }), 400

    title = (data.get('title') or '').strip()
    if not title or len(title) > 255:
        return jsonify({'success': False, 'message': 'A title of 1-255 characters is required'}), 400

    doc_type = (data.get('doc_type') or '').strip().lower()
    if doc_type not in DOC_TYPE_LABELS:
        return jsonify({
            'success': False,
            'message': f"doc_type must be one of: {', '.join(sorted(DOC_TYPE_LABELS))}",
        }), 400

    try:
        expires_days = int(data.get('expires_days', 30))
    except (TypeError, ValueError):
        return jsonify({'success': False, 'message': 'expires_days must be an integer'}), 400
    expires_days = max(1, min(expires_days, 365))

    doc = create_document(
        title=title,
        doc_type=doc_type,
        description=data.get('description'),
        reference_id=data.get('reference_id'),
        reference_type=data.get('reference_type'),
        created_by=user_id,
        expires_days=expires_days,
    )
    db.session.commit()
    return jsonify({'success': True, 'data': doc.to_dict(include_file=True)}), 201


@bp.route('/', methods=['GET'])
@jwt_required()
def list_docs():
    user_id = current_user_id()
    if user_id is None:
        return _auth_error()

    limit, offset = _pagination()
    filters = {
        'reference_id': request.args.get('reference_id'),
        'reference_type': request.args.get('reference_type'),
        'doc_type': request.args.get('doc_type'),
        'status': request.args.get('status'),
    }

    if is_privileged():
        docs = list_documents(limit=limit, offset=offset, **filters)
    else:
        # Staff-only filters are ignored rather than honoured for ordinary users.
        docs = list_documents_for_user(user_id, limit=limit, offset=offset, **filters)

    return jsonify({
        'success': True,
        'data': [d.to_dict(include_file=False) for d in docs],
        'total': len(docs),
        'limit': limit,
        'offset': offset,
    })


@bp.route('/<int:document_id>', methods=['GET'])
@jwt_required()
def get_doc(document_id):
    doc, error = _load_document(document_id, 'view')
    if error:
        return error
    return jsonify({'success': True, 'data': doc.to_dict(include_file=True)})


@bp.route('/<int:document_id>', methods=['PUT'])
@jwt_required()
@limiter.limit("60 per minute")
def update_doc(document_id):
    doc, error = _load_document(document_id, 'manage')
    if error:
        return error

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'success': False, 'message': 'Request body must be a JSON object'}), 400

    # Status transitions have dedicated endpoints (/send, /cancel, /decline),
    # so `status` is deliberately not writable here.
    allowed_fields = {'title', 'description', 'expires_at'}
    rejected = sorted(set(data) - allowed_fields)
    if rejected:
        return jsonify({
            'success': False,
            'message': f"Unsupported field(s): {', '.join(rejected)}",
        }), 400

    if 'title' in data:
        title = (data.get('title') or '').strip()
        if not title or len(title) > 255:
            return jsonify({'success': False, 'message': 'A title of 1-255 characters is required'}), 400
        doc.title = title
    if 'description' in data:
        doc.description = data['description']
    if 'expires_at' in data:
        raw = data['expires_at']
        if raw is None:
            doc.expires_at = None
        elif isinstance(raw, str):
            try:
                doc.expires_at = datetime.fromisoformat(raw.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'success': False, 'message': 'expires_at must be an ISO-8601 timestamp'}), 400
        else:
            return jsonify({'success': False, 'message': 'expires_at must be an ISO-8601 timestamp'}), 400

    db.session.commit()
    return jsonify({'success': True, 'data': doc.to_dict(include_file=True)})


@bp.route('/<int:document_id>/send', methods=['POST'])
@jwt_required()
def send_doc(document_id):
    doc, error = _load_document(document_id, 'manage')
    if error:
        return error

    updated = send_document(document_id, current_user_id())
    if not updated:
        return jsonify({'success': False, 'message': 'Document cannot be sent in its current state'}), 400
    db.session.commit()
    return jsonify({'success': True, 'data': updated.to_dict(include_file=False)})


@bp.route('/<int:document_id>/signatures', methods=['POST'])
@jwt_required()
@limiter.limit("20 per minute")
def add_signature(document_id):
    user_id = current_user_id()
    if user_id is None:
        return _auth_error()

    document = get_document(document_id)
    if not document:
        return _not_found()

    allowed, reason = can_sign_document(user_id, document, current_role())
    if not allowed:
        return _forbidden(reason)

    data = request.get_json(silent=True) or {}
    current_user = User.query.get(user_id)
    if not current_user:
        return _auth_error()

    signature_data = data.get('signature_data')
    if signature_data and not isinstance(signature_data, str):
        return jsonify({'success': False, 'message': 'signature_data must be a string'}), 400
    if signature_data and len(signature_data) > 500000:
        return jsonify({'success': False, 'message': 'signature_data is too large'}), 400

    # Identity always comes from the authenticated account. Accepting
    # signer_name/signer_email from the body let a caller sign as anybody.
    sig = capture_signature(
        document_id=document_id,
        signer_name=current_user.name,
        signer_email=current_user.email,
        signer_id=user_id,
        signature_data=signature_data,
        signer_ip=request.remote_addr,
        signer_user_agent=request.headers.get('User-Agent'),
        signer_location=data.get('signer_location') if is_privileged() else None,
        note=data.get('note'),
    )
    if not sig:
        return jsonify({'success': False, 'message': 'Cannot capture signature - document may not be available for signing'}), 400
    db.session.commit()
    return jsonify({'success': True, 'data': sig.to_dict()}), 201


@bp.route('/<int:document_id>/signatures', methods=['GET'])
@jwt_required()
def list_signatures(document_id):
    doc, error = _load_document(document_id, 'view')
    if error:
        return error
    sigs = doc.signatures.all()
    return jsonify({'success': True, 'data': [s.to_dict() for s in sigs]})


@bp.route('/<int:document_id>/decline', methods=['POST'])
@jwt_required()
def decline_doc(document_id):
    doc, error = _load_document(document_id, 'view')
    if error:
        return error

    data = request.get_json(silent=True) or {}
    updated = decline_document(document_id, current_user_id(), (data.get('reason') or '')[:1000])
    if not updated:
        return jsonify({'success': False, 'message': 'Cannot decline document'}), 400
    db.session.commit()
    return jsonify({'success': True, 'data': updated.to_dict()})


@bp.route('/<int:document_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_doc(document_id):
    doc, error = _load_document(document_id, 'manage')
    if error:
        return error

    updated = cancel_document(document_id, current_user_id())
    if not updated:
        return jsonify({'success': False, 'message': 'Cannot cancel document'}), 400
    db.session.commit()
    return jsonify({'success': True, 'data': updated.to_dict()})


@bp.route('/signatures/<int:signature_id>/verify', methods=['POST'])
@jwt_required()
@limiter.limit("30 per minute")
def verify_sig(signature_id):
    user_id = current_user_id()
    if user_id is None:
        return _auth_error()

    signature = Signature.query.get(signature_id)
    if not signature:
        return jsonify({'success': False, 'message': 'Signature not found'}), 404

    document = get_document(signature.document_id)
    if not document or not can_manage_document(user_id, document, current_role()):
        return _forbidden('Only the document owner or staff can verify a signature')

    sig = verify_signature(signature_id, user_id)
    if not sig:
        db.session.commit()
        return jsonify({'success': False, 'message': 'Cannot verify signature - hash mismatch or invalid state'}), 400
    db.session.commit()
    return jsonify({'success': True, 'data': sig.to_dict()})


@bp.route('/<int:document_id>/audit', methods=['GET'])
@jwt_required()
def get_audit(document_id):
    doc, error = _load_document(document_id, 'view')
    if error:
        return error
    logs = get_audit_trail(document_id)
    return jsonify({
        'success': True,
        'data': [l.to_dict() for l in logs],
        'total': len(logs),
    })


@bp.route('/verify-signature', methods=['POST'])
@jwt_required()
@limiter.limit("30 per minute")
def verify_signature_hash():
    """Compare a provided signature payload with a stored hash."""
    data = request.get_json(silent=True) or {}
    signature_data = data.get('signature_data')
    stored_hash = data.get('signature_hash')
    if not signature_data or not stored_hash:
        return jsonify({'success': False, 'message': 'Missing signature data or hash'}), 400

    payload = signature_data.encode('utf-8') if isinstance(signature_data, str) else bytes(signature_data)
    computed = hashlib.sha256(payload).hexdigest()
    match = hmac.compare_digest(computed, str(stored_hash))
    return jsonify({'success': True, 'data': {'match': match, 'computed_hash': computed}})
