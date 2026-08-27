import { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { workflowApi } from '@/services/api';
import { useCreateWorkRecord, useUpdateWorkRecord, useSubmitWorkRecord, type WorkRecordItem } from '@/hooks/useApi';

interface WorkRecordFormProps {
  assignmentId: number;
  appointmentId: number;
  serviceInfo?: { name: string; duration: number };
  onComplete?: () => void;
}

const DEFAULT_ITEMS: WorkRecordItem[] = [
  { id: '1', description: '', category: 'labor', quantity: 1, unit_price: 0, total_price: 0 },
];

export function WorkRecordForm({ assignmentId, appointmentId, serviceInfo, onComplete }: WorkRecordFormProps) {
  const [items, setItems] = useState<WorkRecordItem[]>(DEFAULT_ITEMS);
  const [overallNotes, setOverallNotes] = useState('');
  const [laborHours, setLaborHours] = useState<number | undefined>();
  const [laborRate, setLaborRate] = useState<number | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutate: createWorkRecord } = useCreateWorkRecord();
  const { mutate: updateWorkRecord } = useUpdateWorkRecord();
  const { mutate: submitWorkRecord } = useSubmitWorkRecord();

  useEffect(() => {
    const loadExisting = async () => {
      try {
        const res = await workflowApi.getWorkRecord(assignmentId);
        if (res.success && res.data?.work_record) {
          const wr = res.data.work_record;
          setItems(wr.items.length > 0 ? wr.items : DEFAULT_ITEMS);
          setOverallNotes(wr.overall_notes || '');
          setLaborHours(wr.labor_hours);
          setLaborRate(wr.labor_rate);
        }
      } catch (e) {
        // No existing work record
      }
    };
    loadExisting();
  }, [assignmentId]);

  const updateItem = (index: number, field: keyof WorkRecordItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      if (field === 'quantity' || field === 'unit_price') {
        updated[index].total_price = Number(updated[index].quantity || 0) * Number(updated[index].unit_price || 0);
      }
      return updated;
    });
  };

  const addItem = () => {
    setItems(prev => [...prev, { id: Date.now().toString(), description: '', category: 'parts', quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const laborTotal = (laborHours || 0) * (laborRate || 0);
  const total = subtotal + laborTotal;

  const handleSaveDraft = () => {
    const validItems = items.filter(i => i.description.trim() !== '');
    if (validItems.length === 0 && !overallNotes) {
      toast.warning('Please add at least one item or notes');
      return;
    }
    createWorkRecord({
      assignmentId,
      data: { items: validItems, overall_notes: overallNotes, labor_hours: laborHours, labor_rate: laborRate },
    });
    toast.success('Work record saved as draft');
  };

  const handleSubmit = () => {
    const validItems = items.filter(i => i.description.trim() !== '');
    if (validItems.length === 0 && !overallNotes) {
      toast.warning('Please add at least one item or notes');
      return;
    }
    setIsSubmitting(true);
    submitWorkRecord(assignmentId, {
      onSettled: () => setIsSubmitting(false),
      onSuccess: () => {
        toast.success('Work record submitted for admin verification');
        onComplete?.();
      },
      onError: () => toast.error('Failed to submit work record'),
    });
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Work Done Record
        </CardTitle>
        <CardDescription>
          {serviceInfo ? `Service: ${serviceInfo.name}` : 'Record all work performed, parts used, and labor'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Work Items</Label>
            <Button type="button" size="sm" variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>

          {items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg">
              <div className="col-span-12 md:col-span-4">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                />
              </div>
              <div className="col-span-6 md:col-span-2">
                <select
                  value={item.category}
                  onChange={(e) => updateItem(index, 'category', e.target.value)}
                  className="w-full border rounded-md p-2 text-sm"
                >
                  <option value="parts">Parts</option>
                  <option value="labor">Labor</option>
                  <option value="consumables">Consumables</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="col-span-3 md:col-span-1">
                <Input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                />
              </div>
              <div className="col-span-3 md:col-span-2">
                <Input
                  type="number"
                  placeholder="Unit Price"
                  value={item.unit_price || ''}
                  onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                />
              </div>
              <div className="col-span-9 md:col-span-2 flex items-center">
                <span className="text-sm font-medium">KES {(item.total_price || 0).toLocaleString()}</span>
              </div>
              <div className="col-span-3 md:col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="labor_hours" className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> Labor Hours
            </Label>
            <Input
              id="labor_hours"
              type="number"
              step="0.5"
              value={laborHours || ''}
              onChange={(e) => setLaborHours(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="labor_rate">Labor Rate (KES/hr)</Label>
            <Input
              id="labor_rate"
              type="number"
              value={laborRate || ''}
              onChange={(e) => setLaborRate(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="overall_notes">Overall Notes</Label>
          <Textarea
            id="overall_notes"
            value={overallNotes}
            onChange={(e) => setOverallNotes(e.target.value)}
            placeholder="Summary of work performed, issues encountered, recommendations..."
            rows={3}
          />
        </div>

        <div className="bg-slate-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Parts & Materials Subtotal</span>
            <span>KES {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Labor Total</span>
            <span>KES {laborTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Grand Total</span>
            <span>KES {total.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={handleSaveDraft} className="flex-1">
            Save Draft
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
