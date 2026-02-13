import { useState } from 'react';
import { 
  CheckCircle2, 
  Star, 
  AlertTriangle, 
  Camera,
  X,
  ThumbsUp,
  MessageSquare,
  Car
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';

interface VehicleReturnConfirmationProps {
  open: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    service: string;
    vehicle: string;
    concierge: string;
    date: string;
    time: string;
  };
  onSubmit: (data: ConfirmationData) => void;
}

export interface ConfirmationData {
  conditionRating: number;
  serviceRating: number;
  conciergeBehaviorRating: number;
  vehicleConditionChecks: {
    exteriorClean: boolean;
    interiorClean: boolean;
    noNewDamages: boolean;
    allItemsPresent: boolean;
  };
  hasIssues: boolean;
  issueDescription?: string;
  feedback: string;
}

export function VehicleReturnConfirmation({ 
  open, 
  onClose, 
  appointment,
  onSubmit 
}: VehicleReturnConfirmationProps) {
  const [step, setStep] = useState<'inspection' | 'rating' | 'confirmation'>('inspection');
  const [conditionRating, setConditionRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [conciergeBehaviorRating, setConciergeBehaviorRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [hasIssues, setHasIssues] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  
  const [vehicleChecks, setVehicleChecks] = useState({
    exteriorClean: false,
    interiorClean: false,
    noNewDamages: false,
    allItemsPresent: false
  });

  const handleCheckChange = (key: keyof typeof vehicleChecks) => {
    setVehicleChecks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const allChecksCompleted = Object.values(vehicleChecks).every(check => check);

  const handleSubmit = () => {
    const data: ConfirmationData = {
      conditionRating,
      serviceRating,
      conciergeBehaviorRating,
      vehicleConditionChecks: vehicleChecks,
      hasIssues,
      issueDescription: hasIssues ? issueDescription : undefined,
      feedback
    };
    onSubmit(data);
  };

  const StarRating = ({ rating, setRating, label }: { rating: number; setRating: (r: number) => void; label: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-slate-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-slate-600">
          {rating > 0 ? `${rating}/5` : 'Not rated'}
        </span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Vehicle Return Confirmation
          </DialogTitle>
          <DialogDescription>
            Appointment #{appointment.id} - {appointment.service}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Vehicle Inspection */}
        {step === 'inspection' && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Vehicle Inspection Required</h4>
                  <p className="text-sm text-blue-800">
                    Please inspect your vehicle carefully before confirming receipt. Check all items below.
                  </p>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Vehicle:</span>
                  <span className="font-medium">{appointment.vehicle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Service:</span>
                  <span className="font-medium">{appointment.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Concierge:</span>
                  <span className="font-medium">{appointment.concierge}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Completed:</span>
                  <span className="font-medium">{appointment.date} at {appointment.time}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vehicle Condition Checklist</CardTitle>
                <CardDescription>Please verify all items before proceeding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="exteriorClean" 
                    checked={vehicleChecks.exteriorClean}
                    onCheckedChange={() => handleCheckChange('exteriorClean')}
                  />
                  <div className="flex-1">
                    <Label htmlFor="exteriorClean" className="font-medium cursor-pointer">
                      Exterior is clean and in good condition
                    </Label>
                    <p className="text-sm text-slate-500">No new scratches, dents, or damages visible</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="interiorClean" 
                    checked={vehicleChecks.interiorClean}
                    onCheckedChange={() => handleCheckChange('interiorClean')}
                  />
                  <div className="flex-1">
                    <Label htmlFor="interiorClean" className="font-medium cursor-pointer">
                      Interior is clean and organized
                    </Label>
                    <p className="text-sm text-slate-500">Seats, dashboard, and floor mats are clean</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="noNewDamages" 
                    checked={vehicleChecks.noNewDamages}
                    onCheckedChange={() => handleCheckChange('noNewDamages')}
                  />
                  <div className="flex-1">
                    <Label htmlFor="noNewDamages" className="font-medium cursor-pointer">
                      No new damages detected
                    </Label>
                    <p className="text-sm text-slate-500">Vehicle is in the same or better condition</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="allItemsPresent" 
                    checked={vehicleChecks.allItemsPresent}
                    onCheckedChange={() => handleCheckChange('allItemsPresent')}
                  />
                  <div className="flex-1">
                    <Label htmlFor="allItemsPresent" className="font-medium cursor-pointer">
                      All personal items are present
                    </Label>
                    <p className="text-sm text-slate-500">Keys, documents, and belongings are returned</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Report an Issue</CardTitle>
                <CardDescription>Did you notice any problems?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="hasIssues" 
                    checked={hasIssues}
                    onCheckedChange={(checked) => setHasIssues(checked as boolean)}
                  />
                  <Label htmlFor="hasIssues" className="font-medium cursor-pointer">
                    I found an issue with my vehicle
                  </Label>
                </div>

                {hasIssues && (
                  <div className="space-y-2 pl-7">
                    <Label htmlFor="issueDescription">Describe the issue</Label>
                    <Textarea
                      id="issueDescription"
                      placeholder="Please describe the issue in detail..."
                      value={issueDescription}
                      onChange={(e) => setIssueDescription(e.target.value)}
                      rows={4}
                    />
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Camera className="h-4 w-4" />
                      <span>Our support team will contact you shortly to resolve this issue</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={() => setStep('rating')}
                disabled={!allChecksCompleted}
              >
                Continue to Rating
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Rating */}
        {step === 'rating' && (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <ThumbsUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900 mb-1">Share Your Experience</h4>
                  <p className="text-sm text-green-800">
                    Your feedback helps us maintain high-quality service standards
                  </p>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Rate Your Experience</CardTitle>
                <CardDescription>How would you rate the following aspects?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <StarRating 
                  rating={serviceRating}
                  setRating={setServiceRating}
                  label="Overall Service Quality"
                />

                <div className="border-t pt-6">
                  <StarRating 
                    rating={conditionRating}
                    setRating={setConditionRating}
                    label="Vehicle Condition Upon Return"
                  />
                </div>

                <div className="border-t pt-6">
                  <StarRating 
                    rating={conciergeBehaviorRating}
                    setRating={setConciergeBehaviorRating}
                    label={`Concierge Performance - ${appointment.concierge}`}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Additional Feedback
                </CardTitle>
                <CardDescription>Share any additional comments or suggestions (optional)</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Tell us about your experience..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep('inspection')}>
                Back
              </Button>
              <Button 
                onClick={() => setStep('confirmation')}
                disabled={serviceRating === 0 || conditionRating === 0 || conciergeBehaviorRating === 0}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 'confirmation' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Review Your Confirmation</h3>
              <p className="text-slate-600">Please verify the information before submitting</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Vehicle Inspection Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Exterior condition</span>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    ✓ Confirmed
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Interior condition</span>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    ✓ Confirmed
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">No new damages</span>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    ✓ Confirmed
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">All items present</span>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    ✓ Confirmed
                  </Badge>
                </div>
                {hasIssues && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm font-medium text-yellow-900 mb-1">Issue Reported:</p>
                    <p className="text-sm text-yellow-800">{issueDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Ratings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Overall Service Quality</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < serviceRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Vehicle Condition</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < conditionRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Concierge Performance</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < conciergeBehaviorRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {feedback && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{feedback}</p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep('rating')}>
                Back
              </Button>
              <Button onClick={handleSubmit}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Confirmation
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}