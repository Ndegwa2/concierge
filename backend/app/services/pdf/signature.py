"""Signature image loading and placement helpers for the PDF service."""

from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional, Tuple

from PIL import Image

#: Default on-page width (PDF points; 1 pt = 1/72 inch) used to draw a
#: signature when the caller does not request an explicit width.
DEFAULT_SIGNATURE_WIDTH_PT = 160.0
#: Default distance from the page edge for ``anchor``-based placements (pt).
DEFAULT_MARGIN_PT = 48.0


class PDFServiceError(Exception):
    """Base error raised by the PDF service."""


class SignatureImageError(PDFServiceError):
    """Raised when a signature image cannot be loaded or processed."""


@dataclass(frozen=True)
class SignatureImage:
    """A decoded signature image ready to be drawn into a PDF.

    The image is normalised to an RGBA PNG buffer so fpdf2 can embed it with
    transparency preserved regardless of the original format (PNG, JPEG,
    WebP, GIF, ...).
    """

    png_bytes: bytes  #: RGBA PNG payload for fpdf2 ``image()``.
    width_pt: float  #: Desired on-page width in points.
    height_pt: float  #: On-page height in points (keeps source aspect ratio).
    name: str = 'signature.png'

    @property
    def aspect_ratio(self) -> float:
        """Height / width ratio of the rendered signature."""
        return self.height_pt / self.width_pt if self.width_pt else 1.0

    def to_bytes_io(self) -> io.BytesIO:
        """Return the PNG payload as a file-like object for fpdf2."""
        return io.BytesIO(self.png_bytes)


@dataclass(frozen=True)
class SignaturePlacement:
    """Describes where a signature should be stamped on a page.

    Coordinates follow the PDF convention: the origin is the *bottom-left*
    corner of the page and units are points (1/72 inch). When ``x``/``y`` are
    omitted, the ``anchor`` + ``margin`` presets compute a sensible location.

    Attributes:
        page: 1-based page to stamp; ``None`` stamps every page.
        x: Left edge of the signature in points (from the left page edge).
        y: Bottom edge of the signature in points (from the page bottom).
        width: On-page signature width in points (falls back to the image's
            default width when unset).
        height: On-page signature height in points (derived from ``width``
            and the source aspect ratio when unset).
        anchor: One of ``bottom-right``, ``bottom-left``, ``top-right``,
            ``top-left`` or ``center``.
        margin: Distance from the page edge used by anchor presets (points).
    """

    page: Optional[int] = 1
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    anchor: str = 'bottom-right'
    margin: float = DEFAULT_MARGIN_PT

    def resolve(
        self,
        page_width_pt: float,
        page_height_pt: float,
        default_width_pt: float,
        default_height_pt: float,
    ) -> Tuple[float, float, float, float]:
        """Return ``(left, bottom, width, height)`` in PDF coordinates."""
        if page_width_pt <= 0 or page_height_pt <= 0:
            raise PDFServiceError('Page dimensions must be positive')

        width = self.width if self.width is not None else default_width_pt
        height = self.height if self.height is not None else (
            width * default_height_pt / default_width_pt if default_width_pt else width
        )

        # Keep the signature inside the printable area while preserving the
        # source aspect ratio.
        max_width = max(page_width_pt - 2 * self.margin, 10.0)
        max_height = max(page_height_pt - 2 * self.margin, 10.0)
        scale = min(1.0, max_width / width, max_height / height)
        width *= scale
        height *= scale

        if self.x is not None and self.y is not None:
            return self.x, self.y, width, height

        anchor = (self.anchor or 'bottom-right').lower()
        margin = self.margin
        if anchor == 'bottom-right':
            x, y = page_width_pt - margin - width, margin
        elif anchor == 'bottom-left':
            x, y = margin, margin
        elif anchor == 'top-right':
            x, y = page_width_pt - margin - width, page_height_pt - margin - height
        elif anchor == 'top-left':
            x, y = margin, page_height_pt - margin - height
        elif anchor == 'center':
            x, y = (page_width_pt - width) / 2, (page_height_pt - height) / 2
        else:
            raise PDFServiceError(
                f'Unknown signature anchor: {self.anchor!r} '
                "(expected one of 'bottom-right', 'bottom-left', 'top-right', "
                "'top-left', 'center')"
            )
        return max(x, 0.0), max(y, 0.0), width, height


def _decode_image(source: Any) -> Image.Image:
    """Open an image from a path, raw bytes or a file-like object."""
    if isinstance(source, (str, Path)):
        with Image.open(source) as img:
            return img.convert('RGBA')
    if isinstance(source, (bytes, bytearray, memoryview)):
        with Image.open(io.BytesIO(bytes(source))) as img:
            return img.convert('RGBA')
    if hasattr(source, 'read'):
        with Image.open(io.BytesIO(source.read())) as img:
            return img.convert('RGBA')
    raise SignatureImageError(
        f'Unsupported signature image source: {type(source).__name__}'
    )


def _remove_white_background(image: Image.Image, threshold: int = 245) -> Image.Image:
    """Make near-white pixels transparent (handy for scanned signatures)."""
    rgba = image.convert('RGBA')
    pixels = list(rgba.getdata())
    new_pixels = []
    for r, g, b, a in pixels:
        if r >= threshold and g >= threshold and b >= threshold:
            new_pixels.append((r, g, b, 0))
        else:
            new_pixels.append((r, g, b, a))
    rgba.putdata(new_pixels)
    return rgba


def load_signature_image(
    source: Any,
    *,
    width_pt: float = DEFAULT_SIGNATURE_WIDTH_PT,
    name: Optional[str] = None,
    remove_white_background: bool = False,
) -> SignatureImage:
    """Load and normalise a signature image for PDF embedding.

    Args:
        source: Path, raw bytes or file-like object holding the image.
        width_pt: Preferred on-page width in points.
        name: Label for the image (falls back to the source name).
        remove_white_background: Drop near-white pixels so the signature
            renders as a clean transparent image (useful for scans/photos).
    """
    if source is None:
        raise SignatureImageError('No signature image was provided')

    try:
        image = _decode_image(source)
    except SignatureImageError:
        raise
    except Exception as exc:
        raise SignatureImageError(f'Could not decode signature image: {exc}') from exc

    if remove_white_background:
        image = _remove_white_background(image)

    if image.size[0] <= 0 or image.size[1] <= 0:
        raise SignatureImageError('Signature image has invalid dimensions')

    rendered_width = width_pt
    rendered_height = width_pt * image.height / image.width

    # Limit very large canvases so fpdf2 can embed the stamp quickly, while
    # still preserving the aspect ratio.
    image.thumbnail((2048, 2048), Image.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format='PNG')

    source_name = name
    if not source_name and isinstance(source, (str, Path)):
        source_name = Path(source).name
    source_name = source_name or 'signature.png'

    return SignatureImage(
        png_bytes=buffer.getvalue(),
        width_pt=rendered_width,
        height_pt=rendered_height,
        name=source_name,
    )