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
          // Only log if it's not an expected 401 during auth initialization
          const isAuthError = error instanceof Response && error.status === 401;
          if (!isAuthError) {
            console.error('Failed to load permissions from backend:', error);
          }
          // Fail closed. Previously this branch rebuilt permissions from
          // `localStorage.user`, which the user (or any XSS) can edit - so a
          // failed API call silently promoted the caller to whatever role the
          // stored blob claimed. Authorization state now comes only from the
          // server; a failure means "no permissions".
          setUserPermissions(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPermissions();

    const handleLogout = () => {
      if (!cancelled) {
        setUserPermissions(null);
        setIsLoading(false);
      }
    };

    window.addEventListener('auth:logout', handleLogout);

    return () => {
      cancelled = true;
      window.removeEventListener('auth:logout', handleLogout);
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
      // Only log if it's not an expected 401
      const isAuthError = error instanceof Response && error.status === 401;
      if (!isAuthError) {
        console.error('Failed to refresh permissions:', error);
      }
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
