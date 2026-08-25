import os
from datetime import datetime, timezone
from pathlib import Path
from fpdf import FPDF
from flask import current_app

from app.models import Invoice, Company, InvoiceLineItem


class FleetInvoicePDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 16)
        self.cell(0, 10, 'AutoConcierge', ln=True, align='C')
        self.set_font('Helvetica', '', 10)
        self.cell(0, 6, 'Fleet & Corporate Billing | contact@autoconcierge.com | +254 700 000 000', ln=True, align='C')
        self.ln(4)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', align='C')


def _format_currency(amount, currency='KES'):
    return f'{currency} {amount:,.2f}'


def generate_fleet_invoice_pdf(invoice: Invoice, company: Company, line_items):
    instance_path = Path(current_app.instance_path)
    invoice_dir = instance_path / 'invoices'
    invoice_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{invoice.invoice_number}.pdf"
    pdf_path = invoice_dir / filename

    pdf = FleetInvoicePDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 8, 'FLEET INVOICE', ln=True)
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(95, 7, f"# {invoice.invoice_number}", ln=False)
    pdf.cell(0, 7, f"Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}", ln=True)
    pdf.ln(2)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 7, 'Bill To:', ln=True)
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(0, 6, company.name, ln=True)
    if company.contact_name:
        pdf.cell(0, 6, company.contact_name, ln=True)
    if company.email:
        pdf.cell(0, 6, company.email, ln=True)
    if company.phone:
        pdf.cell(0, 6, company.phone, ln=True)
    if company.billing_address:
        addr = company.billing_address or {}
        if addr.get('street'):
            pdf.cell(0, 6, addr.get('street'), ln=True)
        city_line = ', '.join(filter(None, [addr.get('city'), addr.get('state'), addr.get('zipCode'), addr.get('country')]))
        if city_line:
            pdf.cell(0, 6, city_line, ln=True)
    pdf.ln(2)

    if invoice.due_date:
        pdf.set_font('Helvetica', '', 10)
        pdf.cell(0, 6, f"Due Date: {invoice.due_date.strftime('%Y-%m-%d')}", ln=True)
        pdf.ln(2)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(120, 8, 'Description', border=1)
    pdf.cell(25, 8, 'Qty', border=1, align='C')
    pdf.cell(45, 8, 'Total', border=1, align='R', ln=True)

    subtotal = 0.0
    for item in line_items or []:
        desc = item.description
        pdf.set_font('Helvetica', '', 10)
        pdf.cell(120, 8, desc, border=1)
        pdf.cell(25, 8, str(item.quantity), border=1, align='C')
        total = float(item.total_price)
        pdf.cell(45, 8, _format_currency(total, invoice.currency), border=1, align='R', ln=True)
        subtotal += total

    tax = float(invoice.tax_amount or 0)
    total = subtotal + tax

    pdf.set_font('Helvetica', '', 10)
    pdf.cell(120, 8, 'Subtotal:', border=0, align='R')
    pdf.cell(25, 8, '', border=0)
    pdf.cell(45, 8, _format_currency(subtotal, invoice.currency), border=0, align='R', ln=True)

    pdf.cell(120, 8, f'Tax ({invoice.currency}):', border=0, align='R')
    pdf.cell(25, 8, '', border=0)
    pdf.cell(45, 8, _format_currency(tax, invoice.currency), border=0, align='R', ln=True)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(120, 8, 'TOTAL:', border=0, align='R')
    pdf.cell(25, 8, '', border=0)
    pdf.cell(45, 8, _format_currency(total, invoice.currency), border=0, align='R', ln=True)

    pdf.ln(6)
    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 7, 'Payment Information:', ln=True)
    pdf.set_font('Helvetica', '', 10)
    pdf.multi_cell(0, 6, 'Payment integration is not yet configured. Please contact our accounts team for payment details.')
    pdf.ln(4)

    if invoice.notes:
        pdf.set_font('Helvetica', 'B', 10)
        pdf.cell(0, 7, 'Notes:', ln=True)
        pdf.set_font('Helvetica', '', 10)
        pdf.multi_cell(0, 6, invoice.notes)
        pdf.ln(2)

    pdf.set_font('Helvetica', '', 10)
    pdf.cell(0, 6, 'Thank you for your business!', ln=True, align='C')

    pdf.output(str(pdf_path))
    return str(pdf_path)
