
/**
 * Authentication Context for AutoConcierge
 * 
 * Provides authentication state and methods throughout the application.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { User } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userType: 'customer' | 'employee' | 'admin' | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.login(email, password);
      
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

  const logout = useCallback(async () => {
    setIsLoading(true);
