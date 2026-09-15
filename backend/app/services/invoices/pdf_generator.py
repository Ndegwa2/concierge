import os
from datetime import datetime, timezone
from pathlib import Path
from fpdf import FPDF
from flask import current_app
from fpdf.enums import AccessPermission

from app.services.appointments.models import Appointment
from app.services.auth.models import User
from app.services.catalog.models import Service
from app.services.fleets.models import Invoice, InvoiceLineItem


class InvoicePDF(FPDF):
    def header(self):
        self.set_xy(self.w / 2, self.h / 2)
        with self.rotation(45, self.w / 2, self.h / 2):
            self.set_font('Helvetica', 'B', 40)
            self.set_text_color(200, 200, 200)
            self.cell(0, 10, 'AutoConcierge', align='C')
        self.set_text_color(0, 0, 0)
        self.set_xy(self.l_margin, self.t_margin)
        self.set_font('Helvetica', 'B', 16)
        self.cell(0, 10, 'Auto Concierge', ln=True, align='C')
        self.set_font('Helvetica', '', 10)
        self.cell(0, 6, 'Nairobi, Kenya | contact@autoconcierge.com | +254 717540110', ln=True, align='C')
        self.ln(4)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', align='C')


def _format_currency(amount):
    return f'KSh {amount:,.2f}'


def generate_invoice_pdf(appointment, customer, vehicle, service, invoice_number, invoice=None):
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
    pdf.ln(2)

    pdf.set_font('Helvetica', '', 10)
    if appointment:
        date_str = f"{appointment.appointment_date.strftime('%B')} {appointment.appointment_date.day}, {appointment.appointment_date.year}"
    else:
        now = datetime.now(timezone.utc)
        date_str = f"{now.strftime('%B')} {now.day}, {now.year}"
    pdf.cell(0, 6, f'Invoice Number: {invoice_number}', ln=True)
    pdf.cell(0, 6, f'Invoice Date: {date_str}', ln=True)
    pdf.cell(0, 6, 'Due Date: Upon Receipt', ln=True)
    pdf.ln(4)

    if customer:
        pdf.set_font('Helvetica', 'B', 10)
        pdf.cell(0, 7, 'Bill To:', ln=True)
        pdf.set_font('Helvetica', '', 10)
        pdf.cell(0, 6, customer.name, ln=True)
        pdf.cell(0, 6, customer.email, ln=True)
        if customer.phone:
            pdf.cell(0, 6, customer.phone, ln=True)
        pdf.ln(4)

    if invoice and invoice.line_items:
        line_items = invoice.line_items
        total = float(invoice.total_amount or 0)
    elif appointment and service:
        line_items = [
            InvoiceLineItem(
                description=service.name,
                quantity=1,
                unit_price=float(appointment.total_amount or 0),
                total_price=float(appointment.total_amount or 0),
            )
        ]
        total = float(appointment.total_amount or 0)
    else:
        line_items = []
        total = 0

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(90, 8, 'Description', border=1)
    pdf.cell(20, 8, 'Qty', border=1, align='C')
    pdf.cell(40, 8, 'Rate (KSh)', border=1, align='R')
    pdf.cell(40, 8, 'Amount (KSh)', border=1, align='R', ln=True)

    pdf.set_font('Helvetica', '', 10)
    for item in line_items:
        pdf.cell(90, 8, item.description, border=1)
        pdf.cell(20, 8, str(item.quantity), border=1, align='C')
        pdf.cell(40, 8, _format_currency(float(item.unit_price)), border=1, align='R')
        pdf.cell(40, 8, _format_currency(float(item.total_price)), border=1, align='R', ln=True)

    subtotal = total - float(invoice.tax_amount if invoice else 0)
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(90, 8, 'Subtotal:', border=0, align='R')
    pdf.cell(20, 8, '', border=0)
    pdf.cell(40, 8, '', border=0, align='R')
    pdf.cell(40, 8, _format_currency(subtotal), border=0, align='R', ln=True)

    tax = float(invoice.tax_amount if invoice else 0)
    pdf.cell(90, 8, f'VAT (16%):', border=0, align='R')
    pdf.cell(20, 8, '', border=0)
    pdf.cell(40, 8, '', border=0, align='R')
    pdf.cell(40, 8, _format_currency(tax), border=0, align='R', ln=True)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(90, 8, 'Total Due:', border=0, align='R')
    pdf.cell(20, 8, '', border=0)
    pdf.cell(40, 8, '', border=0, align='R')
    pdf.cell(40, 8, _format_currency(total), border=0, align='R', ln=True)

    pdf.ln(6)
    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 7, 'Payment Instructions:', ln=True)
    pdf.set_font('Helvetica', '', 10)
    pdf.multi_cell(0, 6, 'A prompt to your bank/mobile will be made upon receipting')
    pdf.ln(2)
    pdf.multi_cell(0, 6, 'For alternative payment methods or billing inquiries, please reach out to us at contact@autoconcierge.com.')
    pdf.ln(4)

    pdf.set_font('Helvetica', '', 10)
    pdf.cell(0, 6, 'Thank you for choosing Auto Concierge. We appreciate your business!', ln=True, align='C')

    pdf.set_encryption(
        owner_password='autoconcierge',
        user_password='',
        permissions=AccessPermission.none(),
    )

    pdf.output(str(pdf_path))
    return str(pdf_path)
