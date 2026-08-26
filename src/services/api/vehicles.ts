import { apiClient } from './client';
import type {
  Vehicle,
  ApiResponse,
} from './types';

export const vehiclesApi = {
  async getVehicles(): Promise<ApiResponse<{ vehicles: Vehicle[] }>> {
    return apiClient.request('/vehicles/');
  },

  async getVehicle(id: number): Promise<ApiResponse<{ vehicle: Vehicle }>> {
    return apiClient.request(`/vehicles/${id}`);
  },

  async createVehicle(data: Partial<Vehicle>): Promise<ApiResponse<{ vehicle: Vehicle }>> {
    return apiClient.request('/vehicles/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateVehicle(id: number, data: Partial<Vehicle>): Promise<ApiResponse<{ vehicle: Vehicle }>> {
    return apiClient.request(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteVehicle(id: number): Promise<ApiResponse<{}>> {
    return apiClient.request(`/vehicles/${id}`, {
      method: 'DELETE',
    });
  },
};
