import { API_BASE_URL, ApiResponse } from './types';

const DEFAULT_TIMEOUT_MS = 30000;
const AUTH_ENDPOINTS = new Set([
  '/auth/refresh',
  '/auth/login',
  '/auth/admin/login',
  '/auth/employee/login',
  '/auth/register',
]);

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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      const text = await response.text();
      let data: any = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          return {
            success: false,
            message: `Unexpected response (${response.status}) from server.`,
            error: text.slice(0, 200),
          };
        }
      }

      const isAuthEndpoint = AUTH_ENDPOINTS.has(endpoint);
      const shouldRetry =
        response.status === 401 && !isAuthEndpoint && !!this.refreshToken;

      if (shouldRetry) {
        const refreshed = await this.refreshAccessToken();

        if (refreshed) {
          return this.request<T>(endpoint, options);
        } else {
          this.clearTokens();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:logout'));
          }
          return {
            success: false,
            message: 'Session expired. Please log in again.',
            error: 'unauthorized',
          };
        }
      }

      return data;
    } catch (error: any) {
      const isAbort = error?.name === 'AbortError';
      console.error(`API request failed for ${endpoint}:`, error);
      return {
        success: false,
        message: isAbort
          ? 'Request timed out. Please try again.'
          : 'Network error. Please check your connection.',
        error: String(error),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.refreshToken}`,
        },
        body: JSON.stringify({
          refresh_token: this.refreshToken,
        }),
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (data.success && data.data?.access_token) {
        this.setTokens(data.data.access_token, data.data.refresh_token);
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
