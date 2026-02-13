import { useState } from 'react';
import { Calendar, Clock, MapPin, Car } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';

interface BookingFormProps {
  selectedService?: string;
  onClose: () => void;
}

export function BookingForm({ selectedService, onClose }: BookingFormProps) {
  const [formData, setFormData] = useState({
    service: selectedService || '',
    date: '',
    time: '',
    pickupLocation: '',
    vehicleMake: '',
    vehicleModel: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Booking submitted:', formData);
    // Show success message
    alert('Booking request submitted! We will confirm your appointment shortly.');
    onClose();
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Book Your Service</CardTitle>
        <CardDescription>
          Fill in the details below and we'll take care of the rest
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="service">Service Type</Label>
            <Select 
              value={formData.service} 
              onValueChange={(value) => setFormData({ ...formData, service: value })}
            >
              <SelectTrigger id="service">
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="car-wash">Premium Car Wash</SelectItem>
                <SelectItem value="oil-change">Oil Change</SelectItem>
                <SelectItem value="tire-rotation">Tire Rotation</SelectItem>
                <SelectItem value="inspection">Vehicle Inspection</SelectItem>
                <SelectItem value="brake-service">Brake Service</SelectItem>
                <SelectItem value="detailing">Full Detailing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Preferred Date
              </Label>
              <Input 
                id="date" 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Preferred Time
              </Label>
              <Select 
                value={formData.time}
                onValueChange={(value) => setFormData({ ...formData, time: value })}
              >
                <SelectTrigger id="time">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="08:00">8:00 AM</SelectItem>
                  <SelectItem value="10:00">10:00 AM</SelectItem>
                  <SelectItem value="12:00">12:00 PM</SelectItem>
                  <SelectItem value="14:00">2:00 PM</SelectItem>
                  <SelectItem value="16:00">4:00 PM</SelectItem>
                  <SelectItem value="18:00">6:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickup" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Pickup Location
            </Label>
            <Input 
              id="pickup" 
              placeholder="Enter your address"
              value={formData.pickupLocation}
              onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Vehicle Make
              </Label>
              <Input 
                id="make" 
                placeholder="e.g., Toyota"
                value={formData.vehicleMake}
                onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Vehicle Model</Label>
              <Input 
                id="model" 
                placeholder="e.g., Camry"
                value={formData.vehicleModel}
                onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea 
              id="notes" 
              placeholder="Any special instructions or concerns..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Confirm Booking
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
