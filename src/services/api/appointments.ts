import { apiClient } from './client';
import { API_BASE_URL } from './types';
import type {
  Appointment,
  ApiResponse,
  Invoice,
} from './types';

export const appointmentsApi = {
  async getAppointments(status?: string): Promise<ApiResponse<{ appointments: Appointment[] }>> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const query = params.toString();
    const endpoint = query ? `/appointments?${query}` : '/appointments';
    return apiClient.request(endpoint);
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

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/invoice/pdf`, {
        // Send cookies so the dev-proxy (localhost:5173 -> :5000) can carry the
        // session, and attach the JWT explicitly for the API.
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch (networkError: any) {
      // DNS/CORS/proxy-down/etc. -> surface something the UI can show.
      throw new Error(networkError?.message || 'Network error. Please check your connection.');
    }

    if (!response.ok) {
      // The error body may be JSON (Flask error) or HTML (gateway/proxy), so
      // parse defensively instead of assuming response.json().
      const contentType = response.headers.get('content-type') || '';
      let message: string | undefined;

      if (contentType.includes('application/json')) {
        try {
          const data = await response.json();
          message = data?.message;
        } catch {
          /* leave message undefined -> fall back to generic text below */
        }
      }

      // A 401 means the token is expired/revoked. apiClient owns token refresh
      // + logout, so delegate to it: clear the stale session so the app-level
      // auth listener redirects to login (otherwise the button looks
      // permanently broken until a hard refresh).
      if (response.status === 401) {
        apiClient.clearTokens();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        throw new Error(message || 'Session expired. Please log in again.');
      }

      throw new Error(
        message ||
          (response.status === 404
            ? 'Invoice not found for this appointment.'
            : 'Failed to download invoice. Please try again.')
      );
    }

    return response.blob();
  },

  async confirmVehicleReturn(appointmentId: number, data: {
    service_rating: number;
    condition_rating: number;
    concierge_behavior_rating?: number;
    review?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.request(`/appointments/${appointmentId}/confirm-return`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
