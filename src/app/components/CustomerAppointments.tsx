import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Car,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  Download,
  Send,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { toast } from 'sonner';
import { useAppointments } from '@/hooks/useApi';
import { appointmentsApi } from '@/services/api';
import type { Appointment } from '@/services/api';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  scheduled: { color: 'text-blue-700', bg: 'bg-blue-50', label: 'Scheduled', icon: Clock },
  confirmed: { color: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Confirmed', icon: CheckCircle2 },
  'in-progress': { color: 'text-amber-700', bg: 'bg-amber-50', label: 'In Progress', icon: Clock },
  completed: { color: 'text-slate-700', bg: 'bg-slate-100', label: 'Completed', icon: CheckCircle2 },
  cancelled: { color: 'text-red-700', bg: 'bg-red-50', label: 'Cancelled', icon: XCircle },
  rescheduled: { color: 'text-purple-700', bg: 'bg-purple-50', label: 'Rescheduled', icon: Calendar },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function CustomerAppointments({ onConfirmReturn }: { onConfirmReturn?: (appointment: Appointment) => void }) {
  const { data: appointments = [], isLoading: appointmentsLoading, refetch: refetchAppointments } = useAppointments();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('upcoming');

  const upcomingAppointments = appointments.filter(a =>
    a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'in-progress'
  );
  const completedAppointments = appointments.filter(a => a.status === 'completed');
  const cancelledAppointments = appointments.filter(a => a.status === 'cancelled');

  const filteredUpcoming = upcomingAppointments.filter(a => {
    const matchesSearch =
      (a.service?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.id).includes(searchQuery) ||
      (a.vehicle?.make || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.vehicle?.model || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredCompleted = completedAppointments.filter(a => {
    const matchesSearch =
      (a.service?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.id).includes(searchQuery) ||
      (a.vehicle?.make || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.vehicle?.model || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredCancelled = cancelledAppointments.filter(a => {
    const matchesSearch =
      (a.service?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.id).includes(searchQuery);
    return matchesSearch;
  });

  const handleCancel = async (appointment: Appointment) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      await appointmentsApi.cancelAppointment(appointment.id);
      toast.success('Appointment cancelled successfully');
      refetchAppointments();
    } catch (error) {
      toast.error('Failed to cancel appointment');
    }
  };

  const handleSendInvoice = async (appointment: Appointment) => {
    try {
      const response = await appointmentsApi.sendInvoice(appointment.id);
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
      const blob = await appointmentsApi.downloadInvoicePdf(appointment.id);
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

  const AppointmentCard = ({ appointment, index }: { appointment: Appointment; index: number }) => {
    const status = statusConfig[appointment.status] || statusConfig.scheduled;
    const StatusIcon = status.icon;

    return (
      <motion.div variants={item} transition={{ delay: index * 0.08 }}>
        <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
          <div className={`h-1.5 ${status.bg}`} />
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${status.bg}`}>
                  <StatusIcon className={`h-5 w-5 ${status.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {appointment.service?.name || `Appointment #${appointment.id}`}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {formatDate(appointment.appointment_date)}
                  </p>
                </div>
              </div>
              <Badge className={`${status.color} ${status.bg} border-0`}>
                {status.label}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {appointment.vehicle && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                  <Car className="h-4 w-4 text-slate-400" />
                  <span>
                    {appointment.vehicle.year} {appointment.vehicle.make} {appointment.vehicle.model}
                    {appointment.vehicle.license_plate && (
                      <span className="text-slate-400 ml-1.5">({appointment.vehicle.license_plate})</span>
                    )}
                  </span>
                </div>
              )}
              {appointment.total_amount && (
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900 bg-slate-50 rounded-lg px-3 py-2">
                  <span>KES {Number(appointment.total_amount).toLocaleString()}</span>
                </div>
              )}
            </div>

            {appointment.notes && (
              <p className="text-sm text-slate-500 italic bg-slate-50 rounded-lg px-3 py-2 mb-4">
                "{appointment.notes}"
              </p>
            )}

            <AnimatePresence mode="wait">
              {appointment.status === 'completed' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  {onConfirmReturn && (
                    <Button
                      className="w-full"
                      onClick={() => onConfirmReturn(appointment)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirm Return & Rate Service
                    </Button>
                  )}

                  {appointment.invoice ? (
                    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        Invoice {appointment.invoice.invoice_number} ({appointment.invoice.status})
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvoice(appointment)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleSendInvoice(appointment)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Get Invoice
                    </Button>
                  )}
                </motion.div>
              )}

              {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleCancel(appointment)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Appointment
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (appointmentsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 bg-slate-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <motion.div
        className="flex flex-col md:flex-row gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by service, vehicle, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rescheduled">Rescheduled</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchAppointments()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <TabsTrigger value="upcoming" className="rounded-lg flex-1 md:flex-none">
            Upcoming ({upcomingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg flex-1 md:flex-none">
            Completed ({completedAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="rounded-lg flex-1 md:flex-none">
            Cancelled ({cancelledAppointments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <AnimatePresence mode="wait">
            {filteredUpcoming.length === 0 ? (
              <motion.div
                key="empty-upcoming"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-16"
              >
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">No upcoming appointments</h3>
                <p className="text-sm text-slate-500">Book a service to get started</p>
              </motion.div>
            ) : (
              <motion.div
                key="list-upcoming"
                className="space-y-4"
                variants={container}
                initial="hidden"
                animate="show"
              >
                {filteredUpcoming.map((apt, i) => (
                  <AppointmentCard key={apt.id} appointment={apt} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <AnimatePresence mode="wait">
            {filteredCompleted.length === 0 ? (
              <motion.div
                key="empty-completed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-16"
              >
                <CheckCircle2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">No completed services yet</h3>
                <p className="text-sm text-slate-500">Your completed appointments will appear here</p>
              </motion.div>
            ) : (
              <motion.div
                key="list-completed"
                className="space-y-4"
                variants={container}
                initial="hidden"
                animate="show"
              >
                {filteredCompleted.map((apt, i) => (
                  <AppointmentCard key={apt.id} appointment={apt} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="cancelled" className="mt-6">
          <AnimatePresence mode="wait">
            {filteredCancelled.length === 0 ? (
              <motion.div
                key="empty-cancelled"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-16"
              >
                <XCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">No cancelled appointments</h3>
                <p className="text-sm text-slate-500">Cancelled appointments will appear here</p>
              </motion.div>
            ) : (
              <motion.div
                key="list-cancelled"
                className="space-y-4"
                variants={container}
                initial="hidden"
                animate="show"
              >
                {filteredCancelled.map((apt, i) => (
                  <AppointmentCard key={apt.id} appointment={apt} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}
