import { apiClient } from './client';
import type {
  User,
  RegisterData,
  LoginResponse,
  ApiResponse,
  ProfileUpdate,
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
    const hasDocuments = userData.documents && userData.documents.length > 0;

    if (hasDocuments) {
      // Send multipart/form-data so file uploads are included.
      const formData = new FormData();
      formData.append('name', userData.name);
      formData.append('email', userData.email);
      formData.append('password', userData.password);
      formData.append('role', userData.role);
      if (userData.phone) formData.append('phone', userData.phone);
      if (userData.address) formData.append('address', userData.address);
      if (userData.location) formData.append('location', userData.location);
      if (userData.specialties && userData.specialties.length) {
        formData.append('specialties', userData.specialties.join(','));
      }
      (userData.documents || []).forEach((file) => {
        formData.append('onboarding_documents', file);
      });

      const response = await apiClient.request<LoginResponse['data']>('/auth/register', {
        method: 'POST',
        body: formData,
      });

      if (response.success && response.data && response.data.access_token) {
        apiClient.setTokens(response.data.access_token, response.data.refresh_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response as LoginResponse;
    }

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
      // Send the refresh token so the server can revoke *this* session rather
      // than only the short-lived access token.
      await apiClient.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: apiClient.getRefreshToken() }),
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    apiClient.clearTokens();
  },

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return apiClient.request('/auth/profile');
  },

  /**
   * Profile updates accept display fields only. Credential changes must carry
   * the current password and go through the dedicated helpers below - the API
   * rejects `email`/`password` in a profile update without it.
   */
  async updateProfile(data: ProfileUpdate): Promise<ApiResponse<{ user: User }>> {
    return apiClient.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Change the account email or password. Requires the current password; the
   * server revokes all existing sessions on success, so the caller must sign in
   * again.
   */
  async updateCredentials(data: {
    current_password: string;
    email?: string;
    password?: string;
  }): Promise<ApiResponse<{ user: User; reauthenticate: boolean }>> {
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

  async resetOwnPassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{}>> {
    return apiClient.request('/auth/profile/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  },

  async adminResetPassword(userId: number, newPassword: string, sendEmail = false): Promise<ApiResponse<{ user: User }>> {
    return apiClient.request(`/auth/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({
        new_password: newPassword,
        send_email: sendEmail,
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
