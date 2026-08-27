from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from app import db
from app.utils.decorators import admin_required, employee_required, role_required, get_current_user
from .service import (
    start_assignment,
    get_checklist,
    create_or_update_checklist,
    submit_checklist,
    get_work_record,
    create_work_record,
    update_work_record,
    submit_work_record,
    verify_work_record,
    generate_invoice,
    get_admin_pending_verifications,
    get_employee_dashboard_data,
)
from app.services.employees.models import Employee
from app.services.appointments.models import Assignment
from app.services.fleets.models import Invoice
import logging

logger = logging.getLogger(__name__)

workflow_bp = Blueprint('workflow', __name__)


def _enrich_assignment(assignment):
    return {
        **assignment.to_dict(),
        'appointment': {
            **assignment.appointment.to_dict(),
            'customer': {
                'id': assignment.appointment.customer.id,
                'name': assignment.appointment.customer.name,
                'phone': assignment.appointment.customer.phone,
                'email': assignment.appointment.customer.email,
            },
            'vehicle': assignment.appointment.vehicle.to_dict() if assignment.appointment.vehicle else None,
            'service': assignment.appointment.service.to_dict() if assignment.appointment.service else None,
        },
        'employee': {
            'id': assignment.employee.id,
            'employee_id': assignment.employee.employee_id,
            'user': {
                'id': assignment.employee.user.id,
                'name': assignment.employee.user.name,
                'email': assignment.employee.user.email,
            }
        } if assignment.employee else None,
        'work_record': assignment.work_record.to_dict() if assignment.work_record else None,
        'checklist': assignment.checklist.to_dict() if assignment.checklist else None,
    }


@workflow_bp.route('/assignments/<int:assignment_id>/start', methods=['POST'])
@jwt_required()
@employee_required
def start_assignment_route(assignment_id):
    try:
        current_user = get_current_user()
        assignment = start_assignment(assignment_id, current_user)
        return jsonify({
            'success': True,
            'message': 'Assignment started',
            'data': {
                'assignment': _enrich_assignment(assignment)
            }
        }), 200
    except PermissionError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 403
    except ValueError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 400
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to start assignment: %s', exc, exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to start assignment'}), 500


@workflow_bp.route('/assignments/<int:assignment_id>/checklist', methods=['GET'])
@jwt_required()
@employee_required
def get_checklist_route(assignment_id):
    try:
        current_user = get_current_user()
        checklist = get_checklist(assignment_id, current_user)
        if not checklist:
            return jsonify({'success': True, 'data': {'checklist': None}}), 200
        return jsonify({'success': True, 'data': {'checklist': checklist.to_dict()}}), 200
    except PermissionError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 403
    except Exception as exc:
        return jsonify({'success': False, 'message': 'Failed to fetch checklist'}), 500


@workflow_bp.route('/assignments/<int:assignment_id>/checklist', methods=['PUT'])
@jwt_required()
@employee_required
def create_or_update_checklist_route(assignment_id):
    try:
        current_user = get_current_user()
        data = request.get_json()
        if not data or 'items' not in data:
            return jsonify({'success': False, 'message': 'items are required'}), 400

        checklist = create_or_update_checklist(assignment_id, current_user, data)
        return jsonify({
            'success': True,
            'message': 'Checklist saved',
            'data': {'checklist': checklist.to_dict()}
        }), 200
    except PermissionError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 403
    except ValueError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 400
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to save checklist: %s', exc, exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to save checklist'}), 500


@workflow_bp.route('/assignments/<int:assignment_id>/checklist/submit', methods=['POST'])
@jwt_required()
@employee_required
def submit_checklist_route(assignment_id):
    try:
        current_user = get_current_user()
        checklist = submit_checklist(assignment_id, current_user)
        return jsonify({
            'success': True,
            'message': 'Checklist submitted',
            'data': {'checklist': checklist.to_dict()}
        }), 200
    except PermissionError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 403
    except ValueError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 400
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to submit checklist: %s', exc, exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to submit checklist'}), 500


@workflow_bp.route('/assignments/<int:assignment_id>/work-record', methods=['GET'])
@jwt_required()
@employee_required
def get_work_record_route(assignment_id):
    try:
        current_user = get_current_user()
        work_record = get_work_record(assignment_id, current_user)
        if not work_record:
            return jsonify({'success': True, 'data': {'work_record': None}}), 200
        return jsonify({'success': True, 'data': {'work_record': work_record.to_dict()}}), 200
    except PermissionError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 403
    except Exception as exc:
        return jsonify({'success': False, 'message': 'Failed to fetch work record'}), 500


@workflow_bp.route('/assignments/<int:assignment_id>/work-record', methods=['POST'])
@jwt_required()
@employee_required
def create_work_record_route(assignment_id):
    try:
        current_user = get_current_user()
        data = request.get_json()
        if not data or 'items' not in data:
            return jsonify({'success': False, 'message': 'items are required'}), 400

        work_record = create_work_record(assignment_id, current_user, data)
        return jsonify({
            'success': True,
            'message': 'Work record created',
            'data': {'work_record': work_record.to_dict()}
        }), 201
    except PermissionError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 403
    except ValueError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 400
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to create work record: %s', exc, exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to create work record'}), 500


@workflow_bp.route('/work-records/<int:work_record_id>', methods=['PUT'])
@jwt_required()
@employee_required
def update_work_record_route(work_record_id):
    try:
        current_user = get_current_user()
        data = request.get_json()
        work_record = update_work_record(work_record_id, current_user, data)
        return jsonify({
            'success': True,
            'message': 'Work record updated',
            'data': {'work_record': work_record.to_dict()}
        }), 200
    except PermissionError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 403
    except ValueError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 400
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to update work record: %s', exc, exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to update work record'}), 500


@workflow_bp.route('/assignments/<int:assignment_id>/work-record/submit', methods=['POST'])
@jwt_required()
@employee_required
def submit_work_record_route(assignment_id):
    try:
        current_user = get_current_user()
        work_record = submit_work_record(assignment_id, current_user)
        return jsonify({
            'success': True,
            'message': 'Work record submitted for verification',
            'data': {'work_record': work_record.to_dict()}
        }), 200
    except PermissionError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 403
    except ValueError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 400
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to submit work record: %s', exc, exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to submit work record'}), 500


@workflow_bp.route('/assignments/<int:assignment_id>/work-record/verify', methods=['POST'])
@jwt_required()
@admin_required
def verify_work_record_route(assignment_id):
    try:
        current_user = get_current_user()
        data = request.get_json()
        if not data or 'approved' not in data:
            return jsonify({'success': False, 'message': 'approved field is required'}), 400

        work_record = verify_work_record(assignment_id, current_user, data)
        return jsonify({
            'success': True,
            'message': 'Work record verified' if data['approved'] else 'Work record rejected',
            'data': {'work_record': work_record.to_dict()}
        }), 200
    except PermissionError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 403
    except ValueError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 400
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to verify work record: %s', exc, exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to verify work record'}), 500


@workflow_bp.route('/assignments/<int:assignment_id>/invoice', methods=['POST'])
@jwt_required()
@admin_required
def generate_invoice_route(assignment_id):
    try:
        current_user = get_current_user()
        data = request.get_json() or {}
        invoice = generate_invoice(assignment_id, current_user, data)
        return jsonify({
            'success': True,
            'message': 'Invoice generated',
            'data': {'invoice': invoice.to_dict()}
        }), 201
    except PermissionError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 403
    except ValueError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 400
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to generate invoice: %s', exc, exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to generate invoice'}), 500


@workflow_bp.route('/invoices/<int:appointment_id>', methods=['GET'])
@jwt_required()
@role_required('admin', 'employee', 'customer')
def get_invoice_route(appointment_id):
    try:
        current_user = get_current_user()
        invoice = Invoice.query.filter_by(appointment_id=appointment_id).first()
        if not invoice:
            return jsonify({'success': False, 'message': 'Invoice not found'}), 404
        return jsonify({'success': True, 'data': {'invoice': invoice.to_dict()}}), 200
    except Exception as exc:
        return jsonify({'success': False, 'message': 'Failed to fetch invoice'}), 500


@workflow_bp.route('/invoices/<int:invoice_id>/send', methods=['POST'])
@jwt_required()
@admin_required
def send_invoice_route(invoice_id):
    try:
        invoice = Invoice.query.get(invoice_id)
        if not invoice:
            return jsonify({'success': False, 'message': 'Invoice not found'}), 404

        from app.services.invoices.service import send_invoice as svc_send_invoice
        result = svc_send_invoice(invoice.appointment_id, get_current_user())
        return jsonify({
            'success': True,
            'message': 'Invoice sent successfully',
            'data': result,
        }), 200
    except PermissionError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 403
    except ValueError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 400
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to send invoice: %s', exc, exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to send invoice'}), 500


@workflow_bp.route('/admin/pending-verifications', methods=['GET'])
@jwt_required()
@admin_required
def get_pending_verifications_route():
    try:
        current_user = get_current_user()
        assignments = get_admin_pending_verifications(current_user)
        return jsonify({
            'success': True,
            'data': {'assignments': assignments}
        }), 200
    except PermissionError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 403
    except Exception as exc:
        logger.error('Failed to fetch pending verifications: %s', exc, exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to fetch pending verifications'}), 500


@workflow_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@employee_required
def get_employee_dashboard_route():
    try:
        current_user = get_current_user()
        result = get_employee_dashboard_data(current_user)
        return jsonify(result), 200
    except Exception as exc:
        return jsonify({
            'success': False,
            'message': 'Failed to get dashboard data',
            'error': str(exc)
        }), 500
