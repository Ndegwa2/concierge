import re
import logging
from datetime import datetime, timezone
from pathlib import Path
from flask import Blueprint, request, jsonify, g, send_file
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import SQLAlchemyError

from app import db
from app.models import Appointment, User, Vehicle, Service, Invoice
from app.utils.decorators import role_required, get_current_user
from app.utils.email import send_email_with_attachment
from app.utils.invoice import generate_invoice_pdf

logger = logging.getLogger(__name__)

invoices_bp = Blueprint('invoices', __name__)


def _generate_invoice_number(appointment_id, created_at=None):
    created_at = created_at or datetime.now(timezone.utc)
    date_part = created_at.strftime('%Y%m%d')
    seq_part = f"{appointment_id:04d}"
    return f"INV-{date_part}-{seq_part}"


def _assert_appointment_access(appointment, current_user):
    if current_user['role'] == 'customer' and appointment.user_id != current_user['id']:
        raise PermissionError('Unauthorized access to appointment')


def _load_appointment_entities(appointment):
    customer = User.query.get(appointment.user_id)
    vehicle = Vehicle.query.get(appointment.vehicle_id)
    service = Service.query.get(appointment.service_id)
    if not all([customer, vehicle, service]):
        raise ValueError('Appointment references missing related data')
    return customer, vehicle, service


@invoices_bp.route('/<int:appointment_id>/send-invoice', methods=['POST'])
@jwt_required()
@role_required('admin', 'employee', 'customer')
def send_invoice(appointment_id):
    request_id = g.get('request_id', 'unknown')
    try:
        current_user = get_current_user()
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'success': False, 'message': 'Appointment not found'}), 404

        _assert_appointment_access(appointment, current_user)

        if appointment.status != 'completed':
            return jsonify({'success': False, 'message': 'Appointment must be completed before sending invoice'}), 400

        customer, vehicle, service = _load_appointment_entities(appointment)

        if not customer.email:
            return jsonify({'success': False, 'message': 'Customer email is missing'}), 400

        invoice = Invoice.query.filter_by(appointment_id=appointment.id).first()
        created = False
        if not invoice:
            invoice_number = _generate_invoice_number(appointment.id, appointment.updated_at)
            invoice = Invoice(
                invoice_number=invoice_number,
                appointment_id=appointment.id,
                user_id=customer.id,
                total_amount=appointment.total_amount or 0,
                status='draft',
            )
            db.session.add(invoice)
            db.session.flush()
            created = True

        pdf_path = generate_invoice_pdf(appointment, customer, vehicle, service, invoice.invoice_number)
        invoice.pdf_path = pdf_path
        invoice.status = 'sent'
        invoice.sent_at = datetime.now(timezone.utc)
        db.session.commit()

        subject = f'Invoice {invoice.invoice_number} - Ndegwa Auto Concierge'
        body = (
            f"Dear {customer.name},\n\n"
            f"Please find your invoice for the completed service attached.\n\n"
            f"Invoice Number: {invoice.invoice_number}\n"
            f"Total Amount: KSh {float(invoice.total_amount):,.2f}\n\n"
            f"Thank you for choosing Ndegwa Auto Concierge.\n"
        )
        send_email_with_attachment(
            to=customer.email,
            subject=subject,
            body=body,
            attachment_path=pdf_path,
            attachment_filename=f'{invoice.invoice_number}.pdf',
        )

        logger.info('[%s] Invoice %s sent for appointment %s', request_id, invoice.invoice_number, appointment_id)
        return jsonify({
            'success': True,
            'message': 'Invoice sent successfully',
            'data': {'invoice': invoice.to_dict(), 'created': created},
        }), 200 if not created else 201

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
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'success': False, 'message': 'Appointment not found'}), 404

        _assert_appointment_access(appointment, current_user)

        invoice = Invoice.query.filter_by(appointment_id=appointment.id).first()
        if not invoice:
            return jsonify({'success': False, 'message': 'Invoice not found'}), 404

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
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'success': False, 'message': 'Appointment not found'}), 404

        _assert_appointment_access(appointment, current_user)

        invoice = Invoice.query.filter_by(appointment_id=appointment.id).first()
        if not invoice or not invoice.pdf_path:
            return jsonify({'success': False, 'message': 'Invoice not found'}), 404

        pdf_path = Path(invoice.pdf_path)
        if not pdf_path.exists():
            return jsonify({'success': False, 'message': 'Invoice file is missing'}), 404

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
