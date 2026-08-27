import { apiClient } from './client';
import type {
  ApiResponse,
  User,
  Appointment,
  ServicePartner,
} from './types';

export const adminApi = {
  async getAdminDashboard(): Promise<ApiResponse<{
    statistics: {
      total_users: number;
      total_appointments: number;
      total_services: number;
      total_vehicles: number;
      active_appointments: number;
      completed_appointments: number;
      total_revenue: number;
    };
    recent_appointments: Appointment[];
  }>> {
    return apiClient.request('/admin/dashboard');
  },

  async getAllUsers(): Promise<ApiResponse<{ users: User[] }>> {
    return apiClient.request('/admin/users');
  },

  async getUser(id: number): Promise<ApiResponse<{ user: User }>> {
    return apiClient.request(`/admin/users/${id}`);
  },

  async getServiceHistory(): Promise<ApiResponse<{ service_history: any[] }>> {
    return apiClient.request('/admin/service-history');
  },

  async createNotification(data: {
    user_id: number;
    title: string;
    message: string;
  }): Promise<ApiResponse<{ notification: any }>> {
    return apiClient.request('/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
