import { apiClient } from './client';
import type {
  ApiResponse,
  Service,
} from './types';

export const servicesApi = {
  async getServices(): Promise<ApiResponse<{ services: Service[] }>> {
    return apiClient.request('/services/');
  },

  async getService(id: number): Promise<ApiResponse<{ service: Service }>> {
    return apiClient.request(`/services/${id}`);
  },
};
