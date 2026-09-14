import { useState, useEffect, useCallback } from 'react';
import { Upload, X, Trash2, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { proofOfWorkApi } from '@/services/api';
import type { ProofOfWorkMedia } from '@/services/api';

interface ProofOfWorkGalleryProps {
  assignmentId?: number;
  appointmentId?: number;
  readOnly?: boolean;
  title?: string;
  emptyMessage?: string;
}

const UPLOADING_ROLES = new Set(['employee', 'admin', 'super_admin']);

export function ProofOfWorkGallery({
  assignmentId,
  appointmentId,
  readOnly = false,
  title = 'Proof of Work',
  emptyMessage = 'No proof-of-work media yet.',
}: ProofOfWorkGalleryProps) {
  const { user, userType } = useAuth();
  const [media, setMedia] = useState<ProofOfWorkMedia[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetFileInput = () => {
    const el = document.getElementById('pofw-file-input') as HTMLInputElement | null;
    if (el) el.value = '';
  };

  const canUpload =
    !readOnly &&
    !!assignmentId &&
    userType != null &&
    UPLOADING_ROLES.has(userType);

  const fetchGallery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await proofOfWorkApi.getProofOfWorkGallery({ assignmentId, appointmentId });
      if (res.success) {
        setMedia(res.data?.media ?? []);
        setCount(res.data?.count ?? 0);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, appointmentId]);

  useEffect(() => {
    if (userType) {
      fetchGallery();
    }
  }, [fetchGallery, userType]);

  const handleUpload = async () => {
    if (!assignmentId || !selectedFiles || selectedFiles.length === 0) {
      toast.error('Select at least one image or video');
      return;
    }
    setUploading(true);
    try {
      const res = await proofOfWorkApi.uploadProofOfWork({
        assignmentId,
        files: Array.from(selectedFiles),
        caption: caption || undefined,
      });
      if (res.success) {
        toast.success(`${res.data?.media?.length ?? 0} item(s) uploaded`);
        setSelectedFiles(null);
        setCaption('');
        resetFileInput();
        await fetchGallery();
      } else {
        toast.error(res.message || 'Upload failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId: number) => {
    if (!confirm('Remove this proof-of-work item?')) return;
    try {
      const res = await proofOfWorkApi.deleteProofOfWorkMedia(mediaId);
      if (res.success) {
        toast.success('Media removed');
        await fetchGallery();
      } else {
        toast.error(res.message || 'Delete failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed');
    }
  };

  const canDelete = (m: ProofOfWorkMedia) =>
    !!user &&
    !readOnly &&
    (user.id === m.uploaded_by || userType === 'admin' || userType === 'super_admin');

  const renderThumb = (m: ProofOfWorkMedia) => {
    if (m.media_type === 'video') {
      return (
        <video
          src={m.original_url}
          poster={m.thumbnail_url}
          controls
          className="w-full h-40 object-cover rounded-md bg-slate-100"
        />
      );
    }
    return (
      <img
        src={m.thumbnail_url}
        alt={m.caption || m.original_filename}
        loading="lazy"
        onClick={() => window.open(m.original_url, '_blank')}
        className="w-full h-40 object-cover rounded-md bg-slate-100 cursor-zoom-in"
      />
    );
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-slate-500">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{count} {count === 1 ? 'item' : 'items'} &middot; proof of completed work</CardDescription>
          </div>
          {(canUpload) && (
            <Badge variant="outline" className="gap-1">
              <ImageIcon className="h-3 w-3" /> Upload allowed
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {canUpload && (
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <Input
                id="pofw-caption"
                placeholder="Caption: e.g. dent repaired, Part #1234 replaced"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={uploading}
              />
              <label className="block text-xs text-slate-500">
                <input
                  id="pofw-file-input"
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime"
                  multiple
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  disabled={uploading}
                  className="sr-only"
                />
                <span
                  className="cursor-pointer text-sky-600 hover:text-sky-700 underline"
                  onClick={() => document.getElementById('pofw-file-input')?.click()}
                >
                  Choose image/video
                </span>
                <span className="text-slate-400">
                  {selectedFiles && selectedFiles.length > 0
                    ? `${selectedFiles.length} file(s) selected`
                    : 'no file chosen'}
                </span>
            </label>
          </div>
            <Button onClick={handleUpload} disabled={uploading || !selectedFiles?.length} className="gap-2">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
            {selectedFiles && selectedFiles.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFiles(null);
                setCaption('');
                resetFileInput();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square bg-slate-200 rounded-md animate-pulse" />
            ))}
          </div>
        ) : count === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {media.map((m) => (
              <div key={m.id} className="group relative aspect-square bg-slate-100 rounded-md overflow-hidden">
                {renderThumb(m)}
                {canDelete(m) && (
                  <Button
                    variant="destructive"
                    size="xs"
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                    onClick={() => handleDelete(m.id)}
                    title="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/45 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100">
                  {m.caption || m.original_filename}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
