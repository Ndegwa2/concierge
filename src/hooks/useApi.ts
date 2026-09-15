/**
 * React Query Hooks for AutoConcierge API
 * 
 * This module provides React Query hooks for all API operations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, employeesApi, servicesApi, vehiclesApi, appointmentsApi, adminApi, partnersApi, workflowApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import type { User, Vehicle, Appointment, ServicePartner, Employee, EmployeeAssignment, TimeOffRequest, TimeOffDecision, IssueReport, TimeLog } from '../services/api';

// Query Keys
// User-scoped keys include a `userScope` segment so React Query caches
// are partitioned per logged-in user. This prevents user A's data from
// being served to user B after a logout/login cycle within the cache TTL.
const anonScope = 'anonymous';

export const queryKeys = {
  services: ['services'] as const,
  service: (id: number) => ['services', id] as const,

  // User-scoped
  appointments: (uid: number | string) => [uid === anonScope ? 'anon' : `user-${uid}`, 'appointments'] as const,
  appointment: (uid: number | string, id: number) =>
    [uid === anonScope ? 'anon' : `user-${uid}`, 'appointments', id] as const,

  allAppointmentsAdmin: (uid: number | string) =>
    [uid === anonScope ? 'anon' : `user-${uid}`, 'admin', 'appointments'] as const,

  vehicles: (uid: number | string) => [uid === anonScope ? 'anon' : `user-${uid}`, 'vehicles'] as const,
  vehicle: (uid: number | string, id: number) =>
    [uid === anonScope ? 'anon' : `user-${uid}`, 'vehicles', id] as const,

  employees: (uid: number | string) => [uid === anonScope ? 'anon' : `user-${uid}`, 'employees'] as const,
  employee: (uid: number | string, id: number) =>
    [uid === anonScope ? 'anon' : `user-${uid}`, 'employees', id] as const,

  partners: ['partners'] as const,
  partner: (id: number) => ['partners', id] as const,

  profile: (uid: number | string) => [uid === anonScope ? 'anon' : `user-${uid}`, 'profile'] as const,
  dashboard: (uid: number | string) => [uid === anonScope ? 'anon' : `user-${uid}`, 'dashboard'] as const,
  assignments: (uid: number | string, status?: string) =>
    [uid === anonScope ? 'anon' : `user-${uid}`, 'assignments', status ?? 'all'] as const,
  schedule: (uid: number | string, start?: string, end?: string) =>
    [uid === anonScope ? 'anon' : `user-${uid}`, 'schedule', start ?? '', end ?? ''] as const,
  timeLogs: (uid: number | string) => [uid === anonScope ? 'anon' : `user-${uid}`, 'time-logs'] as const,
  timeOffRequests: (uid: number | string) =>
    [uid === anonScope ? 'anon' : `user-${uid}`, 'time-off-requests'] as const,
  issueReports: (uid: number | string) =>
    [uid === anonScope ? 'anon' : `user-${uid}`, 'issue-reports'] as const,
  workflowAssignment: (uid: number | string, id: number) =>
    [uid === anonScope ? 'anon' : `user-${uid}`, 'workflow', 'assignment', id] as const,
  workflowChecklist: (uid: number | string, id: number) =>
    [uid === anonScope ? 'anon' : `user-${uid}`, 'workflow', 'checklist', id] as const,
  workflowWorkRecord: (uid: number | string, id: number) =>
    [uid === anonScope ? 'anon' : `user-${uid}`, 'workflow', 'work-record', id] as const,
  workflowPendingVerifications: (uid: number | string) =>
    [uid === anonScope ? 'anon' : `user-${uid}`, 'workflow', 'pending-verifications'] as const,
  workflowEmployeeDashboard: (uid: number | string) =>
    [uid === anonScope ? 'anon' : `user-${uid}`, 'workflow', 'employee-dashboard'] as const,
  adminTimeOffRequests: (uid: number | string) =>
    [uid === anonScope ? 'anon' : `user-${uid}`, 'workflow', 'admin-time-off'] as const,
};

export const userScope = (userId: number | null | undefined): number | string =>
  userId == null ? anonScope : userId;

// ============================================================
// AUTH HOOKS
// ============================================================

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (data) => {
      if (data.success && data.data) {
        const scope = userScope(data.data.user.id);
        queryClient.setQueryData(queryKeys.profile(scope), data.data.user);
        queryClient.removeQueries({ queryKey: ['anon'] });
      }
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: authApi.register.bind(authApi),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
    },
  });
}

export function useProfile() {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.profile(scope),
    queryFn: async () => {
      const response = await authApi.getProfile();
      return response.success ? response.data?.user ?? null : null;
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<User>) => authApi.updateProfile(data),
    onSuccess: (data) => {
      if (data.success && data.data) {
        queryClient.setQueryData(queryKeys.profile, data.data.user);
      }
    },
  });
}

// ============================================================
// PASSWORD RESET HOOKS
// ============================================================

export function useResetOwnPassword() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => authApi.resetOwnPassword(currentPassword, newPassword),
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to reset password');
    },
  });
}

export function useAdminResetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      newPassword,
      sendEmail,
    }: {
      userId: number;
      newPassword: string;
      sendEmail?: boolean;
    }) => authApi.adminResetPassword(userId, newPassword, sendEmail),
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to reset password');
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
      const response = await servicesApi.getServices();
      return response.success ? response.data?.services ?? [] : [];
    },
  });
}

export function useService(id: number) {
  return useQuery({
    queryKey: queryKeys.service(id),
    queryFn: async () => {
      const response = await servicesApi.getService(id);
      return response.success ? response.data?.service ?? null : null;
    },
    enabled: !!id,
  });
}

// ============================================================
// VEHICLES HOOKS
// ============================================================

export function useVehicles() {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.vehicles(scope),
    queryFn: async () => {
      const response = await vehiclesApi.getVehicles();
      return response.success ? response.data?.vehicles ?? [] : [];
    },
    enabled: isAuthenticated,
  });
}

export function useVehicle(id: number) {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.vehicle(scope, id),
    queryFn: async () => {
      const response = await vehiclesApi.getVehicle(id);
      return response.success ? response.data?.vehicle ?? null : null;
    },
    enabled: !!id && isAuthenticated,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: vehiclesApi.createVehicle.bind(vehiclesApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles(scope) });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Vehicle> }) =>
      vehiclesApi.updateVehicle(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicle(scope, id) });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: vehiclesApi.deleteVehicle.bind(vehiclesApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles(scope) });
    },
  });
}

// ============================================================
// APPOINTMENTS HOOKS
// ============================================================

export function useAppointments(status?: string) {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: [...queryKeys.appointments(scope), status ?? 'all'],
    queryFn: async () => {
      const response = await appointmentsApi.getAppointments(status);
      return response.success ? response.data?.appointments ?? [] : [];
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.some((a: any) => ['scheduled', 'confirmed', 'in-progress'].includes(a.status))) {
        return 60 * 1000; // 60 seconds for active appointments
      }
      return false; // Don't poll when no active appointments
    },
  });
}

export function useAppointment(id: number) {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.appointment(scope, id),
    queryFn: async () => {
      const response = await appointmentsApi.getAppointment(id);
      return response.success ? response.data?.appointment ?? null : null;
    },
    enabled: !!id && isAuthenticated,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: appointmentsApi.createAppointment.bind(appointmentsApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allAppointmentsAdmin(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(scope) });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Appointment> }) =>
      appointmentsApi.updateAppointment(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment(scope, id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allAppointmentsAdmin(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(scope) });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: appointmentsApi.cancelAppointment.bind(appointmentsApi),
    onSuccess: (data) => {
      if (data.success && data.data?.appointment) {
        queryClient.invalidateQueries({ queryKey: queryKeys.appointment(scope, data.data.appointment.id) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allAppointmentsAdmin(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(scope) });
    },
  });
}

// ============================================================
// EMPLOYEE PORTAL HOOKS
// ============================================================

export function useEmployeeDashboard() {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.dashboard(scope),
    queryFn: async () => {
      const response = await employeesApi.getEmployeeDashboard();
      return response.success ? response.data : null;
    },
    enabled: isAuthenticated,
  });
}

export function useMyAssignments(status?: string) {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.assignments(scope, status),
    queryFn: async () => {
      const response = await employeesApi.getMyAssignments(status);
      if (!response.success) throw new Error(response.message || 'Failed to load assignments');
      return response.data?.assignments ?? [];
    },
    enabled: isAuthenticated,
  });
}

export function useUpdateAssignmentStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: string; notes?: string }) =>
      employeesApi.updateAssignmentStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(scope) });
    },
  });
}

export function useMySchedule(startDate?: string, endDate?: string) {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.schedule(scope, startDate, endDate),
    queryFn: async () => {
      const response = await employeesApi.getMySchedule(startDate, endDate);
      return response.success ? response.data : null;
    },
    enabled: isAuthenticated,
  });
}

export function useEmployeeProfile() {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.profile(scope),
    queryFn: async () => {
      const response = await employeesApi.getEmployeeProfile();
      return response.success ? response.data?.user ?? null : null;
    },
    enabled: isAuthenticated,
  });
}

export function useUpdateEmployeeProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<User>) => employeesApi.updateEmployeeProfile(data),
    onSuccess: (data) => {
      if (data.success && data.data) {
        queryClient.setQueryData(queryKeys.profile, data.data.user);
      }
    },
  });
}

// ============================================================
// EMPLOYEE TIME TRACKING HOOKS
// ============================================================

export function useTimeLogs() {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.timeLogs(scope),
    queryFn: async () => {
      const response = await employeesApi.getTimeLogs();
      return response.success ? response.data : null;
    },
    enabled: isAuthenticated,
  });
}

export function useClockInOut() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({ action, notes }: { action: 'in' | 'out'; notes?: string }) =>
      employeesApi.clockInOut({ action, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeLogs(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(scope) });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to clock in/out');
    },
  });
}

// ============================================================
// EMPLOYEE TIME-OFF HOOKS
// ============================================================

export function useTimeOffRequests() {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.timeOffRequests(scope),
    queryFn: async () => {
      const response = await employeesApi.getTimeOffRequests();
      return response.success ? response.data : null;
    },
    enabled: isAuthenticated,
  });
}

export function useRequestTimeOff() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: (data: {
      request_type: 'vacation' | 'sick' | 'personal' | 'other';
      start_date: string;
      end_date: string;
      reason?: string;
    }) => employeesApi.requestTimeOff(data),
     onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeOffRequests(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTimeOffRequests(scope) });
    },
  });
}

// ============================================================
// ADMIN TIME-OFF HOOKS
// ============================================================

export function useAdminTimeOffRequests() {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.adminTimeOffRequests(scope),
    queryFn: async () => {
      const response = await employeesApi.getPendingTimeOffRequests();
      return response.success ? response.data?.requests ?? [] : [];
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
  });
}

export function useDecideTimeOffRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: number; data: TimeOffDecision }) =>
      employeesApi.decideTimeOffRequest(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTimeOffRequests(scope) });
    },
  });
}
// ============================================================

export function useIssueReports() {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.issueReports(scope),
    queryFn: async () => {
      const response = await employeesApi.getIssueReports();
      return response.success ? response.data : null;
    },
    enabled: isAuthenticated,
  });
}

export function useReportIssue() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      appointment_id?: number;
    }) => employeesApi.reportIssue(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issueReports(scope) });
    },
  });
}

// ============================================================
// ADMIN HOOKS
// ============================================================

export function useAdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.dashboard(scope),
    queryFn: async () => {
      const response = await adminApi.getAdminDashboard();
      return response.success ? response.data : null;
    },
    enabled: isAuthenticated,
    staleTime: 15 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
  });
}

export function useAllAppointmentsAdmin(status?: string) {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: [...queryKeys.allAppointmentsAdmin(scope), status ?? 'all'],
    queryFn: async () => {
      const response = await appointmentsApi.getAllAppointmentsAdmin(status);
      return response.success ? response.data?.appointments ?? [] : [];
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
  });
}

export function useAllUsers() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await adminApi.getAllUsers();
      return response.success ? response.data?.users ?? [] : [];
    },
    enabled: isAuthenticated,
  });
}

// Employee Management
export function useEmployees(status?: string, location?: string, search?: string, department?: string) {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: [...queryKeys.employees(scope), status ?? 'all', location ?? '', search ?? '', department ?? ''],
    queryFn: async () => {
      const response = await employeesApi.getEmployees(status, location, search, department);
      return response.success ? response.data?.employees ?? [] : [];
    },
    enabled: isAuthenticated,
  });
}

export function useRegisterEmployee() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: employeesApi.registerEmployee.bind(employeesApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees(scope) });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User & Employee> }) =>
      employeesApi.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees(scope) });
    },
  });
}

export function useUpdateEmployeeStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      employeesApi.updateEmployeeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees(scope) });
    },
  });
}

export function useEmployee(id: number) {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.employee(scope, id),
    queryFn: async () => {
      const response = await employeesApi.getEmployee(id);
      return response.success ? response.data : null;
    },
    enabled: !!id && isAuthenticated,
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: employeesApi.deactivateEmployee.bind(employeesApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees(scope) });
    },
  });
}

export function useUpdateEmployeeAccountStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({
      id,
      accountStatus,
      exitNotes,
    }: {
      id: number;
      accountStatus: string;
      exitNotes?: string;
    }) => employeesApi.updateEmployeeAccountStatus(id, accountStatus, exitNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees(scope) });
    },
  });
}

export function useEmployeeDocuments(employeeId: number) {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: [...queryKeys.employee(scope, employeeId), 'documents'],
    queryFn: async () => {
      const response = await employeesApi.getEmployeeDocuments(employeeId);
      return response.success ? response.data?.documents ?? [] : [];
    },
    enabled: !!employeeId && isAuthenticated,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({
      employeeId,
      file,
      docType,
      documentName,
      isVerified,
    }: {
      employeeId: number;
      file: File;
      docType: string;
      documentName: string;
      isVerified?: boolean;
    }) =>
      employeesApi.uploadEmployeeDocument(employeeId, file, docType, documentName, isVerified),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employee(scope, employeeId) });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({ employeeId, docId }: { employeeId: number; docId: number }) =>
      employeesApi.deleteEmployeeDocument(employeeId, docId),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employee(scope, employeeId) });
    },
  });
}

export function useDepartments() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await employeesApi.getDepartments();
      return response.success ? (response.data?.departments ?? []) : [];
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useManagers() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['managers'],
    queryFn: async () => {
      const response = await employeesApi.getManagers();
      return response.success ? (response.data?.managers ?? []) : [];
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssignEmployee() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({
      appointmentId,
      employeeId,
      notes,
    }: {
      appointmentId: number;
      employeeId: number;
      notes?: string;
    }) => employeesApi.assignEmployeeToAppointment(appointmentId, employeeId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments(scope) });
    },
  });
}

// Service Partners
export function useServicePartners(service?: string, location?: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: [...queryKeys.partners, service, location],
    queryFn: async () => {
      const response = await partnersApi.getServicePartners(service, location);
      return response.success ? response.data?.partners ?? [] : [];
    },
    enabled: isAuthenticated,
  });
}

export function useCreateServicePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: partnersApi.createServicePartner.bind(partnersApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners });
    },
  });
}

export function useUpdateServicePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ServicePartner> }) =>
      partnersApi.updateServicePartner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners });
    },
  });
}

export function useDeactivateServicePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: partnersApi.deactivateServicePartner.bind(partnersApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners });
    },
  });
}

// ============================================================
// WORKFLOW HOOKS (Assignment -> Checklist -> Work Record -> Verify -> Invoice)
// ============================================================

export function useAssignmentDetail(assignmentId: number) {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.workflowAssignment(scope, assignmentId),
    queryFn: async () => {
      const response = await workflowApi.getAssignmentDetail(assignmentId);
      return response.success ? response.data?.assignment ?? null : null;
    },
    enabled: !!assignmentId && isAuthenticated,
  });
}

export function useStartAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: (assignmentId: number) => workflowApi.startAssignment(assignmentId),
    onSuccess: (_, assignmentId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAssignment(scope, assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowEmployeeDashboard(scope) });
    },
  });
}

export function useChecklist(assignmentId: number) {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.workflowChecklist(scope, assignmentId),
    queryFn: async () => {
      const response = await workflowApi.getChecklist(assignmentId);
      return response.success ? response.data?.checklist ?? null : null;
    },
    enabled: !!assignmentId && isAuthenticated,
  });
}

export function useCreateOrUpdateChecklist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: number; data: Parameters<typeof workflowApi.createOrUpdateChecklist>[1] }) =>
      workflowApi.createOrUpdateChecklist(assignmentId, data),
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowChecklist(scope, assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAssignment(scope, assignmentId) });
    },
  });
}

export function useSubmitChecklist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: (assignmentId: number) => workflowApi.submitChecklist(assignmentId),
    onSuccess: (_, assignmentId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowChecklist(scope, assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAssignment(scope, assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowEmployeeDashboard(scope) });
    },
  });
}

export function useWorkRecord(assignmentId: number) {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.workflowWorkRecord(scope, assignmentId),
    queryFn: async () => {
      const response = await workflowApi.getWorkRecord(assignmentId);
      return response.success ? response.data?.work_record ?? null : null;
    },
    enabled: !!assignmentId && isAuthenticated,
  });
}

export function useCreateWorkRecord() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: number; data: Parameters<typeof workflowApi.createWorkRecord>[1] }) =>
      workflowApi.createWorkRecord(assignmentId, data),
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowWorkRecord(scope, assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAssignment(scope, assignmentId) });
    },
  });
}

export function useUpdateWorkRecord() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({ workRecordId, data }: { workRecordId: number; data: Parameters<typeof workflowApi.updateWorkRecord>[1] }) =>
      workflowApi.updateWorkRecord(workRecordId, data),
    onSuccess: (_, { workRecordId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowWorkRecord(scope, workRecordId) });
    },
  });
}

export function useSubmitWorkRecord() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: (assignmentId: number) => workflowApi.submitWorkRecord(assignmentId),
    onSuccess: (_, assignmentId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowWorkRecord(scope, assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAssignment(scope, assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowEmployeeDashboard(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowPendingVerifications(scope) });
    },
  });
}

export function useVerifyWorkRecord() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: number; data: Parameters<typeof workflowApi.verifyWorkRecord>[1] }) =>
      workflowApi.verifyWorkRecord(assignmentId, data),
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAssignment(scope, assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowWorkRecord(scope, assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowPendingVerifications(scope) });
    },
  });
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = userScope(user?.id);

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: number; data?: Parameters<typeof workflowApi.generateInvoice>[1] }) =>
      workflowApi.generateInvoice(assignmentId, data),
    onSuccess: (response, { assignmentId }) => {
      const appointmentId = response?.data?.invoice?.appointment_id;
      if (appointmentId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.appointment(scope, appointmentId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allAppointmentsAdmin(scope) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowPendingVerifications(scope) });
    },
  });
}

export function useAdminPendingVerifications() {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.workflowPendingVerifications(scope),
    queryFn: async () => {
      const response = await workflowApi.getAdminPendingVerifications();
      return response.success ? response.data?.assignments ?? [] : [];
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });
}

export function useEmployeeWorkflowDashboard() {
  const { user, isAuthenticated } = useAuth();
  const scope = userScope(user?.id);

  return useQuery({
    queryKey: queryKeys.workflowEmployeeDashboard(scope),
    queryFn: async () => {
      const response = await workflowApi.getEmployeeDashboardData();
      return response.success ? response.data : null;
    },
    enabled: isAuthenticated,
  });
}