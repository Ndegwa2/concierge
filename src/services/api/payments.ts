import { apiClient } from './client';
import type {
  ApiResponse,
} from './types';

export interface Payment {
  id: number;
  payment_reference: string;
  invoice_id: number;
  appointment_id: number;
  user_id: number;
  amount: number;
  currency: string;
  method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  mpesa_receipt_number?: string;
  mpesa_phone_number?: string;
  mpesa_transaction_date?: string;
  card_last_four?: string;
  card_brand?: string;
  failure_reason?: string;
  notes?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export const paymentsApi = {
  async initiateMpesaPayment(appointmentId: number, phoneNumber: string): Promise<ApiResponse<{
    payment: Payment;
    message: string;
  }>> {
    return apiClient.request('/payments/mpesa/stk-push', {
      method: 'POST',
      body: JSON.stringify({
        appointment_id: appointmentId,
        phone_number: phoneNumber,
      }),
    });
  },

  async checkPaymentStatus(paymentId: number): Promise<ApiResponse<{ payment: Payment }>> {
    return apiClient.request(`/payments/${paymentId}/status`);
  },

  async getPayment(paymentId: number): Promise<ApiResponse<{ payment: Payment }>> {
    return apiClient.request(`/payments/${paymentId}`);
  },

  async getPaymentsForAppointment(appointmentId: number): Promise<ApiResponse<{ payments: Payment[] }>> {
    return apiClient.request(`/payments/appointment/${appointmentId}`);
  },
};
