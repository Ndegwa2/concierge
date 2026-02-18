/**
 * React Query Hooks for AutoConcierge API
 * 
 * This module provides React Query hooks for all API operations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { User, Service, Vehicle, Appointment, Assignment, ServicePartner, Employee } from '../services/api';

// Query Keys
export const queryKeys = {
  services: ['services'] as const,
  service: (id: number) => ['services', id] as const,
  appointments: ['appointments'] as const,
  appointment: (id: number) => ['appointments', id] as const,
  vehicles: ['vehicles'] as const,
  vehicle: (id: number) => ['vehicles', id] as const,
  employees: ['employees'] as const,
  employee: (id: number) => ['employees', id] as const,
  partners: ['partners'] as const,
  partner: (id: number) => ['partners', id] as const,
  profile: ['profile'] as const,
  dashboard: ['dashboard'] as const,
  assignments: ['assignments'] as const,
  schedule: ['schedule'] as const,
};

// ============================================================
// AUTH HOOKS
// ============================================================

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onSuccess: (data) => {
      if (data.success && data.data) {
        queryClient.setQueryData(queryKeys.profile, data.data.user);
      }
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: api.register.bind(api),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.logout(),
    onSettled: () => {
      queryClient.clear();
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      if (!api.isAuthenticated()) return null;
      const response = await api.getProfile();
      return response.success ? response.data?.user ?? null : null;
    },
    enabled: api.isAuthenticated(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.updateProfile.bind(api),
    onSuccess: (data) => {
      if (data.success && data.data) {
        queryClient.setQueryData(queryKeys.profile, data.data.user);
      }
    },
  });
}

// ============================================================
// SERVICES HOOKS
// ============================================================

export function useServices() {
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: async () => {
      const response = await api.getServices();
      return response.success ? response.data?.services ?? [] : [];
    },
  });
}

export function useService(id: number) {
  return useQuery({
    queryKey: queryKeys.service(id),
    queryFn: async () => {
      const response = await api.getService(id);
      return response.success ? response.data?.service ?? null : null;
    },
    enabled: !!id,
  });
}

// ============================================================
// VEHICLES HOOKS
// ============================================================

export function useVehicles() {
  return useQuery({
    queryKey: queryKeys.vehicles,
    queryFn: async () => {
      if (!api.isAuthenticated()) return [];
      const response = await api.getVehicles();
      return response.success ? response.data?.vehicles ?? [] : [];
    },
    enabled: api.isAuthenticated(),
  });
}

export function useVehicle(id: number) {
  return useQuery({
    queryKey: queryKeys.vehicle(id),
    queryFn: async () => {
      const response = await api.getVehicle(id);
      return response.success ? response.data?.vehicle ?? null : null;
    },
    enabled: !!id && api.isAuthenticated(),
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createVehicle.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Vehicle> }) =>
      api.updateVehicle(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicle(id) });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteVehicle.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles });
    },
  });
}

// ============================================================
// APPOINTMENTS HOOKS
// ============================================================

export function useAppointments(status?: string) {
  return useQuery({
    queryKey: [...queryKeys.appointments, status],
    queryFn: async () => {
      if (!api.isAuthenticated()) return [];
      const response = await api.getAppointments(status);
      return response.success ? response.data?.appointments ?? [] : [];
    },
    enabled: api.isAuthenticated(),
  });
}

export function useAppointment(id: number) {
  return useQuery({
    queryKey: queryKeys.appointment(id),
    queryFn: async () => {
      const response = await api.getAppointment(id);
      return response.success ? response.data?.appointment ?? null : null;
    },
    enabled: !!id && api.isAuthenticated(),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createAppointment.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Appointment> }) =>
      api.updateAppointment(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment(id) });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.cancelAppointment.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
    },
  });
}

// ============================================================
// EMPLOYEE PORTAL HOOKS
// ============================================================

export function useEmployeeDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const response = await api.getEmployeeDashboard();
      return response.success ? response.data : null;
    },
    enabled: api.isAuthenticated(),
  });
}

export function useMyAssignments(status?: string) {
  return useQuery({
    queryKey: [...queryKeys.assignments, status],
    queryFn: async () => {
      const response = await api.getMyAssignments(status);
      return response.success ? response.data?.assignments ?? [] : [];
    },
    enabled: api.isAuthenticated(),
  });
}

export function useUpdateAssignmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: string; notes?: string }) =>
      api.updateAssignmentStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useMySchedule(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [...queryKeys.schedule, startDate, endDate],
    queryFn: async () => {
      const response = await api.getMySchedule(startDate, endDate);
      return response.success ? response.data : null;
    },
    enabled: api.isAuthenticated(),
  });
}

export function useEmployeeProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const response = await api.getEmployeeProfile();
      return response.success ? response.data?.user ?? null : null;
    },
    enabled: api.isAuthenticated(),
  });
}

export function useUpdateEmployeeProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.updateEmployeeProfile.bind(api),
    onSuccess: (data) => {
      if (data.success && data.data) {
        queryClient.setQueryData(queryKeys.profile, data.data.user);
      }
    },
  });
}

// ============================================================
// ADMIN HOOKS
// ============================================================

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const response = await api.getAdminDashboard();
      return response.success ? response.data : null;
    },
    enabled: api.isAuthenticated(),
  });
}

export function useAllUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.getAllUsers();
      return response.success ? response.data?.users ?? [] : [];
    },
    enabled: api.isAuthenticated(),
  });
}

// Employee Management
export function useEmployees(status?: string, location?: string, search?: string) {
  return useQuery({
    queryKey: [...queryKeys.employees, status, location, search],
    queryFn: async () => {
      const response = await api.getEmployees(status, location, search);
      return response.success ? response.data?.employees ?? [] : [];
    },
    enabled: api.isAuthenticated(),
  });
}

export function useRegisterEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.registerEmployee.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User & Employee> }) =>
      api.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    },
  });
}

export function useUpdateEmployeeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.updateEmployeeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    },
  });
}

export function useAssignEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      employeeId,
      notes,
    }: {
      appointmentId: number;
      employeeId: number;
      notes?: string;
    }) => api.assignEmployeeToAppointment(appointmentId, employeeId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments });
    },
  });
}

// Service Partners
export function useServicePartners(service?: string, location?: string) {
  return useQuery({
    queryKey: [...queryKeys.partners, service, location],
    queryFn: async () => {
      const response = await api.getServicePartners(service, location);
      return response.success ? response.data?.partners ?? [] : [];
    },
    enabled: api.isAuthenticated(),
  });
}

export function useCreateServicePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createServicePartner.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners });
    },
  });
}

export function useUpdateServicePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ServicePartner> }) =>
      api.updateServicePartner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners });
    },
  });
}

export function useDeactivateServicePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deactivateServicePartner.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners });
    },
  });
}