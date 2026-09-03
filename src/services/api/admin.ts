import { apiClient } from './client';
import type { ApiResponse, User, Appointment, ServicePartner } from './types';

export interface POSLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface POSCheckoutRequest {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method: 'cash' | 'mpesa' | 'card';
  line_items: POSLineItem[];
  discount_amount?: number;
  tax_amount?: number;
  notes?: string;
  cash_tendered?: number;
}

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

  async createDiscount(data: {
    code: string;
    discount_type: string;
    value: number;
    minimum_spend?: number;
    max_uses?: number;
    start_date?: string;
    end_date?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<{ discount: any }>> {
    return apiClient.request('/admin/discounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async posCheckout(data: POSCheckoutRequest): Promise<ApiResponse<{
    invoice: {
      id: number;
      invoice_number: string;
      total_amount: number;
      status: string;
      pdf_path?: string;
      line_items?: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        total_price: number;
      }>;
    };
  }>> {
    return apiClient.request('/admin/pos/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
