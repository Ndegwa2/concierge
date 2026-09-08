import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, apiClient } from '../services/api';
import type { User } from '../services/api';

interface SignUpData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userType: 'customer' | 'employee' | 'admin' | 'super_admin' | null;
  login: (email: string, password: string, userType?: 'customer' | 'employee' | 'admin') => Promise<{ success: boolean; message: string }>;
  signup: (data: SignUpData) => Promise<{ success: boolean; message: string; user?: User }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      if (apiClient.isAuthenticated()) {
        try {
          const response = await authApi.getProfile();
          if (response.success && response.data) {
            setUser(response.data.user);
          } else {
            apiClient.clearTokens();
          }
        } catch (error) {
          console.error('Failed to fetch profile:', error);
          apiClient.clearTokens();
        }
      }
      setIsLoading(false);
    };
    initAuth();

    const onForcedLogout = () => {
      queryClient.clear();
      setUser(null);
    };
    window.addEventListener('auth:logout', onForcedLogout);

    // Global appointment status change listener - invalidates relevant caches
    const onAppointmentStatusChange = () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'appointments'] });
    };
    window.addEventListener('appointment:status-changed', onAppointmentStatusChange);

    return () => {
      window.removeEventListener('auth:logout', onForcedLogout);
      window.removeEventListener('appointment:status-changed', onAppointmentStatusChange);
    };
  }, [queryClient]);

  // Whenever the active user id changes (login, logout, account-switch),
  // wipe all user-scoped React Query cache. This is defense-in-depth on
  // top of the per-user query keys in `useApi.ts`.
  const activeUserId = user?.id ?? null;
  const prevUserIdRef = React.useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (prevUserIdRef.current === undefined) {
      prevUserIdRef.current = activeUserId;
      return;
    }
    if (prevUserIdRef.current !== activeUserId) {
      queryClient.clear();
      prevUserIdRef.current = activeUserId;
    }
  }, [activeUserId, queryClient]);

  const login = useCallback(async (email: string, password: string, userType: 'customer' | 'employee' | 'admin' = 'customer') => {
    setIsLoading(true);
    try {
      let response;
      
      // using appropriate login endpoint based on user type
      if (userType === 'admin') {
        response = await authApi.adminLogin(email, password);
      } else if (userType === 'employee') {
        response = await authApi.employeeLogin(email, password);
      } else {
        response = await authApi.login(email, password);
      }
      
      if (response.success && response.data) {
        setUser(response.data.user);
        return { success: true, message: response.message };
      }
      
      return { success: false, message: response.message || 'Login failed' };
    } catch (error) {
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (data: SignUpData) => {
    setIsLoading(true);
    try {
      const response = await authApi.register(data);

      if (response.success && response.data) {
        setUser(response.data.user);
        return { success: true, message: response.message || 'Registration successful', user: response.data.user };
      }

      return { success: false, message: response.message || 'Registration failed' };
    } catch (error) {
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!apiClient.isAuthenticated()) return;

    try {
      const response = await authApi.getProfile();
      if (response.success && response.data) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      const response = await authApi.changePassword(currentPassword, newPassword);
      return { success: response.success, message: response.message || 'Password changed successfully' };
    } catch (error) {
      return { success: false, message: 'Network error. Please try again.' };
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    userType: (user?.role === 'customer' || user?.role === 'employee' || user?.role === 'admin' || user?.role === 'super_admin')
      ? user.role
      : null,
    login,
    signup,
    logout,
    refreshProfile,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook to check if user has required role
 */
export function useRequireRole(allowedRoles: ('customer' | 'employee' | 'admin')[]) {
  const { user, isAuthenticated } = useAuth();

  const hasRole = !!user && (allowedRoles as string[]).includes(user.role);

  return {
    hasAccess: isAuthenticated && hasRole,
    user,
    isDenied: isAuthenticated && !hasRole,
  };
}

export { AuthContext };