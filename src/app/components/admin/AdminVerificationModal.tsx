import { useState, useEffect } from 'react';
import { Check, X, FileText, Send, Download, Receipt, DollarSign } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { toast } from 'sonner';
import { workflowApi } from '@/services/api';
import { useVerifyWorkRecord, useGenerateInvoice, type WorkRecord, type Assignment } from '@/hooks/useApi';

interface AdminVerificationModalProps {
  assignment: Assignment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminVerificationModal({ assignment, open, onOpenChange }: AdminVerificationModalProps) {
  const [verificationNotes, setVerificationNotes] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [taxAmount, setTaxAmount] = useState(16);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isInvoicing, setIsInvoicing] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);

  const { mutate: verifyWorkRecord } = useVerifyWorkRecord();
  const { mutate: generateInvoice } = useGenerateInvoice();

  useEffect(() => {
    if (open) {
      setVerificationNotes('');
      setInvoiceNotes('');
      setTaxAmount(16);
      setDiscountAmount(0);
      setGeneratedInvoice(null);
    }
  }, [open, assignment]);

  if (!assignment || !assignment.work_record) return null;

  const workRecord = assignment.work_record;
  const subtotal = workRecord.subtotal || workRecord.items.reduce((sum, i) => sum + i.total_price, 0);
  const taxValue = (subtotal * taxAmount) / 100;
  const discountValue = (subtotal * discountAmount) / 100;
  const total = subtotal + taxValue - discountValue;

  const handleVerify = (approved: boolean) => {
    setIsVerifying(true);
    verifyWorkRecord({
      appointmentId: assignment.appointment_id,
      data: { approved, notes: verificationNotes },
    }, {
      onSettled: () => setIsVerifying(false),
      onSuccess: () => {
        toast.success(approved ? 'Work record verified successfully' : 'Work record rejected');
        onOpenChange(false);
      },
      onError: () => toast.error('Verification failed'),
    });
  };

  const handleGenerateInvoice = () => {
    if (!assignment) return;
    setIsInvoicing(true);
    generateInvoice({
      appointmentId: assignment.appointment_id,
      data: {
        tax_amount: taxValue,
        discount_amount: discountValue,
        notes: invoiceNotes,
        line_items: workRecord.items.map(i => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.total_price,
        })),
      },
    }, {
      onSettled: () => setIsInvoicing(false),
      onSuccess: (res) => {
        if (res.success && res.data) {
          setGeneratedInvoice(res.data.invoice);
          toast.success('Invoice generated successfully');
        } else {
          toast.error(res.message || 'Failed to generate invoice');
        }
      },
      onError: () => toast.error('Failed to generate invoice'),
    });
  };

  const handleSendInvoice = async (invoiceId: number) => {
    try {
      const res = await workflowApi.sendInvoice(invoiceId);
      if (res.success) {
        toast.success('Invoice sent to customer');
      } else {
        toast.error(res.message || 'Failed to send invoice');
      }
    } catch (e) {
      toast.error('Failed to send invoice');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Verify Work & Generate Invoice
          </DialogTitle>
          <DialogDescription>
            Appointment #{assignment.appointment_id} - {assignment.appointment.customer?.name}
          </DialogDescription>
        </DialogHeader>

        {!generatedInvoice ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Customer & Vehicle</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><span className="text-slate-500">Customer:</span> {assignment.appointment.customer?.name}</p>
                  <p><span className="text-slate-500">Phone:</span> {assignment.appointment.customer?.phone}</p>
                  {assignment.appointment.vehicle && (
                    <p><span className="text-slate-500">Vehicle:</span> {assignment.appointment.vehicle.make} {assignment.appointment.vehicle.model} ({assignment.appointment.vehicle.year})</p>
                  )}
                  {assignment.appointment.service && (
                    <p><span className="text-slate-500">Service:</span> {assignment.appointment.service.name}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Employee</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><span className="text-slate-500">Assigned to:</span> {assignment.employee?.user?.name || 'N/A'}</p>
                  <p><span className="text-slate-500">Employee ID:</span> {assignment.employee?.employee_id || 'N/A'}</p>
                </CardContent>
              </Card>
            </div>

            {assignment.checklist && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Vehicle Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-slate-600">Condition:</span>
                    <Badge>{assignment.checklist.overall_condition}</Badge>
                  </div>
                  {assignment.checklist.notes && (
                    <p className="text-sm text-slate-600">{assignment.checklist.notes}</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Work Performed</CardTitle>
              </CardHeader>
              <CardContent>
                {workRecord.items.length > 0 ? (
                  <div className="space-y-2">
                    {workRecord.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded">
                        <div>
                          <span className="font-medium">{item.description}</span>
                          <span className="text-slate-500 ml-2">x{item.quantity}</span>
                        </div>
                        <span className="font-medium">KES {item.total_price.toLocaleString()}</span>
                      </div>
                    ))}
                    {workRecord.overall_notes && (
                      <p className="text-sm text-slate-600 mt-2 italic">{workRecord.overall_notes}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No items recorded</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Invoice Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_amount">Tax (%)</Label>
                  <Input
                    id="tax_amount"
                    type="number"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount_amount">Discount (%)</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_notes">Invoice Notes</Label>
                  <Textarea
                    id="invoice_notes"
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    placeholder="Payment terms, thank you message..."
                    rows={2}
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>KES {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Discount ({discountAmount}%)</span>
                    <span className="text-red-600">-KES {discountValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax ({taxAmount}%)</span>
                    <span>KES {taxValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Grand Total</span>
                    <span className="text-green-600">KES {total.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="verification_notes">Verification Notes</Label>
              <Textarea
                id="verification_notes"
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Add verification comments..."
                rows={2}
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-2 flex-1">
                <Button
                  variant="destructive"
                  onClick={() => handleVerify(false)}
                  disabled={isVerifying}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleVerify(true)}
                  disabled={isVerifying}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {isVerifying ? 'Verifying...' : 'Verify & Approve'}
                </Button>
              </div>
              <Button
                onClick={handleGenerateInvoice}
                disabled={isInvoicing}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                {isInvoicing ? 'Generating...' : 'Generate Invoice'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center py-6 bg-green-50 rounded-lg">
              <Receipt className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-green-900">Invoice Generated</h3>
              <p className="text-sm text-green-700">Invoice #{generatedInvoice.invoice_number}</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Invoice Number</span>
                  <span className="font-medium">{generatedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <Badge>{generatedInvoice.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount</span>
                  <span className="font-bold text-green-600">KES {generatedInvoice.total_amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created</span>
                  <span>{new Date(generatedInvoice.created_at).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setGeneratedInvoice(null)}
                className="flex-1"
              >
                Back to Verification
              </Button>
              <Button
                onClick={() => generatedInvoice && handleSendInvoice(generatedInvoice.id)}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                Send to Customer
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
