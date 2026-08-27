import { useState, useEffect } from 'react';
import { Check, ChevronDown, ChevronUp, Camera, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { workflowApi } from '@/services/api';
import { useCreateOrUpdateChecklist, useSubmitChecklist, type ChecklistItem, type VehicleChecklist } from '@/hooks/useApi';

interface VehicleChecklistFormProps {
  assignmentId: number;
  appointmentId: number;
  vehicleInfo?: { make: string; model: string; year: number; color?: string; license_plate?: string };
  onComplete?: () => void;
}

const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: '1', label: 'Exterior body condition (dents, scratches)', checked: false, category: 'exterior' },
  { id: '2', label: 'Windshield and windows condition', checked: false, category: 'exterior' },
  { id: '3', label: 'Lights (headlights, taillights, indicators)', checked: false, category: 'exterior' },
  { id: '4', label: 'Tires tread depth and pressure', checked: false, category: 'tires' },
  { id: '5', label: 'Spare tire and jack present', checked: false, category: 'tires' },
  { id: '6', label: 'Interior cleanliness', checked: false, category: 'interior' },
  { id: '7', label: 'Seats and upholstery condition', checked: false, category: 'interior' },
  { id: '8', label: 'Dashboard and controls functional', checked: false, category: 'interior' },
  { id: '9', label: 'Engine oil level and condition', checked: false, category: 'engine' },
  { id: '10', label: 'Coolant and brake fluid levels', checked: false, category: 'engine' },
  { id: '11', label: 'Battery condition and terminals', checked: false, category: 'engine' },
  { id: '12', label: 'Registration and insurance documents present', checked: false, category: 'documents' },
  { id: '13', label: 'Keys and remote controls present', checked: false, category: 'documents' },
  { id: '14', label: 'Fuel level noted', checked: false, category: 'other' },
];

const CATEGORY_LABELS: Record<string, string> = {
  exterior: 'Exterior',
  interior: 'Interior',
  engine: 'Engine & Fluids',
  tires: 'Tires & Wheels',
  documents: 'Documents & Accessories',
  other: 'Other',
};

export function VehicleChecklistForm({ assignmentId, appointmentId, vehicleInfo, onComplete }: VehicleChecklistFormProps) {
  const [items, setItems] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST_ITEMS);
  const [overallCondition, setOverallCondition] = useState<VehicleChecklist['overall_condition']>('good');
  const [notes, setNotes] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['exterior', 'interior', 'engine', 'tires', 'documents', 'other']));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutate: saveChecklist } = useCreateOrUpdateChecklist();
  const { mutate: submitChecklist } = useSubmitChecklist();

  useEffect(() => {
    const loadExisting = async () => {
      try {
        const res = await workflowApi.getChecklist(assignmentId);
        if (res.success && res.data?.checklist) {
          const checklist = res.data.checklist;
          setItems(checklist.items);
          setOverallCondition(checklist.overall_condition);
          setNotes(checklist.notes || '');
        }
      } catch (e) {
        // No existing checklist, use defaults
      }
    };
    loadExisting();
  }, [assignmentId]);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const updateItemNote = (id: string, note: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, notes: note } : item));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const getCategoryItems = (category: string) => items.filter(item => item.category === category);
  const getCategoryProgress = (category: string) => {
    const catItems = getCategoryItems(category);
    if (catItems.length === 0) return 0;
    return Math.round((catItems.filter(i => i.checked).length / catItems.length) * 100);
  };

  const handleSaveDraft = () => {
    saveChecklist({ assignmentId, data: { items, overall_condition, notes } });
    toast.success('Checklist saved as draft');
  };

  const handleSubmit = () => {
    const uncheckedCount = items.filter(i => !i.checked).length;
    if (uncheckedCount > 0) {
      toast.warning(`${uncheckedCount} items are unchecked. Please review.`);
    }
    setIsSubmitting(true);
    submitChecklist(assignmentId, {
      onSettled: () => setIsSubmitting(false),
      onSuccess: () => {
        toast.success('Checklist submitted for review');
        onComplete?.();
      },
      onError: () => toast.error('Failed to submit checklist'),
    });
  };

  const categories = Array.from(new Set(items.map(i => i.category)));

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Vehicle Pre-Pickup Checklist
        </CardTitle>
        <CardDescription>
          {vehicleInfo ? `${vehicleInfo.make} ${vehicleInfo.model} (${vehicleInfo.year})` : 'Complete vehicle inspection before pickup'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {categories.map(category => {
          const catItems = getCategoryItems(category);
          const progress = getCategoryProgress(category);
          const isExpanded = expandedCategories.has(category);

          return (
            <div key={category} className="border rounded-lg">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{CATEGORY_LABELS[category] || category}</span>
                  <Badge variant={progress === 100 ? 'default' : progress > 0 ? 'secondary' : 'outline'}>
                    {progress}%
                  </Badge>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {catItems.map(item => (
                    <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-md">
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                          item.checked ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'
                        }`}
                      >
                        {item.checked && <Check className="h-3 w-3" />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${item.checked ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {item.label}
                        </p>
                        <Textarea
                          placeholder="Add notes (optional)"
                          value={item.notes || ''}
                          onChange={(e) => updateItemNote(item.id, e.target.value)}
                          className="mt-2 h-16 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="space-y-2">
          <Label htmlFor="overall_condition">Overall Vehicle Condition</Label>
          <select
            id="overall_condition"
            value={overallCondition}
            onChange={(e) => setOverallCondition(e.target.value as VehicleChecklist['overall_condition'])}
            className="w-full border rounded-md p-2"
          >
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional observations..."
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={handleSaveDraft} className="flex-1">
            Save Draft
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Submitting...' : 'Submit Checklist'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
