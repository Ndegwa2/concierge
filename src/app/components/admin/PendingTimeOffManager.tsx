import { useState } from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { TimeOffVerificationModal } from './TimeOffVerificationModal';
import { useAdminTimeOffRequests } from '@/hooks/useApi';
import type { TimeOffRequest } from '@/services/api';

export function PendingTimeOffManager() {
  const { data: requests = [], isLoading, error, refetch } = useAdminTimeOffRequests();
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleVerifyClick = (request: TimeOffRequest) => {
    setSelectedRequest(request);
    setModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setSelectedRequest(null);
      refetch();
    }
  };

  const getRequestTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      vacation: 'Vacation',
      sick: 'Sick Leave',
      personal: 'Personal',
      other: 'Other',
    };
    return map[type] || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="h-6 w-6 text-slate-400 animate-spin" />
        <span className="ml-2 text-slate-500">Loading time-off requests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-red-600">Failed to load time-off requests</p>
          <Button onClick={refetch} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Leave Requests</h1>
        <p className="text-slate-600">Review and approve employee time-off / leave requests</p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-slate-500">No pending leave requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request: TimeOffRequest) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {getRequestTypeLabel(request.request_type)}
                    </CardTitle>
                    <CardDescription>
                      Request #{request.id} - {request.user?.name || 'Unknown Employee'}
                    </CardDescription>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Employee</p>
                    <p className="font-medium">{request.user?.name || 'N/A'}</p>
                    <p className="text-xs text-slate-500">{request.employee?.employee_id || ''}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Dates</p>
                    <p className="font-medium">{formatDate(request.start_date)} - {formatDate(request.end_date)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Submitted</p>
                    <p className="font-medium">
                      {new Date(request.created_at).toLocaleDateString('en-KE', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {request.reason && (
                  <div>
                    <p className="text-sm font-medium text-slate-700">Reason</p>
                    <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{request.reason}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleVerifyClick(request)}
                    className="flex-1"
                  >
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedRequest && (
        <TimeOffVerificationModal
          request={selectedRequest}
          open={modalOpen}
          onOpenChange={handleModalClose}
        />
      )}
    </div>
  );
}
