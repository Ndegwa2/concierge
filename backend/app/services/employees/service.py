from app import db
from app.services.auth.models import User
from app.services.employees.models import Employee, EmployeeDocument, EmployeeTimeLog, TimeOffRequest, IssueReport
from app.services.appointments.models import Appointment, Assignment
from datetime import datetime, timezone, timedelta
from io import StringIO
import csv
import os


def register_employee(data):
    required_fields = ['name', 'email', 'password', 'location']
    if not all(key in data for key in required_fields):
        raise ValueError('Missing required fields')
    
    if User.query.filter_by(email=data['email']).first():
        raise ValueError('Email already registered')
    
    user = User()
    user.name = data['name']
    user.email = data['email']
    user.set_password(data['password'])
    user.phone = data.get('phone', '')
    user.address = data.get('address', '')
    user.role = 'employee'
    user.is_active = True
    
    db.session.add(user)
    db.session.flush()
    
    employee = Employee()
    employee.user_id = user.id
    employee.location = data['location']
    employee.specialties = data.get('specialties', [])
    employee.status = data.get('status', 'active')
    employee.department = data.get('department', 'Operations')
    employee.title = data.get('title', 'Concierge')
    employee.employment_type = data.get('employment_type', 'full_time')
    if data.get('start_date'):
        employee.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
    employee.account_status = data.get('account_status', 'onboarding')
    
    if 'base_salary' in data:
        employee.base_salary = data['base_salary']
    if 'hourly_rate' in data:
        employee.hourly_rate = data['hourly_rate']
    if 'pay_frequency' in data:
        employee.pay_frequency = data['pay_frequency']
    if 'bank_account_number' in data:
        employee.bank_account_number = data['bank_account_number']
    if 'bank_name' in data:
        employee.bank_name = data['bank_name']
    if 'health_plan_tier' in data:
        employee.health_plan_tier = data['health_plan_tier']
    
    db.session.add(employee)
    db.session.commit()
    return employee


def get_all_employees_query(status=None, location=None, search=None):
    query = Employee.query.join(User)
    
    if status:
        query = query.filter(Employee.status == status)
    
    if location:
        query = query.filter(Employee.location.ilike(f'%{location}%'))
    
    if search:
        query = query.filter(
            db.or_(
                User.name.ilike(f'%{search}%'),
                Employee.employee_id.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%')
            )
        )
    
    return query.all()


def get_employee_by_id(employee_id):
    employee = Employee.query.get(employee_id)
    
    if not employee:
        raise ValueError('Employee not found')
    
    return employee


def update_employee(employee_id, data):
    employee = Employee.query.get(employee_id)
    
    if not employee:
        raise ValueError('Employee not found')
    
    user = employee.user
    
    if 'name' in data:
        user.name = data['name']
    
    if 'email' in data:
        existing = User.query.filter_by(email=data['email']).first()
        if existing and existing.id != user.id:
            raise ValueError('Email already in use')
        user.email = data['email']
    
    if 'phone' in data:
        user.phone = data['phone']
    
    if 'address' in data:
        user.address = data['address']
    
    if 'password' in data:
        user.set_password(data['password'])
    
    if 'location' in data:
        employee.location = data['location']
    
    if 'specialties' in data:
        employee.specialties = data['specialties']
    
    if 'status' in data:
        employee.status = data['status']
    
    if 'department' in data:
        employee.department = data['department']
    
    if 'title' in data:
        employee.title = data['title']
    
    if 'employment_type' in data:
        employee.employment_type = data['employment_type']
    
    if 'start_date' in data:
        employee.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00')) if data['start_date'] else employee.start_date
    
    if 'manager_id' in data:
        employee.manager_id = data['manager_id']
    
    if 'account_status' in data:
        employee.account_status = data['account_status']
    
    if 'exit_notes' in data:
        employee.exit_notes = data['exit_notes']
    
    if 'offboarding_checklist_completed' in data:
        employee.offboarding_checklist_completed = data['offboarding_checklist_completed']
    
    if 'base_salary' in data:
        employee.base_salary = data['base_salary']
    
    if 'hourly_rate' in data:
        employee.hourly_rate = data['hourly_rate']
    
    if 'pay_frequency' in data:
        employee.pay_frequency = data['pay_frequency']
    
    if 'bank_account_number' in data:
        employee.bank_account_number = data['bank_account_number']
    
    if 'bank_name' in data:
        employee.bank_name = data['bank_name']
    
    if 'health_plan_tier' in data:
        employee.health_plan_tier = data['health_plan_tier']
    
    db.session.commit()
    return user


def deactivate_employee(employee_id):
    employee = Employee.query.get(employee_id)
    
    if not employee:
        raise ValueError('Employee not found')
    
    employee.user.is_active = False
    employee.status = 'suspended'
    
    db.session.commit()


def update_employee_status(employee_id, data):
    employee = Employee.query.get(employee_id)
    
    if not employee:
        raise ValueError('Employee not found')
    
    if 'status' not in data:
        raise ValueError('Status is required')
    
    valid_statuses = ['active', 'off-duty', 'suspended']
    if data['status'] not in valid_statuses:
        raise ValueError(f'Invalid status. Valid options: {valid_statuses}')
    
    employee.status = data['status']
    
    if data['status'] == 'suspended':
        employee.user.is_active = False
    else:
        employee.user.is_active = True
    
    db.session.commit()
    return employee


def upload_employee_document(employee_id, file, doc_type, document_name, is_verified):
    employee = Employee.query.get(employee_id)
    
    if not employee:
        raise ValueError('Employee not found')
    
    if file.filename == '':
        raise ValueError('No file selected')
    
    ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.docx', '.doc'}
    ALLOWED_MIME_TYPES = {
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f'File type not allowed. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}')
    
    if file.mimetype not in ALLOWED_MIME_TYPES:
        raise ValueError('Invalid file type detected')
    
    if file.content_length > 10 * 1024 * 1024:
        raise ValueError('File size exceeds 10MB limit')
    
    upload_dir = os.path.join(os.getcwd(), 'uploads', 'employee_documents')
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1]
    unique_filename = f"doc_{employee_id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}{ext}"
    file_path = os.path.join(upload_dir, unique_filename)
    file.save(file_path)
    
    file_size = os.path.getsize(file_path)
    
    document = EmployeeDocument()
    document.employee_id = employee.id
    document.document_name = document_name
    document.doc_type = doc_type
    document.file_path = unique_filename
    document.file_name = file.filename
    document.file_size = file_size
    document.mime_type = file.mimetype
    document.is_verified = is_verified
    document.verified_at = datetime.now(timezone.utc) if is_verified else None
    
    current_user = None
    try:
        from app.utils.decorators import get_current_user
        current_user = get_current_user()
    except RuntimeError:
        pass
    
    if current_user:
        document.uploaded_by = current_user.get('id')
    
    db.session.add(document)
    db.session.commit()
    return document


def get_employee_documents_query(employee_id):
    employee = Employee.query.get(employee_id)
    
    if not employee:
        raise ValueError('Employee not found')
    
    return EmployeeDocument.query.filter_by(employee_id=employee.id).all()


def delete_employee_document(employee_id, doc_id):
    document = EmployeeDocument.query.get(doc_id)
    
    if not document or document.employee_id != employee_id:
        raise ValueError('Document not found')
    
    if document.file_path:
        upload_dir = os.path.join(os.getcwd(), 'uploads', 'employee_documents')
        file_path = os.path.join(upload_dir, document.file_path)
        if os.path.exists(file_path):
            os.remove(file_path)
    
    db.session.delete(document)
    db.session.commit()


def export_employees_csv_query(status=None, location=None, search=None):
    query = Employee.query.join(User)
    
    if status:
        query = query.filter(Employee.status == status)
    
    if location:
        query = query.filter(Employee.location.ilike(f'%{location}%'))
    
    if search:
        query = query.filter(
            db.or_(
                User.name.ilike(f'%{search}%'),
                Employee.employee_id.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%')
            )
        )
    
    return query.all()


def update_employee_account_status(employee_id, data):
    employee = Employee.query.get(employee_id)
    
    if not employee:
        raise ValueError('Employee not found')
    
    if 'account_status' not in data:
        raise ValueError('account_status is required')
    
    valid_statuses = ['active', 'onboarding', 'suspended', 'terminated']
    if data['account_status'] not in valid_statuses:
        raise ValueError(f'Invalid account_status. Valid options: {valid_statuses}')
    
    employee.account_status = data['account_status']
    
    if 'exit_notes' in data:
        employee.exit_notes = data['exit_notes']
    
    if 'offboarding_checklist_completed' in data:
        employee.offboarding_checklist_completed = data['offboarding_checklist_completed']
    
    if data['account_status'] == 'terminated':
        employee.user.is_active = False
        employee.status = 'suspended'
    elif data['account_status'] == 'suspended':
        employee.user.is_active = False
    else:
        employee.user.is_active = True
    
    db.session.commit()
    return employee


def get_departments_query():
    departments = db.session.query(Employee.department).filter(Employee.department.isnot(None)).distinct().all()
    dept_list = [d[0] for d in departments]
    defaults = ['Operations', 'Customer Service', 'Maintenance', 'Detailing', 'Administration']
    for d in defaults:
        if d not in dept_list:
            dept_list.append(d)
    return dept_list


def get_managers_query():
    employees = Employee.query.filter(Employee.title.in_(['Manager', 'Supervisor', 'Team Lead', 'Head of Operations'])).all()
    managers = [
        {
            'id': emp.id,
            'name': emp.user.name,
            'employee_id': emp.employee_id
        }
        for emp in employees
    ]
    return managers


def assign_employee_to_appointment(appointment_id, data=None):
    if data is None:
        from flask import request
        data = request.get_json(silent=True) or {}

    appointment = Appointment.query.get(appointment_id)

    if not appointment:
        raise ValueError('Appointment not found')

    if 'employee_id' not in data:
        raise ValueError('employee_id is required')

    employee = Employee.query.get(data['employee_id'])

    if not employee:
        raise ValueError('Employee not found')

    if employee.status != 'active':
        raise ValueError('Employee is not available for assignment')

    existing = Assignment.query.filter(
        Assignment.appointment_id == appointment_id,
        Assignment.status.in_(['assigned', 'in-progress'])
    ).first()

    if existing:
        raise ValueError('Appointment already has an active assignment')

    assignment = Assignment()
    assignment.appointment_id = appointment_id
    assignment.employee_id = employee.id
    assignment.status = 'assigned'
    assignment.notes = data.get('notes', '')

    appointment.status = 'confirmed'

    db.session.add(assignment)
    db.session.commit()

    _notify_employee_assigned(assignment, employee, appointment)
    return assignment


def _notify_employee_assigned(assignment, employee, appointment):
    """Notify the assigned employee via in-app Notification + email."""
    from datetime import datetime
    from app.services.notifications.models import Notification
    from app.services.auth.models import User
    from app.services.vehicles.models import Vehicle
    from app.services.catalog.models import Service

    user = User.query.get(employee.user_id) if employee else None
    if not user:
        return

    vehicle = Vehicle.query.get(appointment.vehicle_id) if appointment.vehicle_id else None
    service = Service.query.get(appointment.service_id) if appointment.service_id else None

    vehicle_label = (
        f'{vehicle.make} {vehicle.model} ({vehicle.year})' if vehicle
        else f'Vehicle #{appointment.vehicle_id}'
    )
    service_name = service.name if service else f'Service #{appointment.service_id}'
    scheduled = appointment.appointment_date.strftime('%Y-%m-%d %H:%M') if appointment.appointment_date else 'unscheduled'

    title = 'New assignment'
    message = (
        f'You have been assigned to {service_name} for {vehicle_label} '
        f'on {scheduled} (Appointment #{appointment.id}).'
    )

    try:
        note = Notification(
            user_id=user.id,
            title=title,
            message=message,
            notification_type='assignment',
        )
        db.session.add(note)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        import logging
        logging.getLogger(__name__).warning('Failed to create employee notification: %s', exc)
        return

    if not user.email:
        return

    try:
        from app.tasks.email_tasks import send_email
        subject = f'[AutoConcierge] New assignment — Appointment #{appointment.id}'
        body = (
            f"Hi {user.name},\n\n"
            f"You have been assigned a new job.\n\n"
            f"  Service:    {service_name}\n"
            f"  Vehicle:    {vehicle_label}\n"
            f"  Date/Time:  {scheduled}\n"
            f"  Appointment ID: {appointment.id}\n\n"
            f"Open your employee dashboard to view the full assignment and start the checklist.\n\n"
            f"AutoConcierge"
        )
        send_email.delay(user.email, subject, body)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning('Failed to enqueue employee assignment email: %s', exc)


def get_employee_dashboard(current_user):
    employee = Employee.query.filter_by(user_id=current_user['id']).first()
    
    if not employee:
        raise ValueError('Employee profile not found')
    
    total_assignments = Assignment.query.filter_by(employee_id=employee.id).count()
    active_assignments = Assignment.query.filter(
        Assignment.employee_id == employee.id,
        Assignment.status.in_(['assigned', 'in-progress'])
    ).count()
    completed_assignments = Assignment.query.filter_by(
        employee_id=employee.id,
        status='completed'
    ).count()
    
    today = datetime.now(timezone.utc).date()
    today_assignments = Assignment.query.filter(
        Assignment.employee_id == employee.id,
        db.func.date(Assignment.assigned_at) == today
    ).count()
    
    return {
        'success': True,
        'data': {
            'employee': employee.to_dict(),
            'statistics': {
                'total_assignments': total_assignments,
                'active_assignments': active_assignments,
                'completed_assignments': completed_assignments,
                'today_assignments': today_assignments,
                'rating': float(employee.rating) if employee.rating else 0.0
            }
        }
    }


def get_my_assignments_query(current_user):
    employee = Employee.query.filter_by(user_id=current_user['id']).first()
    
    if not employee:
        raise ValueError('Employee profile not found')
    
    query = Assignment.query.filter_by(employee_id=employee.id)
    status = None
    assignments = query.order_by(Assignment.assigned_at.desc()).all()
    
    enriched_assignments = []
    for assignment in assignments:
        appointment = assignment.appointment
        customer = appointment.customer
        vehicle = appointment.vehicle
        service = appointment.service
        
        enriched_assignments.append({
            **assignment.to_dict(),
            'appointment': {
                **appointment.to_dict(),
                'customer': {
                    'id': customer.id,
                    'name': customer.name,
                    'phone': customer.phone
                },
                'vehicle': vehicle.to_dict() if vehicle else None,
                'service': service.to_dict() if service else None
            }
        })
    
    return enriched_assignments


def update_assignment_status(assignment_id, current_user, data):
    employee = Employee.query.filter_by(user_id=current_user['id']).first()
    
    if not employee:
        raise ValueError('Employee profile not found')
    
    assignment = Assignment.query.get(assignment_id)
    
    if not assignment:
        raise ValueError('Assignment not found')
    
    if assignment.employee_id != employee.id:
        raise ValueError('Unauthorized access')
    
    if 'status' not in data:
        raise ValueError('Status is required')
    
    valid_transitions = {
        'assigned': ['in-progress', 'cancelled'],
        'in-progress': ['completed', 'cancelled'],
        'completed': [],
        'cancelled': []
    }
    
    current_status = assignment.status
    new_status = data['status']
    
    if new_status not in valid_transitions.get(current_status, []):
        raise ValueError(f'Cannot transition from {current_status} to {new_status}')
    
    assignment.status = new_status
    
    if new_status == 'in-progress':
        assignment.started_at = datetime.now(timezone.utc)
        assignment.appointment.status = 'in-progress'
    
    elif new_status == 'completed':
        assignment.completed_at = datetime.now(timezone.utc)
        assignment.appointment.status = 'completed'
        employee.total_services += 1
    
    elif new_status == 'cancelled':
        assignment.appointment.status = 'scheduled'
    
    if 'notes' in data:
        assignment.notes = data['notes']
    
    db.session.commit()
    return assignment


def get_my_schedule_query(current_user, start_date=None, end_date=None):
    employee = Employee.query.filter_by(user_id=current_user['id']).first()
    
    if not employee:
        raise ValueError('Employee profile not found')
    
    query = Assignment.query.filter_by(employee_id=employee.id)
    
    if start_date:
        query = query.filter(Assignment.assigned_at >= datetime.fromisoformat(start_date))
    
    if end_date:
        query = query.filter(Assignment.assigned_at <= datetime.fromisoformat(end_date))
    
    assignments = query.order_by(Assignment.assigned_at).all()
    
    schedule = {}
    for assignment in assignments:
        date_key = assignment.assigned_at.date().isoformat()
        if date_key not in schedule:
            schedule[date_key] = []
        
        appointment = assignment.appointment
        schedule[date_key].append({
            'assignment_id': assignment.id,
            'appointment_id': appointment.id,
            'time': assignment.assigned_at.strftime('%H:%M'),
            'status': assignment.status,
            'service': appointment.service.name if appointment.service else None,
            'customer': {
                'name': appointment.customer.name,
                'phone': appointment.customer.phone
            }
        })
    
    return schedule


def get_my_profile(current_user):
    employee = Employee.query.filter_by(user_id=current_user['id']).first()
    
    if not employee:
        raise ValueError('Employee profile not found')
    
    return employee


def update_my_profile(current_user, data):
    employee = Employee.query.filter_by(user_id=current_user['id']).first()
    
    if not employee:
        raise ValueError('Employee profile not found')
    
    user = employee.user
    
    if 'name' in data:
        user.name = data['name']
    
    if 'phone' in data:
        user.phone = data['phone']
    
    if 'address' in data:
        user.address = data['address']
    
    if 'password' in data:
        user.set_password(data['password'])
    
    if 'location' in data:
        employee.location = data['location']
    
    if 'specialties' in data:
        employee.specialties = data['specialties']
    
    db.session.commit()
    return user


def clock_in_out(current_user, action, notes=''):
    employee = Employee.query.filter_by(user_id=current_user['id']).first()
    
    if not employee:
        raise ValueError('Employee profile not found')
    
    last_log = EmployeeTimeLog.query.filter_by(
        employee_id=employee.id
    ).order_by(EmployeeTimeLog.timestamp.desc()).first()
    
    if action == 'in':
        if last_log and last_log.action == 'in' and not last_log.notes.startswith('clocked_out'):
            has_clock_out = EmployeeTimeLog.query.filter(
                EmployeeTimeLog.employee_id == employee.id,
                EmployeeTimeLog.timestamp > last_log.timestamp,
                EmployeeTimeLog.action == 'out'
            ).first()
            if not has_clock_out:
                raise ValueError('You are already clocked in')
        
        time_log = EmployeeTimeLog()
        time_log.employee_id = employee.id
        time_log.action = 'in'
        time_log.notes = notes
        employee.status = 'active'
        db.session.add(time_log)
        db.session.commit()
        
        return {
            'time_log': time_log.to_dict(),
            'status': employee.status
        }
    
    else:
        if not last_log or last_log.action == 'out':
            has_clock_in = EmployeeTimeLog.query.filter(
                EmployeeTimeLog.employee_id == employee.id,
                EmployeeTimeLog.action == 'in'
            ).order_by(EmployeeTimeLog.timestamp.desc()).first()
            if not has_clock_in:
                clock_in_count = EmployeeTimeLog.query.filter_by(
                    employee_id=employee.id,
                    action='in'
                ).count()
                if clock_in_count == 0:
                    raise ValueError('You must clock in first')
        
        clock_in_logs = EmployeeTimeLog.query.filter_by(
            employee_id=employee.id,
            action='in'
        ).order_by(EmployeeTimeLog.timestamp.desc()).all()
        
        matched_clock_in = None
        for clk_in in clock_in_logs:
            matching_out = EmployeeTimeLog.query.filter(
                EmployeeTimeLog.employee_id == employee.id,
                EmployeeTimeLog.action == 'out',
                EmployeeTimeLog.timestamp > clk_in.timestamp
            ).first()
            if not matching_out:
                matched_clock_in = clk_in
                break
        
        if not matched_clock_in:
            raise ValueError('No active clock-in session found')
        
        time_log = EmployeeTimeLog()
        time_log.employee_id = employee.id
        time_log.action = 'out'
        time_log.notes = notes
        time_log.timestamp = datetime.now(timezone.utc)
        employee.status = 'off-duty'
        db.session.add(time_log)
        db.session.commit()
        
        return {
            'time_log': time_log.to_dict(),
            'status': employee.status
        }


def get_time_logs_query(current_user):
    employee = Employee.query.filter_by(user_id=current_user['id']).first()
    
    if not employee:
        raise ValueError('Employee profile not found')
    
    today = datetime.now(timezone.utc).date()
    today_start = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
    today_end = datetime.combine(today + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
    
    logs = EmployeeTimeLog.query.filter(
        EmployeeTimeLog.employee_id == employee.id,
        EmployeeTimeLog.timestamp >= today_start,
        EmployeeTimeLog.timestamp < today_end
    ).order_by(EmployeeTimeLog.timestamp).all()
    
    is_clocked_in = False
    last_action = None
    
    if logs:
        last_log = logs[-1]
        if last_log.action == 'in':
            is_clocked_in = True
        last_action = last_log.action
    
    if not is_clocked_in:
        all_logs = EmployeeTimeLog.query.filter_by(
            employee_id=employee.id
        ).order_by(EmployeeTimeLog.timestamp.desc()).all()
        for log in all_logs:
            if log.action == 'in' and not log.notes.startswith('clocked_out'):
                matching_out = EmployeeTimeLog.query.filter(
                    EmployeeTimeLog.employee_id == employee.id,
                    EmployeeTimeLog.action == 'out',
                    EmployeeTimeLog.timestamp > log.timestamp
                ).first()
                if not matching_out:
                    is_clocked_in = True
                    break
    
    total_seconds = 0
    clock_in_time = None
    for log in logs:
        if log.action == 'in':
            clock_in_time = log.timestamp
        elif log.action == 'out' and clock_in_time:
            total_seconds += (log.timestamp - clock_in_time).total_seconds()
            clock_in_time = None
    
    if clock_in_time:
        total_seconds += (datetime.now(timezone.utc) - clock_in_time).total_seconds()
    
    total_hours = round(total_seconds / 3600, 2)
    
    return {
        'logs': [log.to_dict() for log in logs],
        'is_clocked_in': is_clocked_in,
        'total_hours': total_hours,
        'current_status': employee.status,
        'last_action': last_action
    }


def request_time_off(current_user, data):
    employee = Employee.query.filter_by(user_id=current_user['id']).first()
    
    if not employee:
        raise ValueError('Employee profile not found')
    
    required_fields = ['request_type', 'start_date', 'end_date']
    if not all(key in data for key in required_fields):
        raise ValueError('Missing required fields')
    
    valid_types = ['vacation', 'sick', 'personal', 'other']
    if data['request_type'] not in valid_types:
        raise ValueError(f'Invalid request_type. Valid options: {valid_types}')
    
    try:
        start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
    except (ValueError, TypeError):
        raise ValueError('Invalid date format. Use ISO 8601 format.')
    
    if end_date < start_date:
        raise ValueError('End date must be after or equal to start date')
    
    time_off = TimeOffRequest()
    time_off.employee_id = employee.id
    time_off.request_type = data['request_type']
    time_off.start_date = start_date
    time_off.end_date = end_date
    time_off.reason = data.get('reason', '')
    time_off.status = 'pending'
    
    db.session.add(time_off)
    db.session.commit()
    return time_off


def get_time_off_requests_query(current_user):
    employee = Employee.query.filter_by(user_id=current_user['id']).first()
    
    if not employee:
        raise ValueError('Employee profile not found')
    
    return TimeOffRequest.query.filter_by(
        employee_id=employee.id
    ).order_by(TimeOffRequest.created_at.desc()).all()


def report_issue(current_user, data):
    employee = Employee.query.filter_by(user_id=current_user['id']).first()
    
    if not employee:
        raise ValueError('Employee profile not found')
    
    required_fields = ['title', 'description']
    if not all(key in data for key in required_fields):
        raise ValueError('Missing required fields')
    
    valid_priorities = ['low', 'medium', 'high', 'urgent']
    priority = data.get('priority', 'medium')
    if priority not in valid_priorities:
        raise ValueError(f'Invalid priority. Valid options: {valid_priorities}')
    
    issue = IssueReport()
    issue.employee_id = employee.id
    issue.title = data['title']
    issue.description = data['description']
    issue.priority = priority
    issue.appointment_id = data.get('appointment_id')
    issue.status = 'open'
    
    db.session.add(issue)
    db.session.commit()
    return issue


def get_issue_reports_query(current_user):
    employee = Employee.query.filter_by(user_id=current_user['id']).first()
    
    if not employee:
        raise ValueError('Employee profile not found')
    
    return IssueReport.query.filter_by(
        employee_id=employee.id
    ).order_by(IssueReport.created_at.desc()).all()


def download_employee_document_file(document_id):
    document = EmployeeDocument.query.get(document_id)
    
    if not document:
        raise ValueError('Document not found')
    
    upload_dir = os.path.join(os.getcwd(), 'uploads', 'employee_documents')
    file_path = os.path.join(upload_dir, document.file_path)
    
    if not os.path.exists(file_path):
        raise ValueError('File not found on disk')
    
    return file_path