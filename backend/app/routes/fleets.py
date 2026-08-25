import logging
from datetime import datetime, timezone
from pathlib import Path
from flask import Blueprint, request, jsonify, g, send_file
from flask_jwt_extended import jwt_required
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError

from app import db
from app.models import Company, FleetVehicle, FleetExpense, Invoice, InvoiceLineItem, Employee, User
from app.utils.decorators import admin_required, get_current_user
from app.utils.email import send_email_with_attachment
from app.utils.cache import cache_get, cache_set, cache_delete_pattern, REDIS_SHORT_TTL

logger = logging.getLogger(__name__)

fleets_bp = Blueprint('fleets', __name__)


def _generate_fleet_invoice_number(company_id, period_start, created_at=None):
    created_at = created_at or datetime.now(timezone.utc)
    date_part = created_at.strftime('%Y%m%d')
    seq_part = f"{company_id:04d}"
    return f"FLEET-{date_part}-{seq_part}"


@fleets_bp.route('/companies', methods=['GET'])
@jwt_required()
@admin_required
def list_companies():
    try:
        search = request.args.get('search', '').strip()
        page = max(int(request.args.get('page', 1)), 1)
        per_page = min(max(int(request.args.get('per_page', 20)), 1), 100)

        query = Company.query
        if search:
            query = query.filter(Company.name.ilike(f'%{search}%'))

        total = query.count()
        companies = query.order_by(Company.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

        return jsonify({
            'success': True,
            'data': {
                'companies': [company.to_dict() for company in companies],
                'total': total,
                'page': page,
                'per_page': per_page,
            }
        }), 200
    except Exception as exc:
        logger.error('Failed to list companies: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to load companies'}), 500


@fleets_bp.route('/companies', methods=['POST'])
@jwt_required()
@admin_required
def create_company():
    try:
        data = request.get_json(silent=True) or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'success': False, 'message': 'Company name is required'}), 400

        company = Company(
            name=name,
            contact_name=data.get('contact_name'),
            email=data.get('email'),
            phone=data.get('phone'),
            address=data.get('address'),
            billing_address=data.get('billing_address') or data.get('address'),
            payment_terms=data.get('payment_terms', 'Net 30'),
            is_active=bool(data.get('is_active', True)),
            notes=data.get('notes'),
        )
        db.session.add(company)
        db.session.commit()

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
        company = Company.query.get(company_id)
        if not company:
            return jsonify({'success': False, 'message': 'Company not found'}), 404

        vehicles = FleetVehicle.query.filter_by(company_id=company.id).order_by(FleetVehicle.created_at.desc()).all()
        recent_expenses = FleetExpense.query.filter_by(company_id=company.id).order_by(FleetExpense.incurred_at.desc()).limit(20).all()

        data = company.to_dict()
        data['vehicles'] = [v.to_dict() for v in vehicles]
        data['vehicle_count'] = len(vehicles)
        data['active_vehicle_count'] = sum(1 for v in vehicles if v.status == 'active')
        data['recent_expenses'] = [e.to_dict() for e in recent_expenses]

        return jsonify({'success': True, 'data': {'company': data}}), 200
    except Exception as exc:
        logger.error('Failed to get company %s: %s', company_id, exc)
        return jsonify({'success': False, 'message': 'Failed to load company'}), 500


@fleets_bp.route('/companies/<int:company_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_company(company_id):
    try:
        company = Company.query.get(company_id)
        if not company:
            return jsonify({'success': False, 'message': 'Company not found'}), 404

        data = request.get_json(silent=True) or {}
        for field in ('name', 'contact_name', 'email', 'phone', 'payment_terms', 'notes'):
            if field in data:
                setattr(company, field, data.get(field))
        if 'address' in data:
            company.address = data.get('address')
        if 'billing_address' in data:
            company.billing_address = data.get('billing_address')
        if 'is_active' in data:
            company.is_active = bool(data.get('is_active'))

        db.session.commit()
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
        company = Company.query.get(company_id)
        if not company:
            return jsonify({'success': False, 'message': 'Company not found'}), 404

        company.is_active = False
        db.session.commit()
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
        company = Company.query.get(company_id)
        if not company:
            return jsonify({'success': False, 'message': 'Company not found'}), 404

        vehicles = FleetVehicle.query.filter_by(company_id=company.id).order_by(FleetVehicle.created_at.desc()).all()
        return jsonify({'success': True, 'data': {'vehicles': [v.to_dict() for v in vehicles]}}), 200
    except Exception as exc:
        logger.error('Failed to list vehicles for company %s: %s', company_id, exc)
        return jsonify({'success': False, 'message': 'Failed to load vehicles'}), 500


@fleets_bp.route('/companies/<int:company_id>/vehicles', methods=['POST'])
@jwt_required()
@admin_required
def create_company_vehicle(company_id):
    try:
        company = Company.query.get(company_id)
        if not company:
            return jsonify({'success': False, 'message': 'Company not found'}), 404

        data = request.get_json(silent=True) or {}
        make = (data.get('make') or '').strip()
        model = (data.get('model') or '').strip()
        license_plate = (data.get('license_plate') or '').strip()
        if not make or not model or not license_plate:
            return jsonify({'success': False, 'message': 'Make, model and license plate are required'}), 400

        vehicle = FleetVehicle(
            company_id=company.id,
            make=make,
            model=model,
            year=data.get('year'),
            license_plate=license_plate,
            vin=data.get('vin'),
            status=data.get('status', 'active'),
            assigned_employee_id=data.get('assigned_employee_id'),
            last_service_date=data.get('last_service_date'),
            mileage_km=data.get('mileage_km', 0),
            notes=data.get('notes'),
        )
        db.session.add(vehicle)
        db.session.commit()

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
        vehicle = FleetVehicle.query.get(vehicle_id)
        if not vehicle:
            return jsonify({'success': False, 'message': 'Vehicle not found'}), 404

        data = request.get_json(silent=True) or {}
        for field in ('make', 'model', 'year', 'license_plate', 'vin', 'status', 'mileage_km', 'notes'):
            if field in data:
                setattr(vehicle, field, data.get(field))
        if 'assigned_employee_id' in data:
            vehicle.assigned_employee_id = data.get('assigned_employee_id')
        if 'last_service_date' in data:
            vehicle.last_service_date = data.get('last_service_date')

        db.session.commit()
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
        vehicle = FleetVehicle.query.get(vehicle_id)
        if not vehicle:
            return jsonify({'success': False, 'message': 'Vehicle not found'}), 404

        db.session.delete(vehicle)
        db.session.commit()
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
        company = Company.query.get(company_id)
        if not company:
            return jsonify({'success': False, 'message': 'Company not found'}), 404

        start = request.args.get('start')
        end = request.args.get('end')
        query = FleetExpense.query.filter_by(company_id=company.id)
        if start:
            query = query.filter(FleetExpense.incurred_at >= start)
        if end:
            query = query.filter(FleetExpense.incurred_at <= end)
        expenses = query.order_by(FleetExpense.incurred_at.desc()).all()

        return jsonify({'success': True, 'data': {'expenses': [e.to_dict() for e in expenses]}}), 200
    except Exception as exc:
        logger.error('Failed to list expenses for company %s: %s', company_id, exc)
        return jsonify({'success': False, 'message': 'Failed to load expenses'}), 500


@fleets_bp.route('/companies/<int:company_id>/expenses', methods=['POST'])
@jwt_required()
@admin_required
def create_company_expense(company_id):
    try:
        company = Company.query.get(company_id)
        if not company:
            return jsonify({'success': False, 'message': 'Company not found'}), 404

        data = request.get_json(silent=True) or {}
        expense_type = (data.get('expense_type') or '').strip()
        description = (data.get('description') or '').strip()
        amount = data.get('amount')
        incurred_at = data.get('incurred_at')
        if not expense_type or not description or amount is None or not incurred_at:
            return jsonify({'success': False, 'message': 'expense_type, description, amount and incurred_at are required'}), 400

        expense = FleetExpense(
            company_id=company.id,
            vehicle_id=data.get('vehicle_id'),
            expense_type=expense_type,
            description=description,
            amount=amount,
            incurred_at=incurred_at,
            created_by=get_current_user().get('id') if get_current_user() else None,
        )
        db.session.add(expense)
        db.session.commit()

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
        expense = FleetExpense.query.get(expense_id)
        if not expense:
            return jsonify({'success': False, 'message': 'Expense not found'}), 404

        db.session.delete(expense)
        db.session.commit()
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
        company = Company.query.get(company_id)
        if not company:
            return jsonify({'success': False, 'message': 'Company not found'}), 404

        invoices = Invoice.query.filter_by(company_id=company.id).order_by(Invoice.created_at.desc()).all()
        return jsonify({'success': True, 'data': {'invoices': [i.to_dict() for i in invoices]}}), 200
    except Exception as exc:
        logger.error('Failed to list invoices for company %s: %s', company_id, exc)
        return jsonify({'success': False, 'message': 'Failed to load invoices'}), 500


@fleets_bp.route('/companies/<int:company_id>/invoices', methods=['POST'])
@jwt_required()
@admin_required
def generate_company_invoice(company_id):
    try:
        company = Company.query.get(company_id)
        if not company:
            return jsonify({'success': False, 'message': 'Company not found'}), 404

        data = request.get_json(silent=True) or {}
        period_start = data.get('period_start')
        period_end = data.get('period_end')
        line_items_data = data.get('line_items', [])
        notes = data.get('notes')

        if not period_start or not period_end:
            return jsonify({'success': False, 'message': 'period_start and period_end are required'}), 400

        if not line_items_data:
            return jsonify({'success': False, 'message': 'At least one line item is required'}), 400

        subtotal = sum(float(item.get('total_price') or 0) for item in line_items_data)
        tax = float(data.get('tax_amount') or 0)
        total = subtotal + tax

        invoice_number = _generate_fleet_invoice_number(company.id, period_start)
        invoice = Invoice(
            invoice_number=invoice_number,
            appointment_id=0,
            user_id=0,
            company_id=company.id,
            total_amount=total,
            status='draft',
            invoice_type='fleet',
            tax_amount=tax,
            currency=data.get('currency', 'KES'),
            due_date=data.get('due_date'),
            notes=notes,
        )
        db.session.add(invoice)
        db.session.flush()

        for item in line_items_data:
            line = InvoiceLineItem(
                invoice_id=invoice.id,
                description=item.get('description') or '',
                quantity=int(item.get('quantity') or 1),
                unit_price=float(item.get('unit_price') or 0),
                total_price=float(item.get('total_price') or 0),
            )
            db.session.add(line)

        db.session.commit()
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
        invoice = Invoice.query.get(invoice_id)
        if not invoice:
            return jsonify({'success': False, 'message': 'Invoice not found'}), 404

        if not invoice.company:
            return jsonify({'success': False, 'message': 'Invoice is not a fleet invoice'}), 400

        return jsonify({'success': True, 'data': {'invoice': invoice.to_dict()}}), 200
    except Exception as exc:
        logger.error('Failed to fetch fleet invoice %s: %s', invoice_id, exc)
        return jsonify({'success': False, 'message': 'Failed to load invoice'}), 500


@fleets_bp.route('/invoices/<int:invoice_id>/pdf', methods=['GET'])
@jwt_required()
@admin_required
def download_fleet_invoice_pdf(invoice_id):
    try:
        invoice = Invoice.query.get(invoice_id)
        if not invoice or not invoice.company:
            return jsonify({'success': False, 'message': 'Invoice not found'}), 404

        if not invoice.pdf_path:
            from app.utils.fleet_invoice import generate_fleet_invoice_pdf
            pdf_path = generate_fleet_invoice_pdf(invoice, invoice.company, invoice.line_items)
            invoice.pdf_path = pdf_path
            db.session.commit()
        else:
            pdf_path = invoice.pdf_path

        path = Path(pdf_path)
        if not path.exists():
            return jsonify({'success': False, 'message': 'Invoice file is missing'}), 404

        return send_file(
            str(path),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'{invoice.invoice_number}.pdf',
        )
    except Exception as exc:
        logger.error('Failed to download fleet invoice %s: %s', invoice_id, exc)
        return jsonify({'success': False, 'message': 'Failed to download invoice'}), 500


@fleets_bp.route('/invoices/<int:invoice_id>/send', methods=['POST'])
@jwt_required()
@admin_required
def send_fleet_invoice(invoice_id):
    try:
        invoice = Invoice.query.get(invoice_id)
        if not invoice or not invoice.company:
            return jsonify({'success': False, 'message': 'Invoice not found'}), 404

        if not invoice.company.email:
            return jsonify({'success': False, 'message': 'Company email is missing'}), 400

        from app.utils.fleet_invoice import generate_fleet_invoice_pdf
        if not invoice.pdf_path:
            pdf_path = generate_fleet_invoice_pdf(invoice, invoice.company, invoice.line_items)
            invoice.pdf_path = pdf_path
        else:
            pdf_path = invoice.pdf_path

        invoice.status = 'sent'
        invoice.sent_at = datetime.now(timezone.utc)
        db.session.commit()

        subject = f'Fleet Invoice {invoice.invoice_number} - AutoConcierge'
        body = (
            f"Dear {invoice.company.contact_name or 'Accounts Payable'},\n\n"
            f"Please find your fleet invoice attached.\n\n"
            f"Invoice Number: {invoice.invoice_number}\n"
            f"Total Amount: {invoice.currency} {float(invoice.total_amount):,.2f}\n"
            f"Due Date: {invoice.due_date.strftime('%Y-%m-%d') if invoice.due_date else 'On receipt'}\n\n"
            f"Thank you for choosing AutoConcierge.\n"
        )
        send_email_with_attachment(
            to=invoice.company.email,
            subject=subject,
            body=body,
            attachment_path=pdf_path,
            attachment_filename=f'{invoice.invoice_number}.pdf',
        )

        return jsonify({'success': True, 'message': 'Fleet invoice sent', 'data': {'invoice': invoice.to_dict()}}), 200
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
        company_ids = data.get('company_ids', [])
        period_start = data.get('period_start')
        period_end = data.get('period_end')

        if not company_ids or not period_start or not period_end:
            return jsonify({'success': False, 'message': 'company_ids, period_start and period_end are required'}), 400

        created = []
        for company_id in company_ids:
            company = Company.query.get(company_id)
            if not company or not company.is_active:
                continue

            expenses = FleetExpense.query.filter(
                FleetExpense.company_id == company.id,
                FleetExpense.incurred_at >= period_start,
                FleetExpense.incurred_at <= period_end,
            ).all()
            if not expenses:
                continue

            line_items = [
                {
                    'description': f"{e.expense_type}: {e.description}",
                    'quantity': 1,
                    'unit_price': float(e.amount),
                    'total_price': float(e.amount),
                }
                for e in expenses
            ]
            subtotal = sum(float(e.amount) for e in expenses)

            invoice_number = _generate_fleet_invoice_number(company.id, period_start)
            invoice = Invoice(
                invoice_number=invoice_number,
                appointment_id=0,
                user_id=0,
                company_id=company.id,
                total_amount=subtotal,
                status='draft',
                invoice_type='fleet',
                tax_amount=0,
                currency='KES',
                due_date=data.get('due_date'),
                notes=data.get('notes'),
            )
            db.session.add(invoice)
            db.session.flush()

            for item in line_items:
                db.session.add(InvoiceLineItem(
                    invoice_id=invoice.id,
                    description=item['description'],
                    quantity=item['quantity'],
                    unit_price=item['unit_price'],
                    total_price=item['total_price'],
                ))
            created.append(invoice_number)

        db.session.commit()
        return jsonify({'success': True, 'message': 'Statements queued', 'data': {'created': created, 'count': len(created)}}), 201
    except Exception as exc:
        db.session.rollback()
        logger.error('Failed to bulk generate statements: %s', exc)
        return jsonify({'success': False, 'message': 'Failed to generate statements'}), 500
