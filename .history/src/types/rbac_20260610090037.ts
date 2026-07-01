
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
