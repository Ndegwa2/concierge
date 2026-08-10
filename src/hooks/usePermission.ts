import { useContext } from 'react';
import { RBACContext } from '@/contexts/RBACContext';

export function usePermission() {
  const context = useContext(RBACContext);
  
  if (!context) {
    throw new Error('usePermission must be used within a RBACProvider');
  }
  
  const { hasPermission, isLoading, userPermissions } = context;
  
  const isAdmin = userPermissions?.role === 'super_admin' || userPermissions?.role === 'admin';
  const isManager = userPermissions?.role === 'manager';
  const isHR = isAdmin || isManager;
  const canManageEmployees = hasPermission('employees', 'create') || hasPermission('employees', 'update') || hasPermission('employees', 'delete');
  const canEditCompensation = hasPermission('employees', 'manage_compensation');
  const canUploadDocuments = hasPermission('employees', 'upload_documents');
  
  return {
    hasPermission,
    isLoading,
    userPermissions,
    isAuthenticated: !!userPermissions?.user_id,
    isAdmin,
    isManager,
    isHR,
    canManageEmployees,
    canEditCompensation,
    canUploadDocuments,
  };
}
