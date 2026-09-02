/**
 * React Query Hooks for AutoConcierge API
 * 
 * This module provides React Query hooks for all API operations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, authApi, employeesApi, servicesApi, vehiclesApi, appointmentsApi, adminApi, partnersApi, workflowApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { User, Vehicle, Appointment, ServicePartner, Employee, EmployeeAssignment, TimeOffRequest, IssueReport, TimeLog } from '../services/api';

// Query Keys
export const queryKeys = {
  services: ['services'] as const,
  service: (id: number) => ['services', id] as const,
  appointments: ['appointments'] as const,
  appointment: (id: number) => ['appointments', id] as const,
  allAppointmentsAdmin: ['admin', 'appointments'] as const,
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
  timeLogs: ['time-logs'] as const,
  timeOffRequests: ['time-off-requests'] as const,
  issueReports: ['issue-reports'] as const,
  workflowAssignment: (id: number) => ['workflow', 'assignment', id] as const,
  workflowChecklist: (id: number) => ['workflow', 'checklist', id] as const,
  workflowWorkRecord: (id: number) => ['workflow', 'work-record', id] as const,
  workflowPendingVerifications: ['workflow', 'pending-verifications'] as const,
  workflowEmployeeDashboard: ['workflow', 'employee-dashboard'] as const,
};

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
        queryClient.setQueryData(queryKeys.profile, data.data.user);
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
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      if (!api.isAuthenticated()) return null;
      const response = await authApi.getProfile();
      return response.success ? response.data?.user ?? null : null;
    },
    enabled: api.isAuthenticated(),
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
  return useQuery({
    queryKey: queryKeys.vehicles,
    queryFn: async () => {
      if (!api.isAuthenticated()) return [];
      const response = await vehiclesApi.getVehicles();
      return response.success ? response.data?.vehicles ?? [] : [];
    },
    enabled: api.isAuthenticated(),
  });
}

export function useVehicle(id: number) {
  return useQuery({
    queryKey: queryKeys.vehicle(id),
    queryFn: async () => {
      const response = await vehiclesApi.getVehicle(id);
      return response.success ? response.data?.vehicle ?? null : null;
    },
    enabled: !!id && api.isAuthenticated(),
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: vehiclesApi.createVehicle.bind(vehiclesApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Vehicle> }) =>
      vehiclesApi.updateVehicle(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicle(id) });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: vehiclesApi.deleteVehicle.bind(vehiclesApi),
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
      const response = await appointmentsApi.getAppointments(status);
      return response.success ? response.data?.appointments ?? [] : [];
    },
    enabled: api.isAuthenticated(),
  });
}

export function useAppointment(id: number) {
  return useQuery({
    queryKey: queryKeys.appointment(id),
    queryFn: async () => {
      const response = await appointmentsApi.getAppointment(id);
      return response.success ? response.data?.appointment ?? null : null;
    },
    enabled: !!id && api.isAuthenticated(),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: appointmentsApi.createAppointment.bind(appointmentsApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
      queryClient.invalidateQueries({ queryKey: queryKeys.allAppointmentsAdmin });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Appointment> }) =>
      appointmentsApi.updateAppointment(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allAppointmentsAdmin });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: appointmentsApi.cancelAppointment.bind(appointmentsApi),
    onSuccess: (data) => {
      if (data.success && data.data?.appointment) {
        queryClient.invalidateQueries({ queryKey: queryKeys.appointment(data.data.appointment.id) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
      queryClient.invalidateQueries({ queryKey: queryKeys.allAppointmentsAdmin });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
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
      const response = await employeesApi.getEmployeeDashboard();
      return response.success ? response.data : null;
    },
    enabled: api.isAuthenticated(),
  });
}

export function useMyAssignments(status?: string) {
  return useQuery({
    queryKey: [...queryKeys.assignments, status],
    queryFn: async () => {
      if (!api.isAuthenticated()) return [];
      const response = await employeesApi.getMyAssignments(status);
      if (!response.success) throw new Error(response.message || 'Failed to load assignments');
      return response.data?.assignments ?? [];
    },
    enabled: api.isAuthenticated(),
  });
}

export function useUpdateAssignmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: string; notes?: string }) =>
      employeesApi.updateAssignmentStatus(id, status, notes),
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
      const response = await employeesApi.getMySchedule(startDate, endDate);
      return response.success ? response.data : null;
    },
    enabled: api.isAuthenticated(),
  });
}

export function useEmployeeProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const response = await employeesApi.getEmployeeProfile();
      return response.success ? response.data?.user ?? null : null;
    },
    enabled: api.isAuthenticated(),
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
  return useQuery({
    queryKey: ['time-logs'],
    queryFn: async () => {
      if (!api.isAuthenticated()) return null;
      const response = await employeesApi.getTimeLogs();
      return response.success ? response.data : null;
    },
    enabled: api.isAuthenticated(),
  });
}

export function useClockInOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action, notes }: { action: 'in' | 'out'; notes?: string }) =>
      employeesApi.clockInOut({ action, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-logs'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ============================================================
// EMPLOYEE TIME-OFF HOOKS
// ============================================================

export function useTimeOffRequests() {
  return useQuery({
    queryKey: ['time-off-requests'],
    queryFn: async () => {
      if (!api.isAuthenticated()) return null;
      const response = await employeesApi.getTimeOffRequests();
      return response.success ? response.data : null;
    },
    enabled: api.isAuthenticated(),
  });
}

export function useRequestTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      request_type: 'vacation' | 'sick' | 'personal' | 'other';
      start_date: string;
      end_date: string;
      reason?: string;
    }) => employeesApi.requestTimeOff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off-requests'] });
    },
  });
}

// ============================================================
// EMPLOYEE ISSUE REPORTING HOOKS
// ============================================================

export function useIssueReports() {
  return useQuery({
    queryKey: ['issue-reports'],
    queryFn: async () => {
      if (!api.isAuthenticated()) return null;
      const response = await employeesApi.getIssueReports();
      return response.success ? response.data : null;
    },
    enabled: api.isAuthenticated(),
  });
}

export function useReportIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      appointment_id?: number;
    }) => employeesApi.reportIssue(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-reports'] });
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
      const response = await adminApi.getAdminDashboard();
      return response.success ? response.data : null;
    },
    enabled: api.isAuthenticated(),
  });
}

export function useAllAppointmentsAdmin(status?: string) {
  return useQuery({
    queryKey: [...queryKeys.allAppointmentsAdmin, status],
    queryFn: async () => {
      const response = await appointmentsApi.getAllAppointmentsAdmin(status);
      return response.success ? response.data?.appointments ?? [] : [];
    },
    enabled: api.isAuthenticated(),
  });
}

export function useAllUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await adminApi.getAllUsers();
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
      const response = await employeesApi.getEmployees(status, location, search);
      return response.success ? response.data?.employees ?? [] : [];
    },
    enabled: api.isAuthenticated(),
  });
}

export function useRegisterEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: employeesApi.registerEmployee.bind(employeesApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User & Employee> }) =>
      employeesApi.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    },
  });
}

export function useUpdateEmployeeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      employeesApi.updateEmployeeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    },
  });
}

export function useEmployee(id: number) {
  return useQuery({
    queryKey: queryKeys.employee(id),
    queryFn: async () => {
      const response = await employeesApi.getEmployee(id);
      return response.success ? response.data : null;
    },
    enabled: !!id && api.isAuthenticated(),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: employeesApi.deactivateEmployee.bind(employeesApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    },
  });
}

export function useUpdateEmployeeAccountStatus() {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    },
  });
}

export function useEmployeeDocuments(employeeId: number) {
  return useQuery({
    queryKey: ['employee-docs', employeeId],
    queryFn: async () => {
      const response = await employeesApi.getEmployeeDocuments(employeeId);
      return response.success ? response.data?.documents ?? [] : [];
    },
    enabled: !!employeeId && api.isAuthenticated(),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, docId }: { employeeId: number; docId: number }) =>
      employeesApi.deleteEmployeeDocument(employeeId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    },
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await employeesApi.getDepartments();
      return response.success ? (response.data?.departments ?? []) : [];
    },
    enabled: api.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useManagers() {
  return useQuery({
    queryKey: ['managers'],
    queryFn: async () => {
      const response = await employeesApi.getManagers();
      return response.success ? (response.data?.managers ?? []) : [];
    },
    enabled: api.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
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
    }) => employeesApi.assignEmployeeToAppointment(appointmentId, employeeId, notes),
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
      const response = await partnersApi.getServicePartners(service, location);
      return response.success ? response.data?.partners ?? [] : [];
    },
    enabled: api.isAuthenticated(),
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
  return useQuery({
    queryKey: queryKeys.workflowAssignment(assignmentId),
    queryFn: async () => {
      const response = await workflowApi.getAssignmentDetail(assignmentId);
      return response.success ? response.data?.assignment ?? null : null;
    },
    enabled: !!assignmentId && api.isAuthenticated(),
  });
}

export function useStartAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: number) => workflowApi.startAssignment(assignmentId),
    onSuccess: (_, assignmentId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAssignment(assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowEmployeeDashboard });
    },
  });
}

export function useChecklist(assignmentId: number) {
  return useQuery({
    queryKey: queryKeys.workflowChecklist(assignmentId),
    queryFn: async () => {
      const response = await workflowApi.getChecklist(assignmentId);
      return response.success ? response.data?.checklist ?? null : null;
    },
    enabled: !!assignmentId && api.isAuthenticated(),
  });
}

export function useCreateOrUpdateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: number; data: Parameters<typeof workflowApi.createOrUpdateChecklist>[1] }) =>
      workflowApi.createOrUpdateChecklist(assignmentId, data),
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowChecklist(assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAssignment(assignmentId) });
    },
  });
}

export function useSubmitChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: number) => workflowApi.submitChecklist(assignmentId),
    onSuccess: (_, assignmentId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowChecklist(assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAssignment(assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowEmployeeDashboard });
    },
  });
}

export function useWorkRecord(assignmentId: number) {
  return useQuery({
    queryKey: queryKeys.workflowWorkRecord(assignmentId),
    queryFn: async () => {
      const response = await workflowApi.getWorkRecord(assignmentId);
      return response.success ? response.data?.work_record ?? null : null;
    },
    enabled: !!assignmentId && api.isAuthenticated(),
  });
}

export function useCreateWorkRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: number; data: Parameters<typeof workflowApi.createWorkRecord>[1] }) =>
      workflowApi.createWorkRecord(assignmentId, data),
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowWorkRecord(assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAssignment(assignmentId) });
    },
  });
}

export function useUpdateWorkRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workRecordId, data }: { workRecordId: number; data: Parameters<typeof workflowApi.updateWorkRecord>[1] }) =>
      workflowApi.updateWorkRecord(workRecordId, data),
    onSuccess: (_, { workRecordId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowWorkRecord(workRecordId) });
    },
  });
}

export function useSubmitWorkRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: number) => workflowApi.submitWorkRecord(assignmentId),
    onSuccess: (_, assignmentId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowWorkRecord(assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAssignment(assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowEmployeeDashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowPendingVerifications });
    },
  });
}

export function useVerifyWorkRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: number; data: Parameters<typeof workflowApi.verifyWorkRecord>[1] }) =>
      workflowApi.verifyWorkRecord(assignmentId, data),
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowAssignment(assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowWorkRecord(assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowPendingVerifications });
    },
  });
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { appointmentId: number; data?: Parameters<typeof workflowApi.generateInvoice>[1] }) =>
      workflowApi.generateInvoice(assignmentId, data),
    onSuccess: (_, { appointmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment(appointmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
      queryClient.invalidateQueries({ queryKey: queryKeys.allAppointmentsAdmin });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflowPendingVerifications });
    },
  });
}

export function useAdminPendingVerifications() {
  return useQuery({
    queryKey: queryKeys.workflowPendingVerifications,
    queryFn: async () => {
      const response = await workflowApi.getAdminPendingVerifications();
      return response.success ? response.data?.assignments ?? [] : [];
    },
    enabled: api.isAuthenticated(),
  });
}

export function useEmployeeWorkflowDashboard() {
  return useQuery({
    queryKey: queryKeys.workflowEmployeeDashboard,
    queryFn: async () => {
      const response = await workflowApi.getEmployeeDashboardData();
      return response.success ? response.data : null;
    },
    enabled: api.isAuthenticated(),
  });
}