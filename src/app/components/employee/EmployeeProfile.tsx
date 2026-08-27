import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Star, Award, Calendar, DollarSign, Edit, Users, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { api, type User } from '@/services/api';
import { employeesApi } from '@/services/api/employees';

interface EmployeeProfileProps {
  employeeData: {
    name: string;
    id: string;
    email?: string;
    phone?: string;
    location?: string;
  };
}

export function EmployeeProfile({ employeeData }: EmployeeProfileProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <Button variant="outline" className="w-full justify-start">
            Change Password
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
    </div>
  );
}
