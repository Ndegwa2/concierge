import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Star, Award, Calendar, DollarSign, Edit, Users, BarChart3, Key, Eye, EyeOff, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { toast } from 'sonner';
import { api, type User } from '@/services/api';
import { employeesApi } from '@/services/api/employees';
import { useResetOwnPassword } from '@/hooks/useApi';

interface EmployeeProfileProps {
  employeeData: {
    name: string;
    id: string;
    email?: string;
    phone?: string;
    location?: string;
  };
}

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

export function EmployeeProfile({ employeeData }: EmployeeProfileProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const resetOwnPassword = useResetOwnPassword();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await employeesApi.getEmployeeProfile();
        if (response.success && response.data) {
          setProfile(response.data.user);
        } else {
          setError(response.message || 'Failed to load profile');
        }
      } catch (err) {
        setError('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const employee = profile?.employee;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Calendar className="h-6 w-6 text-slate-400 animate-spin" />
        <span className="ml-2 text-slate-500">Loading profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const specialties = employee?.specialties || [];

  const performanceMetrics = [
    { label: 'Total Services', value: String(employee?.total_services || 0), icon: Calendar },
    { label: 'Average Rating', value: employee ? `${employee.rating.toFixed(1)}/5` : '0.0/5', icon: Star },
    { label: 'Rating Count', value: String(employee?.rating ? Math.round(employee.rating * 50) : 0), icon: Award },
    { label: 'Total Earnings', value: 'View Reports', icon: DollarSign }
  ];

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-slate-600">View and manage your profile information</p>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-slate-900 text-white text-2xl">
                {getInitials(employeeData.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{profile?.name || employeeData.name}</h2>
                  <p className="text-slate-600 mb-2">Concierge Staff • {employeeData.id}</p>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    {employee?.account_status === 'active' ? 'Active' : employee?.account_status || 'Active'}
                  </Badge>
                </div>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {profile?.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{profile.email}</span>
                  </div>
                )}
                {profile?.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">{profile.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-600 md:col-span-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{employee?.location || employeeData.location || 'N/A'}</span>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => setPasswordModalOpen(true)}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        {performanceMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-5 w-5 text-slate-500" />
                </div>
                <div className="text-2xl font-bold mb-1">{metric.value}</div>
                <p className="text-sm text-slate-600">{metric.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Specialties and Certifications */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Specialties</CardTitle>
            <CardDescription>Your areas of expertise</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {specialties.length > 0 ? (
                specialties.map((specialty) => (
                  <Badge key={specialty} variant="outline" className="text-sm">
                    {specialty}
                  </Badge>
                ))
              ) : (
                <p className="text-slate-500 text-sm">No specialties listed</p>
              )}
            </div>
            <Button variant="outline" size="sm" className="mt-4">
              <Edit className="h-4 w-4 mr-2" />
              Update Specialties
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certifications</CardTitle>
            <CardDescription>Your professional credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center py-8 text-slate-500">
                <Award className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p>Certification management coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance History */}
      <Card>
        <CardHeader>
          <CardTitle>Performance History</CardTitle>
          <CardDescription>Your monthly performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-8 text-slate-500">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p>Performance reports will appear here once available</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your account preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="h-4 w-4" />
            <div>
              <p className="font-medium">Change Password</p>
              <p className="text-xs text-slate-400">Update your account password</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto w-full justify-start"
            onClick={() => setPasswordModalOpen(true)}
          >
            <Key className="h-4 w-4 mr-2" />
            Change
          </Button>
          <Button variant="outline" className="w-full justify-start">
            Notification Preferences
          </Button>
          <Button variant="outline" className="w-full justify-start">
            Banking Information
          </Button>
          <Button variant="outline" className="w-full justify-start">
            Emergency Contacts
          </Button>
        </CardContent>
      </Card>

      <PasswordResetModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSubmit={handlePasswordReset}
        isSubmitting={resetOwnPassword.isPending}
      />
    </div>
  );
}
