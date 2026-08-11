import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Clock, MapPin, Calendar, Car, CheckCircle2, Star, Download, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/services/api';
import type { Appointment } from '@/services/api';

interface AppointmentListProps {
  appointments: Appointment[];
  onConfirmReturn?: (appointment: Appointment) => void;
  onSendInvoice?: (appointment: Appointment) => void;
  onDownloadInvoice?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  refreshTrigger?: number;
}

export function AppointmentList({ 
  appointments, 
  onConfirmReturn, 
  onCancel,
  refreshTrigger 
}: AppointmentListProps) {
  
  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'confirmed':
        return 'Confirmed';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const handleCancel = async (appointment: Appointment) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    
    try {
      await api.cancelAppointment(appointment.id);
      toast.success('Appointment cancelled successfully');
      onCancel?.(appointment);
    } catch (error) {
      toast.error('Failed to cancel appointment');
    }
  };

  const handleSendInvoice = async (appointment: Appointment) => {
    try {
      const response = await api.sendInvoice(appointment.id);
      if (response.success) {
        toast.success('Invoice sent successfully');
      } else {
        toast.error(response.message || 'Failed to send invoice');
      }
    } catch (error) {
      toast.error('Failed to send invoice');
    }
  };

  const handleDownloadInvoice = async (appointment: Appointment) => {
    try {
      const blob = await api.downloadInvoicePdf(appointment.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${appointment.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-1">No appointments found</h3>
        <p className="text-sm text-slate-500">Book a service to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <Card key={appointment.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">
                {appointment.service?.name || `Appointment #${appointment.id}`}
              </CardTitle>
              <Badge className={getStatusColor(appointment.status)}>
                {getStatusLabel(appointment.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(appointment.appointment_date)}</span>
              </div>
              {appointment.total_amount && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="font-medium">KES {Number(appointment.total_amount).toLocaleString()}</span>
                </div>
              )}
            </div>
            
            {appointment.vehicle && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Car className="h-4 w-4" />
                <span>
                  {appointment.vehicle.year} {appointment.vehicle.make} {appointment.vehicle.model}
                  {appointment.vehicle.license_plate && <span className="text-slate-400 ml-2">({appointment.vehicle.license_plate})</span>}
                </span>
              </div>
            )}
            
            {appointment.notes && (
              <p className="text-sm text-slate-500 italic">"{appointment.notes}"</p>
            )}
            
            {/* Confirmation Button */}
            {appointment.status === 'completed' && onConfirmReturn && (
              <div className="pt-3 border-t">
                <Button 
                  className="w-full"
                  onClick={() => onConfirmReturn(appointment)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Return & Rate Service
                </Button>
              </div>
            )}

            {/* Invoice Section */}
            {appointment.status === 'completed' && (
              <div className="pt-3 border-t">
                {appointment.invoice ? (
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Invoice {appointment.invoice.invoice_number} ({appointment.invoice.status})
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvoice(appointment)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={() => handleSendInvoice(appointment)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Get Invoice
                  </Button>
                )}
              </div>
            )}

            {/* Cancel Button for scheduled/confirmed appointments */}
            {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && onCancel && (
              <div className="pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700"
                  onClick={() => handleCancel(appointment)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Appointment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
