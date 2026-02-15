import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Clock, MapPin, Calendar, Car, CheckCircle2, Star } from 'lucide-react';

interface Appointment {
  id: string;
  service: string;
  date: string;
  time: string;
  location: string;
  vehicle: string;
  status: 'pending' | 'in-progress' | 'completed' | 'awaiting-confirmation';
  concierge?: string;
  confirmed?: boolean;
}

interface AppointmentListProps {
  appointments: Appointment[];
  onConfirmReturn?: (appointment: Appointment) => void;
}

export function AppointmentList({ appointments, onConfirmReturn }: AppointmentListProps) {
  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'awaiting-confirmation':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStatusLabel = (status: Appointment['status']) => {
    switch (status) {
      case 'pending':
        return 'Scheduled';
      case 'in-progress':
        return 'In Progress';
      case 'awaiting-confirmation':
        return 'Awaiting Confirmation';
      case 'completed':
        return 'Completed';
    }
  };

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <Card key={appointment.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">{appointment.service}</CardTitle>
              <Badge className={getStatusColor(appointment.status)}>
                {getStatusLabel(appointment.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="h-4 w-4" />
                <span>{appointment.date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4" />
                <span>{appointment.time}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="h-4 w-4" />
              <span>{appointment.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Car className="h-4 w-4" />
              <span>{appointment.vehicle}</span>
            </div>
            {appointment.concierge && (
              <div className="pt-2 border-t text-sm">
                <span className="text-slate-500">Concierge: </span>
                <span className="font-medium">{appointment.concierge}</span>
              </div>
            )}
            
            {/* Confirmation Button */}
            {appointment.status === 'awaiting-confirmation' && onConfirmReturn && (
              <div className="pt-3 border-t">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg mb-3">
                  <p className="text-sm text-purple-900 font-medium mb-1">
                    Action Required: Confirm Vehicle Return
                  </p>
                  <p className="text-xs text-purple-700">
                    Please inspect your vehicle and confirm receipt
                  </p>
                </div>
                <Button 
                  className="w-full"
                  onClick={() => onConfirmReturn(appointment)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Return & Rate Service
                </Button>
              </div>
            )}

            {/* Confirmed Status */}
            {appointment.status === 'completed' && appointment.confirmed && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Confirmed & Rated</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}