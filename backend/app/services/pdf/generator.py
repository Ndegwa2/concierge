"""fpdf2-based PDF builders used by the PDF service.

fpdf2 cannot read or modify existing PDFs, so this module provides the two
building blocks the service needs:

* ``build_signature_overlay`` — a full-page *transparent* overlay whose only
  content is the signature image. pypdf merges this onto existing PDF pages.
* ``build_document_pdf`` — a brand-new branded document rendered from text
  sections, which can already include the signature image.

Coordinates are in points (1 pt = 1/72 inch) so signature placements match
``pypdf``'s PDF coordinate system.
"""

from __future__ import annotations

import unicodedata
from typing import Iterable, Optional, Sequence, Tuple

from fpdf import FPDF

from .signature import SignatureImage, SignaturePlacement

#: Company branding defaults, kept consistent with the rest of the app.
COMPANY_NAME_DEFAULT = 'AutoConcierge'
COMPANY_CONTACT_DEFAULT = 'Nairobi, Kenya | contact@autoconcierge.com'
GREEN = (6, 78, 59)

#: A4 dimensions in points (fpdf2's default page size).
A4_WIDTH_PT = 595.28
A4_HEIGHT_PT = 841.89


def _pdf_safe(value) -> str:
    """Strip characters the built-in Helvetica core fonts cannot encode."""
    text = unicodedata.normalize('NFKD', str(value or ''))
    return text.encode('ascii', 'ignore').decode('ascii')


def build_signature_overlay(
    page_width_pt: float,
    page_height_pt: float,
    signature: SignatureImage,
    placement: Optional[SignaturePlacement] = None,
) -> bytes:
    """Build a transparent full-page overlay stamp that contains the signature.

    Everything but the signature is blank, so when pypdf merges this overlay
    on top of an existing page, only the signature is visible.

    fpdf2 uses a top-left origin while PDF pages use bottom-left coordinates,
    so the placement resolved in PDF coordinates is flipped vertically.
    """
    placement = placement or SignaturePlacement()
    left, bottom, width, height = placement.resolve(
        page_width_pt, page_height_pt, signature.width_pt, signature.height_pt
    )
    top = page_height_pt - bottom - height

    pdf = FPDF(unit='pt', format=(page_width_pt, page_height_pt))
    pdf.add_page()
    pdf.image(
        signature.to_bytes_io(),
        x=left,
        y=max(top, 0.0),
        w=width,
        h=height,
    )
    return bytes(pdf.output())


class DocumentPDF(FPDF):
    """A simple branded A4 document rendered from text sections."""

    def __init__(self, *, company_name: str, company_contact: str):
        super().__init__(orientation='P', unit='pt', format='A4')
        self.company_name = company_name
        self.company_contact = company_contact
        self.set_auto_page_break(auto=True, margin=54.0)

    def header(self):
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(*GREEN)
        self.cell(0, 16, _pdf_safe(self.company_name), align='C')
        self.ln(16)
        self.set_font('Helvetica', '', 8)
        self.set_text_color(110, 110, 110)
        self.cell(0, 10, _pdf_safe(self.company_contact), align='C')
        self.ln(10)
        self.set_draw_color(200, 200, 200)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(8)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f'Page {self.page_no()}', align='C')


def _render_sections(pdf: DocumentPDF, sections: Sequence[Tuple[str, Iterable[str]]]) -> None:
    for heading, lines in sections:
        pdf.set_font('Helvetica', 'B', 11)
        pdf.set_text_color(*GREEN)
        pdf.multi_cell(0, 7, _pdf_safe(heading))
        pdf.set_x(pdf.l_margin)
        pdf.set_font('Helvetica', '', 10)
        pdf.set_text_color(35, 35, 35)
        for line in lines:
            pdf.multi_cell(0, 6, _pdf_safe(line))
            pdf.set_x(pdf.l_margin)
        pdf.ln(5)


def build_document_pdf(
    *,
    title: str = 'Document',
    subtitle: str = '',
    sections: Optional[Sequence[Tuple[str, Iterable[str]]]] = None,
    company_name: str = COMPANY_NAME_DEFAULT,
    company_contact: str = COMPANY_CONTACT_DEFAULT,
    signer_name: str = '',
    signature: Optional[SignatureImage] = None,
    signature_placement: Optional[SignaturePlacement] = None,
    signature_label: str = 'Authorised Signature',
) -> bytes:
    """Render a brand-new PDF document with fpdf2.

    When ``signature`` is provided, the signature block is drawn after the
    content: label, signature image, then the signer's name. The anchor in
    ``signature_placement`` controls the horizontal gravity of the block
    (``right``, ``left`` or ``center``) and its ``width`` sets the on-page
    signature size. Use :func:`embed_signature_in_existing_pdf` for
    pixel-exact placement on existing PDFs.
    """
    pdf = DocumentPDF(company_name=company_name, company_contact=company_contact)
    pdf.add_page()

    pdf.set_font('Helvetica', 'B', 17)
    pdf.set_text_color(35, 35, 35)
    pdf.multi_cell(0, 20, _pdf_safe(title))
    pdf.set_x(pdf.l_margin)
    if subtitle:
        pdf.set_font('Helvetica', '', 11)
        pdf.set_text_color(90, 90, 90)
        pdf.multi_cell(0, 8, _pdf_safe(subtitle))
        pdf.set_x(pdf.l_margin)
    pdf.ln(6)

    _render_sections(pdf, sections or [])

    # ---- Signature block -------------------------------------------------
    placement = signature_placement or SignaturePlacement()
    if signature is not None:
        # Resolve once: validates the anchor and yields the target size.
        _, _, width, height = placement.resolve(
            pdf.w, pdf.h, signature.width_pt, signature.height_pt
        )
    else:
        width, height = 0.0, 0.0

    anchor = placement.anchor.lower() if placement.anchor else 'bottom-right'
    if 'left' in anchor:
        align = 'L'
    elif 'center' in anchor:
        align = 'C'
    else:
        align = 'R'

    required_height = 16.0 + height + 14.0
    if pdf.will_page_break(required_height):
        pdf.add_page()

    pdf.ln(14)
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_text_color(35, 35, 35)
    pdf.cell(0, 8, _pdf_safe(signature_label), ln=1, align=align)
    pdf.ln(4)

    if signature is not None:
        if align == 'L':
            x_left = pdf.l_margin
        elif align == 'C':
            x_left = pdf.l_margin + (pdf.w - pdf.l_margin - pdf.r_margin - width) / 2
        else:
            x_left = pdf.w - pdf.r_margin - width
        y_top = pdf.get_y()
        pdf.image(signature.to_bytes_io(), x=x_left, y=y_top, w=width, h=height)
        pdf.set_y(y_top + height + 6)

    if signer_name:
        pdf.set_font('Helvetica', '', 10)
        pdf.set_text_color(90, 90, 90)
        pdf.cell(0, 8, _pdf_safe(signer_name), ln=1, align=align)

    return bytes(pdf.output())