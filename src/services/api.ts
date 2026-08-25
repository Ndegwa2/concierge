/**
 * API Service Layer for AutoConcierge
 * 
 * This module provides a centralized API service for all backend communication.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
}

export type Employee = EmployeeProfile;

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
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'overdue';
  notes?: string;
  total_amount?: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  reminder_sent?: boolean;
  overdue_notified?: boolean;
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

export interface InvoiceLineItem {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Company {
  id: number;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: Record<string, any>;
  billing_address?: Record<string, any>;
  payment_terms?: string;
  is_active: boolean;
  notes?: string;
  vehicle_count?: number;
  active_vehicle_count?: number;
  created_at: string;
  updated_at: string;
}

export interface FleetVehicle {
  id: number;
  company_id: number;
  make: string;
  model: string;
  year?: number;
  license_plate: string;
  vin?: string;
  status: string;
  assigned_employee_id?: number;
  last_service_date?: string;
  mileage_km: number;
  notes?: string;
  assigned_employee?: {
    id: number;
    employee_id: string;
    name?: string;
    status: string;
  };
  created_at: string;
  updated_at: string;
}

export interface FleetExpense {
  id: number;
  company_id: number;
  vehicle_id?: number;
  expense_type: string;
  description: string;
  amount: number;
  incurred_at: string;
  vehicle?: {
    license_plate: string;
    make: string;
    model: string;
  };
  created_at: string;
}

export interface FleetInvoice extends Invoice {
  company_id?: number;
  invoice_type: string;
  tax_amount: number;
  currency: string;
  due_date?: string;
  notes?: string;
  company?: Company;
  line_items?: InvoiceLineItem[];
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

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
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

      const data = await response.json();

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

      const data = await response.json();

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

    if (response.success && response.data && response.data.access_token) {
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

  async clockInOut({ action, notes }: { action: 'in' | 'out'; notes?: string }): Promise<ApiResponse<{
    time_log: any;
    status: string;
  }>> {
    return this.request('/employees/clock', {
      method: 'POST',
      body: JSON.stringify({ action, notes }),
    });
  }

  async getTimeLogs(): Promise<ApiResponse<{
    logs: any[];
    is_clocked_in: boolean;
    total_hours: number;
    current_status: string;
    last_action: string | null;
  }>> {
    return this.request('/employees/time-logs');
  }

  async requestTimeOff(data: {
    request_type: 'vacation' | 'sick' | 'personal' | 'other';
    start_date: string;
    end_date: string;
    reason?: string;
  }): Promise<ApiResponse<{ time_off_request: any }>> {
    return this.request('/employees/time-off', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTimeOffRequests(): Promise<ApiResponse<{
    time_off_requests: any[];
    count: number;
  }>> {
    return this.request('/employees/time-off');
  }

  // ============================================================
  // ADMIN EMPLOYEE MANAGEMENT ENDPOINTS
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
    return this.request('/employees/admin/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployee(
    id: number,
    data: Partial<User & { location?: string; specialties?: string[]; status?: string }>
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
    return this.deactivateEmployee(id);
  }

  async updateEmployeeStatus(id: number, status: string): Promise<ApiResponse<{ status: string }>> {
    return this.request(`/employees/admin/employees/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getPendingEmployees(): Promise<ApiResponse<{
    pending_employees: Array<{ user: User; employee: EmployeeProfile }>;
    count: number;
  }>> {
    return this.request('/auth/admin/pending-employees');
  }

  async approveEmployee(userId: number, action: 'approve' | 'reject'): Promise<ApiResponse<{ user: User; employee: EmployeeProfile }>> {
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

  async getAllAppointmentsAdmin(status?: string): Promise<ApiResponse<{ appointments: Appointment[]; count: number }>> {
    const query = status ? `?status=${status}` : '';
    return this.request(`/admin/appointments${query}`);
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

  async getAllUsers(): Promise<ApiResponse<{ users: User[] }>> {
    return this.request('/admin/users');
  }

  async getUser(id: number): Promise<ApiResponse<{ user: User }>> {
    return this.request(`/admin/users/${id}`);
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

  // ============================================================
  // FLEET MANAGEMENT ENDPOINTS
  // ============================================================

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
    return this.request(`/fleets/companies${qs}`);
  }

  async getCompany(id: number): Promise<ApiResponse<{ company: any }>> {
    return this.request(`/fleets/companies/${id}`);
  }

  async createCompany(data: Partial<Company>): Promise<ApiResponse<{ company: Company }>> {
    return this.request('/fleets/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompany(id: number, data: Partial<Company>): Promise<ApiResponse<{ company: Company }>> {
    return this.request(`/fleets/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompany(id: number): Promise<ApiResponse<{}>> {
    return this.request(`/fleets/companies/${id}`, {
      method: 'DELETE',
    });
  }

  async getCompanyVehicles(companyId: number): Promise<ApiResponse<{ vehicles: FleetVehicle[] }>> {
    return this.request(`/fleets/companies/${companyId}/vehicles`);
  }

  async createCompanyVehicle(companyId: number, data: Partial<FleetVehicle>): Promise<ApiResponse<{ vehicle: FleetVehicle }>> {
    return this.request(`/fleets/companies/${companyId}/vehicles`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFleetVehicle(id: number, data: Partial<FleetVehicle>): Promise<ApiResponse<{ vehicle: FleetVehicle }>> {
    return this.request(`/fleets/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFleetVehicle(id: number): Promise<ApiResponse<{}>> {
    return this.request(`/fleets/vehicles/${id}`, {
      method: 'DELETE',
    });
  }

  async getCompanyExpenses(companyId: number, params?: { start?: string; end?: string }): Promise<ApiResponse<{ expenses: FleetExpense[] }>> {
    const query = new URLSearchParams();
    if (params?.start) query.append('start', params.start);
    if (params?.end) query.append('end', params.end);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/fleets/companies/${companyId}/expenses${qs}`);
  }

  async createCompanyExpense(companyId: number, data: Partial<FleetExpense>): Promise<ApiResponse<{ expense: FleetExpense }>> {
    return this.request(`/fleets/companies/${companyId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteFleetExpense(id: number): Promise<ApiResponse<{}>> {
    return this.request(`/fleets/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  async getCompanyInvoices(companyId: number): Promise<ApiResponse<{ invoices: FleetInvoice[] }>> {
    return this.request(`/fleets/companies/${companyId}/invoices`);
  }

  async generateFleetInvoice(companyId: number, data: {
    period_start: string;
    period_end: string;
    line_items: Array<{ description: string; quantity?: number; unit_price: number; total_price: number }>;
    tax_amount?: number;
    currency?: string;
    due_date?: string;
    notes?: string;
  }): Promise<ApiResponse<{ invoice: FleetInvoice }>> {
    return this.request(`/fleets/companies/${companyId}/invoices`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFleetInvoice(id: number): Promise<ApiResponse<{ invoice: FleetInvoice }>> {
    return this.request(`/fleets/invoices/${id}`);
  }

  async downloadFleetInvoicePdf(id: number): Promise<Blob> {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/fleets/invoices/${id}/pdf`, {
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

  async sendFleetInvoice(id: number): Promise<ApiResponse<{ invoice: FleetInvoice }>> {
    return this.request(`/fleets/invoices/${id}/send`, {
      method: 'POST',
    });
  }

  async bulkGenerateStatements(data: {
    company_ids: number[];
    period_start: string;
    period_end: string;
    due_date?: string;
    notes?: string;
  }): Promise<ApiResponse<{ created: string[]; count: number }>> {
    return this.request('/fleets/companies/bulk-statement', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAllEmployeesAdmin(status?: string, location?: string, search?: string): Promise<ApiResponse<{
    employees: Array<{ user: User; employee: EmployeeProfile }>;
  }>> {
    return this.getEmployees(status, location, search);
  }

  async confirmVehicleReturn(appointmentId: number, data: {
    service_rating: number;
    condition_rating: number;
    review?: string;
  }): Promise<ApiResponse<any>> {
    return this.request(`/appointments/${appointmentId}/confirm-return`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async chatWithAI(data: {
    message: string;
    conversation_history?: Array<{ role: string; content: string }>;
  }): Promise<ApiResponse<{ response: string }>> {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/ai-chat/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  }

  async uploadEmployeeDocument(
    employeeId: number,
    file: File,
    docType: string,
    docName: string,
    isVerified: boolean
  ): Promise<ApiResponse<{ document: any }>> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    formData.append('document_name', docName);
    formData.append('is_verified', String(isVerified));

    const response = await fetch(`${API_BASE_URL}/employees/admin/employees/${employeeId}/documents`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    const data = await response.json();
    return data;
  }

  async exportEmployeesCsv(status?: string, department?: string, search?: string): Promise<Blob> {
    const token = this.getToken();
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (department) params.append('department', department);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const response = await fetch(`${API_BASE_URL}/employees/admin/employees/export/csv${qs}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to export CSV');
    }

    return response.blob();
  }

  async getNotifications(unreadOnly = false): Promise<ApiResponse<{ notifications: Notification[]; unread_count: number }>> {
    const query = unreadOnly ? '?unread_only=true' : '';
    return this.request(`/notifications/${query}`);
  }

  async markNotificationRead(notificationId: number): Promise<ApiResponse<{ notification: Notification }>> {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead(): Promise<ApiResponse<void>> {
    return this.request(`/notifications/read-all`, {
      method: 'PUT',
    });
  }
}

// Export singleton instance
export const api = new ApiService();

// Export class for testing
export { ApiService };