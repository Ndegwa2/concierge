import { Mail, Phone, MapPin, Star, Award, Calendar, DollarSign, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';

interface EmployeeProfileProps {
  employeeData: {
    name: string;
    id: string;
    email: string;
    phone: string;
    location: string;
  };
}

export function EmployeeProfile({ employeeData }: EmployeeProfileProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  const specialties = ['Luxury Vehicles', 'Detailing', 'Customer Service'];
  const certifications = [
    { name: 'Advanced Detailing Certification', issuer: 'IDA', date: 'Mar 2024' },
    { name: 'Luxury Vehicle Handling', issuer: 'AutoCare Pro', date: 'Jan 2024' },
    { name: 'Customer Service Excellence', issuer: 'CSI', date: 'Nov 2023' }
  ];

  const performanceMetrics = [
    { label: 'Total Services', value: '156', icon: Calendar },
    { label: 'Average Rating', value: '4.9/5', icon: Star },
    { label: 'Customer Satisfaction', value: '98%', icon: Award },
    { label: 'Earnings This Month', value: '$3,245', icon: DollarSign }
  ];

  const achievements = [
    { title: 'Top Performer', description: 'Highest ratings for Q4 2025', date: 'Dec 2025' },
    { title: 'Customer Favorite', description: '50+ five-star reviews', date: 'Nov 2025' },
    { title: '100 Services Milestone', description: 'Completed 100 services', date: 'Sep 2025' },
    { title: 'Perfect Attendance', description: 'No missed shifts in 6 months', date: 'Aug 2025' }
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
                  <h2 className="text-2xl font-bold mb-1">{employeeData.name}</h2>
                  <p className="text-slate-600 mb-2">Concierge Staff • {employeeData.id}</p>
                  <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                </div>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{employeeData.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">{employeeData.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 md:col-span-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{employeeData.location}</span>
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
              {specialties.map((specialty) => (
                <Badge key={specialty} variant="outline" className="text-sm">
                  {specialty}
                </Badge>
              ))}
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
              {certifications.map((cert, index) => (
                <div key={index} className="p-3 bg-slate-50 rounded-lg border">
                  <p className="font-medium text-sm">{cert.name}</p>
                  <p className="text-xs text-slate-600">{cert.issuer} • {cert.date}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle>Achievements & Awards</CardTitle>
          <CardDescription>Your milestones and recognition</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Award className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">{achievement.title}</h4>
                  <p className="text-sm text-slate-600 mb-1">{achievement.description}</p>
                  <p className="text-xs text-slate-500">{achievement.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance History */}
      <Card>
        <CardHeader>
          <CardTitle>Performance History</CardTitle>
          <CardDescription>Your monthly performance over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { month: 'January 2026', services: 18, rating: 4.9, earnings: '$1,425' },
              { month: 'December 2025', services: 24, rating: 4.9, earnings: '$1,840' },
              { month: 'November 2025', services: 22, rating: 4.8, earnings: '$1,680' },
              { month: 'October 2025', services: 26, rating: 4.9, earnings: '$1,995' },
              { month: 'September 2025', services: 21, rating: 4.8, earnings: '$1,610' },
              { month: 'August 2025', services: 23, rating: 4.7, earnings: '$1,765' }
            ].map((record, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                <div className="flex-1">
                  <p className="font-medium">{record.month}</p>
                </div>
                <div className="flex items-center gap-8 text-sm">
                  <div className="text-center">
                    <p className="font-semibold">{record.services}</p>
                    <p className="text-slate-500">Services</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <p className="font-semibold">{record.rating}</p>
                    </div>
                    <p className="text-slate-500">Rating</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{record.earnings}</p>
                    <p className="text-slate-500">Earnings</p>
                  </div>
                </div>
              </div>
            ))}
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
