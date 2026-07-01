import { useContext } from 'react';
import { RBACContext } from '@/contexts/RBACContext';

export function usePermission() {
  const context = useContext(RBACContext);
  
  if (!context) {
    throw new Error('usePermission must be used within a RBACProvider');
  }
  
  const { hasPermission, isLoading, userPermissions } = context;
  
  return {
    hasPermission,
    isLoading,
    userPermissions,
    isAuthenticated: !!userPermissions?.user_id,
  };
}
