"""HTTP API for the PDF service.

Two endpoints are exposed under ``/api/pdf``:

* ``POST /api/pdf/generate`` — generate a brand-new signed document from JSON.
* ``POST /api/pdf/embed`` — stamp a signature image onto an uploaded PDF
  (multipart form: ``pdf`` + ``signature`` file fields).
"""

from __future__ import annotations

import base64
import logging
from io import BytesIO

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename

from app.utils.decorators import role_required
from .service import PDFService
from .signature import PDFServiceError, SignaturePlacement

logger = logging.getLogger(__name__)

pdf_bp = Blueprint('pdf', __name__)

_PLACEMENT_FIELDS = {'page', 'x', 'y', 'width', 'height', 'anchor', 'margin'}


def _data_url_to_bytes(data_url: str) -> bytes:
    """Convert ``data:image/png;base64,...`` payloads into raw bytes."""
    prefix, _, payload = str(data_url or '').partition(',')
    if not payload or 'base64' not in prefix:
        raise PDFServiceError(
            'signature_image must be a base64 data URL '
            "(data:image/<type>;base64,....)"
        )
    try:
        return base64.b64decode(payload)
    except Exception as exc:
        raise PDFServiceError(f'Could not decode signature_image: {exc}') from exc


def _parse_sections(raw) -> list:
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise PDFServiceError('sections must be a list of [heading, lines] pairs')
    sections = []
    for item in raw:
        if not isinstance(item, (list, tuple)) or len(item) != 2:
            raise PDFServiceError('Each section must be a [heading, lines] pair')
        heading, lines = item
        sections.append((str(heading), [str(line) for line in (lines or [])]))
    return sections


def _parse_placement(raw) -> SignaturePlacement:
    if not raw:
        return SignaturePlacement()
    if not isinstance(raw, dict):
        raise PDFServiceError('signature placement must be an object')
    unknown = set(raw) - _PLACEMENT_FIELDS
    if unknown:
        raise PDFServiceError(f'Unknown signature placement field(s): {sorted(unknown)}')

    kwargs = {}
    if raw.get('page') is not None:
        try:
            kwargs['page'] = int(raw['page'])
        except (TypeError, ValueError):
            raise PDFServiceError("signature placement 'page' must be an integer")
    for key in ('x', 'y', 'width', 'height', 'margin'):
        if raw.get(key) is not None:
            try:
                kwargs[key] = float(raw[key])
            except (TypeError, ValueError):
                raise PDFServiceError(f"signature placement '{key}' must be a number")
    if raw.get('anchor') is not None:
        kwargs['anchor'] = str(raw['anchor'])
    return SignaturePlacement(**kwargs)


@pdf_bp.route('/generate', methods=['POST'])
@jwt_required()
@role_required('admin', 'employee', 'customer')
def generate_signed_document():
    """Generate a brand-new PDF document, optionally embedding a signature."""
    data = request.get_json(silent=True) or {}
    try:
        signature_source = data.get('signature_image')
        if isinstance(signature_source, str):
            signature_source = _data_url_to_bytes(signature_source)

        service = PDFService()
        pdf_bytes = service.generate_pdf(
            title=data.get('title', 'Document'),
            subtitle=data.get('subtitle', ''),
            sections=_parse_sections(data.get('sections')),
            signer_name=data.get('signer_name', ''),
            signature_source=signature_source,
            signature_label=data.get('signature_label', 'Authorised Signature'),
            placement=_parse_placement(data.get('signature') or data.get('placement')),
        )
        if not isinstance(pdf_bytes, bytes):
            raise PDFServiceError('generate_pdf returned an unexpected type')

        filename = secure_filename(str(data.get('title') or 'document')).lower() or 'document'
        if not filename.endswith('.pdf'):
            filename += '.pdf'
        return send_file(
            BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename,
        )
    except PDFServiceError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 400
    except Exception as exc:
        logger.error('PDF generate failed: %s', exc, exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to generate PDF'}), 500


@pdf_bp.route('/embed', methods=['POST'])
@jwt_required()
@role_required('admin', 'employee', 'customer')
def embed_signature_into_pdf():
    """Stamp a signature image onto an existing PDF (multipart upload)."""
    pdf_file = request.files.get('pdf')
    signature_file = request.files.get('signature')
    if pdf_file is None or signature_file is None:
        return jsonify({
            'success': False,
            'message': 'Both "pdf" and "signature" file fields are required',
        }), 400

    try:
        placement = _parse_placement(dict(request.form) or {})
        service = PDFService()
        pdf_bytes = service.embed_signature(
            pdf_file.read(),
            signature_file.read(),
            placement,
        )
        if not isinstance(pdf_bytes, bytes):
            raise PDFServiceError('embed_signature returned an unexpected type')

        filename = secure_filename(pdf_file.filename or 'document.pdf')
        if not filename.lower().endswith('.pdf'):
            filename += '.pdf'
        return send_file(
            BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename,
        )
    except PDFServiceError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 400
    except Exception as exc:
        logger.error('PDF embed failed: %s', exc, exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to embed signature into PDF'}), 500