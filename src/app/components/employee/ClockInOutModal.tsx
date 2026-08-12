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

interface ClockInOutModalProps {
  open: boolean;
  onClose: () => void;
  action: 'in' | 'out';
  onConfirm: (notes?: string) => Promise<void>;
  isSubmitting: boolean;
}

export function ClockInOutModal({
  open,
  onClose,
  action,
  onConfirm,
  isSubmitting,
}: ClockInOutModalProps) {
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    await onConfirm(notes.trim() || undefined);
    setNotes('');
  };

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === 'in' ? 'Clock In' : 'Clock Out'}
          </DialogTitle>
          <DialogDescription>
            {action === 'in'
              ? 'Start your work shift'
              : 'End your work shift'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              placeholder={
                action === 'in'
                  ? 'Any notes for your shift start...'
                  : 'Any notes for your shift end...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Clock className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : `Clock ${action === 'in' ? 'In' : 'Out'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}