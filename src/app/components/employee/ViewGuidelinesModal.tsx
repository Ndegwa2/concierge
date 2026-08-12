import { BookText, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';

interface ViewGuidelinesModalProps {
  open: boolean;
  onClose: () => void;
}

const guidelinesSections = [
  {
    title: 'Customer Service Standards',
    content: [
      'Always arrive on time for appointments.',
      'Wear the official AutoConcierge uniform and ID badge.',
      'Greet customers with a professional and friendly attitude.',
      'Verify customer identity before beginning service.',
      'Keep the vehicle interior clean and protect personal items.',
    ],
  },
  {
    title: 'Vehicle Care Procedures',
    content: [
      'Inspect the vehicle exterior for existing damage before starting.',
      'Follow the service checklist provided in the app.',
      'Use only approved cleaning products and materials.',
      'Document any issues with photos before and after service.',
      'Return the vehicle keys to the customer upon completion.',
    ],
  },
  {
    title: 'Safety Guidelines',
    content: [
      'Wear safety gloves and eye protection when using chemicals.',
      'Do not operate machinery while fatigued or under medication.',
      'Report any safety incidents to your supervisor immediately.',
      'Keep walkie-talkie charged and accessible at all times.',
      'Lock vehicle doors when leaving the vehicle unattended.',
    ],
  },
  {
    title: 'Communication Protocol',
    content: [
      'Update the dispatcher when arriving at and leaving each location.',
      'Call the customer if you are more than 10 minutes late.',
      'Report any vehicle or equipment issues to maintenance.',
      'Escalate customer complaints to your supervisor promptly.',
    ],
  },
];

export function ViewGuidelinesModal({ open, onClose }: ViewGuidelinesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookText className="h-5 w-5" />
            Employee Guidelines
          </DialogTitle>
          <DialogDescription>
            Company policies and best practices for all employees
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {guidelinesSections.map((section) => (
              <div key={section.title} className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-900">
                  {section.title}
                </h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
                  {section.content.map((item, idx) => (
                    <li key={idx} className="pl-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
