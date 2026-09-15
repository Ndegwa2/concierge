import React, { useState } from 'react';
import { User, Car, Calendar, Crown, Mail, Phone, MapPin, Clock, CheckCircle2, XCircle, Plus, Edit2, Trash2, Shield, Award, Gauge, LogOut, Key, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Separator } from '@/app/components/ui/separator';
import { toast } from 'sonner';
import { useProfile, useAppointments, useVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle, useResetOwnPassword } from '@/hooks/useApi';
import type { Vehicle } from '@/services/api';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
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

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ReactNode }> = {
  scheduled: { variant: 'secondary', label: 'Scheduled', icon: <Clock className="h-3 w-3" /> },
  confirmed: { variant: 'default', label: 'Confirmed', icon: <CheckCircle2 className="h-3 w-3" /> },
  'in-progress': { variant: 'default', label: 'In Progress', icon: <Clock className="h-3 w-3" /> },
  completed: { variant: 'outline', label: 'Completed', icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { variant: 'destructive', label: 'Cancelled', icon: <XCircle className="h-3 w-3" /> },
};

function PasswordResetModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setShowCurrent(false);
    setShowNew(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    try {
      await onSubmit(currentPassword, newPassword);
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-slate-700" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="current-password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pl-10 pr-10"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400">Must be at least 8 characters with uppercase, lowercase, and a number.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </Button>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CustomerProfile({ onLogout }: { onLogout?: () => void } = {}) {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: appointments = [], isLoading: appointmentsLoading } = useAppointments();
  const { data: vehicles = [], isLoading: vehiclesLoading, refetch: refetchVehicles } = useVehicles();
  const resetOwnPassword = useResetOwnPassword();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>();

  const completedAppointments = appointments.filter(a => a.status === 'completed');
  const totalSpent = completedAppointments.reduce((sum, a) => sum + (a.total_amount || 0), 0);
  const loyaltyPoints = Math.floor(totalSpent);

  const upcomingAppointments = appointments
    .filter(a => a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'in-progress')
    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

  const recentCompleted = appointments
    .filter(a => a.status === 'completed')
    .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
    .slice(0, 5);

  const isLoading = profileLoading || appointmentsLoading || vehiclesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-48" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <div className="h-64 bg-slate-200 rounded-xl" />
                <div className="h-96 bg-slate-200 rounded-xl" />
              </div>
              <div className="lg:col-span-2 space-y-6">
                <div className="h-32 bg-slate-200 rounded-xl" />
                <div className="h-64 bg-slate-200 rounded-xl" />
                <div className="h-64 bg-slate-200 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  const handleAddVehicle = () => {
    setEditingVehicle(undefined);
    setVehicleModalOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleModalOpen(true);
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (!confirm(`Are you sure you want to delete ${vehicle.year} ${vehicle.make} ${vehicle.model}?`)) return;
    
    try {
      await deleteVehicle.mutateAsync(vehicle.id);
      toast.success('Vehicle deleted successfully');
      refetchVehicles();
    } catch (error) {
      toast.error('Failed to delete vehicle');
    }
  };

  const handleVehicleSubmit = async (data: Partial<Vehicle>) => {
    try {
      if (editingVehicle) {
        await updateVehicle.mutateAsync({ id: editingVehicle.id, data });
        toast.success('Vehicle updated successfully');
      } else {
        await createVehicle.mutateAsync(data);
        toast.success('Vehicle added successfully');
      }
      refetchVehicles();
    } catch (error) {
      toast.error(editingVehicle ? 'Failed to update vehicle' : 'Failed to add vehicle');
      throw error;
    }
  };

  const handlePasswordReset = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await resetOwnPassword.mutateAsync({
        currentPassword,
        newPassword,
      });
      if (response.success) {
        toast.success('Password updated successfully');
      } else {
        throw new Error(response.message || 'Failed to reset password');
      }
    } catch (error: any) {
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
          {/* Page Header */}
          <div className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
              <p className="text-slate-600 mt-1">Manage your account, vehicles, and service history</p>
            </div>
          </div>

        {/* Main Layout: Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Sidebar - Profile Details & Vehicle Registration */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Profile Overview Card */}
            <Card className="overflow-hidden">
              <div className="bg-slate-900 px-6 py-8">
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 p-3 rounded-xl">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-white">
                    <h2 className="text-xl font-semibold">{profile.name}</h2>
                    <p className="text-slate-300 text-sm mt-0.5 capitalize">{profile.role}</p>
                  </div>
                </div>
              </div>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 text-sm">
                    <Mail className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Email</p>
                      <p className="text-slate-900">{profile.email}</p>
                    </div>
                  </div>
                  {profile.phone && (
                    <div className="flex items-start gap-3 text-sm">
                      <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Phone</p>
                        <p className="text-slate-900">{profile.phone}</p>
                      </div>
                    </div>
                  )}
                  {profile.address && (
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Address</p>
                        <p className="text-slate-900">{profile.address}</p>
                      </div>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-start gap-3 text-sm">
                    <Shield className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Member Since</p>
                      <p className="text-slate-900">{formatDate(profile.created_at)}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-slate-700"
                      onClick={() => setPasswordModalOpen(true)}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{appointments.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Appointments</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{vehicles.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Vehicles</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{loyaltyPoints.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">Points</p>
                </CardContent>
              </Card>
            </div>

            {/* Vehicle Registration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Car className="h-4 w-4 text-slate-500" />
                  Register Vehicle
                </CardTitle>
                <CardDescription>
                  Add a new vehicle to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" className="w-full" size="sm" onClick={handleAddVehicle}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Upcoming Appointments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  Upcoming Appointments
                </CardTitle>
                <CardDescription>
                  {upcomingAppointments.length} upcoming
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No upcoming appointments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingAppointments.slice(0, 4).map(appointment => {
                      const status = statusConfig[appointment.status] || statusConfig.scheduled;
                      return (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-900 truncate">
                              {appointment.service?.name || `Appointment #${appointment.id}`}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatDate(appointment.appointment_date)}
                            </p>
                            {appointment.vehicle && (
                              <p className="text-xs text-slate-400 mt-1">
                                {appointment.vehicle.year} {appointment.vehicle.make} {appointment.vehicle.model}
                              </p>
                            )}
                          </div>
                          <Badge variant={status.variant} className="flex items-center gap-1 ml-2">
                            {status.icon}
                            {status.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Vehicles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Car className="h-4 w-4 text-slate-500" />
                  My Vehicles
                </CardTitle>
                <CardDescription>
                  {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} registered
                </CardDescription>
              </CardHeader>
              <CardContent>
                {vehicles.length === 0 ? (
                  <div className="text-center py-8">
                    <Car className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No vehicles registered yet</p>
                    <p className="text-xs text-slate-400 mt-1">Use the sidebar form to add your first vehicle</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vehicles.map(vehicle => (
                      <div
                        key={vehicle.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100"
                      >
                        <div>
                          <p className="font-medium text-sm text-slate-900">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            {vehicle.license_plate && <span>{vehicle.license_plate}</span>}
                            {vehicle.color && <span>{vehicle.color}</span>}
                            {vehicle.odometer && <span>{Number(vehicle.odometer).toLocaleString()} km</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={vehicle.is_active ? 'default' : 'secondary'} className="text-xs">
                            {vehicle.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditVehicle(vehicle)}
                          >
                            <Edit2 className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDeleteVehicle(vehicle)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-slate-500" />
                  Recent Services
                </CardTitle>
                <CardDescription>
                  Your recently completed appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentCompleted.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No completed services yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-b">
                          <th className="pb-3 font-medium">Service</th>
                          <th className="pb-3 font-medium">Date</th>
                          <th className="pb-3 font-medium">Vehicle</th>
                          <th className="pb-3 font-medium text-right">Amount</th>
                          <th className="pb-3 font-medium text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentCompleted.map(appointment => {
                          const status = statusConfig[appointment.status] || statusConfig.completed;
                          return (
                            <tr key={appointment.id} className="text-sm">
                              <td className="py-3">
                                <p className="font-medium text-slate-900">
                                  {appointment.service?.name || `Appointment #${appointment.id}`}
                                </p>
                              </td>
                              <td className="py-3 text-slate-600">
                                {formatShortDate(appointment.appointment_date)}
                              </td>
                              <td className="py-3 text-slate-600">
                                {appointment.vehicle ? (
                                  `${appointment.vehicle.year} ${appointment.vehicle.make} ${appointment.vehicle.model}`
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="py-3 text-right font-medium text-slate-900">
                                {appointment.total_amount ? `KES ${appointment.total_amount.toLocaleString()}` : '—'}
                              </td>
                              <td className="py-3 text-center">
                                <Badge variant={status.variant} className="text-xs">
                                  {status.label}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Membership Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Member since {formatDate(profile.created_at)}
          </p>
        </div>
      </div>

      {/* Vehicle Form Modal */}
      <VehicleFormModal
        open={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        vehicle={editingVehicle}
        onSubmit={handleVehicleSubmit}
      />

      {/* Password Reset Modal */}
      <PasswordResetModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSubmit={handlePasswordReset}
        isSubmitting={resetOwnPassword.isPending}
      />
    </div>
  );
}
