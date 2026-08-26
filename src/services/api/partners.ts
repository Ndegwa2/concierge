import { apiClient } from './client';
import type {
  ApiResponse,
  ServicePartner,
} from './types';

export const partnersApi = {
  async getServicePartners(service?: string, location?: string): Promise<ApiResponse<{
    partners: ServicePartner[];
  }>> {
    const params = new URLSearchParams();
    if (service) params.append('service', service);
    if (location) params.append('location', location);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request(`/partners/${query}`);
  },

  async createServicePartner(data: Partial<ServicePartner>): Promise<ApiResponse<{ partner: ServicePartner }>> {
    return apiClient.request('/partners/admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateServicePartner(
    id: number,
    data: Partial<ServicePartner>
  ): Promise<ApiResponse<{ partner: ServicePartner }>> {
    return apiClient.request(`/partners/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deactivateServicePartner(id: number): Promise<ApiResponse<{}>> {
    return apiClient.request(`/partners/admin/${id}`, {
      method: 'DELETE',
    });
  },

  async getPartner(id: number): Promise<ApiResponse<{ partner: ServicePartner }>> {
    return apiClient.request(`/partners/${id}`);
  },

  async getAllPartnersAdmin(): Promise<ApiResponse<{ partners: ServicePartner[] }>> {
    return apiClient.request('/partners/admin');
  },

  async getPartnerAdmin(id: number): Promise<ApiResponse<{
    partner: ServicePartner;
    statistics: { total_appointments: number; completed_appointments: number };
  }>> {
    return apiClient.request(`/partners/admin/${id}`);
  },

  async activatePartner(id: number): Promise<ApiResponse<{ partner: ServicePartner }>> {
    return apiClient.request(`/partners/admin/${id}/activate`, {
      method: 'PUT',
    });
  },

  async updatePartnerServices(id: number, services: string[]): Promise<ApiResponse<{ services: string[] }>> {
    return apiClient.request(`/partners/admin/${id}/services`, {
      method: 'PUT',
      body: JSON.stringify({ services }),
    });
  },

  async updatePartnerRating(id: number, rating: number): Promise<ApiResponse<{ rating: number }>> {
    return apiClient.request(`/partners/admin/${id}/rating`, {
      method: 'PUT',
      body: JSON.stringify({ rating }),
    });
  },

  async getPartnersStatistics(): Promise<ApiResponse<{
    total_partners: number;
    active_partners: number;
    inactive_partners: number;
    top_partners: ServicePartner[];
    services_distribution: Record<string, number>;
  }>> {
    return apiClient.request('/partners/admin/statistics');
  },
};
