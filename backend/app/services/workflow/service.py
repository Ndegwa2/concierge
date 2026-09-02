from app import db
from app.services.auth.models import User
from app.services.employees.models import Employee
from app.services.appointments.models import Appointment, Assignment
from app.services.fleets.models import Invoice
from app.services.workflow.models import WorkRecord, VehicleChecklist
from app.services.invoices.service import _generate_invoice_number, _load_appointment_entities
from datetime import datetime, timezone
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)


def _get_assignment_or_404(assignment_id):
    assignment = Assignment.query.get(assignment_id)
    if not assignment:
        raise ValueError('Assignment not found')
    return assignment


def _get_employee_or_404(user_id):
    employee = Employee.query.filter_by(user_id=user_id).first()
    if not employee:
        raise ValueError('Employee profile not found')
    return employee


def start_assignment(assignment_id, current_user):
    assignment = _get_assignment_or_404(assignment_id)
    employee = _get_employee_or_404(current_user['id'])

    if assignment.employee_id != employee.id:
        raise PermissionError('Unauthorized access to this assignment')

    if assignment.status not in ('assigned',):
        raise ValueError(f'Cannot start assignment in status: {assignment.status}')

    assignment.status = 'in-progress'
    assignment.started_at = datetime.now(timezone.utc)
    assignment.appointment.status = 'in-progress'
    db.session.commit()
    return assignment


def get_checklist(assignment_id, current_user):
    assignment = _get_assignment_or_404(assignment_id)
    employee = _get_employee_or_404(current_user['id'])

    if assignment.employee_id != employee.id:
        raise PermissionError('Unauthorized access')

    checklist = VehicleChecklist.query.filter_by(assignment_id=assignment_id).first()
    if not checklist:
        return None
    return checklist


def create_or_update_checklist(assignment_id, current_user, data):
    assignment = _get_assignment_or_404(assignment_id)
    employee = _get_employee_or_404(current_user['id'])

    if assignment.employee_id != employee.id:
        raise PermissionError('Unauthorized access')

    checklist = VehicleChecklist.query.filter_by(assignment_id=assignment_id).first()
    if not checklist:
        checklist = VehicleChecklist()
        checklist.assignment_id = assignment_id
        checklist.appointment_id = assignment.appointment_id
        checklist.employee_id = employee.id
        db.session.add(checklist)

    checklist.items = data.get('items', [])
    checklist.overall_condition = data.get('overall_condition', 'good')
    checklist.notes = data.get('notes', '')
    checklist.photos = data.get('photos', [])

    db.session.commit()
    return checklist


def submit_checklist(assignment_id, current_user):
    assignment = _get_assignment_or_404(assignment_id)
    employee = _get_employee_or_404(current_user['id'])

    if assignment.employee_id != employee.id:
        raise PermissionError('Unauthorized access')

    checklist = VehicleChecklist.query.filter_by(assignment_id=assignment_id).first()
    if not checklist:
        raise ValueError('Checklist not found. Please create one first.')

    checklist.submitted_at = datetime.now(timezone.utc)
    assignment.status = 'checklist_pending'
    db.session.commit()
    return checklist


def get_work_record(assignment_id, current_user):
    assignment = _get_assignment_or_404(assignment_id)
    employee = _get_employee_or_404(current_user['id'])

    if assignment.employee_id != employee.id:
        raise PermissionError('Unauthorized access')

    work_record = WorkRecord.query.filter_by(assignment_id=assignment_id).first()
    return work_record


def create_work_record(assignment_id, current_user, data):
    assignment = _get_assignment_or_404(assignment_id)
    employee = _get_employee_or_404(current_user['id'])

    if assignment.employee_id != employee.id:
        raise PermissionError('Unauthorized access')

    work_record = WorkRecord.query.filter_by(assignment_id=assignment_id).first()
    if work_record:
        raise ValueError('Work record already exists. Use update instead.')

    work_record = WorkRecord()
    work_record.assignment_id = assignment_id
    work_record.appointment_id = assignment.appointment_id
    work_record.employee_id = employee.id
    work_record.customer_id = assignment.appointment.user_id
    work_record.items = data.get('items', [])
    work_record.overall_notes = data.get('overall_notes', '')
    work_record.labor_hours = data.get('labor_hours')
    work_record.labor_rate = data.get('labor_rate')
    work_record.status = 'draft'

    _recalculate_work_record(work_record)

    db.session.add(work_record)
    db.session.commit()
    return work_record


def update_work_record(work_record_id, current_user, data):
    work_record = WorkRecord.query.get(work_record_id)
    if not work_record:
        raise ValueError('Work record not found')

    assignment = Assignment.query.get(work_record.assignment_id)
    employee = _get_employee_or_404(current_user['id'])

    if assignment.employee_id != employee.id:
        raise PermissionError('Unauthorized access')

    if work_record.status != 'draft':
        raise ValueError('Cannot update work record that is not in draft status')

    if 'items' in data:
        work_record.items = data['items']
    if 'overall_notes' in data:
        work_record.overall_notes = data['overall_notes']
    if 'labor_hours' in data:
        work_record.labor_hours = data['labor_hours']
    if 'labor_rate' in data:
        work_record.labor_rate = data['labor_rate']

    _recalculate_work_record(work_record)
    db.session.commit()
    return work_record


def submit_work_record(assignment_id, current_user):
    assignment = _get_assignment_or_404(assignment_id)
    employee = _get_employee_or_404(current_user['id'])

    if assignment.employee_id != employee.id:
        raise PermissionError('Unauthorized access')

    work_record = WorkRecord.query.filter_by(assignment_id=assignment_id).first()
    if not work_record:
        raise ValueError('Work record not found. Please create one first.')

    if work_record.status != 'draft':
        raise ValueError('Work record is already submitted')

    work_record.status = 'submitted'
    work_record.submitted_at = datetime.now(timezone.utc)
    assignment.status = 'submitted'
    db.session.commit()
    return work_record


def verify_work_record(assignment_id, current_user, data):
    assignment = _get_assignment_or_404(assignment_id)
    work_record = WorkRecord.query.filter_by(assignment_id=assignment_id).first()
    if not work_record:
        raise ValueError('Work record not found')

    if work_record.status != 'submitted':
        raise ValueError('Work record is not pending verification')

    approved = data.get('approved', False)
    notes = data.get('notes', '')

    if approved:
        work_record.status = 'verified'
        work_record.verified_at = datetime.now(timezone.utc)
        work_record.verified_by = current_user['id']
        assignment.status = 'verified'
    else:
        work_record.status = 'draft'
        assignment.status = 'work_pending'

    db.session.commit()
    return work_record


def generate_invoice(assignment_id, current_user, data=None):
    assignment = _get_assignment_or_404(assignment_id)
    work_record = WorkRecord.query.filter_by(assignment_id=assignment_id).first()
    if not work_record:
        raise ValueError('Work record not found')

    if work_record.status != 'verified':
        raise ValueError('Work record must be verified before generating invoice')

    appointment = assignment.appointment
    customer, vehicle, service = _load_appointment_entities(appointment)

    if not customer.email:
        raise ValueError('Customer email is missing')

    existing_invoice = Invoice.query.filter_by(appointment_id=appointment.id).first()
    if existing_invoice:
        raise ValueError('Invoice already exists for this appointment')

    data = data or {}
    tax_amount = data.get('tax_amount', 0)
    discount_amount = data.get('discount_amount', 0)
    notes = data.get('notes', '')

    invoice_number = _generate_invoice_number(appointment.id, appointment.updated_at)
    total_amount = float(work_record.total_amount) + float(tax_amount) - float(discount_amount)

    invoice = Invoice()
    invoice.invoice_number = invoice_number
    invoice.appointment_id = appointment.id
    invoice.user_id = customer.id
    invoice.total_amount = total_amount
    invoice.status = 'draft'
    invoice.notes = notes
    db.session.add(invoice)
    db.session.flush()

    line_items_data = data.get('line_items', [])
    for item_data in line_items_data:
        from app.services.fleets.models import InvoiceLineItem
        line_item = InvoiceLineItem()
        line_item.invoice_id = invoice.id
        line_item.description = item_data.get('description', '')
        line_item.quantity = item_data.get('quantity', 1)
        line_item.unit_price = item_data.get('unit_price', 0)
        line_item.total_price = item_data.get('total_price', 0)
        db.session.add(line_item)

    work_record.status = 'invoiced'
    appointment.status = 'completed'
    appointment.total_amount = total_amount
    db.session.commit()
    return invoice


def get_admin_pending_verifications(current_user):
    if current_user.get('role') not in ('admin', 'super_admin'):
        raise PermissionError('Admin access required')

    assignments = Assignment.query.join(WorkRecord).filter(
        WorkRecord.status == 'submitted'
    ).order_by(WorkRecord.submitted_at.desc()).all()

    result = []
    for assignment in assignments:
        result.append({
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
        })
    return result


def get_employee_dashboard_data(current_user):
    employee = _get_employee_or_404(current_user['id'])

    total_assignments = Assignment.query.filter_by(employee_id=employee.id).count()
    pending_checklist = Assignment.query.filter_by(employee_id=employee.id, status='checklist_pending').count()
    pending_work = Assignment.query.filter_by(employee_id=employee.id, status='work_pending').count()
    submitted = Assignment.query.filter_by(employee_id=employee.id, status='submitted').count()
    completed = Assignment.query.filter_by(employee_id=employee.id, status='completed').count()

    assignments = Assignment.query.filter_by(employee_id=employee.id).order_by(Assignment.assigned_at.desc()).limit(20).all()

    enriched = []
    for assignment in assignments:
        enriched.append({
            **assignment.to_dict(),
            'appointment': {
                **assignment.appointment.to_dict(),
                'customer': {
                    'id': assignment.appointment.customer.id,
                    'name': assignment.appointment.customer.name,
                    'phone': assignment.appointment.customer.phone,
                },
                'vehicle': assignment.appointment.vehicle.to_dict() if assignment.appointment.vehicle else None,
                'service': assignment.appointment.service.to_dict() if assignment.appointment.service else None,
            },
            'employee': {
                'id': employee.id,
                'employee_id': employee.employee_id,
                'user': {
                    'id': employee.user.id,
                    'name': employee.user.name,
                    'email': employee.user.email,
                }
            },
            'checklist': assignment.checklist.to_dict() if assignment.checklist else None,
            'work_record': assignment.work_record.to_dict() if assignment.work_record else None,
        })

    return {
        'success': True,
        'data': {
            'assignments': enriched,
            'statistics': {
                'total_assignments': total_assignments,
                'pending_checklist': pending_checklist,
                'pending_work_record': pending_work,
                'submitted_waiting_verification': submitted,
                'completed': completed,
            }
        }
    }


def _recalculate_work_record(work_record):
    items = work_record.items or []
    subtotal = sum(item.get('total_price', 0) for item in items)
    labor_total = (float(work_record.labor_hours) if work_record.labor_hours else 0) * (float(work_record.labor_rate) if work_record.labor_rate else 0)
    work_record.subtotal = subtotal + labor_total
    work_record.total_amount = work_record.subtotal + float(work_record.tax_amount or 0)
