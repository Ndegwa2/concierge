import { useQueryClient } from '@tanstack/react-query';
import { workflowApi } from '@/services/api';
import { useAssignmentDetail, useStartAssignment, useChecklist, useCreateOrUpdateChecklist, useSubmitChecklist, useWorkRecord, useCreateWorkRecord, useUpdateWorkRecord, useSubmitWorkRecord, useVerifyWorkRecord, useGenerateInvoice, useAdminPendingVerifications, useEmployeeWorkflowDashboard } from '@/hooks/useApi';
import type { Assignment, VehicleChecklist, WorkRecord, ChecklistItem, WorkRecordItem } from '@/services/api';
import { toast } from 'sonner';

export type AssignmentStatus = Assignment['status'];
export type WorkRecordStatus = WorkRecord['status'];

export function useWorkflowAssignment(assignmentId: number) {
  const assignmentQuery = useAssignmentDetail(assignmentId);
  const checklistQuery = useChecklist(assignmentId);
  const workRecordQuery = useWorkRecord(assignmentId);
  const startMutation = useStartAssignment();
  const saveChecklistMutation = useCreateOrUpdateChecklist();
  const submitChecklistMutation = useSubmitChecklist();
  const createWorkRecordMutation = useCreateWorkRecord();
  const updateWorkRecordMutation = useUpdateWorkRecord();
  const submitWorkRecordMutation = useSubmitWorkRecord();
  const verifyWorkRecordMutation = useVerifyWorkRecord();
  const generateInvoiceMutation = useGenerateInvoice();

  const assignment = assignmentQuery.data;
  const checklist = checklistQuery.data;
  const workRecord = workRecordQuery.data;

  const isAssigned = assignment?.status === 'assigned';
  const isInProgress = assignment?.status === 'in-progress';
  const isChecklistPending = assignment?.status === 'checklist_pending';
  const isWorkPending = assignment?.status === 'work_pending';
  const isSubmitted = assignment?.status === 'submitted';
  const isVerified = assignment?.status === 'verified';
  const isCompleted = assignment?.status === 'completed';
  const isCancelled = assignment?.status === 'cancelled';

  const startAssignment = () => {
    if (!assignmentId) return;
    startMutation.mutate(assignmentId, {
      onSuccess: () => {
        toast.success('Assignment started');
        assignmentQuery.refetch();
      },
      onError: () => toast.error('Failed to start assignment'),
    });
  };

  const saveChecklist = (items: ChecklistItem[], overallCondition: VehicleChecklist['overall_condition'], notes?: string) => {
    saveChecklistMutation.mutate(
      { assignmentId, data: { items, overall_condition: overallCondition, notes } },
      { onSuccess: () => toast.success('Checklist saved') }
    );
  };

  const submitChecklist = () => {
    submitChecklistMutation.mutate(assignmentId, {
      onSuccess: () => {
        toast.success('Checklist submitted');
        assignmentQuery.refetch();
        checklistQuery.refetch();
      },
    });
  };

  const saveWorkRecord = (items: WorkRecordItem[], overallNotes?: string, laborHours?: number, laborRate?: number) => {
    createWorkRecordMutation.mutate(
      { assignmentId, data: { items, overall_notes: overallNotes, labor_hours: laborHours, labor_rate: laborRate } },
      { onSuccess: () => toast.success('Work record saved') }
    );
  };

  const updateWorkRecord = (items: WorkRecordItem[], overallNotes?: string, laborHours?: number, laborRate?: number) => {
    if (!workRecord?.id) return;
    updateWorkRecordMutation.mutate(
      { workRecordId: workRecord.id, data: { items, overall_notes: overallNotes, labor_hours: laborHours, labor_rate: laborRate } },
      { onSuccess: () => toast.success('Work record updated') }
    );
  };

  const submitWorkRecord = () => {
    submitWorkRecordMutation.mutate(assignmentId, {
      onSuccess: () => {
        toast.success('Work record submitted for verification');
        assignmentQuery.refetch();
        workRecordQuery.refetch();
      },
    });
  };

  const verifyWorkRecord = (approved: boolean, notes?: string) => {
    verifyWorkRecordMutation.mutate(
      { appointmentId: assignmentId, data: { approved, notes } },
      {
        onSuccess: () => {
          toast.success(approved ? 'Work record verified' : 'Work record rejected');
          assignmentQuery.refetch();
          workRecordQuery.refetch();
        },
      }
    );
  };

  const generateInvoice = (taxAmount?: number, discountAmount?: number, notes?: string) => {
    generateInvoiceMutation.mutate(
      { appointmentId: assignmentId, data: { tax_amount: taxAmount, discount_amount: discountAmount, notes } },
      {
        onSuccess: () => {
          toast.success('Invoice generated');
          assignmentQuery.refetch();
        },
      }
    );
  };

  return {
    assignment,
    checklist,
    workRecord,
    isAssigned,
    isInProgress,
    isChecklistPending,
    isWorkPending,
    isSubmitted,
    isVerified,
    isCompleted,
    isCancelled,
    startAssignment,
    saveChecklist,
    submitChecklist,
    saveWorkRecord,
    updateWorkRecord,
    submitWorkRecord,
    verifyWorkRecord,
    generateInvoice,
    isLoading: assignmentQuery.isLoading || checklistQuery.isLoading || workRecordQuery.isLoading,
    isSaving: saveChecklistMutation.isPending || createWorkRecordMutation.isPending || updateWorkRecordMutation.isPending,
    isSubmitting: submitChecklistMutation.isPending || submitWorkRecordMutation.isPending,
    isVerifying: verifyWorkRecordMutation.isPending,
    isInvoicing: generateInvoiceMutation.isPending,
    refetchAll: () => {
      assignmentQuery.refetch();
      checklistQuery.refetch();
      workRecordQuery.refetch();
    },
  };
}

export function useWorkflowDashboard() {
  const employeeQuery = useEmployeeWorkflowDashboard();
  const adminQuery = useAdminPendingVerifications();
  const queryClient = useQueryClient();

  const pendingVerifications = adminQuery.data || [];

  const refreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ['workflow', 'employee-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['workflow', 'pending-verifications'] });
  };

  return {
    employeeData: employeeQuery.data,
    pendingVerifications,
    isLoading: employeeQuery.isLoading || adminQuery.isLoading,
    refreshDashboard,
  };
}
