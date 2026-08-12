/**
 * API Service Layer for AutoConcierge
 * 
 * This module provides a centralized API service for all backend communication.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export { API_BASE_URL };

// Types
export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'customer' | 'employee' | 'admin' | 'super_admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  employee?: EmployeeProfile;
}

export interface EmployeeProfile {
  id: number;
  user_id: number;
  employee_id: string;
  location: string;
  specialties: string[];
  rating: number;
  total_services: number;
  status: string;
  hired_at?: string;
  created_at: string;
  updated_at: string;
  // Employment details
  department?: string;
  title?: string;
  employment_type?: 'full_time' | 'part_time' | 'contractor';
  start_date?: string;
  manager_id?: number;
  // Onboarding / Offboarding
  account_status?: 'active' | 'onboarding' | 'suspended' | 'terminated';
  exit_notes?: string;
  offboarding_checklist_completed?: boolean;
  // Compensation & Benefits (RBAC-gated)
  base_salary?: number;
  hourly_rate?: number;
  pay_frequency?: 'monthly' | 'bi_weekly' | 'weekly';
  bank_account_number?: string;
  bank_name?: string;
  health_plan_tier?: 'basic' | 'standard' | 'premium';
}

export type Employee = EmployeeProfile;

export interface EmployeeDocument {
  id: number;
  employee_id: number;
  document_name: string;
  doc_type: 'id_proof' | 'tax_form' | 'certification' | 'contract' | 'other';
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  is_verified?: boolean;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RegisterEmployeeData {
  name: string;
  email: string;
  password: string;
  location: string;
  phone?: string;
  address?: string;
  specialties?: string[];
  status?: string;
  department?: string;
  title?: string;
  employment_type?: 'full_time' | 'part_time' | 'contractor';
  start_date?: string;
  account_status?: string;
  base_salary?: number;
  hourly_rate?: number;
  pay_frequency?: string;
  bank_account_number?: string;
  bank_name?: string;
  health_plan_tier?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'employee';
  phone?: string;
  address?: string;
  location?: string;
  specialties?: string[];
}


export interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  duration: number;
  category: string;
  is_active: boolean;
}

export interface Vehicle {
  id: number;
  user_id: number;
  make: string;
  model: string;
  year: number;
  color?: string;
  license_plate?: string;
  vin?: string;
  odometer?: number;
  current_mileage?: number;
  last_service_mileage?: number;
  next_service_mileage?: number;
  insurance_expiry_date?: string;
  estimated_monthly_maintenance?: number;
  total_maintenance_ytd: number;
  is_active: boolean;
}

export interface Appointment {
  id: number;
  user_id: number;
  vehicle_id: number;
  service_id: number;
  partner_id?: number;
  appointment_date: string;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  total_amount?: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  vehicle?: Vehicle;
  service?: Service;
  customer?: { id: number; name: string; phone: string };
}

export interface ServicePartner {
  id: number;
  name: string;
  contact_name: string;
  email?: string;
  phone: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  services_offered: string[];
  rating: number;
  total_services: number;
  is_active: boolean;
}

export interface Assignment {
  id: number;
  appointment_id: number;
  employee_id: number;
  status: string;
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAssignment extends Assignment {
  appointment: {
    id: number;
    user_id: number;
    vehicle_id: number;
    service_id: number;
    appointment_date: string;
    status: string;
    notes?: string;
    total_amount?: number;
    vehicle?: Vehicle;
    service?: Service;
    customer?: { id: number; name: string; phone: string };
  };
}

export interface TimeOffRequest {
  id: number;
  employee_id: number;
  request_type: 'vacation' | 'sick' | 'personal' | 'other';
  start_date: string;
  end_date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface IssueReport {
  id: number;
  employee_id: number;
  appointment_id?: number | null;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeLog {
  id: number;
  employee_id: number;
  action: 'in' | 'out';
  timestamp: string;
  notes?: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  appointment_id: number;
  user_id: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'void';
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * API Service Class
 */
class ApiService {
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  /**
   * Set authentication tokens
   */
  setTokens(accessToken: string, refreshToken?: string) {
    this.token = accessToken;
    localStorage.setItem('auth_token', accessToken);
    
    if (refreshToken) {
      this.refreshToken = refreshToken;
      localStorage.setItem('refresh_token', refreshToken);
    }
  }

  /**
   * Clear authentication tokens
   */
  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  /**
   * Get current access token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token;
  }

  /**
   * Make an API request
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      let data: ApiResponse<T>;
      try {
        data = await response.json();
      } catch {
        data = {
          success: false,
          message: response.statusText || 'Invalid response from server',
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // Handle token expiration / missing JWT
      const method = (options.method || 'GET').toUpperCase();
      const isRefreshEndpoint = endpoint === '/auth/refresh';
      if ((response.status === 401 || response.status === 422) && !isRefreshEndpoint) {
        // Try to refresh token for invalid or expired access tokens
        const refreshed = await this.refreshAccessToken();
        
        if (refreshed) {
          // Retry the original request
          return this.request<T>(endpoint, options);
        } else {
          // Clear tokens and redirect to login
          this.clearTokens();
          window.location.href = '/';
        }
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        error: String(error),
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.refreshToken && { Authorization: `Bearer ${this.refreshToken}` }),
        },
        body: JSON.stringify({
          refresh_token: this.refreshToken,
        }),
      });

      let data: ApiResponse<any>;
      try {
        data = await response.json();
      } catch {
        return false;
      }

      if (data.success && data.data?.access_token) {
        this.setTokens(data.data.access_token);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Refresh token request failed:', error);
      return false;
    }
  }

  // ============================================================
  // AUTH ENDPOINTS
  // ============================================================

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse['data']>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      this.setTokens(response.data.access_token, response.data.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response as LoginResponse;
  }

  async adminLogin(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse['data']>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      this.setTokens(response.data.access_token, response.data.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response as LoginResponse;
  }

  async register(userData: RegisterData): Promise<LoginResponse> {
    const response = await this.request<LoginResponse['data']>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success && response.data) {
      this.setTokens(response.data.access_token, response.data.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response as LoginResponse;
  }

  async employeeLogin(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse['data']>('/auth/employee/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      this.setTokens(response.data.access_token, response.data.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response as LoginResponse;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    this.clearTokens();
  }

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return this.request('/auth/profile');
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{}>> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  async verifyToken(): Promise<ApiResponse<{ user: User }>> {
    return this.request('/auth/verify-token');
  }

  // ============================================================
  // EMPLOYEE PORTAL ENDPOINTS
  // ============================================================

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
    return this.request('/employees/dashboard');
  }

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
    return this.request(`/employees/assignments${query}`);
  }

  async updateAssignmentStatus(
    id: number,
    status: string,
    notes?: string
  ): Promise<ApiResponse<{ assignment: any }>> {
    return this.request(`/employees/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }

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
    return this.request(`/employees/schedule${query}`);
  }

  async getEmployeeProfile(): Promise<ApiResponse<{ user: User }>> {
    return this.request('/employees/profile');
  }

  async updateEmployeeProfile(data: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    return this.request('/employees/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ============================================================
  // EMPLOYEE TIME TRACKING ENDPOINTS
  // ============================================================

  async clockInOut(data: { action: 'in' | 'out'; notes?: string }): Promise<ApiResponse<{ time_log: TimeLog; status: string }>> {
    return this.request('/employees/clock', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTimeLogs(): Promise<ApiResponse<{ logs: TimeLog[]; is_clocked_in: boolean; total_hours: number; current_status: string; last_action?: string }>> {
    return this.request('/employees/time-logs');
  }

  // ============================================================
  // EMPLOYEE TIME-OFF ENDPOINTS
  // ============================================================

  async requestTimeOff(data: {
    request_type: 'vacation' | 'sick' | 'personal' | 'other';
    start_date: string;
    end_date: string;
    reason?: string;
  }): Promise<ApiResponse<{ time_off_request: TimeOffRequest }>> {
    return this.request('/employees/time-off', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTimeOffRequests(): Promise<ApiResponse<{ requests: TimeOffRequest[]; count: number; pending_count: number }>> {
    return this.request('/employees/time-off');
  }

  // ============================================================
  // EMPLOYEE ISSUE REPORTING ENDPOINTS
  // ============================================================

  async reportIssue(data: {
    title: string;
    description: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    appointment_id?: number;
  }): Promise<ApiResponse<{ issue: IssueReport }>> {
    return this.request('/employees/issues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getIssueReports(): Promise<ApiResponse<{ issues: IssueReport[]; count: number; open_count: number }>> {
    return this.request('/employees/issues');
  }

  // ============================================================

  async getEmployees(status?: string, location?: string, search?: string): Promise<ApiResponse<{
    employees: Array<{ user: User; employee: EmployeeProfile }>;
  }>> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (location) params.append('location', location);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/employees/admin/employees${query}`);
  }

  async getEmployee(id: number): Promise<ApiResponse<{ user: User; employee: EmployeeProfile }>> {
    return this.request(`/employees/admin/employees/${id}`);
  }

  async registerEmployee(data: RegisterEmployeeData): Promise<ApiResponse<{ user: User; employee_id: string }>> {
    return this.request('/employees/admin/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployee(
    id: number,
    data: Partial<User & EmployeeProfile>
  ): Promise<ApiResponse<{ user: User }>> {
    return this.request(`/employees/admin/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deactivateEmployee(id: number): Promise<ApiResponse<{}>> {
    return this.request(`/employees/admin/employees/${id}`, {
      method: 'DELETE',
    });
  }

  async deleteEmployee(id: number): Promise<ApiResponse<{}>> {
    return this.request(`/employees/admin/employees/${id}`, {
      method: 'DELETE',
    });
  }

  async updateEmployeeStatus(id: number, status: string): Promise<ApiResponse<{ status: string }>> {
    return this.request(`/employees/admin/employees/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateEmployeeAccountStatus(
    id: number,
    accountStatus: string,
    exitNotes?: string
  ): Promise<ApiResponse<{ account_status: string }>> {
    return this.request(`/employees/admin/employees/${id}/account-status`, {
      method: 'PUT',
      body: JSON.stringify({ account_status: accountStatus, exit_notes: exitNotes }),
    });
  }

  async uploadEmployeeDocument(
    employeeId: number,
    file: File,
    docType: string,
    documentName: string,
    isVerified: boolean = false
  ): Promise<ApiResponse<{ document: EmployeeDocument }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    formData.append('document_name', documentName);
    formData.append('is_verified', String(isVerified));

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/employees/admin/employees/${employeeId}/documents`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Document upload error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        error: String(error),
      };
    }
  }

  async getEmployeeDocuments(employeeId: number): Promise<ApiResponse<{ documents: EmployeeDocument[]; count: number }>> {
    return this.request(`/employees/admin/employees/${employeeId}/documents`);
  }

  async deleteEmployeeDocument(employeeId: number, docId: number): Promise<ApiResponse<{}>> {
    return this.request(`/employees/admin/employees/${employeeId}/documents/${docId}`, {
      method: 'DELETE',
    });
  }

  async downloadEmployeeDocument(documentId: number): Promise<Blob> {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/employees/admin/employees/documents/${documentId}/download`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to download document');
    }

    return response.blob();
  }

  async exportEmployeesCsv(
    status?: string,
    location?: string,
    search?: string
  ): Promise<Blob> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (location) params.append('location', location);
    if (search) params.append('search', search);
    const query = params.toString();

    const token = this.getToken();
    const response = await fetch(
      `${API_BASE_URL}/employees/admin/employees/export/csv?${query}`,
      {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to export employees');
    }

    return response.blob();
  }

  async getDepartments(): Promise<ApiResponse<{ departments: string[] }>> {
    return this.request('/employees/admin/departments');
  }

  async getManagers(): Promise<ApiResponse<{ managers: Array<{ id: number; name: string; employee_id: string }> }>> {
    return this.request('/employees/admin/managers');
  }

  async getPendingEmployees(): Promise<ApiResponse<{
    pending_employees: Array<{
      user: User;
      employee: EmployeeProfile;
    }>;
  }>> {
    return this.request('/auth/admin/pending-employees');
  }

  async approveEmployee(userId: number, action: 'approve' | 'reject'): Promise<ApiResponse<{}>> {
    return this.request(`/auth/admin/approve-employee/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  async assignEmployeeToAppointment(
    appointmentId: number,
    employeeId: number,
    notes?: string
  ): Promise<ApiResponse<{ assignment: Assignment }>> {
    return this.request(`/employees/admin/appointments/${appointmentId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId, notes }),
    });
  }

  // ============================================================
  // SERVICES ENDPOINTS
  // ============================================================

  async getServices(): Promise<ApiResponse<{ services: Service[] }>> {
    return this.request('/services/');
  }

  async getService(id: number): Promise<ApiResponse<{ service: Service }>> {
    return this.request(`/services/${id}`);
  }

  // ============================================================
  // APPOINTMENTS ENDPOINTS
  // ============================================================

  async getAppointments(status?: string): Promise<ApiResponse<{ appointments: Appointment[] }>> {
    const query = status ? `?status=${status}` : '';
    return this.request(`/appointments/${query}`);
  }

  async getAppointment(id: number): Promise<ApiResponse<{ appointment: Appointment }>> {
    return this.request(`/appointments/${id}`);
  }

  async createAppointment(data: {
    vehicle_id: number;
    service_id: number;
    appointment_date: string;
    notes?: string;
  }): Promise<ApiResponse<{ appointment: Appointment }>> {
    return this.request('/appointments/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAppointment(
    id: number,
    data: Partial<Appointment>
  ): Promise<ApiResponse<{ appointment: Appointment }>> {
    return this.request(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async cancelAppointment(id: number): Promise<ApiResponse<{}>> {
    return this.request(`/appointments/${id}`, {
      method: 'DELETE',
    });
  }

  async sendInvoice(appointmentId: number): Promise<ApiResponse<{ invoice: Invoice; created: boolean }>> {
    return this.request(`/appointments/${appointmentId}/send-invoice`, {
      method: 'POST',
    });
  }

  async getInvoice(appointmentId: number): Promise<ApiResponse<{ invoice: Invoice }>> {
    return this.request(`/appointments/${appointmentId}/invoice`);
  }

  async downloadInvoicePdf(appointmentId: number): Promise<Blob> {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/invoice/pdf`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to download invoice');
    }

    return response.blob();
  }

  // ============================================================
  // VEHICLES ENDPOINTS
  // ============================================================

  async getVehicles(): Promise<ApiResponse<{ vehicles: Vehicle[] }>> {
    return this.request('/vehicles/');
  }

  async getVehicle(id: number): Promise<ApiResponse<{ vehicle: Vehicle }>> {
    return this.request(`/vehicles/${id}`);
  }

  async createVehicle(data: Partial<Vehicle>): Promise<ApiResponse<{ vehicle: Vehicle }>> {
    return this.request('/vehicles/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVehicle(id: number, data: Partial<Vehicle>): Promise<ApiResponse<{ vehicle: Vehicle }>> {
    return this.request(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteVehicle(id: number): Promise<ApiResponse<{}>> {
    return this.request(`/vehicles/${id}`, {
      method: 'DELETE',
    });
  }

  async confirmVehicleReturn(
    appointmentId: number,
    data: { service_rating: number; condition_rating: number; review?: string }
  ): Promise<ApiResponse<{ service_history: any }>> {
    return this.request(`/appointments/${appointmentId}/confirm-return`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================================
  // ADMIN ENDPOINTS
  // ============================================================

  async getAdminDashboard(): Promise<ApiResponse<{
    stats: {
      total_users: number;
      total_appointments: number;
      total_services: number;
      total_revenue: number;
    };
    recent_appointments: Appointment[];
  }>> {
    return this.request('/admin/dashboard');
  }

  async getAllAppointmentsAdmin(status?: string): Promise<ApiResponse<{ appointments: Appointment[] }>> {
    const query = status ? `?status=${status}` : '';
    return this.request(`/admin/appointments${query}`);
  }

  async getAllUsers(): Promise<ApiResponse<{ users: User[] }>> {
    return this.request('/admin/users');
  }

  async getUser(id: number): Promise<ApiResponse<{ user: User }>> {
    return this.request(`/admin/users/${id}`);
  }

  async getAllEmployeesAdmin(status?: string, location?: string, search?: string): Promise<ApiResponse<{
    employees: Array<{ user: User; employee: EmployeeProfile }>;
  }>> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (location) params.append('location', location);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/employees/admin/employees${query}`);
  }

  // Service Partners Management
  async getServicePartners(service?: string, location?: string): Promise<ApiResponse<{
    partners: ServicePartner[];
  }>> {
    const params = new URLSearchParams();
    if (service) params.append('service', service);
    if (location) params.append('location', location);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/partners/${query}`);
  }

  async createServicePartner(data: Partial<ServicePartner>): Promise<ApiResponse<{ partner: ServicePartner }>> {
    return this.request('/partners/admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateServicePartner(
    id: number,
    data: Partial<ServicePartner>
  ): Promise<ApiResponse<{ partner: ServicePartner }>> {
    return this.request(`/partners/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deactivateServicePartner(id: number): Promise<ApiResponse<{}>> {
    return this.request(`/partners/admin/${id}`, {
      method: 'DELETE',
    });
  }

  async getPartner(id: number): Promise<ApiResponse<{ partner: ServicePartner }>> {
    return this.request(`/partners/${id}`);
  }

  async getAllPartnersAdmin(): Promise<ApiResponse<{ partners: ServicePartner[] }>> {
    return this.request('/partners/admin');
  }

  async getPartnerAdmin(id: number): Promise<ApiResponse<{
    partner: ServicePartner;
    statistics: { total_appointments: number; completed_appointments: number };
  }>> {
    return this.request(`/partners/admin/${id}`);
  }

  async activatePartner(id: number): Promise<ApiResponse<{ partner: ServicePartner }>> {
    return this.request(`/partners/admin/${id}/activate`, {
      method: 'PUT',
    });
  }

  async updatePartnerServices(id: number, services: string[]): Promise<ApiResponse<{ services: string[] }>> {
    return this.request(`/partners/admin/${id}/services`, {
      method: 'PUT',
      body: JSON.stringify({ services }),
    });
  }

  async updatePartnerRating(id: number, rating: number): Promise<ApiResponse<{ rating: number }>> {
    return this.request(`/partners/admin/${id}/rating`, {
      method: 'PUT',
      body: JSON.stringify({ rating }),
    });
  }

  async getPartnersStatistics(): Promise<ApiResponse<{
    total_partners: number;
    active_partners: number;
    inactive_partners: number;
    top_partners: ServicePartner[];
    services_distribution: Record<string, number>;
  }>> {
    return this.request('/partners/admin/statistics');
  }

  // ============================================================
  // ADMIN AUTH MANAGEMENT ENDPOINTS
  // ============================================================

  async createAdmin(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<ApiResponse<{ admin: User }>> {
    return this.request('/auth/admin/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getServiceHistory(): Promise<ApiResponse<{ service_history: any[] }>> {
    return this.request('/admin/service-history');
  }

  async createNotification(data: {
    user_id: number;
    title: string;
    message: string;
  }): Promise<ApiResponse<{ notification: any }>> {
    return this.request('/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async chatWithAI(data: ChatRequest): Promise<ChatResponse> {
    return this.request<{ response: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversation_history?: ChatMessage[];
}

export interface ChatResponse {
  success: boolean;
  message?: string;
  data?: {
    response: string;
  };
  error?: string;
}

// Export singleton instance
export const api = new ApiService();

// Export class for testing
export { ApiService };