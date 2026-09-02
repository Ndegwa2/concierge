import { apiClient } from './client';
import type {
  Appointment,
  ApiResponse,
  Invoice,
} from './types';

export const appointmentsApi = {
  async getAppointments(status?: string): Promise<ApiResponse<{ appointments: Appointment[] }>> {
    const query = status ? `?status=${status}` : '';
    return apiClient.request(`/appointments/${query}`);
  },

  async getAllAppointmentsAdmin(status?: string): Promise<ApiResponse<{ appointments: Appointment[]; count: number }>> {
    const query = status ? `?status=${status}` : '';
    return apiClient.request(`/admin/appointments${query}`);
  },

  async getAppointment(id: number): Promise<ApiResponse<{ appointment: Appointment }>> {
    return apiClient.request(`/appointments/${id}`);
  },

  async createAppointment(data: {
    vehicle_id: number;
    service_id: number;
    appointment_date: string;
    notes?: string;
  }): Promise<ApiResponse<{ appointment: Appointment }>> {
    return apiClient.request('/appointments/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAppointment(
    id: number,
    data: Partial<Appointment>
  ): Promise<ApiResponse<{ appointment: Appointment }>> {
    return apiClient.request(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async cancelAppointment(id: number): Promise<ApiResponse<{ appointment: Appointment }>> {
    return apiClient.request(`/appointments/${id}`, {
      method: 'DELETE',
    });
  },

  async sendInvoice(appointmentId: number): Promise<ApiResponse<{ invoice: Invoice; created: boolean }>> {
    return apiClient.request(`/appointments/${appointmentId}/send-invoice`, {
      method: 'POST',
    });
  },

  async getInvoice(appointmentId: number): Promise<ApiResponse<{ invoice: Invoice }>> {
    return apiClient.request(`/appointments/${appointmentId}/invoice`);
  },

  async downloadInvoicePdf(appointmentId: number): Promise<Blob> {
    const token = apiClient.getToken();
    const response = await fetch(`${apiClient['API_BASE_URL']}/appointments/${appointmentId}/invoice/pdf`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to download invoice');
    }

    return response.blob();
  },

  async confirmVehicleReturn(appointmentId: number, data: {
    service_rating: number;
    condition_rating: number;
    review?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.request(`/appointments/${appointmentId}/confirm-return`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
