import { apiClient } from './client';
import type {
  ApiResponse,
  Assignment,
  VehicleChecklist,
  ChecklistItem,
  WorkRecord,
  WorkRecordItem,
  Invoice,
  InvoiceLineItem,
} from './types';

export const workflowApi = {
  async getAssignmentDetail(assignmentId: number): Promise<ApiResponse<{ assignment: Assignment }>> {
    return apiClient.request(`/workflow/assignments/${assignmentId}`);
  },

  async startAssignment(assignmentId: number): Promise<ApiResponse<{ assignment: Assignment }>> {
    return apiClient.request(`/workflow/assignments/${assignmentId}/start`, {
      method: 'POST',
    });
  },

  async getChecklist(assignmentId: number): Promise<ApiResponse<{ checklist: VehicleChecklist }>> {
    return apiClient.request(`/workflow/assignments/${assignmentId}/checklist`);
  },

  async createOrUpdateChecklist(assignmentId: number, data: {
    items: ChecklistItem[];
    overall_condition: VehicleChecklist['overall_condition'];
    notes?: string;
    photos?: string[];
  }): Promise<ApiResponse<{ checklist: VehicleChecklist }>> {
    return apiClient.request(`/workflow/assignments/${assignmentId}/checklist`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async submitChecklist(assignmentId: number): Promise<ApiResponse<{ checklist: VehicleChecklist }>> {
    return apiClient.request(`/workflow/assignments/${assignmentId}/checklist/submit`, {
      method: 'POST',
    });
  },

  async getWorkRecord(assignmentId: number): Promise<ApiResponse<{ work_record: WorkRecord }>> {
    return apiClient.request(`/workflow/assignments/${assignmentId}/work-record`);
  },

  async createWorkRecord(assignmentId: number, data: {
    items: WorkRecordItem[];
    overall_notes?: string;
    labor_hours?: number;
    labor_rate?: number;
  }): Promise<ApiResponse<{ work_record: WorkRecord }>> {
    return apiClient.request(`/workflow/assignments/${assignmentId}/work-record`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateWorkRecord(workRecordId: number, data: {
    items?: WorkRecordItem[];
    overall_notes?: string;
    labor_hours?: number;
    labor_rate?: number;
  }): Promise<ApiResponse<{ work_record: WorkRecord }>> {
    return apiClient.request(`/workflow/work-records/${workRecordId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async submitWorkRecord(assignmentId: number): Promise<ApiResponse<{ work_record: WorkRecord }>> {
    return apiClient.request(`/workflow/assignments/${assignmentId}/work-record/submit`, {
      method: 'POST',
    });
  },

  async verifyWorkRecord(assignmentId: number, data: {
    approved: boolean;
    notes?: string;
  }): Promise<ApiResponse<{ work_record: WorkRecord }>> {
    return apiClient.request(`/workflow/assignments/${assignmentId}/work-record/verify`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async generateInvoice(assignmentId: number, data?: {
    tax_amount?: number;
    discount_amount?: number;
    notes?: string;
    line_items?: Omit<InvoiceLineItem, 'id' | 'invoice_id' | 'created_at'>[];
  }): Promise<ApiResponse<{ invoice: Invoice }>> {
    return apiClient.request(`/workflow/assignments/${assignmentId}/invoice`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  async getInvoice(appointmentId: number): Promise<ApiResponse<{ invoice: Invoice & { line_items?: InvoiceLineItem[] } }>> {
    return apiClient.request(`/workflow/invoices/${appointmentId}`);
  },

  async sendInvoice(invoiceId: number): Promise<ApiResponse<{ sent: boolean }>> {
    return apiClient.request(`/workflow/invoices/${invoiceId}/send`, {
      method: 'POST',
    });
  },

  async getAdminPendingVerifications(): Promise<ApiResponse<{ assignments: Assignment[] }>> {
    return apiClient.request('/workflow/admin/pending-verifications');
  },

  async getEmployeeDashboardData(): Promise<ApiResponse<{
    assignments: Assignment[];
    statistics: {
      total_assignments: number;
      pending_checklist: number;
      pending_work_record: number;
      submitted_waiting_verification: number;
      completed: number;
    };
  }>> {
    return apiClient.request('/workflow/employees/dashboard');
  },
};
