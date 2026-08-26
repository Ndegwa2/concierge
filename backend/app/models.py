"""
Models module - re-exports from domain-specific modules for backward compatibility.

This module provides a single import point for all models.
New code should import directly from domain modules:
    from app.services.auth.models import User
    from app.services.catalog.models import Service
    from app.services.vehicles.models import Vehicle
    from app.services.appointments.models import Appointment
    from app.services.notifications.models import Notification
    from app.services.employees.models import Employee
    from app.services.partners.models import ServicePartner
    from app.services.admin.models import AuditLog
    from app.services.fleets.models import Company, FleetVehicle, FleetExpense, Invoice
    from app.services.payments.models import Payment
"""

from app.core.types import EncryptedString, EncryptedDate

from app.services.auth.models import User, PaymentMethod
from app.services.catalog.models import Service, DiscountCode
from app.services.vehicles.models import Vehicle
from app.services.appointments.models import Appointment, ServiceHistory, Assignment
from app.services.notifications.models import Notification
from app.services.employees.models import (
    Employee, EmployeeDocument, EmployeeTimeLog, TimeOffRequest, IssueReport
)
from app.services.partners.models import ServicePartner
from app.services.admin.models import AuditLog, SystemMetric, ActivityTracker
from app.services.fleets.models import (
    Company, FleetVehicle, FleetExpense, InvoiceLineItem, Invoice
)
from app.services.payments.models import Payment

__all__ = [
    'EncryptedString',
    'EncryptedDate',
    'User',
    'PaymentMethod',
    'Service',
    'DiscountCode',
    'Vehicle',
    'Appointment',
    'ServiceHistory',
    'Assignment',
    'Notification',
    'Employee',
    'EmployeeDocument',
    'EmployeeTimeLog',
    'TimeOffRequest',
    'IssueReport',
    'ServicePartner',
    'AuditLog',
    'SystemMetric',
    'ActivityTracker',
    'Company',
    'FleetVehicle',
    'FleetExpense',
    'InvoiceLineItem',
    'Invoice',
    'Payment',
]
