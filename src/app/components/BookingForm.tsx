import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Car, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/services/api';
import type { Service, Vehicle } from '@/services/api';

interface BookingFormProps {
  selectedService?: string;
  onClose: () => void;
}

export function BookingForm({ selectedService, onClose }: BookingFormProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    service_id: selectedService ? parseInt(selectedService) : 0,
    vehicle_id: 0,
    appointment_date: '',
    notes: ''
  });

  useEffect(() => {
    loadServices();
    loadVehicles();
  }, []);

  const loadServices = async () => {
    try {
      const response = await api.getServices();
      if (response.success && response.data?.services) {
        setServices(response.data.services);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
      toast.error('Failed to load services');
    } finally {
      setIsLoadingServices(false);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await api.getVehicles();
      if (response.success && response.data?.vehicles) {
        setVehicles(response.data.vehicles);
      }
    } catch (error) {
      console.error('Failed to load vehicles:', error);
      toast.error('Failed to load your vehicles');
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.service_id) {
      toast.error('Please select a service');
      return;
    }
    
    if (!formData.vehicle_id) {
      toast.error('Please select a vehicle');
      return;
    }
    
    if (!formData.appointment_date) {
      toast.error('Please select a date and time');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await api.createAppointment({
        vehicle_id: formData.vehicle_id,
        service_id: formData.service_id,
        appointment_date: new Date(formData.appointment_date).toISOString(),
        notes: formData.notes
      });

      if (response.success) {
        toast.success('Booking confirmed! We will confirm your appointment shortly.');
        onClose();
      } else {
        toast.error(response.message || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedServiceData = services.find(s => s.id === formData.service_id);
  const selectedVehicleData = vehicles.find(v => v.id === formData.vehicle_id);

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
              value={formData.service_id.toString()} 
              onValueChange={(value) => setFormData({ ...formData, service_id: parseInt(value) })}
              disabled={isLoadingServices}
            >
              <SelectTrigger id="service">
                <SelectValue placeholder={isLoadingServices ? "Loading services..." : "Select a service"} />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    {service.name} {service.price ? `- KES ${service.price.toLocaleString()}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedServiceData && (
              <p className="text-xs text-slate-500 mt-1">
                Duration: {selectedServiceData.duration || 60} mins
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Select Vehicle
            </Label>
            <Select 
              value={formData.vehicle_id.toString()} 
              onValueChange={(value) => setFormData({ ...formData, vehicle_id: parseInt(value) })}
              disabled={isLoadingVehicles}
            >
              <SelectTrigger id="vehicle">
                <SelectValue placeholder={isLoadingVehicles ? "Loading vehicles..." : "Select a vehicle"} />
              </SelectTrigger>
              <SelectContent>
                {vehicles.length === 0 ? (
                  <div className="p-2 text-sm text-slate-500">
                    No vehicles registered. Please add a vehicle first.
                  </div>
                ) : (
                  vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.license_plate ? `(${vehicle.license_plate})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedVehicleData && (
              <p className="text-xs text-slate-500 mt-1">
                {selectedVehicleData.color && <span>{selectedVehicleData.color}</span>}
                {selectedVehicleData.color && selectedVehicleData.license_plate && <span> • </span>}
                {selectedVehicleData.license_plate && <span>{selectedVehicleData.license_plate}</span>}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Preferred Date & Time
            </Label>
            <Input 
              id="date" 
              type="datetime-local" 
              value={formData.appointment_date}
              onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
              required
              min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
            />
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
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={isSubmitting || vehicles.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                'Confirm Booking'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
          
          {vehicles.length === 0 && !isLoadingVehicles && (
            <p className="text-xs text-amber-600 text-center mt-2">
              Please add a vehicle in your profile before booking.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
