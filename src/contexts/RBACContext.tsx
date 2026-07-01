import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { UserPermissions, RBACContextType, PermissionMap } from '@/types/rbac';

export const RBACContext = createContext<RBACContextType | undefined>(undefined);

interface RBACProviderProps {
  children: ReactNode;
}

export function RBACProvider({ children }: RBACProviderProps) {
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user data
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        // Map simple user data to UserPermissions structure
        const permissions: PermissionMap = {
          users: [],
          billing: [],
          system_settings: [],
          logs: []
        };
        
        // Map role to permissions
        switch (userData.role) {
          case 'super_admin':
          case 'admin':
            permissions.users = ['create', 'read', 'update', 'delete'];
            permissions.billing = ['read', 'create', 'update'];
            permissions.system_settings = ['read', 'update'];
            permissions.logs = ['read', 'export'];
            break;
          case 'manager':
            permissions.users = ['read', 'update'];
            permissions.billing = ['read'];
            permissions.system_settings = [];
            permissions.logs = ['read'];
            break;
          case 'employee':
            permissions.users = ['read'];
            permissions.billing = [];
            permissions.system_settings = [];
            permissions.logs = ['read'];
            break;
          default:
            break;
        }
        
        setUserPermissions({
          user_id: userData.id || '',
          role: userData.role || '',
          permissions
        });
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    setIsLoading(false);
  }, []);

  const hasPermission = useCallback((resource: string, action: string): boolean => {
    if (!userPermissions) return false;
    return !!userPermissions.permissions[resource]?.includes(action);
  }, [userPermissions]);

  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);
    // In a real implementation, this would fetch from the API
    // For now, just reload from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        const permissions: PermissionMap = {
          users: [],
          billing: [],
          system_settings: [],
          logs: []
        };
        
        switch (userData.role) {
          case 'super_admin':
          case 'admin':
            permissions.users = ['create', 'read', 'update', 'delete'];
            permissions.billing = ['read', 'create', 'update'];
            permissions.system_settings = ['read', 'update'];
            permissions.logs = ['read', 'export'];
            break;
          case 'manager':
            permissions.users = ['read', 'update'];
            permissions.billing = ['read'];
            permissions.system_settings = [];
            permissions.logs = ['read'];
            break;
          case 'employee':
            permissions.users = ['read'];
            permissions.billing = [];
            permissions.system_settings = [];
            permissions.logs = ['read'];
            break;
          default:
            break;
        }
        
        setUserPermissions({
          user_id: userData.id || '',
          role: userData.role || '',
          permissions
        });
      } catch (e) {
        console.error('Failed to refresh permissions:', e);
      }
    }
    setIsLoading(false);
  }, []);

  const value: RBACContextType = {
    userPermissions,
    isLoading,
    hasPermission,
    refreshPermissions
  };

  return (
    <RBACContext.Provider value={value}>
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC(): RBACContextType {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
}
