from app import db
from flask import request, has_request_context
from app.services.fleets.models import Company, FleetVehicle, FleetExpense, Invoice, InvoiceLineItem
from datetime import datetime, timezone


def list_companies_query(search='', page=1, per_page=20):
    query = Company.query
    if search:
        query = query.filter(Company.name.ilike(f'%{search}%'))
    
    total = query.count()
    companies = query.order_by(Company.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    
    return {
        'success': True,
        'data': {
            'companies': [company.to_dict() for company in companies],
            'total': total,
            'page': page,
            'per_page': per_page,
        }
    }


def create_company(data):
    name = (data.get('name') or '').strip()
    if not name:
        raise ValueError('Company name is required')
    
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
    return company


def get_company_by_id(company_id):
    company = Company.query.get(company_id)
    if not company:
        raise ValueError('Company not found')
    
    vehicles = FleetVehicle.query.filter_by(company_id=company.id).order_by(FleetVehicle.created_at.desc()).all()
    recent_expenses = FleetExpense.query.filter_by(company_id=company.id).order_by(FleetExpense.incurred_at.desc()).limit(20).all()
    
    data = company.to_dict()
    data['vehicles'] = [v.to_dict() for v in vehicles]
    data['vehicle_count'] = len(vehicles)
    data['active_vehicle_count'] = sum(1 for v in vehicles if v.status == 'active')
    data['recent_expenses'] = [e.to_dict() for e in recent_expenses]
    
    return data


def update_company(company_id, data):
    company = Company.query.get(company_id)
    if not company:
        raise ValueError('Company not found')
    
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
    return company


def delete_company(company_id):
    company = Company.query.get(company_id)
    if not company:
        raise ValueError('Company not found')
    
    company.is_active = False
    db.session.commit()


def list_company_vehicles_query(company_id):
    company = Company.query.get(company_id)
    if not company:
        raise ValueError('Company not found')
    
    return FleetVehicle.query.filter_by(company_id=company.id).order_by(FleetVehicle.created_at.desc()).all()


def create_company_vehicle(company_id, data):
    company = Company.query.get(company_id)
    if not company:
        raise ValueError('Company not found')
    
    make = (data.get('make') or '').strip()
    model = (data.get('model') or '').strip()
    license_plate = (data.get('license_plate') or '').strip()
    if not make or not model or not license_plate:
        raise ValueError('Make, model and license plate are required')
    
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
    return vehicle


def update_fleet_vehicle(vehicle_id, data):
    vehicle = FleetVehicle.query.get(vehicle_id)
    if not vehicle:
        raise ValueError('Vehicle not found')
    
    for field in ('make', 'model', 'year', 'license_plate', 'vin', 'status', 'mileage_km', 'notes'):
        if field in data:
            setattr(vehicle, field, data.get(field))
    if 'assigned_employee_id' in data:
        vehicle.assigned_employee_id = data.get('assigned_employee_id')
    if 'last_service_date' in data:
        vehicle.last_service_date = data.get('last_service_date')
    
    db.session.commit()
    return vehicle


def delete_fleet_vehicle(vehicle_id):
    vehicle = FleetVehicle.query.get(vehicle_id)
    if not vehicle:
        raise ValueError('Vehicle not found')
    
    db.session.delete(vehicle)
    db.session.commit()


def list_company_expenses_query(company_id):
    company = Company.query.get(company_id)
    if not company:
        raise ValueError('Company not found')
    
    start = request.args.get('start') if _has_request() else None
    end = request.args.get('end') if _has_request() else None
    query = FleetExpense.query.filter_by(company_id=company.id)
    if start:
        query = query.filter(FleetExpense.incurred_at >= start)
    if end:
        query = query.filter(FleetExpense.incurred_at <= end)
    return query.order_by(FleetExpense.incurred_at.desc()).all()


def create_company_expense(company_id, data):
    company = Company.query.get(company_id)
    if not company:
        raise ValueError('Company not found')
    
    expense_type = (data.get('expense_type') or '').strip()
    description = (data.get('description') or '').strip()
    amount = data.get('amount')
    incurred_at = data.get('incurred_at')
    if not expense_type or not description or amount is None or not incurred_at:
        raise ValueError('expense_type, description, amount and incurred_at are required')
    
    expense = FleetExpense(
        company_id=company.id,
        vehicle_id=data.get('vehicle_id'),
        expense_type=expense_type,
        description=description,
        amount=amount,
        incurred_at=incurred_at,
        created_by=get_current_user_id(),
    )
    db.session.add(expense)
    db.session.commit()
    return expense


def delete_fleet_expense(expense_id):
    expense = FleetExpense.query.get(expense_id)
    if not expense:
        raise ValueError('Expense not found')
    
    db.session.delete(expense)
    db.session.commit()


def list_company_invoices_query(company_id):
    company = Company.query.get(company_id)
    if not company:
        raise ValueError('Company not found')
    
    return Invoice.query.filter_by(company_id=company.id).order_by(Invoice.created_at.desc()).all()


def generate_company_invoice(company_id, data):
    company = Company.query.get(company_id)
    if not company:
        raise ValueError('Company not found')
    
    period_start = data.get('period_start')
    period_end = data.get('period_end')
    line_items_data = data.get('line_items', [])
    notes = data.get('notes')
    
    if not period_start or not period_end:
        raise ValueError('period_start and period_end are required')
    
    if not line_items_data:
        raise ValueError('At least one line item is required')
    
    subtotal = sum(float(item.get('total_price') or 0) for item in line_items_data)
    tax = float(data.get('tax_amount') or 0)
    total = subtotal + tax
    
    invoice_number = _generate_fleet_invoice_number(company.id, period_start)
    invoice = Invoice(
        invoice_number=invoice_number,
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
    return invoice


def get_fleet_invoice_by_id(invoice_id):
    invoice = Invoice.query.get(invoice_id)
    if not invoice:
        raise ValueError('Invoice not found')
    
    if not invoice.company:
        raise ValueError('Invoice is not a fleet invoice')
    
    return invoice.to_dict()


def download_fleet_invoice_pdf_file(invoice_id):
    invoice = Invoice.query.get(invoice_id)
    if not invoice or not invoice.company:
        raise ValueError('Invoice not found')
    
    if not invoice.pdf_path:
        from app.utils.fleet_invoice import generate_fleet_invoice_pdf
        pdf_path = generate_fleet_invoice_pdf(invoice, invoice.company, invoice.line_items)
        invoice.pdf_path = pdf_path
        db.session.commit()
    else:
        pdf_path = invoice.pdf_path
    
    path = Path(pdf_path)
    if not path.exists():
        raise ValueError('Invoice file is missing')
    
    return str(path)


def send_fleet_invoice(invoice_id):
    invoice = Invoice.query.get(invoice_id)
    if not invoice or not invoice.company:
        raise ValueError('Invoice not found')
    
    if not invoice.company.email:
        raise ValueError('Company email is missing')
    
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


def bulk_generate_statements(data):
    company_ids = data.get('company_ids', [])
    period_start = data.get('period_start')
    period_end = data.get('period_end')
    
    if not company_ids or not period_start or not period_end:
        raise ValueError('company_ids, period_start and period_end are required')
    
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
    return {'created': created, 'count': len(created)}


def _generate_fleet_invoice_number(company_id, period_start, created_at=None):
    created_at = created_at or datetime.now(timezone.utc)
    date_part = created_at.strftime('%Y%m%d')
    base = f"FLEET-{date_part}-{company_id:04d}"
    seq = 1
    candidate = base
    while Invoice.query.filter_by(invoice_number=candidate).first() is not None:
        seq += 1
        candidate = f"{base}-{seq:03d}"
    return candidate


def _has_request():
    return has_request_context()


def get_current_user_id():
    try:
        from app.utils.decorators import get_current_user
        user = get_current_user()
        return user.get('id') if user else None
    except RuntimeError:
        return None