import { apiClient } from './client';
import type { ApiResponse } from './types';

export interface Document {
  id: number;
  title: string;
  doc_type: 'work_order' | 'service_agreement' | 'invoice' | 'other';
  description: string | null;
  reference_id: number | null;
  reference_type: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  status: 'pending' | 'sent' | 'signed' | 'declined' | 'cancelled' | 'expired';
  expires_at: string | null;
  created_by: number;
  signed_by: number | null;
  signed_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Signature {
  id: number;
  document_id: number;
  signer_name: string;
  signer_email: string;
  signer_id: number | null;
  signature_image_path: string | null;
  signature_image_name: string | null;
  signature_hash: string | null;
  signature_data: string | null;
  signer_ip: string | null;
  signer_user_agent: string | null;
  signer_location: string | null;
  status: 'pending' | 'captured' | 'verified' | 'rejected';
  verified_at: string | null;
  verified_by: number | null;
  rejection_reason: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignatureAuditEvent {
  id: number;
  document_id: number;
  event_type: string;
  actor_id: number | null;
  actor_type: string;
  actor_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
  document_hash: string | null;
  created_at: string;
}

export interface DocumentVerificationResult {
  match: boolean;
  computed_hash: string;
}

export const documentsApi = {
  async createDocument(data: {
    title: string;
    doc_type: string;
    description?: string;
    reference_id?: number;
    reference_type?: string;
    expires_days?: number;
  }): Promise<ApiResponse<{ document: Document }>> {
    return apiClient.request('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async listDocuments(params?: {
    reference_id?: number;
    reference_type?: string;
    doc_type?: string;
    status?: string;
  }): Promise<ApiResponse<{ data: Document[]; total: number }>> {
    const p = new URLSearchParams();
    if (params?.reference_id) p.set('reference_id', String(params.reference_id));
    if (params?.reference_type) p.set('reference_type', params.reference_type);
    if (params?.doc_type) p.set('doc_type', params.doc_type);
    if (params?.status) p.set('status', params.status);
    const q = p.toString() ? `?${p.toString()}` : '';
    return apiClient.request(`/documents${q}`);
  },

  async getDocument(documentId: number): Promise<ApiResponse<{ document: Document }>> {
    return apiClient.request(`/documents/${documentId}`);
  },

  async updateDocument(documentId: number, data: Partial<{
    title: string;
    description: string;
    status: string;
  }>): Promise<ApiResponse<{ document: Document }>> {
    return apiClient.request(`/documents/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async sendDocument(documentId: number): Promise<ApiResponse<{ document: Document }>> {
    return apiClient.request(`/documents/${documentId}/send`, {
      method: 'POST',
    });
  },

  async cancelDocument(documentId: number): Promise<ApiResponse<{ document: Document }>> {
    return apiClient.request(`/documents/${documentId}/cancel`, {
      method: 'POST',
    });
  },

  async captureSignature(documentId: number, data: {
    signature_data: string;
    signer_name?: string;
    signer_email?: string;
    signer_location?: string;
    note?: string;
  }): Promise<ApiResponse<{ signature: Signature }>> {
    return apiClient.request(`/documents/${documentId}/signatures`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async listSignatures(documentId: number): Promise<ApiResponse<{ data: Signature[] }>> {
    return apiClient.request(`/documents/${documentId}/signatures`);
  },

  async declineDocument(documentId: number, reason: string): Promise<ApiResponse<{ document: Document }>> {
    return apiClient.request(`/documents/${documentId}/decline`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async verifySignature(signatureId: number): Promise<ApiResponse<{ signature: Signature }>> {
    return apiClient.request(`/signatures/${signatureId}/verify`, {
      method: 'POST',
    });
  },

  async getAuditTrail(documentId: number): Promise<ApiResponse<{ data: SignatureAuditEvent[]; total: number }>> {
    return apiClient.request(`/documents/${documentId}/audit`);
  },

  async verifySignatureHash(signatureData: string, storedHash: string): Promise<ApiResponse<{ data: DocumentVerificationResult }>> {
    return apiClient.request('/documents/verify-signature', {
      method: 'POST',
      body: JSON.stringify({ signature_data: signatureData, signature_hash: storedHash }),
    });
  },
};
