from flask import Blueprint, request, jsonify, g, send_file
from flask_jwt_extended import jwt_required
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError
from pathlib import Path

from app import db
from app.services.auth.models import User
from app.services.employees.models import Employee
from app.services.fleets.models import Company, FleetVehicle, FleetExpense, Invoice, InvoiceLineItem
from app.utils.decorators import admin_required, get_current_user
from app.utils.email import send_email_with_attachment
from app.utils.cache import cache_get, cache_set, cache_delete_pattern, REDIS_SHORT_TTL
from .service import (
    list_companies_query,
    create_company as svc_create_company,
    get_company_by_id,
    update_company as svc_update_company,
    delete_company as svc_delete_company,
    list_company_vehicles_query,
    create_company_vehicle as svc_create_company_vehicle,
    update_fleet_vehicle as svc_update_fleet_vehicle,
    delete_fleet_vehicle as svc_delete_fleet_vehicle,
    list_company_expenses_query,
    create_company_expense as svc_create_company_expense,
    delete_fleet_expense as svc_delete_fleet_expense,
    list_company_invoices_query,
    generate_company_invoice as svc_generate_company_invoice,
    get_fleet_invoice_by_id,
    download_fleet_invoice_pdf_file,
    send_fleet_invoice as svc_send_fleet_invoice,
    bulk_generate_statements as svc_bulk_generate_statements,
)
import logging

logger = logging.getLogger(__name__)

fleets_bp = Blueprint('fleets', __name__)


@fleets_bp.route('/companies', methods=['GET'])
@jwt_required()
@admin_required
def list_companies():
    try:
        search = request.args.get('search', '').strip()
        page = max(int(request.args.get('page', 1)), 1)
        per_page = min(max(int(request.args.get('per_page', 20)), 1), 100)
        
        result = list_companies_query(search, page, per_page)
        return jsonify(result), 200
    except Exception as exc:
        logger.error('Failed to list companies: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to load companies'}), 500


@fleets_bp.route('/companies', methods=['POST'])
@jwt_required()
@admin_required
def create_company():
    try:
        data = request.get_json(silent=True) or {}
        company = svc_create_company(data)
        
        return jsonify({'success': True, 'message': 'Company created', 'data': {'company': company.to_dict()}}), 201
    except SQLAlchemyError as exc:
        db.session.rollback()
        logger.error('Database error creating company: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to create company'}), 500
    except Exception as exc:
        db.session.rollback()
        logger.error('Unexpected error creating company: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to create company'}), 500


@fleets_bp.route('/companies/<int:company_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_company(company_id):
    try:
        data = get_company_by_id(company_id)
        return jsonify({'success': True, 'data': {'company': data}}), 200
    except Exception as exc:
        logger.error('Failed to get company %s: %s', company_id, exc)
        return jsonify({'success': False, 'message': 'Failed to load company'}), 500


@fleets_bp.route('/companies/<int:company_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_company(company_id):
    try:
        data = request.get_json(silent=True) or {}
        company = svc_update_company(company_id, data)
        
        return jsonify({'success': True, 'message': 'Company updated', 'data': {'company': company.to_dict()}}), 200
    except SQLAlchemyError as exc:
        db.session.rollback()
        logger.error('Database error updating company: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to update company'}), 500
    except Exception as exc:
        db.session.rollback()
        logger.error('Unexpected error updating company: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to update company'}), 500


@fleets_bp.route('/companies/<int:company_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_company(company_id):
    try:
        svc_delete_company(company_id)
        cache_delete_pattern(f"fleets:companies:*")
        return jsonify({'success': True, 'message': 'Company deactivated'}), 200
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to deactivate company %s: %s', company_id, exc)
        return jsonify({'success': False, 'message': 'Failed to deactivate company'}), 500


@fleets_bp.route('/companies/<int:company_id>/vehicles', methods=['GET'])
@jwt_required()
@admin_required
def list_company_vehicles(company_id):
    try:
        vehicles = list_company_vehicles_query(company_id)
        return jsonify({'success': True, 'data': {'vehicles': [v.to_dict() for v in vehicles]}}), 200
    except Exception as exc:
        logger.error('Failed to list vehicles for company %s: %s', company_id, exc)
        return jsonify({'success': False, 'message': 'Failed to load vehicles'}), 500


@fleets_bp.route('/companies/<int:company_id>/vehicles', methods=['POST'])
@jwt_required()
@admin_required
def create_company_vehicle(company_id):
    try:
        data = request.get_json(silent=True) or {}
        vehicle = svc_create_company_vehicle(company_id, data)
        
        return jsonify({'success': True, 'message': 'Vehicle added', 'data': {'vehicle': vehicle.to_dict()}}), 201
    except SQLAlchemyError as exc:
        db.session.rollback()
        logger.error('Database error adding vehicle: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to add vehicle'}), 500
    except Exception as exc:
        db.session.rollback()
        logger.error('Unexpected error adding vehicle: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to add vehicle'}), 500


@fleets_bp.route('/vehicles/<int:vehicle_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_fleet_vehicle(vehicle_id):
    try:
        data = request.get_json(silent=True) or {}
        vehicle = svc_update_fleet_vehicle(vehicle_id, data)
        
        return jsonify({'success': True, 'message': 'Vehicle updated', 'data': {'vehicle': vehicle.to_dict()}}), 200
    except SQLAlchemyError as exc:
        db.session.rollback()
        logger.error('Database error updating vehicle: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to update vehicle'}), 500
    except Exception as exc:
        db.session.rollback()
        logger.error('Unexpected error updating vehicle: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to update vehicle'}), 500


@fleets_bp.route('/vehicles/<int:vehicle_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_fleet_vehicle(vehicle_id):
    try:
        svc_delete_fleet_vehicle(vehicle_id)
        cache_delete_pattern(f"fleets:companies:*")
        return jsonify({'success': True, 'message': 'Vehicle removed'}), 200
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to delete vehicle %s: %s', vehicle_id, exc)
        return jsonify({'success': False, 'message': 'Failed to remove vehicle'}), 500


@fleets_bp.route('/companies/<int:company_id>/expenses', methods=['GET'])
@jwt_required()
@admin_required
def list_company_expenses(company_id):
    try:
        expenses = list_company_expenses_query(company_id)
        return jsonify({'success': True, 'data': {'expenses': [e.to_dict() for e in expenses]}}), 200
    except Exception as exc:
        logger.error('Failed to list expenses for company %s: %s', company_id, exc)
        return jsonify({'success': False, 'message': 'Failed to load expenses'}), 500


@fleets_bp.route('/companies/<int:company_id>/expenses', methods=['POST'])
@jwt_required()
@admin_required
def create_company_expense(company_id):
    try:
        data = request.get_json(silent=True) or {}
        expense = svc_create_company_expense(company_id, data)
        
        return jsonify({'success': True, 'message': 'Expense recorded', 'data': {'expense': expense.to_dict()}}), 201
    except SQLAlchemyError as exc:
        db.session.rollback()
        logger.error('Database error creating expense: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to record expense'}), 500
    except Exception as exc:
        db.session.rollback()
        logger.error('Unexpected error creating expense: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to record expense'}), 500


@fleets_bp.route('/expenses/<int:expense_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_fleet_expense(expense_id):
    try:
        svc_delete_fleet_expense(expense_id)
        return jsonify({'success': True, 'message': 'Expense deleted'}), 200
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to delete expense %s: %s', expense_id, exc)
        return jsonify({'success': False, 'message': 'Failed to delete expense'}), 500


@fleets_bp.route('/companies/<int:company_id>/invoices', methods=['GET'])
@jwt_required()
@admin_required
def list_company_invoices(company_id):
    try:
        invoices = list_company_invoices_query(company_id)
        return jsonify({'success': True, 'data': {'invoices': [i.to_dict() for i in invoices]}}), 200
    except Exception as exc:
        logger.error('Failed to list invoices for company %s: %s', company_id, exc)
        return jsonify({'success': False, 'message': 'Failed to load invoices'}), 500


@fleets_bp.route('/companies/<int:company_id>/invoices', methods=['POST'])
@jwt_required()
@admin_required
def generate_company_invoice(company_id):
    try:
        data = request.get_json(silent=True) or {}
        invoice = svc_generate_company_invoice(company_id, data)
        cache_delete_pattern(f"fleets:companies:*")
        
        return jsonify({'success': True, 'message': 'Invoice draft created', 'data': {'invoice': invoice.to_dict()}}), 201
    except SQLAlchemyError as exc:
        db.session.rollback()
        logger.error('Database error generating invoice: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to generate invoice'}), 500
    except Exception as exc:
        db.session.rollback()
        logger.error('Unexpected error generating invoice: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to generate invoice'}), 500


@fleets_bp.route('/invoices/<int:invoice_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_fleet_invoice(invoice_id):
    try:
        invoice_data = get_fleet_invoice_by_id(invoice_id)
        return jsonify({'success': True, 'data': {'invoice': invoice_data}}), 200
    except Exception as exc:
        logger.error('Failed to fetch fleet invoice %s: %s', invoice_id, exc)
        return jsonify({'success': False, 'message': 'Failed to load invoice'}), 500


@fleets_bp.route('/invoices/<int:invoice_id>/pdf', methods=['GET'])
@jwt_required()
@admin_required
def download_fleet_invoice_pdf(invoice_id):
    try:
        pdf_path = download_fleet_invoice_pdf_file(invoice_id)
        
        path = Path(pdf_path)
        if not path.exists():
            return jsonify({'success': False, 'message': 'Invoice file is missing'}), 404
        
        return send_file(
            str(path),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'{invoice_id}.pdf',
        )
    except Exception as exc:
        logger.error('Failed to download fleet invoice %s: %s', invoice_id, exc)
        return jsonify({'success': False, 'message': 'Failed to download invoice'}), 500


@fleets_bp.route('/invoices/<int:invoice_id>/send', methods=['POST'])
@jwt_required()
@admin_required
def send_fleet_invoice(invoice_id):
    try:
        svc_send_fleet_invoice(invoice_id)
        
        return jsonify({'success': True, 'message': 'Fleet invoice sent', 'data': {'invoice': Invoice.query.get(invoice_id).to_dict()}}), 200
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to send fleet invoice %s: %s', invoice_id, exc)
        return jsonify({'success': False, 'message': 'Failed to send invoice'}), 500


@fleets_bp.route('/companies/bulk-statement', methods=['POST'])
@jwt_required()
@admin_required
def bulk_generate_statements():
    try:
        data = request.get_json(silent=True) or {}
        result = svc_bulk_generate_statements(data)
        
        return jsonify({'success': True, 'message': 'Statements queued', 'data': result}), 201
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to bulk generate statements: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to generate statements'}), 500