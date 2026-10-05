"""Authorization policy for the documents / e-signature domain.

Document endpoints previously relied on ``@jwt_required()`` alone, so any
authenticated customer could read, read the audit trail of, re-assign and even
*sign* another customer's legal document by walking the id space. Every
capability is now decided here so the rules live in exactly one place.

Resolution of "who is this user to this document" is intentionally explicit:

* ``creator``   - ``Document.created_by == user``
* ``signer``    - ``Document.signed_by == user`` or a captured ``Signature``
* ``reference`` - the document was raised against this user
                  (``reference_type == 'user'`` and ``reference_id == user``)
* ``privileged``- staff roles that administer documents
"""
from typing import Optional, Tuple

from app import db
from app.services.documents.models import Document, Signature

PRIVILEGED_ROLES = ('admin', 'super_admin', 'concierge', 'manager')

# Statuses in which a document may still be acted upon.
OPEN_STATUSES = ('pending', 'sent')

# Statuses a signature may still be captured against.
SIGNABLE_STATUSES = ('pending', 'sent')


def current_user_id() -> Optional[int]:
    """Return the JWT identity as an int.

    ``flask_jwt_extended`` hands back a **string**; comparing that against the
    BigInteger foreign keys silently produced wrong answers (for example
    ``doc.created_by != current_user_id`` was always True, so owners were locked
    out of their own documents while non-owners were treated correctly by
    accident).
    """
    from flask_jwt_extended import get_jwt_identity
    identity = get_jwt_identity()
    if identity is None:
        return None
    try:
        return int(identity)
    except (TypeError, ValueError):
        return None


def current_role() -> str:
    from flask_jwt_extended import get_jwt
    try:
        return (get_jwt() or {}).get('role') or ''
    except Exception:
        return ''


def is_privileged(role: Optional[str] = None) -> bool:
    return (role if role is not None else current_role()) in PRIVILEGED_ROLES


def is_creator(user_id: Optional[int], document: Document) -> bool:
    return user_id is not None and document.created_by == user_id


def is_signer(user_id: Optional[int], document: Document) -> bool:
    if user_id is None:
        return False
    if document.signed_by == user_id:
        return True
    return db.session.query(
        Signature.query.filter(
            Signature.document_id == document.id,
            Signature.signer_id == user_id,
        ).exists()
    ).scalar() or False


def is_reference_owner(user_id: Optional[int], document: Document) -> bool:
    return (
        user_id is not None
        and document.reference_type == 'user'
        and document.reference_id == user_id
    )


def can_view_document(user_id: Optional[int], document: Document,
                      role: Optional[str] = None) -> bool:
    if user_id is None:
        return False
    if is_privileged(role):
        return True
    return (
        is_creator(user_id, document)
        or is_signer(user_id, document)
        or is_reference_owner(user_id, document)
    )


def can_manage_document(user_id: Optional[int], document: Document,
                        role: Optional[str] = None) -> bool:
    """Create/edit/send/cancel/verify - the document's owner or staff."""
    if user_id is None:
        return False
    return is_privileged(role) or is_creator(user_id, document)


def can_sign_document(user_id: Optional[int], document: Document,
                      role: Optional[str] = None) -> Tuple[bool, str]:
    """Return ``(allowed, reason)`` for capturing a signature."""
    if user_id is None:
        return False, 'Authentication required'
    if document.status not in SIGNABLE_STATUSES:
        return False, f'Document is {document.status} and can no longer be signed'
    if document.created_by == user_id and not is_privileged(role):
        return False, 'A document cannot be signed by its author'
    if not can_view_document(user_id, document, role):
        return False, 'You are not a participant in this document'
    return True, ''
