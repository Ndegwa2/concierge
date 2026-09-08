import { useState, useEffect } from 'react';
import { Check, X, Calendar } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { toast } from 'sonner';
import { useDecideTimeOffRequest } from '@/hooks/useApi';
import type { TimeOffRequest } from '@/services/api';

interface TimeOffVerificationModalProps {
  request: TimeOffRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimeOffVerificationModal({ request, open, onOpenChange }: TimeOffVerificationModalProps) {
  const [adminNotes, setAdminNotes] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);

  const { mutate: decideTimeOff } = useDecideTimeOffRequest();

  useEffect(() => {
    if (open) {
      setAdminNotes(request?.admin_notes || '');
    }
  }, [open, request]);

  if (!request) return null;

  const startDate = new Date(request.start_date);
  const endDate = new Date(request.end_date);
  const dayCount = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const getRequestTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      vacation: 'Vacation',
      sick: 'Sick Leave',
      personal: 'Personal',
      other: 'Other',
    };
    return map[type] || type;
  };

  const handleDecision = (approved: boolean) => {
    if (!request?.id) return;
    setIsDeciding(true);
    decideTimeOff(
      { requestId: request.id, data: { approved, notes: adminNotes } },
      {
        onSettled: () => setIsDeciding(false),
        onSuccess: () => {
          toast.success(approved ? 'Leave request approved' : 'Leave request rejected');
          onOpenChange(false);
        },
        onError: () => {
          toast.error('Failed to update leave request');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Verify Time-Off Request
          </DialogTitle>
          <DialogDescription>
            Review {request.user?.name || 'Employee'}'s leave request #{request.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-slate-500 uppercase">Request Type</Label>
                <p className="font-medium text-lg">{getRequestTypeLabel(request.request_type)}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase">Employee</Label>
                <p className="font-medium">{request.user?.name || 'N/A'}</p>
                <p className="text-sm text-slate-600">{request.user?.email || ''}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase">Employee ID</Label>
                <p className="font-medium">{request.employee?.employee_id || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase">Department</Label>
                <p className="font-medium">{request.employee?.department || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs text-slate-500 uppercase">Start Date</Label>
                <p className="font-medium">
                  {startDate.toLocaleDateString('en-KE', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase">End Date</Label>
                <p className="font-medium">
                  {endDate.toLocaleDateString('en-KE', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase">Duration</Label>
                <p className="font-medium">{dayCount} day{dayCount > 1 ? 's' : ''}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase">Submitted</Label>
                <p className="font-medium">
                  {new Date(request.created_at).toLocaleDateString('en-KE', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {request.reason && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-500 uppercase">Reason</Label>
              <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{request.reason}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="admin_notes">Admin Notes</Label>
            <Textarea
              id="admin_notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add approval/rejection notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="destructive"
            onClick={() => handleDecision(false)}
            disabled={isDeciding}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            {isDeciding ? 'Processing...' : 'Reject'}
          </Button>
          <Button
            onClick={() => handleDecision(true)}
            disabled={isDeciding}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            {isDeciding ? 'Processing...' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
