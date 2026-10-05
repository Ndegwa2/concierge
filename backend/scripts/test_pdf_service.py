#!/usr/bin/env python3
"""Standalone smoke test for the PDF service.

Exercises both workflows (generating a brand-new signed PDF with fpdf2 and
stamping a signature onto an existing PDF with the pypdf merge) using only
the public ``PDFService`` API.

Run from anywhere:

    python backend/scripts/test_pdf_service.py
"""

from __future__ import annotations

import io
import math
import sys
import tempfile
from pathlib import Path
from typing import Union

from PIL import Image, ImageDraw

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.pdf import (  # noqa: E402
    PDFService,
    PDFServiceError,
    SignaturePlacement,
)


def make_signature_png(width=600, height=200) -> bytes:
    """Draw a wavy scribble that resembles a signature into a transparent PNG."""
    img = Image.new('RGBA', (width, height), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    points = []
    for i in range(64):
        x = 30 + i * (width - 60) / 63
        y = (height - 40) - int(16 * math.sin(i / 3.2)) + (i % 5)
        points.append((x, y))
    draw.line(points, fill=(10, 40, 120, 255), width=7)
    draw.line([(30, height - 30), (width - 40, height - 30)],
              fill=(10, 40, 120, 255), width=4)
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return buffer.getvalue()


def assert_pdf(pdf_bytes: bytes, label: str) -> list:
    from pypdf import PdfReader

    assert pdf_bytes[:5] == b'%PDF-', f'{label}: missing PDF header'
    reader = PdfReader(io.BytesIO(pdf_bytes))
    assert len(reader.pages) > 0, f'{label}: no pages'
    return reader.pages


def as_pdf_bytes(result: Union[bytes, str], label: str) -> bytes:
    """Narrow a ``PDFService`` result to ``bytes``.

    ``generate_pdf``/``embed_signature`` return the output path as ``str``
    when ``output_path`` is supplied; every call below omits it, so anything
    that is not ``bytes`` is a regression worth failing on.
    """
    if not isinstance(result, bytes):
        raise PDFServiceError(
            f'{label}: expected PDF bytes, got {type(result).__name__}'
        )
    return result


def as_pdf_path(result: Union[bytes, str], label: str) -> str:
    """Narrow a ``PDFService`` result to the output path (``str``)."""
    if not isinstance(result, str):
        raise PDFServiceError(
            f'{label}: expected an output path, got {type(result).__name__}'
        )
    return result


def main() -> int:
    service = PDFService()
    signature_png = make_signature_png()

    # 1. Brand-new signed PDF (signature embedded at build time).
    new_pdf = service.generate_pdf(
        title='Service Agreement',
        subtitle='Prepared by AutoConcierge',
        sections=[
            ('Scope of Work', ['Routine vehicle inspection and maintenance.']),
            ('Terms', [
                'Work is completed within the agreed timeframe.',
                'Any additional costs are communicated before work begins.',
            ]),
        ],
        signer_name='Jane Doe',
        signature_source=signature_png,
        signature_label='Authorised Signature',
    )
    new_pdf = as_pdf_bytes(new_pdf, 'generate_pdf')
    pages = assert_pdf(new_pdf, 'generate_pdf')
    assert len(pages) == 1, 'generate_pdf should produce a single page'
    print('[ok] generate_pdf -> new signed PDF produced (1 page)')

    # 2. Stamp a signature onto an "existing" PDF (bytes in -> bytes out).
    signed_bytes = service.embed_signature(
        new_pdf,
        signature_png,
        SignaturePlacement(page=1, anchor='bottom-right', margin=48),
    )
    signed_bytes = as_pdf_bytes(signed_bytes, 'embed_signature')
    signed_pages = assert_pdf(signed_bytes, 'embed_signature')
    assert len(signed_pages) == 1, 'embed_signature must keep the page count'
    print('[ok] embed_signature -> existing PDF stamped (page 1, bottom-right)')

    # 3. Multi-page PDF: stamp page 2 only.
    multi_pdf = service.generate_pdf(
        title='Two-Page Document',
        sections=[('Section', [f'Padding line {i}: some extra text to fill the page width nicely.' for i in range(160)])],
    )
    multi_pdf = as_pdf_bytes(multi_pdf, 'multi-page generate_pdf')
    before = assert_pdf(multi_pdf, 'multi-page generate_pdf')
    assert len(before) >= 2, 'expected at least two pages'
    stamped = service.embed_signature(
        multi_pdf,
        signature_png,
        SignaturePlacement(page=2, anchor='center'),
    )
    stamped = as_pdf_bytes(stamped, 'multi-page embed_signature')
    after = assert_pdf(stamped, 'multi-page embed_signature')
    assert len(after) == len(before), 'page count changed after stamping'
    print(f'[ok] multi-page PDF stamped on page 2 only (pages={len(after)})')

    # 4. Stamping every page.
    all_pages = service.embed_signature(
        multi_pdf, signature_png, SignaturePlacement(page=None, anchor='top-right')
    )
    all_pages = as_pdf_bytes(all_pages, 'all-pages embed')
    assert len(assert_pdf(all_pages, 'all-pages embed')) == len(before)
    print('[ok] placement page=None stamps every page')

    # 5. output_path variants.
    with tempfile.TemporaryDirectory() as tmp:
        out_path = as_pdf_path(
            service.generate_pdf(title='To File', output_path=f'{tmp}/plain.pdf'),
            'generate_pdf output_path',
        )
        assert Path(out_path).exists() and Path(out_path).read_bytes()[:5] == b'%PDF-'
        signed_path = as_pdf_path(
            service.embed_signature(
                out_path, signature_png, output_path=f'{tmp}/signed.pdf'
            ),
            'embed_signature output_path',
        )
        assert Path(signed_path).exists() and Path(signed_path).read_bytes()[:5] == b'%PDF-'
        print('[ok] generate/embed with output_path')

    # 6. Invalid inputs produce friendly errors.
    errors = 0
    for invalid in (
        lambda: service.embed_signature(new_pdf, b'not-an-image'),
        lambda: service.embed_signature(b'not-a-pdf', signature_png),
        lambda: service.generate_pdf(
            signature_source=signature_png,
            placement={'anchor': 'off-page'},
        ),
    ):
        try:
            invalid()
        except PDFServiceError:
            errors += 1
    assert errors == 3, f'expected 3 friendly errors, got {errors}'
    print('[ok] invalid inputs raise PDFServiceError')

    print('\nPDF service smoke test PASSED')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except PDFServiceError as exc:
        print(f'FAILED: {exc}', file=sys.stderr)
        raise SystemExit(1) from exc