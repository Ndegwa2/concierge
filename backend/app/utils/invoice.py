"""
Utilities for invoice PDF generation.

This module re-exports from the invoices domain for backward compatibility.
New code should import directly from:
    from app.services.invoices.pdf_generator import generate_invoice_pdf
"""

from app.services.invoices.pdf_generator import generate_invoice_pdf, InvoicePDF

__all__ = ['generate_invoice_pdf', 'InvoicePDF']
