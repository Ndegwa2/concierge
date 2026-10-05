import { useState, useCallback, useRef, useEffect } from 'react';
import { Image as ImageIcon, X, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner';
import {
  validateImageFile,
  generateAltText,
  formatFileSize,
  type ImageValidationResult,
} from '@/utils/imageUtils';

export interface UploadedImagePreview {
  id: string;            // client-side temp id
  file: File;
  preview: string;       // object URL for <img src>
  alt: string;
  size: number;
  valid: boolean;
  errors: ImageValidationResult['errors'];
}

export interface ImageUploaderProps {
  /** Maximum number of images a user can select at once. */
  maxFiles?: number;
  /** Called with the full list of valid, accepted previews. */
  onImagesSelected: (images: UploadedImagePreview[]) => void;
  /** Initial previews (for edit flows). */
  initial?: UploadedImagePreview[];
  disabled?: boolean;
}

export function ImageUploader({
  maxFiles = 3,
  onImagesSelected,
  initial = [],
  disabled = false,
}) {
  const [previews, setPreviews] = useState<UploadedImagePreview[]>(initial);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs on unmount to avoid memory leaks.
  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.preview));
    };
  }, [previews]);

  const removePreview = useCallback(
    (id: string) => {
      const target = previews.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      const updated = previews.filter((p) => p.id !== id);
      setPreviews(updated);
      onImagesSelected(updated);
    },
    [previews, onImagesSelected],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (previews.length + fileArray.length > maxFiles) {
        toast.error(`You can upload up to ${maxFiles} image(s) at a time.`);
        return;
      }

      const newPreviews: UploadedImagePreview[] = [];

      fileArray.forEach((file) => {
        const result = validateImageFile(file);
        const preview: UploadedImagePreview = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          preview: URL.createObjectURL(file),
          alt: generateAltText(file.name),
          size: file.size,
          valid: result.valid,
          errors: result.errors,
        };
        newPreviews.push(preview);

        if (!result.valid) {
          toast.error(`${file.name}: ${result.errors[0].message}`);
        }
      });

      const combined = [...previews, ...newPreviews];
      setPreviews(combined);
      onImagesSelected(combined);
    },
    [previews, maxFiles, onImagesSelected],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
        e.target.value = '';
      }
    },
    [addFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles, disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const triggerFileSelect = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  if (previews.length === 0) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
          multiple={maxFiles > 1}
          onChange={handleFileChange}
          disabled={disabled}
          className="sr-only"
          aria-label="Upload images"
        />
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={triggerFileSelect}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            disabled
              ? 'opacity-50 cursor-not-allowed'
              : isDragging
                ? 'border-sky-500 bg-sky-50'
                : 'border-slate-300 hover:border-sky-400 hover:bg-sky-50'
          }}`}
        >
          <ImageIcon className="h-6 w-6 mx-auto mb-1 text-slate-400" />
          <p className="text-xs text-slate-600">
            {disabled ? 'Upload disabled' : 'Click or drag & drop images'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            JPEG, PNG, WEBP, HEIC · max 10 MB each
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-2">
      {/* Active previews */}
      <div className="grid grid-cols-3 gap-2">
        {previews.map((p) => (
          <div
            key={p.id}
            className={`relative aspect-square rounded-md overflow-hidden border ${
              p.valid ? 'border-slate-200' : 'border-red-300'
            } bg-slate-100`}
          >
            <img
              src={p.preview}
              alt={p.alt}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {!p.valid && p.errors.length > 0 && (
              <div className="absolute inset-0 bg-red-500/20 flex items-start p-1">
                <AlertCircle className="h-3 w-3 text-red-600 mt-0.5 ml-auto" />
              </div>
            )}
            <Button
              variant="ghost"
              size="xs"
              className="absolute top-0.5 right-0.5 h-5 w-5 p-0 rounded-full bg-white/80 hover:bg-white"
              onClick={() => removePreview(p.id)}
              title="Remove"
            >
              <X className="h-3 w-3" />
            </Button>
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[9px] px-1 py-0.5 truncate">
              {formatFileSize(p.size)}
            </div>
          </div>
        ))}
      </div>

      {/* Add more button (only if room) */}
      {previews.length < maxFiles && (
        <div className="flex justify-start">
          <label className="cursor-pointer text-xs text-sky-600 hover:text-sky-700 underline flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
              multiple={maxFiles > 1}
              onChange={handleFileChange}
              disabled={disabled}
              className="sr-only"
            />
            <Upload className="h-3 w-3" />
            Add {previews.length === 0 ? 'images' : 'more'}
          </label>
        </div>
      )}
    </div>
  );
}
