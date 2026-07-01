export type Role = 'super_admin' | 'admin' | 'manager' | 'employee';

export type Permission = 
  | 'view_dashboard'
  | 'view_appointments'
  | 'manage_appointments'
  | 'view_customers'
  | 'manage_customers'
  | 'view_employees'
  | 'manage_employee_schedule'
  | 'view_own_schedule'
  | 'update_own_profile'
  | 'view_assigned_tasks'
  | 'update_task_status'
  | 'manage_system';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

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