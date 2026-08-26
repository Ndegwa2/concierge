/**
 * API Service Layer for AutoConcierge
 *
 * This module re-exports from domain-specific API clients for backward compatibility.
 * New code should import directly from domain modules:
 *   import { authApi } from '@/services/api/auth';
 *   import { fleetsApi } from '@/services/api/fleets';
 */

export { apiClient as api, authApi, appointmentsApi, vehiclesApi, employeesApi, fleetsApi, notificationsApi, partnersApi, servicesApi, adminApi, aiChatApi } from './index';
export * from './types';
