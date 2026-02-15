import { CheckCircle2, Star, Download } from 'lucide-react';
import { Dialog, DialogContent } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';

interface ConfirmationSuccessModalProps {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  serviceRating: number;
}

export function ConfirmationSuccessModal({ 
  open, 
  onClose, 
  appointmentId,
  serviceRating
}: ConfirmationSuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-slate-600 mb-6">
            Your confirmation has been submitted successfully
          </p>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Appointment ID</p>
                  <p className="font-semibold">#{appointmentId}</p>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-slate-500 mb-2">Your Rating</p>
                  <div className="flex items-center justify-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-6 w-6 ${
                          i < serviceRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-slate-700">
                    A confirmation email and receipt have been sent to your email address.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button className="w-full" onClick={onClose}>
              Back to Appointments
            </Button>
            <Button className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
            </Button>
          </div>

          <p className="text-sm text-slate-500 mt-6">
            We appreciate your feedback and look forward to serving you again!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
