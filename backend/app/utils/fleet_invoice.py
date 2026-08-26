"""
Utilities for fleet invoice PDF generation.

This module re-exports from the fleets domain for backward compatibility.
New code should import directly from:
    from app.services.fleets.pdf_generator import generate_fleet_invoice_pdf
"""

from app.services.fleets.pdf_generator import generate_fleet_invoice_pdf, FleetInvoicePDF

__all__ = ['generate_fleet_invoice_pdf', 'FleetInvoicePDF']
