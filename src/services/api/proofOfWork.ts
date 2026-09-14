import { apiClient } from './client';
import { API_BASE_URL } from './types';
import type { ApiResponse, ProofOfWorkMedia } from './types';

export type PaginatedProofOfWork = {
  media: ProofOfWorkMedia[];
  count: number;
};

export const proofOfWorkApi = {
  async uploadProofOfWork({
    assignmentId,
    files,
    caption,
    isPublic,
  }: {
    assignmentId: number;
    files: File[];
    caption?: string;
    isPublic?: boolean;
  }): Promise<ApiResponse<{ media: ProofOfWorkMedia[] }>> {
    const token = apiClient.getToken();
    const form = new FormData();
    form.append('assignment_id', String(assignmentId));
    if (caption) form.append('caption', caption);
    if (isPublic) form.append('is_public', 'true');
    files.forEach((f) => form.append('files', f));

    const response = await fetch(`${API_BASE_URL}/proof-of-work/media`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    return response.json();
  },

  async getProofOfWorkGallery({
    assignmentId,
    appointmentId,
  }: { assignmentId?: number; appointmentId?: number } = {}): Promise<ApiResponse<PaginatedProofOfWork>> {
    const params = new URLSearchParams();
    if (assignmentId) params.append('assignment_id', String(assignmentId));
    if (appointmentId) params.append('appointment_id', String(appointmentId));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request(`/proof-of-work/media${query}`);
  },

  async getProofOfWorkMedia(mediaId: number): Promise<ApiResponse<{ media: ProofOfWorkMedia }>> {
    return apiClient.request(`/proof-of-work/media/${mediaId}`);
  },

  async deleteProofOfWorkMedia(mediaId: number): Promise<ApiResponse<Record<string, unknown>>> {
    return apiClient.request(`/proof-of-work/media/${mediaId}`, { method: 'DELETE' });
  },
};
