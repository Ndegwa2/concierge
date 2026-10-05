"""High-level facade for the PDF service.

``PDFService`` exposes the two workflows the service supports:

* ``embed_signature`` — stamp a signature image onto an *existing* PDF.
* ``generate_pdf`` — render a brand-new signed/non-signed document.

Both accept the signature as a path, raw bytes, a file-like object or a
pre-loaded :class:`SignatureImage`.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Iterable, Optional, Sequence, Tuple, Union

from .generator import build_document_pdf, COMPANY_CONTACT_DEFAULT, COMPANY_NAME_DEFAULT
from .overlay import embed_signature_in_existing_pdf as _embed_overlay
from .signature import (
    DEFAULT_SIGNATURE_WIDTH_PT,
    PDFServiceError,
    SignatureImage,
    SignaturePlacement,
    load_signature_image,
)

__all__ = ['PDFService']


class PDFService:
    """Embed signature images into PDFs and generate new signed documents."""

    def __init__(
        self,
        *,
        company_name: str = COMPANY_NAME_DEFAULT,
        company_contact: str = COMPANY_CONTACT_DEFAULT,
        default_signature_width_pt: float = DEFAULT_SIGNATURE_WIDTH_PT,
        remove_white_background: bool = False,
    ) -> None:
        self.company_name = company_name
        self.company_contact = company_contact
        self.default_signature_width_pt = default_signature_width_pt
        self.remove_white_background = remove_white_background

    # ------------------------------------------------------------------ #
    # helpers
    # ------------------------------------------------------------------ #
    def load_signature(
        self,
        source: Any,
        *,
        width_pt: Optional[float] = None,
        name: Optional[str] = None,
        remove_white_background: Optional[bool] = None,
    ) -> SignatureImage:
        """Normalise a signature image for embedding (path/bytes/file object)."""
        return load_signature_image(
            source,
            width_pt=width_pt if width_pt is not None else self.default_signature_width_pt,
            name=name,
            remove_white_background=(
                remove_white_background
                if remove_white_background is not None
                else self.remove_white_background
            ),
        )

    @staticmethod
    def _as_signature(source: Any) -> SignatureImage:
        if isinstance(source, SignatureImage):
            return source
        raise PDFServiceError(
            'signature must be a SignatureImage or a raw image '
            '(path/bytes/file-like)'
        )

    @staticmethod
    def _as_placement(
        placement: Optional[Union[SignaturePlacement, dict]],
    ) -> Optional[SignaturePlacement]:
        if placement is None or isinstance(placement, SignaturePlacement):
            return placement
        if isinstance(placement, dict):
            return SignaturePlacement(**placement)
        raise PDFServiceError(
            'placement must be a SignaturePlacement or a mapping of its fields'
        )
# ------------------------------------------------------------------ #
    # existing PDFs
    # ------------------------------------------------------------------ #
    def embed_signature(
        self,
        input_pdf: Any,
        signature_source: Any,
        placement: Optional[Union[SignaturePlacement, dict]] = None,
        *,
        output_path: Optional[Union[str, Path]] = None,
        signature_width_pt: Optional[float] = None,
    ) -> Union[bytes, str]:
        """Stamp a signature onto an existing PDF.

        Args:
            input_pdf: Path, bytes or file-like object of the PDF to sign.
            signature_source: Signature image (path/bytes/file/``SignatureImage``).
            placement: Where to place the signature (defaults to the bottom
                right corner of page 1).
            output_path: Where to write the result. When omitted, the signed
                PDF is returned as ``bytes``.
            signature_width_pt: Optional signature width override (points).

        Returns:
            The signed PDF as ``bytes``, or the output path as ``str`` when
            ``output_path`` is given.
        """
        if isinstance(signature_source, SignatureImage):
            signature = signature_source
        else:
            signature = self.load_signature(
                signature_source,
                width_pt=signature_width_pt,
            )
        placement = self._as_placement(placement)
        return _embed_overlay(
            input_pdf,
            signature,
            placement,
            output_path=output_path,
        )

    # ------------------------------------------------------------------ #
    # new PDFs
    # ------------------------------------------------------------------ #
    def generate_pdf(
        self,
        *,
        title: str = 'Document',
        subtitle: str = '',
        sections: Optional[Sequence[Tuple[str, Iterable[str]]]] = None,
        signer_name: str = '',
        signature_source: Optional[Any] = None,
        signature_image: Optional[Any] = None,
        placement: Optional[Union[SignaturePlacement, dict]] = None,
        signature_label: str = 'Authorised Signature',
        company_name: Optional[str] = None,
        company_contact: Optional[str] = None,
        output_path: Optional[Union[str, Path]] = None,
    ) -> Union[bytes, str]:
        """Generate a brand-new PDF document with fpdf2.

        By default the document contains a right-aligned signature block
        labelled ``signature_label``. Pass ``signature_source`` to also draw
        the signature image (``signature_image`` is accepted as an alias for
        callers used to the documents service naming).

        Returns:
            The generated PDF as ``bytes``, or the output path as ``str``
            when ``output_path`` is given.
        """
        if signature_source is None:
            signature_source = signature_image
        signature = None
        if signature_source is not None:
            if isinstance(signature_source, SignatureImage):
                signature = signature_source
            else:
                signature = self.load_signature(signature_source)

        data = build_document_pdf(
            title=str(title or 'Document'),
            subtitle=str(subtitle or ''),
            sections=sections or [],
            company_name=str(company_name or self.company_name),
            company_contact=str(company_contact or self.company_contact),
            signer_name=str(signer_name or ''),
            signature=signature,
            signature_placement=self._as_placement(placement),
            signature_label=str(signature_label or 'Authorised Signature'),
        )

        if output_path is not None:
            output = Path(output_path)
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(data)
            return str(output)
        return data