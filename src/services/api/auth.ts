import { apiClient } from './client';
import type {
  User,
  RegisterData,
  LoginResponse,
  ApiResponse,
} from './types';

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.request<LoginResponse['data']>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      apiClient.setTokens(response.data.access_token, response.data.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response as LoginResponse;
  },

  async adminLogin(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.request<LoginResponse['data']>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      apiClient.setTokens(response.data.access_token, response.data.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response as LoginResponse;
  },

  async register(userData: RegisterData): Promise<LoginResponse> {
    const response = await apiClient.request<LoginResponse['data']>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success && response.data && response.data.access_token) {
      apiClient.setTokens(response.data.access_token, response.data.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response as LoginResponse;
  },

  async employeeLogin(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.request<LoginResponse['data']>('/auth/employee/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      apiClient.setTokens(response.data.access_token, response.data.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response as LoginResponse;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    apiClient.clearTokens();
  },

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return apiClient.request('/auth/profile');
  },

  async updateProfile(data: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    return apiClient.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{}>> {
    return apiClient.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  },

  async verifyToken(): Promise<ApiResponse<{ user: User }>> {
    return apiClient.request('/auth/verify-token');
  },

  async getPendingEmployees(): Promise<ApiResponse<{
    pending_employees: Array<{ user: User; employee: import('./types').EmployeeProfile }>;
    count: number;
  }>> {
    return apiClient.request('/auth/admin/pending-employees');
  },

  async approveEmployee(userId: number, action: 'approve' | 'reject'): Promise<ApiResponse<{ user: User; employee: import('./types').EmployeeProfile }>> {
    return apiClient.request(`/auth/admin/approve-employee/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  async createAdmin(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<ApiResponse<{ admin: User }>> {
    return apiClient.request('/auth/admin/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
