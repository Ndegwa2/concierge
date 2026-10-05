"""PDF service: embed signature images into PDFs.

The service supports two workflows:

* **Existing PDFs** — ``PDFService.embed_signature`` stamps a signature image
  onto any page of an existing PDF (path, bytes or file-like object). The
  transparent overlay stamp is rendered with fpdf2 and merged with pypdf.

* **New PDFs** — ``PDFService.generate_pdf`` renders a simple branded document
  with fpdf2 and can already include the signature image.

fpdf2 (already used by the invoice generator) remains the PDF engine for all
generation; pypdf is only used to merge the overlay onto pre-existing pages.
"""

from .routes import pdf_bp
from .service import PDFService
from .signature import (
    PDFServiceError,
    SignatureImage,
    SignatureImageError,
    SignaturePlacement,
    load_signature_image,
)

__all__ = [
    'PDFService',
    'PDFServiceError',
    'SignatureImage',
    'SignatureImageError',
    'SignaturePlacement',
    'load_signature_image',
    'pdf_bp',
]