import { useState } from 'react';
import { Clock, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

interface UpdateAssignmentStatusModalProps {
  open: boolean;
  onClose: () => void;
  assignment: {
    id: number;
    status: string;
    appointment: {
      service?: { name?: string };
      customer?: { name?: string };
    };
  };
  onSave: (status: string, notes?: string) => Promise<void>;
  isSubmitting: boolean;
}

const statusOptions: { value: string; label: string; description: string }[] = [
  {
    value: 'in-progress',
    label: 'Start Service',
    description: 'Mark this assignment as in-progress',
  },
  {
    value: 'completed',
    label: 'Complete Service',
    description: 'Mark this service as completed',
  },
  {
    value: 'cancelled',
    label: 'Cancel Assignment',
    description: 'Cancel this assignment (requires reason)',
  },
];

export function UpdateAssignmentStatusModal({
  open,
  onClose,
  assignment,
  onSave,
  isSubmitting,
}: UpdateAssignmentStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(assignment.status);
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!selectedStatus) return;
    await onSave(selectedStatus, notes);
    setNotes('');
    setSelectedStatus(assignment.status);
  };

  const handleClose = () => {
    setNotes('');
    setSelectedStatus(assignment.status);
    onClose();
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Assignment Status</DialogTitle>
          <DialogDescription>
            Assignment #{assignment.id} -{' '}
            {assignment.appointment?.service?.name || 'Unknown Service'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">New Status</label>
            <Select
              value={selectedStatus}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-slate-500">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Notes {selectedStatus === 'cancelled' && '*'}
            </label>
            <Textarea
              placeholder={
                selectedStatus === 'cancelled'
                  ? 'Reason for cancellation is required'
                  : 'Add any notes about this status change...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
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
            disabled={isSubmitting || !selectedStatus || (selectedStatus === 'cancelled' && !notes.trim())}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
