"""Merging signature overlay stamps onto existing PDFs.

fpdf2 cannot read or modify an existing PDF, so the service renders a
full-page *transparent* overlay stamp with fpdf2 and merges it on top of the
existing PDF's pages using pypdf — a pure-Python PDF toolkit declared in
``backend/requirements.txt``.
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Optional, Union

from .generator import build_signature_overlay
from .signature import PDFServiceError, SignatureImage, SignaturePlacement

#: Sources accepted as the input PDF.
PDFSource = Union[str, Path, bytes, bytearray, memoryview]


def _page_selected(placement: SignaturePlacement, page_number: int) -> bool:
    """Return whether ``page_number`` (1-based) should receive the signature."""
    target = placement.page
    if target is None:
        return True
    try:
        return int(target) == page_number
    except (TypeError, ValueError):
        raise PDFServiceError(f'Invalid signature page: {target!r}')


def embed_signature_in_existing_pdf(
    input_pdf: PDFSource,
    signature: SignatureImage,
    placement: Optional[SignaturePlacement] = None,
    *,
    output_path: Optional[Union[str, Path]] = None,
) -> Union[bytes, str]:
    """Stamp ``signature`` onto an existing PDF and return the signed bytes.

    When ``output_path`` is provided the result is written there and its
    string path is returned instead.
    """
    try:
        from pypdf import PdfReader, PdfWriter
    except ImportError as exc:  # pragma: no cover
        raise PDFServiceError(
            'pypdf is required to embed a signature into an existing PDF. '
            "Install it with: pip install 'pypdf==5.1.0'"
        ) from exc

    # -- read the source PDF -------------------------------------------------
    if isinstance(input_pdf, (str, Path)):
        source: Union[str, io.BytesIO] = str(input_pdf)
    elif isinstance(input_pdf, (bytes, bytearray, memoryview)):
        source = io.BytesIO(bytes(input_pdf))
    elif hasattr(input_pdf, 'read'):
        source = input_pdf
    else:
        raise PDFServiceError(
            'input_pdf must be a path, bytes or a file-like object, '
            f'got {type(input_pdf).__name__}'
        )

    try:
        reader = PdfReader(source)
    except FileNotFoundError as exc:
        raise PDFServiceError(f'PDF file not found: {input_pdf}') from exc
    except Exception as exc:
        # pypdf raises PdfStreamError/PdfReadError for truncated or corrupted
        # files; surface those as a single friendly error type.
        raise PDFServiceError(f'Could not read PDF: {exc}') from exc

    if not reader.pages:
        raise PDFServiceError('The PDF does not contain any pages')

    placement = placement if placement is not None else SignaturePlacement()
    writer = PdfWriter()
    overlays_by_size = {}

    for page_number, page in enumerate(reader.pages, start=1):
        target_page = writer.add_page(page)
        if not _page_selected(placement, page_number):
            continue

        page_width = float(page.mediabox.width)
        page_height = float(page.mediabox.height)
        if page_width <= 0 or page_height <= 0:
            continue

        # Build one stamp per distinct page size and reuse it.
        size_key = (round(page_width, 2), round(page_height, 2))
        if size_key not in overlays_by_size:
            overlays_by_size[size_key] = build_signature_overlay(
                page_width, page_height, signature, placement
            )
        stamp = PdfReader(io.BytesIO(overlays_by_size[size_key])).pages[0]

        # Safety net for pages whose /MediaBox differs slightly.
        if (
            abs(float(stamp.mediabox.width) - page_width) > 0.5
            or abs(float(stamp.mediabox.height) - page_height) > 0.5
        ):
            stamp.scale_to(page_width, page_height)
        target_page.merge_page(stamp)

    if output_path is not None:
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open('wb') as handle:
            writer.write(handle)
        return str(output)

    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()