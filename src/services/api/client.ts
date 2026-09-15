import { API_BASE_URL, ApiResponse } from './types';

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;
const RATE_LIMIT_DELAY_MS = 3000;
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
    return this._requestWithRetry(endpoint, options, 0);
  }

  private async _requestWithRetry<T>(
    endpoint: string,
    options: RequestInit,
    retryCount: number
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (error: any) {
      clearTimeout(timeout);
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
        return this._requestWithRetry(endpoint, options, retryCount);
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

    if (response.status === 429 && retryCount < MAX_RETRIES && this.token) {
      const retryAfter = response.headers.get('Retry-After');
      const baseDelay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : RATE_LIMIT_DELAY_MS * Math.pow(2, retryCount);
      const jitter = Math.random() * 0.5 + 0.5;
      const delay = Math.max(baseDelay * jitter, 1000);

      await new Promise(resolve => setTimeout(resolve, delay));
      return this._requestWithRetry(endpoint, options, retryCount + 1);
    }

    if (!response.ok) {
      return {
        success: false,
        message: data.message || data.error || `HTTP ${response.status}`,
        error: String(response.status),
      };
    }

    return data;
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
