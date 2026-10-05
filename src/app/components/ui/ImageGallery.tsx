import { useState } from 'react';
import { ChatImage } from '@/services/api';
import { formatFileSize } from '@/utils/imageUtils';

export interface ImageGalleryProps {
  /** Images to display. */
  images: ChatImage[];
  /** Maximum images per row in the grid. */
  columns?: number;
  /** When true, images are rendered smaller (inline chat mode). */
  compact?: boolean;
  /** Optional click handler for lightbox-style expansion. */
  onImageClick?: (image: ChatImage) => void;
}

/**
 * Renders a set of images in a responsive grid or single-row carousel.
 *
 * Each image uses its server-provided signed URL and auto-generated alt text.
 * Lazy loading keeps the initial paint fast.  When `onImageClick` is supplied,
 * clicking a thumbnail opens the handler (e.g. a lightbox).
 */
export function ImageGallery({
  images,
  columns = 3,
  compact = false,
  onImageClick,
}: ImageGalleryProps) {
  if (!images || images.length === 0) return null;

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[Math.min(columns, 4) as 1 | 2 | 3 | 4] || 'grid-cols-3';

  const singleImage = images.length === 1;

  return (
    <div className="mt-2">
      {singleImage ? (
        // Single image: full-width inline preview
        <SingleImage
          image={images[0]}
          compact={compact}
          onClick={onImageClick}
        />
      ) : (
        // Multiple images: responsive grid
        <div className={`grid ${gridCols} gap-1.5`}>
          {images.map((img) => (
            <GridImage
              key={img.id}
              image={img}
              compact={compact}
              onClick={onImageClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ImageCardProps {
  image: ChatImage;
  compact?: boolean;
  onClick?: (image: ChatImage) => void;
}

function SingleImage({ image, compact, onClick }: ImageCardProps) {
  const alt = image.alt_text || generateFallbackAlt(image);

  return (
    <div className="mt-1">
      <img
        src={image.url}
        alt={alt}
        loading="lazy"
        onClick={onClick ? () => onClick(image) : undefined}
        className={`rounded-lg object-cover w-full border border-slate-200 ${
          onClick ? 'cursor-zoom-in transition-transform hover:scale-[1.02]' : ''
        } ${compact ? 'max-h-32' : 'max-h-48'}`}
      />
      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
        <span>{image.original_filename}</span>
        {image.file_size && <span>{formatFileSize(image.file_size)}</span>}
      </div>
    </div>
  );
}

function GridImage({ image, compact, onClick }: ImageCardProps) {
  const alt = image.alt_text || generateFallbackAlt(image);

  return (
    <div className="relative group">
      <img
        src={image.url}
        alt={alt}
        loading="lazy"
        onClick={onClick ? () => onClick(image) : undefined}
        className={`rounded-md object-cover w-full aspect-square border border-slate-200 ${
          onClick ? 'cursor-zoom-in transition-transform group-hover:scale-105' : ''
        } ${compact ? 'max-h-16' : 'max-h-24'}`}
      />
      {!compact && onClick && (
        <div className="absolute inset-0 rounded-md bg-black/0 group-hover:bg-black/10 transition-colors" />
      )}
    </div>
  );
}

function generateFallbackAlt(image: ChatImage): string {
  // If no server-provided alt text, derive from filename.
  const name = image.original_filename || 'image';
  const base = name.replace(/\.[^/.]+$/, '');
  return base.length > 60 ? base.slice(0, 60) + '…' : base || 'Uploaded image';
}
