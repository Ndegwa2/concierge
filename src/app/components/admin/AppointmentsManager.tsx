import { useState, useRef, useEffect } from 'react';
import { Search, Filter, Download, Eye, Edit, Trash2, Phone, Mail, Loader2, UserPlus, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { useAllAppointmentsAdmin, useUpdateAppointment, useCancelAppointment, useAssignEmployee, useEmployees } from '@/hooks/useApi';
import type { Appointment, User, Vehicle, Service } from '@/services/api';

interface AppointmentRow extends Appointment {
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  vehicle_info?: string;
  service_name?: string;
}

export function AppointmentsManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRow | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [assignNotes, setAssignNotes] = useState('');
  const [editForm, setEditForm] = useState({
    status: '',
    notes: '',
    appointment_date: '',
    total_amount: '',
    payment_status: '',
  });

  const { data: rawAppointments = [], isLoading: loading, error, refetch } = useAllAppointmentsAdmin(statusFilter !== 'all' ? statusFilter : undefined);
  const updateMutation = useUpdateAppointment();
  const cancelMutation = useCancelAppointment();
  const assignMutation = useAssignEmployee();
  const { data: activeEmployees = [], isLoading: employeesLoading } = useEmployees('active');

  const appointments: AppointmentRow[] = (rawAppointments || []).map((apt: Appointment) => {
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

  const lastSeenAppointmentId = useRef<number | null>(null);
  useEffect(() => {
    if (loading || appointments.length === 0) return;
    const newest = Math.max(...appointments.map(a => a.id));
    if (lastSeenAppointmentId.current === null) {
      lastSeenAppointmentId.current = newest;
      return;
    }
    const fresh = appointments
      .filter(a => a.id > (lastSeenAppointmentId.current as number))
      .sort((a, b) => a.id - b.id);
    fresh.forEach(a => {
      toast.info(`New appointment #${a.id} from ${a.customer_name} — ${a.service_name}`, {
        description: `${a.vehicle_info} • ${new Date(a.appointment_date).toLocaleString()}`,
        action: {
          label: 'View',
          onClick: () => {
            setSelectedAppointment(a);
            setViewDialogOpen(true);
          },
        },
      });
    });
    lastSeenAppointmentId.current = newest;
  }, [appointments, loading]);

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
      case 'rescheduled':
        return 'bg-purple-100 text-purple-800 border-purple-200';
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

  const handleView = (appointment: AppointmentRow) => {
    setSelectedAppointment(appointment);
    setViewDialogOpen(true);
  };

  const handleEdit = (appointment: AppointmentRow) => {
    setSelectedAppointment(appointment);
    setEditForm({
      status: appointment.status,
      notes: appointment.notes || '',
      appointment_date: appointment.appointment_date ? appointment.appointment_date.slice(0, 16) : '',
      total_amount: appointment.total_amount?.toString() || '',
      payment_status: appointment.payment_status,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (appointment: AppointmentRow) => {
    setSelectedAppointment(appointment);
    setDeleteDialogOpen(true);
  };

  const handleAssign = (appointment: AppointmentRow) => {
    setSelectedAppointment(appointment);
    setSelectedEmployeeId('');
    setAssignNotes('');
    setAssignDialogOpen(true);
  };

  const submitAssign = async () => {
    if (!selectedAppointment) return;
    if (!selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }
    try {
      const response = await assignMutation.mutateAsync({
        appointmentId: selectedAppointment.id,
        employeeId: Number(selectedEmployeeId),
        notes: assignNotes.trim() || undefined,
      });
      if (response.success) {
        toast.success('Employee assigned — customer, admin, and employee have been notified.');
        setAssignDialogOpen(false);
        setSelectedAppointment(null);
        setSelectedEmployeeId('');
        setAssignNotes('');
      } else {
        toast.error(response.message || 'Failed to assign employee');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign employee');
    }
  };

  const canAssign = (status: string) => status === 'scheduled' || status === 'confirmed';

  const confirmDelete = async () => {
    if (!selectedAppointment) return;
    try {
      const response = await cancelMutation.mutateAsync(selectedAppointment.id);
      if (response.success) {
        toast.success('Appointment deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedAppointment(null);
      } else {
        toast.error(response.message || 'Failed to delete appointment');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete appointment');
    }
  };

  const submitEdit = async () => {
    if (!selectedAppointment) return;
    try {
      const response = await updateMutation.mutateAsync({
        id: selectedAppointment.id,
        data: {
          status: editForm.status as Appointment['status'],
          notes: editForm.notes,
          appointment_date: editForm.appointment_date ? new Date(editForm.appointment_date).toISOString() : undefined,
          total_amount: editForm.total_amount ? parseFloat(editForm.total_amount) : undefined,
          payment_status: editForm.payment_status as Appointment['payment_status'],
        },
      });
      if (response.success) {
        toast.success('Appointment updated successfully');
        setEditDialogOpen(false);
        setSelectedAppointment(null);
      } else {
        toast.error(response.message || 'Failed to update appointment');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update appointment');
    }
  };

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
          <p className="text-red-600">{error instanceof Error ? error.message : String(error)}</p>
          <Button onClick={refetch} className="mt-4">Retry</Button>
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
                <SelectItem value="rescheduled">Rescheduled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={refetch}>
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
                          {canAssign(appointment.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAssign(appointment)}
                              title="Assign employee"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleView(appointment)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(appointment)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(appointment)}>
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

      {/* View Appointment Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              Appointment #{selectedAppointment?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Customer</p>
                  <p className="font-medium">{selectedAppointment.customer_name}</p>
                  <p className="text-sm text-slate-600">{selectedAppointment.customer_email}</p>
                  {selectedAppointment.customer_phone && (
                    <p className="text-sm text-slate-600">{selectedAppointment.customer_phone}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Service</p>
                  <p className="font-medium">{selectedAppointment.service_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Vehicle</p>
                  <p className="font-medium">{selectedAppointment.vehicle_info}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Date & Time</p>
                  <p className="font-medium">{new Date(selectedAppointment.appointment_date).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Status</p>
                  <Badge className={getStatusColor(selectedAppointment.status)}>
                    {getStatusLabel(selectedAppointment.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Price</p>
                  <p className="font-medium">
                    {selectedAppointment.total_amount ? `KES ${Number(selectedAppointment.total_amount).toLocaleString()}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Payment Status</p>
                  <p className="font-medium capitalize">{selectedAppointment.payment_status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Created</p>
                  <p className="font-medium">{new Date(selectedAppointment.created_at).toLocaleString()}</p>
                </div>
              </div>
              {selectedAppointment.notes && (
                <div>
                  <p className="text-sm font-medium text-slate-500">Notes</p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-md">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>
              Update appointment #{selectedAppointment?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointment_date">Date & Time</Label>
                <Input
                  id="appointment_date"
                  type="datetime-local"
                  value={editForm.appointment_date}
                  onChange={(e) => setEditForm({ ...editForm, appointment_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_amount">Total Amount (KES)</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  value={editForm.total_amount}
                  onChange={(e) => setEditForm({ ...editForm, total_amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_status">Payment Status</Label>
                <Select value={editForm.payment_status} onValueChange={(value) => setEditForm({ ...editForm, payment_status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Employee Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Employee</DialogTitle>
            <DialogDescription>
              Assign a concierge to appointment #{selectedAppointment?.id}. The employee and admins will be notified by email and in-app.
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="rounded-md bg-slate-50 p-3 text-sm space-y-1">
                <p><span className="font-medium">Customer:</span> {selectedAppointment.customer_name}</p>
                <p><span className="font-medium">Service:</span> {selectedAppointment.service_name}</p>
                <p><span className="font-medium">Vehicle:</span> {selectedAppointment.vehicle_info}</p>
                <p><span className="font-medium">Scheduled:</span> {new Date(selectedAppointment.appointment_date).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee">Active Employee</Label>
                <Select
                  value={selectedEmployeeId}
                  onValueChange={setSelectedEmployeeId}
                  disabled={employeesLoading}
                >
                  <SelectTrigger id="employee">
                    <SelectValue placeholder={employeesLoading ? 'Loading employees…' : 'Select an active employee'} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEmployees.length === 0 && !employeesLoading ? (
                      <SelectItem value="__none__" disabled>No active employees available</SelectItem>
                    ) : (
                      activeEmployees.map((emp: any) => {
                        const profile = emp.employee || {};
                        const name = emp.name || profile.full_name || `Employee #${profile.id ?? emp.id ?? ''}`;
                        const email = emp.email || '';
                        const empId = profile.id ?? emp.id;
                        return (
                          <SelectItem key={empId} value={String(empId)}>
                            {name}{email ? ` — ${email}` : ''}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Only employees with status "active" are listed.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assign_notes">Notes (optional)</Label>
                <Textarea
                  id="assign_notes"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  rows={3}
                  placeholder="Special instructions for the employee…"
                />
              </div>
              <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-xs text-blue-900">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  On confirm, the employee will receive an in-app notification and an email,
                  and the appointment status will move to <strong>Confirmed</strong>.
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
              disabled={assignMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submitAssign}
              disabled={assignMutation.isPending || !selectedEmployeeId}
            >
              {assignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete appointment #{selectedAppointment?.id}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={cancelMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
