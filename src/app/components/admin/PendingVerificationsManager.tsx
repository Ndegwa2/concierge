import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle2, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { workflowApi } from '@/services/api';
import { useAdminPendingVerifications } from '@/hooks/useApi';
import { AdminVerificationModal } from './AdminVerificationModal';
import type { Assignment } from '@/services/api';

export function PendingVerificationsManager() {
  const { data: assignments = [], isLoading, error, refetch } = useAdminPendingVerifications();
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [verificationOpen, setVerificationOpen] = useState(false);

  const handleVerifyClick = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setVerificationOpen(true);
  };

  const handleVerificationComplete = () => {
    setVerificationOpen(false);
    setSelectedAssignment(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="h-6 w-6 text-slate-400 animate-spin" />
        <span className="ml-2 text-slate-500">Loading pending verifications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-red-600">Failed to load pending verifications</p>
          <Button onClick={refetch} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Pending Verifications</h1>
        <p className="text-slate-600">Review and verify employee work records before invoicing</p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-slate-500">All work records have been verified</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {assignment.appointment?.service?.name || 'Unknown Service'}
                    </CardTitle>
                    <CardDescription>
                      Assignment #{assignment.id} - Appointment #{assignment.appointment_id}
                    </CardDescription>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    Pending Verification
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Customer</p>
                    <p className="font-medium">{assignment.appointment?.customer?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Employee</p>
                    <p className="font-medium">{assignment.employee?.user?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Submitted At</p>
                    <p className="font-medium">
                      {assignment.work_record?.submitted_at 
                        ? new Date(assignment.work_record.submitted_at).toLocaleString() 
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {assignment.work_record && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Work Summary</p>
                    <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Items:</span>
                        <span>{assignment.work_record.items.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Labor Hours:</span>
                        <span>{assignment.work_record.labor_hours || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium pt-1 border-t">
                        <span>Total Amount:</span>
                        <span className="text-green-600">KES {assignment.work_record.total_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleVerifyClick(assignment)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Verify & Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedAssignment && (
        <AdminVerificationModal
          assignment={selectedAssignment}
          open={verificationOpen}
          onOpenChange={(open) => {
            setVerificationOpen(open);
            if (!open) {
              setSelectedAssignment(null);
            }
          }}
        />
      )}
    </div>
  );
}
