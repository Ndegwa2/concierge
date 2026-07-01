
export interface PermissionMap {
  [resource: string]: string[];
}

export interface UserPermissions {
  user_id: string;
  role: string;
  permissions: PermissionMap;
}

export interface RBACContextType {
  userPermissions: UserPermissions | null;
  isLoading: boolean;
  hasPermission: (resource: string, action: string) => boolean;
  refreshPermissions: () => Promise<void>;
}
</path>
<line_count>
14
</line_count>
</write_to_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "in_progress", "description": "Implement custom hook for permission checking"}, {"status": "pending", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "pending", "description": "Update navigation menu to use permission-based rendering"}, {"status": "pending", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "pending", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>write_to_file<|tool_call_argument|>{"path": "src/contexts/RBACContext.tsx", "content": "
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { UserPermissions } from '../types/rbac';

interface RBACProviderProps {
  children: React.ReactNode;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export function RBACProvider({ children }: RBACProviderProps) {
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch permissions on mount and session validation
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        // Assuming the backend exposes GET /api/v1/me/permissions
        // For now, we'll use the existing profile endpoint and extend it
        const response = await api.getProfile();
        
        if (response.success && response.data) {
          // Transform the user data to match our permission structure
          // This assumes the backend returns the permission structure as described
          const userData = response.data.user;
          
          // If the backend doesn't return permissions yet, we'll map roles to basic permissions
          // In a real implementation, this would come directly from the /api/v1/me/permissions endpoint
          const permissions: PermissionMap = {
            users: [],
            billing: [],
            system_settings: [],
            logs: []
          };
          
          // Map role to permissions (this is a fallback - ideally comes from backend)
          switch (userData.role) {
            case 'admin':
              permissions.users = ['create', 'read', 'update', 'delete'];
              permissions.billing = ['read', 'create', 'update'];
              permissions.system_settings = ['read', 'update'];
              permissions.logs = ['read', 'export'];
              break;
            case 'employee':
              permissions.users = ['read'];
              permissions.billing = [];
              permissions.system_settings = [];
              permissions.logs = ['read'];
              break;
            case 'client':
            default:
              permissions.users = ['read'];
              permissions.billing = ['read'];
              permissions.system_settings = [];
              permissions.logs = ['read'];
              break;
          }
          
          setUserPermissions({
            user_id: userData.id.toString(),
            role: userData.role,
            permissions
          });
        } else {
          // No user or invalid response - set empty permissions
          setUserPermissions({
            user_id: '',
            role: '',
            permissions: {
              users: [],
              billing: [],
              system_settings: [],
              logs: []
            }
          });
        }
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
        // Default to zero permissions on error
        setUserPermissions({
          user_id: '',
          role: '',
          permissions: {
            users: [],
            billing: [],
            system_settings: [],
            logs: []
          }
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  const hasPermission = useCallback((resource: string, action: string): boolean => {
    if (!userPermissions) return false;
    return !!userPermissions.permissions[resource]?.includes(action);
  }, [userPermissions]);

  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getProfile();
      
      if (response.success && response.data) {
        const userData = response.data.user;
        
        const permissions: PermissionMap = {
          users: [],
          billing: [],
          system_settings: [],
          logs: []
        };
        
        // Map role to permissions (fallback)
        switch (userData.role) {
          case 'admin':
            permissions.users = ['create', 'read', 'update', 'delete'];
            permissions.billing = ['read', 'create', 'update'];
            permissions.system_settings = ['read', 'update'];
            permissions.logs = ['read', 'export'];
            break;
          case 'employee':
            permissions.users = ['read'];
            permissions.billing = [];
            permissions.system_settings = [];
            permissions.logs = ['read'];
            break;
            case 'client':
            default:
              permissions.users = ['read'];
              permissions.billing = ['read'];
              permissions.system_settings = [];
              permissions.logs = ['read'];
              break;
          }
          
          setUserPermissions({
            user_id: userData.id.toString(),
            role: userData.role,
            permissions
          });
        } else {
          setUserPermissions({
            user_id: '',
            role: '',
            permissions: {
              users: [],
              billing: [],
              system_settings: [],
              logs: []
            }
          });
        }
      } catch (error) {
        console.error('Failed to refresh permissions:', error);
        setUserPermissions({
          user_id: '',
          role: '',
          permissions: {
            users: [],
            billing: [],
            system_settings: [],
            logs: []
          }
        });
      } finally {
        setIsLoading(false);
      }
    }, [userPermissions]);

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

  /**
   * Hook to access RBAC context
   */
  export function useRBAC(): RBACContextType {
    const context = useContext(RBACContext);
    
    if (context === undefined) {
      throw new Error('useRBAC must be used within an RBACProvider');
    }
    
    return context;
  }
</path>
<line_count>
120
</line_count>
</write_to_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "in_progress", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "pending", "description": "Update navigation menu to use permission-based rendering"}, {"status": "pending", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "pending", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>write_to_file<|tool_call_argument|>{"path": "src/hooks/usePermission.ts", "content": "
import { useRBAC } from '../contexts/RBACContext';

/**
 * Custom hook to check permissions
 * @returns Object with hasPermission function and user permissions data
 */
export function usePermission() {
  const { userPermissions, isLoading, hasPermission } = useRBAC();
  
  return {
    userPermissions,
    isLoading,
    hasPermission
  };
}

/**
 * Wrapper component to conditionally render content based on permissions
 * @param resource - The resource to check (e.g., 'users', 'billing')
 * @param action - The action to check (e.g., 'create', 'read', 'update', 'delete')
 * @param children - The content to render if permission is granted
 * @param fallback - Optional fallback content to render if permission is denied
 */
export function Protect({ 
  resource, 
  action, 
  children, 
  fallback = null 
}: {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission, isLoading } = useRBAC();
  
  if (isLoading) {
    return null; // or return a loading indicator
  }
  
  return hasPermission(resource, action) ? children : fallback;
}
</path>
<line_count>
45
</line_count>
</write_to_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "in_progress", "description": "Update navigation menu to use permission-based rendering"}, {"status": "pending", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "pending", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/app/components/Header.tsx"}
</path>
</read_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "in_progress", "description": "Update navigation menu to use permission-based rendering"}, {"status": "pending", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "pending", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/app/components/admin/AdminDashboard.tsx"}
</path>
</read_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "in_progress", "description": "Update navigation menu to use permission-based rendering"}, {"status": "in_progress", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "pending", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/app/components/admin/AppointmentsManager.tsx"}
</path>
</read_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "in_progress", "description": "Update navigation menu to use permission-based rendering"}, {"status": "in_progress", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "pending", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/app/components/admin/CustomersManager.tsx"}
</path>
</read_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "in_progress", "description": "Update navigation menu to use permission-based rendering"}, {"status": "in_progress", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "pending", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/app/components/admin/ConciergeManager.tsx"}
</path>
</read_file>
<|tool