import re
import logging
from datetime import datetime, timezone
from pathlib import Path
from flask import Blueprint, request, jsonify, g, send_file
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import SQLAlchemyError

from app import db
from app.services.auth.models import User
from app.services.catalog.models import Service
from app.services.vehicles.models import Vehicle
from app.services.appointments.models import Appointment
from app.services.fleets.models import Invoice
from app.utils.decorators import role_required, get_current_user
from app.utils.email import send_email_with_attachment
from .pdf_generator import generate_invoice_pdf
from .service import (
    send_invoice as svc_send_invoice,
    get_invoice_by_appointment,
    download_invoice_pdf_file,
)

logger = logging.getLogger(__name__)

invoices_bp = Blueprint('invoices', __name__)


@invoices_bp.route('/<int:appointment_id>/send-invoice', methods=['POST'])
@jwt_required()
@role_required('admin', 'employee', 'customer')
def send_invoice(appointment_id):
    request_id = g.get('request_id', 'unknown')
    try:
        current_user = get_current_user()
        result = svc_send_invoice(appointment_id, current_user)
        
        logger.info('[%s] Invoice %s sent for appointment %s', request_id, result['invoice']['invoice_number'], appointment_id)
        return jsonify({
            'success': True,
            'message': 'Invoice sent successfully',
            'data': result,
        }), 200 if not result['created'] else 201

    except PermissionError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 403
    except ValueError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 400
    except FileNotFoundError as exc:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(exc)}), 500
    except RuntimeError as exc:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(exc)}), 500
    except SQLAlchemyError as exc:
        db.session.rollback()
        logger.error('[%s] Database error sending invoice: %s', request_id, exc)
        return jsonify({'success': False, 'message': 'Failed to send invoice'}), 500
    except Exception as exc:
        db.session.rollback()
        logger.error('[%s] Unexpected error sending invoice: %s', request_id, exc, exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to send invoice'}), 500


@invoices_bp.route('/<int:appointment_id>/invoice', methods=['GET'])
@jwt_required()
@role_required('admin', 'employee', 'customer')
def get_invoice(appointment_id):
    try:
        current_user = get_current_user()
        invoice = get_invoice_by_appointment(appointment_id, current_user)
        
        return jsonify({'success': True, 'data': {'invoice': invoice.to_dict()}}), 200
    except PermissionError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 403
    except Exception as exc:
        logger.error('Failed to fetch invoice for appointment %s: %s', appointment_id, exc)
        return jsonify({'success': False, 'message': 'Failed to fetch invoice'}), 500


@invoices_bp.route('/<int:appointment_id>/invoice/pdf', methods=['GET'])
@jwt_required()
@role_required('admin', 'employee', 'customer')
def download_invoice_pdf(appointment_id):
    try:
        current_user = get_current_user()
        invoice = get_invoice_by_appointment(appointment_id, current_user)
        
        if not invoice.pdf_path:
            return jsonify({'success': False, 'message': 'Invoice not found'}), 404
        
        pdf_path = download_invoice_pdf_file(invoice.pdf_path)
        
        return send_file(
            str(pdf_path),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'{invoice.invoice_number}.pdf',
        )
    except PermissionError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 403
    except Exception as exc:
        logger.error('Failed to download invoice for appointment %s: %s', appointment_id, exc)
        return jsonify({'success': False, 'message': 'Failed to download invoice'}), 500