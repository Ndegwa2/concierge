import os
from datetime import datetime, timezone
from pathlib import Path
from fpdf import FPDF
from flask import current_app

from app.services.appointments.models import Appointment
from app.services.auth.models import User
from app.services.vehicles.models import Vehicle
from app.services.catalog.models import Service


class InvoicePDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 16)
        self.cell(0, 10, 'Ndegwa Auto Concierge', ln=True, align='C')
        self.set_font('Helvetica', '', 10)
        self.cell(0, 6, 'contact@autoconcierge.com | +254 700 000 000', ln=True, align='C')
        self.ln(4)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', align='C')


def _format_currency(amount):
    return f'KSh {amount:,.2f}'


def generate_invoice_pdf(appointment, customer, vehicle, service, invoice_number):
    instance_path = Path(current_app.instance_path)
    invoice_dir = instance_path / 'invoices'
    invoice_dir.mkdir(parents=True, exist_ok=True)

    filename = f'{invoice_number}.pdf'
    pdf_path = invoice_dir / filename

    pdf = InvoicePDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 8, 'INVOICE', ln=True)
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(95, 7, f'# {invoice_number}', ln=False)
    pdf.cell(0, 7, f"Date: {appointment.appointment_date.strftime('%Y-%m-%d')}", ln=True)
    pdf.ln(2)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 7, 'Bill To:', ln=True)
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(0, 6, customer.name, ln=True)
    pdf.cell(0, 6, customer.email, ln=True)
    if customer.phone:
        pdf.cell(0, 6, customer.phone, ln=True)
    pdf.ln(2)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 7, 'Vehicle:', ln=True)
    pdf.set_font('Helvetica', '', 10)
    vehicle_text = f"{vehicle.make} {vehicle.model} {vehicle.year or ''}".strip()
    if vehicle.license_plate:
        vehicle_text += f" ({vehicle.license_plate})"
    pdf.cell(0, 6, vehicle_text, ln=True)
    pdf.ln(2)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 7, 'Service:', ln=True)
    pdf.set_font('Helvetica', '', 10)
    pdf.multi_cell(0, 6, service.name)
    if service.description:
        pdf.multi_cell(0, 6, service.description)
    pdf.ln(2)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 7, 'Work Done:', ln=True)
    pdf.set_font('Helvetica', '', 10)
    notes = (appointment.notes or '').strip()
    if notes:
        pdf.multi_cell(0, 6, notes)
    else:
        pdf.cell(0, 6, 'No additional notes.', ln=True)
    pdf.ln(4)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(120, 8, 'Description', border=1)
    pdf.cell(25, 8, 'Qty', border=1, align='C')
    pdf.cell(45, 8, 'Total', border=1, align='R', ln=True)

    pdf.set_font('Helvetica', '', 10)
    pdf.cell(120, 8, service.name, border=1)
    pdf.cell(25, 8, '1', border=1, align='C')
    total = float(appointment.total_amount or 0)
    pdf.cell(45, 8, _format_currency(total), border=1, align='R', ln=True)

    pdf.set_font('Helvetica', '', 10)
    pdf.cell(120, 8, 'Subtotal:', border=0, align='R')
    pdf.cell(45, 8, _format_currency(total), border=0, align='R', ln=True)

    tax = 0.0
    pdf.cell(120, 8, 'Tax (0%):', border=0, align='R')
    pdf.cell(45, 8, _format_currency(tax), border=0, align='R', ln=True)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(120, 8, 'TOTAL:', border=0, align='R')
    pdf.cell(45, 8, _format_currency(total), border=0, align='R', ln=True)

    pdf.ln(6)
    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 7, 'Payment Information:', ln=True)
    pdf.set_font('Helvetica', '', 10)
    pdf.multi_cell(0, 6, 'Payment integration is not yet configured. Please contact us for payment details.')
    pdf.ln(4)

    pdf.set_font('Helvetica', '', 10)
    pdf.cell(0, 6, 'Thank you for your business!', ln=True, align='C')

    pdf.output(str(pdf_path))
    return str(pdf_path)
