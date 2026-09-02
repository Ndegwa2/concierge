import { API_BASE_URL, ApiResponse } from './types';

class ApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  setTokens(accessToken: string, refreshToken?: string) {
    this.token = accessToken;
    localStorage.setItem('auth_token', accessToken);

    if (refreshToken) {
      this.refreshToken = refreshToken;
      localStorage.setItem('refresh_token', refreshToken);
    }
  }

  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

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

      const method = (options.method || 'GET').toUpperCase();
      const isRefreshEndpoint = endpoint === '/auth/refresh';
      if ((response.status === 401 || response.status === 422) && !isRefreshEndpoint) {
        const refreshed = await this.refreshAccessToken();

        if (refreshed) {
          return this.request<T>(endpoint, options);
        } else {
          this.clearTokens();
          window.location.href = '/';
        }
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        error: String(error),
      };
    }
  }

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
}

export const apiClient = new ApiClient();

export { ApiClient };
