import { apiClient } from './client';
import type {
  ApiResponse,
  Company,
  FleetVehicle,
  FleetExpense,
  FleetInvoice,
} from './types';

export const fleetsApi = {
  async getCompanies(params?: { search?: string; page?: number; per_page?: number }): Promise<ApiResponse<{
    companies: Company[];
    total: number;
    page: number;
    per_page: number;
  }>> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.request(`/fleets/companies${qs}`);
  },

  async getCompany(id: number): Promise<ApiResponse<{ company: any }>> {
    return apiClient.request(`/fleets/companies/${id}`);
  },

  async createCompany(data: Partial<Company>): Promise<ApiResponse<{ company: Company }>> {
    return apiClient.request('/fleets/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCompany(id: number, data: Partial<Company>): Promise<ApiResponse<{ company: Company }>> {
    return apiClient.request(`/fleets/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCompany(id: number): Promise<ApiResponse<{}>> {
    return apiClient.request(`/fleets/companies/${id}`, {
      method: 'DELETE',
    });
  },

  async getCompanyVehicles(companyId: number): Promise<ApiResponse<{ vehicles: FleetVehicle[] }>> {
    return apiClient.request(`/fleets/companies/${companyId}/vehicles`);
  },

  async createCompanyVehicle(companyId: number, data: Partial<FleetVehicle>): Promise<ApiResponse<{ vehicle: FleetVehicle }>> {
    return apiClient.request(`/fleets/companies/${companyId}/vehicles`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateFleetVehicle(id: number, data: Partial<FleetVehicle>): Promise<ApiResponse<{ vehicle: FleetVehicle }>> {
    return apiClient.request(`/fleets/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteFleetVehicle(id: number): Promise<ApiResponse<{}>> {
    return apiClient.request(`/fleets/vehicles/${id}`, {
      method: 'DELETE',
    });
  },

  async getCompanyExpenses(companyId: number, params?: { start?: string; end?: string }): Promise<ApiResponse<{ expenses: FleetExpense[] }>> {
    const query = new URLSearchParams();
    if (params?.start) query.append('start', params.start);
    if (params?.end) query.append('end', params.end);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.request(`/fleets/companies/${companyId}/expenses${qs}`);
  },

  async createCompanyExpense(companyId: number, data: Partial<FleetExpense>): Promise<ApiResponse<{ expense: FleetExpense }>> {
    return apiClient.request(`/fleets/companies/${companyId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteFleetExpense(id: number): Promise<ApiResponse<{}>> {
    return apiClient.request(`/fleets/expenses/${id}`, {
      method: 'DELETE',
    });
  },

  async getCompanyInvoices(companyId: number): Promise<ApiResponse<{ invoices: FleetInvoice[] }>> {
    return apiClient.request(`/fleets/companies/${companyId}/invoices`);
  },

  async generateFleetInvoice(companyId: number, data: {
    period_start: string;
    period_end: string;
    line_items: Array<{ description: string; quantity?: number; unit_price: number; total_price: number }>;
    tax_amount?: number;
    currency?: string;
    due_date?: string;
    notes?: string;
  }): Promise<ApiResponse<{ invoice: FleetInvoice }>> {
    return apiClient.request(`/fleets/companies/${companyId}/invoices`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getFleetInvoice(id: number): Promise<ApiResponse<{ invoice: FleetInvoice }>> {
    return apiClient.request(`/fleets/invoices/${id}`);
  },

  async downloadFleetInvoicePdf(id: number): Promise<Blob> {
    const token = apiClient.getToken();
    const response = await fetch(`${apiClient['API_BASE_URL']}/fleets/invoices/${id}/pdf`, {
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

  async sendFleetInvoice(id: number): Promise<ApiResponse<{ invoice: FleetInvoice }>> {
    return apiClient.request(`/fleets/invoices/${id}/send`, {
      method: 'POST',
    });
  },

  async bulkGenerateStatements(data: {
    company_ids: number[];
    period_start: string;
    period_end: string;
    due_date?: string;
    notes?: string;
  }): Promise<ApiResponse<{ created: string[]; count: number }>> {
    return apiClient.request('/fleets/companies/bulk-statement', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
