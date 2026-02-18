/**
 * API Service Layer for AutoConcierge
 * 
 * This module provides a centralized API service for all backend communication.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Types
export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'customer' | 'employee' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface Employee {
  id: number;
  user_id: number;
  employee_id: string;
  location: string;
  specialties: string[];
  rating: number;
  total_services: number;
  status: 'active' | 'off-duty' | 'suspended';
  hired_at: string;
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
  is_active: boolean;
}

export interface Appointment {
  id: number;
  user_id: number;
  vehicle_id: number;
  service_id: number;
  partner_id?: number;
  appointment_date: string;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
  total_amount?: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  vehicle?: Vehicle;
  service?: Service;
  customer?: { id: number; name: string; phone: string };
}

export interface Assignment {
  id: number;
  appointment_id: number;
  employee_id: number;
  status: 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  appointment?: Appointment;
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

      const data = await response.json();

      // Handle token expiration
      if (response.status === 401) {
        // Try to refresh token
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
          Authorization: `Bearer ${this.refreshToken}`,
        },
      });

      const data = await response.json();

      if (data.success && data.data?.access_token) {
        this.setTokens(data.data.access_token);
        return true;
      }

      return false;
    } catch {
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

  async register(userData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
  }): Promise<ApiResponse<{ user: User }>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
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
  // EMPLOYEE PORTAL ENDPOINTS
  // ============================================================

  async getEmployeeDashboard(): Promise<ApiResponse<{
    employee: Employee;
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

  async getMyAssignments(status?: string): Promise<ApiResponse<{ assignments: Assignment[] }>> {
    const query = status ? `?status=${status}` : '';
    return this.request(`/employees/assignments${query}`);
  }

  async updateAssignmentStatus(
    id: number,
    status: string,
    notes?: string
  ): Promise<ApiResponse<{ assignment: Assignment }>> {
    return this.request(`/employees/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }

  async getMySchedule(startDate?: string, endDate?: string): Promise<ApiResponse<{
    schedule: Record<string, any[]>;
    employee: Employee;
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

  // Employee Management
  async getEmployees(status?: string, location?: string, search?: string): Promise<ApiResponse<{
    employees: Array<User & { employee: Employee }>;
  }>> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (location) params.append('location', location);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/employees/admin/employees${query}`);
  }

  async registerEmployee(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    location: string;
    specialties?: string[];
  }): Promise<ApiResponse<{ user: User; employee_id: string }>> {
    return this.request('/employees/admin/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployee(id: number, data: Partial<User & Employee>): Promise<ApiResponse<{ user: User }>> {
    return this.request(`/employees/admin/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateEmployeeStatus(id: number, status: string): Promise<ApiResponse<{ status: string }>> {
    return this.request(`/employees/admin/employees/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
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
}

// Export singleton instance
export const api = new ApiService();

// Export class for testing
export { ApiService };