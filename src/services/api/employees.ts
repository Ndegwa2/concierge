import { apiClient } from './client';
import type {
  ApiResponse,
  EmployeeProfile,
  Assignment,
  Appointment,
  Vehicle,
  Service,
  User,
} from './types';

export const employeesApi = {
  async getEmployeeDashboard(): Promise<ApiResponse<{
    employee: EmployeeProfile;
    statistics: {
      total_assignments: number;
      active_assignments: number;
      completed_assignments: number;
      today_assignments: number;
      rating: number;
    };
  }>> {
    return apiClient.request('/employees/dashboard');
  },

  async getMyAssignments(status?: string): Promise<ApiResponse<{
    assignments: Array<Assignment & {
      appointment: Appointment & {
        customer: { id: number; name: string; phone: string };
        vehicle?: Vehicle;
        service?: Service;
      };
    }>;
  }>> {
    const query = status ? `?status=${status}` : '';
    return apiClient.request(`/employees/assignments${query}`);
  },

  async updateAssignmentStatus(
    id: number,
    status: string,
    notes?: string
  ): Promise<ApiResponse<{ assignment: any }>> {
    return apiClient.request(`/employees/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  async getMySchedule(startDate?: string, endDate?: string): Promise<ApiResponse<{
    schedule: Record<string, Array<{
      assignment_id: number;
      appointment_id: number;
      time: string;
      status: string;
      service?: string;
      customer: { name: string; phone: string };
    }>>;
    employee: EmployeeProfile;
  }>> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request(`/employees/schedule${query}`);
  },

  async getEmployeeProfile(): Promise<ApiResponse<{ user: User }>> {
    return apiClient.request('/employees/profile');
  },

  async updateEmployeeProfile(data: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    return apiClient.request('/employees/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async clockInOut({ action, notes }: { action: 'in' | 'out'; notes?: string }): Promise<ApiResponse<{
    time_log: any;
    status: string;
  }>> {
    return apiClient.request('/employees/clock', {
      method: 'POST',
      body: JSON.stringify({ action, notes }),
    });
  },

  async getTimeLogs(): Promise<ApiResponse<{
    logs: any[];
    is_clocked_in: boolean;
    total_hours: number;
    current_status: string;
    last_action: string | null;
  }>> {
    return apiClient.request('/employees/time-logs');
  },

  async requestTimeOff(data: {
    request_type: 'vacation' | 'sick' | 'personal' | 'other';
    start_date: string;
    end_date: string;
    reason?: string;
  }): Promise<ApiResponse<{ time_off_request: any }>> {
    return apiClient.request('/employees/time-off', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTimeOffRequests(): Promise<ApiResponse<{
    time_off_requests: any[];
    count: number;
  }>> {
    return apiClient.request('/employees/time-off');
  },

  async getEmployees(status?: string, location?: string, search?: string): Promise<ApiResponse<{
    employees: Array<{ user: User; employee: EmployeeProfile }>;
  }>> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (location) params.append('location', location);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request(`/employees/admin/employees${query}`);
  },

  async getEmployee(id: number): Promise<ApiResponse<{ user: User; employee: EmployeeProfile }>> {
    return apiClient.request(`/employees/admin/employees/${id}`);
  },

  async registerEmployee(data: {
    name: string;
    email: string;
    password: string;
    location: string;
    phone?: string;
    address?: string;
    specialties?: string[];
    status?: string;
  }): Promise<ApiResponse<{ user: User; employee_id: string }>> {
    return apiClient.request('/employees/admin/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateEmployee(
    id: number,
    data: Partial<User & { location?: string; specialties?: string[]; status?: string }>
  ): Promise<ApiResponse<{ user: User }>> {
    return apiClient.request(`/employees/admin/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deactivateEmployee(id: number): Promise<ApiResponse<{}>> {
    return apiClient.request(`/employees/admin/employees/${id}`, {
      method: 'DELETE',
    });
  },

  async updateEmployeeStatus(id: number, status: string): Promise<ApiResponse<{ status: string }>> {
    return apiClient.request(`/employees/admin/employees/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async assignEmployeeToAppointment(
    appointmentId: number,
    employeeId: number,
    notes?: string
  ): Promise<ApiResponse<{ assignment: Assignment }>> {
    return apiClient.request(`/employees/admin/appointments/${appointmentId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId, notes }),
    });
  },

  async uploadEmployeeDocument(
    employeeId: number,
    file: File,
    docType: string,
    docName: string,
    isVerified: boolean
  ): Promise<ApiResponse<{ document: any }>> {
    const token = apiClient.getToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    formData.append('document_name', docName);
    formData.append('is_verified', String(isVerified));

    const response = await fetch(`${apiClient['API_BASE_URL']}/employees/admin/employees/${employeeId}/documents`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    const data = await response.json();
    return data;
  },

  async exportEmployeesCsv(status?: string, department?: string, search?: string): Promise<Blob> {
    const token = apiClient.getToken();
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (department) params.append('department', department);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const response = await fetch(`${apiClient['API_BASE_URL']}/employees/admin/employees/export/csv${qs}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to export CSV');
    }

    return response.blob();
  },
};
