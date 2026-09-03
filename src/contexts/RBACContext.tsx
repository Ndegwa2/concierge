import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { apiClient } from '../services/api';
import { UserPermissions, RBACContextType, PermissionMap } from '@/types/rbac';

export const RBACContext = createContext<RBACContextType | undefined>(undefined);

interface RBACProviderProps {
  children: ReactNode;
}

function mapRoleToPermissions(role: string): PermissionMap {
  const permissions: PermissionMap = {
    users: [],
    employees: [],
    billing: [],
    system_settings: [],
    logs: []
  };

  switch (role) {
    case 'super_admin':
    case 'admin':
      permissions.users = ['create', 'read', 'update', 'delete'];
      permissions.employees = ['create', 'read', 'update', 'delete', 'manage_compensation', 'upload_documents'];
      permissions.billing = ['read', 'create', 'update'];
      permissions.system_settings = ['read', 'update'];
      permissions.logs = ['read', 'export'];
      break;
    case 'manager':
      permissions.users = ['read', 'update'];
      permissions.employees = ['read', 'update', 'upload_documents'];
      permissions.billing = ['read'];
      permissions.system_settings = [];
      permissions.logs = ['read'];
      break;
    case 'employee':
      permissions.users = ['read'];
      permissions.employees = ['read', 'update_own_profile'];
      permissions.billing = [];
      permissions.system_settings = [];
      permissions.logs = ['read'];
      break;
    default:
      break;
  }

  return permissions;
}

export function RBACProvider({ children }: RBACProviderProps) {
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPermissions() {
      if (!apiClient.isAuthenticated()) {
        if (!cancelled) {
          setUserPermissions(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await apiClient.request('/auth/profile');
        if (cancelled) return;

        if (response.success && response.data?.user) {
          const user = response.data.user;
          const permissions = mapRoleToPermissions(user.role);

          setUserPermissions({
            user_id: String(user.id ?? ''),
            role: user.role || '',
            permissions,
          });

          localStorage.setItem('user', JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }));
        } else {
          setUserPermissions(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load permissions from backend:', error);
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              const permissions = mapRoleToPermissions(userData.role);
              setUserPermissions({
                user_id: String(userData.id || ''),
                role: userData.role || '',
                permissions,
              });
            } catch (e) {
              console.error('Failed to parse stored user:', e);
            }
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasPermission = useCallback((resource: string, action: string): boolean => {
    if (!userPermissions) return false;
    return !!userPermissions.permissions[resource]?.includes(action);
  }, [userPermissions]);

  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.request('/auth/profile');
      if (response.success && response.data?.user) {
        const user = response.data.user;
        const permissions = mapRoleToPermissions(user.role);
        setUserPermissions({
          user_id: String(user.id ?? ''),
          role: user.role || '',
          permissions,
        });
      }
    } catch (error) {
      console.error('Failed to refresh permissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: RBACContextType = {
    userPermissions,
    isLoading,
    hasPermission,
    refreshPermissions,
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
