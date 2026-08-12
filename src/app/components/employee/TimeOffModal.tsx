import { useState } from 'react';
import { Calendar, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

interface TimeOffModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TimeOffRequestData) => Promise<void>;
  isSubmitting: boolean;
}

export interface TimeOffRequestData {
  request_type: 'vacation' | 'sick' | 'personal' | 'other';
  start_date: string;
  end_date: string;
  reason?: string;
}

const today = new Date().toISOString().split('T')[0];

export function TimeOffModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: TimeOffModalProps) {
  const [requestType, setRequestType] = useState<'vacation' | 'sick' | 'personal' | 'other'>('vacation');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!startDate || !endDate || startDate > endDate) return;
    await onSubmit({
      request_type: requestType,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim() || undefined,
    });
    setRequestType('vacation');
    setStartDate(today);
    setEndDate(today);
    setReason('');
  };

  const handleClose = () => {
    setRequestType('vacation');
    setStartDate(today);
    setEndDate(today);
    setReason('');
    onClose();
  };

  const isValid = startDate && endDate && startDate <= endDate;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
          <DialogDescription>
            Submit a time-off request for your manager's approval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Request Type</label>
            <Select
              value={requestType}
              onValueChange={(v) => setRequestType(v as TimeOffRequestData['request_type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="sick">Sick Leave</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={today}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (Optional)</label>
            <Textarea
              placeholder="Add a reason for your time-off request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isValid}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
