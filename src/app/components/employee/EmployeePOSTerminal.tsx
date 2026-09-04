import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { employeesApi } from '@/services/api';
import { POSTerminal } from '@/app/components/POSTerminal';

interface EmployeePOSTerminalProps {
  assignmentId: number | null;
  onClose: () => void;
  onBackToAssignments: () => void;
}

export function EmployeePOSTerminal({ assignmentId, onClose, onBackToAssignments }: EmployeePOSTerminalProps) {
  const { user } = useAuth();
  const userId = user?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['employee', 'assignment', userId, assignmentId],
    queryFn: async () => {
      if (!assignmentId) return null;
      const res = await employeesApi.getMyAssignments();
      if (!res.success) throw new Error(res.message || 'Failed to load assignments');
      const found = (res.data?.assignments ?? []).find((a: any) => a.id === assignmentId);
      return found ?? null;
    },
    enabled: !!assignmentId && !!userId,
  });

  if (!assignmentId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>POS Checkout</CardTitle>
          <CardDescription>
            Open a completed assignment from the <strong>My Assignments</strong> tab to start checkout.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={onBackToAssignments}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assignments
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Cannot open POS
          </CardTitle>
          <CardDescription>
            {(error as Error)?.message ?? 'Assignment not found or not assigned to you.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={onBackToAssignments}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assignments
          </Button>
        </CardContent>
      </Card>
    );
  }

  const assignment: any = data;
  const customer = assignment.appointment?.customer;
  const service = assignment.appointment?.service;
  const vehicle = assignment.appointment?.vehicle;

  const baseServiceAmount = Number(assignment.appointment?.total_amount ?? service?.price ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Checkout for { customer?.name ?? 'Customer' }</h2>
          <p className="text-sm text-slate-500">
            {service?.name ?? 'Service'}{vehicle ? ` · ${vehicle.year} ${vehicle.make} ${vehicle.model}` : ''}
            {' · '}Assignment #{assignment.id}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBackToAssignments}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Items below are prefilled from the assignment. Adjust amounts as needed.
          When you confirm checkout, the invoice is sent to <strong>Pending Verification</strong>;
          an admin will review and email the customer the official receipt.
        </AlertDescription>
      </Alert>

      <div className="rounded-lg overflow-hidden border border-slate-200">
        <POSTerminal
          mode="employee"
          assignmentId={assignment.id}
          userType="employee"
          prefill={{
            customerName: customer?.name,
            customerEmail: customer?.email,
            customerPhone: customer?.phone,
            initialLineItems: [
              {
                type: 'service-fee',
                label: service?.name ?? 'Service',
                amount: baseServiceAmount,
              },
              {
                type: 'service-fee',
                label: 'Concierge Logistics Fee',
                amount: Math.round(baseServiceAmount * 0.1),
              },
            ],
          }}
          onClose={onClose}
        />
      </div>
    </div>
  );
}