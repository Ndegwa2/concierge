/**
 * Client-side image validation and alt-text generation utilities.
 *
 * These helpers provide immediate feedback before the file hits the network,
 * mirroring the server-side validation in ``backend/app/services/ai_chat/service.py``.
 */

/** Maximum image upload size — 10 MB, matching the backend limit. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const MAX_IMAGE_MB = 10;

/** MIME types accepted by the chat image backend. */
export const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
] as const;

/** File extensions accepted by the chat image backend. */
export const ALLOWED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'];

export interface ImageValidationError {
  field: 'file' | 'size' | 'type' | 'dimensions';
  message: string;
}

export interface ImageValidationResult {
  valid: boolean;
  errors: ImageValidationError[];
}

/**
 * Validate a File object client-side (format + size).
 *
 * Returns a list of errors rather than throwing so the caller can present them
 * with actionable guidance.
 */
export function validateImageFile(file: File): ImageValidationResult {
  const errors: ImageValidationError[] = [];

  if (!file) {
    errors.push({ field: 'file', message: 'No file selected.' });
    return { valid: false, errors };
  }

  const ext = ('.' + file.name.split('.').pop() || '').toLowerCase();
  const mime = file.type.toLowerCase();

  if (!ALLOWED_IMAGE_EXT.includes(ext as any) && !ALLOWED_IMAGE_MIME.includes(mime as any)) {
    errors.push({
      field: 'type',
      message: `Unsupported file type. Accepted formats: JPEG, PNG, WEBP, HEIC (got: ${file.name}).`,
    });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    errors.push({
      field: 'size',
      message: `Image exceeds the ${MAX_IMAGE_MB} MB size limit. Please choose a smaller image and try again.`,
    });
  }

  if (file.size === 0) {
    errors.push({ field: 'file', message: 'The selected file is empty or unreadable.' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate a concise, descriptive alt text for an image.
 *
 * Uses the filename as a basis — strips common camera prefixes, file
 * extensions, and humanises the result.  When the upload response includes
 * server-generated ``alt_text`` that takes priority.
 */
export function generateAltText(filename: string): string {
  let name = filename.replace(/\.[^/.]+$/, ''); // strip extension

  // Remove common camera/app prefixes.
  const prefixes = ['IMG_', 'DSC_', 'PXL_', 'Screenshot_', 'Screen Shot', 'DSC'];
  for (const prefix of prefixes) {
    if (name.toUpperCase().startsWith(prefix.toUpperCase())) {
      name = name.slice(prefix.length);
    }
  }

  name = name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!name) {
    return 'Uploaded image';
  }

  return name.length > 120 ? name.slice(0, 120) + '…' : name;
}

/**
 * Format a file size in bytes as a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
