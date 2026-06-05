/**
 * Authentication Context for AutoConcierge
 *
 * Provides authentication state and methods throughout the application.
 * Supports JWT authentication with role-based access control.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
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
  userType: 'customer' | 'employee' | 'admin' | null;
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

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      if (api.isAuthenticated()) {
        try {
          const response = await api.getProfile();
          if (response.success && response.data) {
            setUser(response.data.user);
          } else {
            // Token invalid, clear it
            api.clearTokens();
          }
        } catch (error) {
          console.error('Failed to fetch profile:', error);
          api.clearTokens();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string, userType: 'customer' | 'employee' | 'admin' = 'customer') => {
    setIsLoading(true);
    try {
      let response;
      
      // Use appropriate login endpoint based on user type
      if (userType === 'admin') {
        response = await api.adminLogin(email, password);
      } else if (userType === 'employee') {
        response = await api.employeeLogin(email, password);
      } else {
        response = await api.login(email, password);
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
      const response = await api.register(data);
      
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
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!api.isAuthenticated()) return;
    
    try {
      const response = await api.getProfile();
      if (response.success && response.data) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      const response = await api.changePassword(currentPassword, newPassword);
      return { success: response.success, message: response.message || 'Password changed successfully' };
    } catch (error) {
      return { success: false, message: 'Network error. Please try again.' };
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    userType: user?.role ?? null,
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
  
  const hasRole = user && allowedRoles.includes(user.role);
  
  return {
    hasAccess: isAuthenticated && hasRole,
    user,
    isDenied: isAuthenticated && !hasRole,
  };
}

export { AuthContext };