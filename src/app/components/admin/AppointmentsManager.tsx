import { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, Edit, Trash2, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { api } from '@/services/api';
import type { Appointment, User, Vehicle, Service } from '@/services/api';

interface AppointmentRow extends Appointment {
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  vehicle_info?: string;
  service_name?: string;
}

export function AppointmentsManager() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getAllAppointmentsAdmin();
      if (response.success && response.data) {
        const enriched = (response.data.appointments || []).map((apt: Appointment) => {
          const customer = apt.customer as User | undefined;
          const vehicle = apt.vehicle as Vehicle | undefined;
          const service = apt.service as Service | undefined;
          return {
            ...apt,
            customer_name: customer?.name || `Customer #${apt.user_id}`,
            customer_phone: customer?.phone || '',
            customer_email: customer?.email || '',
            vehicle_info: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : `Vehicle #${apt.vehicle_id}`,
            service_name: service?.name || `Service #${apt.service_id}`,
          };
        });
        setAppointments(enriched);
      }
    } catch (err) {
      setError('Failed to load appointments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled':
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = 
      appointment.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.id.toString().includes(searchQuery) ||
      appointment.vehicle_info?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Appointments Manager</h1>
          <p className="text-slate-600">Loading appointments...</p>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-slate-200 rounded"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Appointments Manager</h1>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchAppointments} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Appointments Manager</h1>
        <p className="text-slate-600">View and manage all service appointments</p>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by customer, ID, or vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchAppointments}>
              <Download className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Appointments</CardTitle>
              <CardDescription>{filteredAppointments.length} appointments found</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No appointments found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-medium">#{appointment.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{appointment.customer_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <p className="text-xs text-slate-500">{appointment.customer_email}</p>
                          </div>
                          {appointment.customer_phone && (
                            <div className="flex items-center gap-2 mt-1">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <p className="text-xs text-slate-500">{appointment.customer_phone}</p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{appointment.service_name}</TableCell>
                      <TableCell className="text-sm">{appointment.vehicle_info}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{new Date(appointment.appointment_date).toLocaleDateString()}</p>
                          <p className="text-xs text-slate-500">{new Date(appointment.appointment_date).toLocaleTimeString()}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(appointment.status)}>
                          {getStatusLabel(appointment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {appointment.total_amount ? `KES ${Number(appointment.total_amount).toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
