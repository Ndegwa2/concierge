import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Star,
  Calendar,
  AlertCircle,
  Navigation,
  DollarSign,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { api } from '@/services/api';
import type { Appointment } from '@/services/api';

interface EmployeeOverviewProps {
  employeeData: {
    name: string;
    id: string;
  };
}

export function EmployeeOverview({ employeeData }: EmployeeOverviewProps) {
  const [dashboard, setDashboard] = useState<any>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashResponse, apptResponse] = await Promise.all([
          api.getEmployeeDashboard(),
          api.getMyAssignments(),
        ]);

        if (dashResponse.success && dashResponse.data) {
          setDashboard(dashResponse.data);
        }

        if (apptResponse.success && apptResponse.data) {
          const today = new Date();
          const todayAppts = apptResponse.data.appointments.filter(a => {
            const apptDate = new Date(a.appointment_date);
            return apptDate.toDateString() === today.toDateString();
          });
          setTodayAppointments(todayAppts);
        }
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = dashboard ? [
    {
      title: 'Today\'s Assignments',
      value: String(dashboard.statistics?.today_assignments || 0),
      description: `${dashboard.statistics?.active_assignments || 0} active`,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Completed This Week',
      value: String(dashboard.statistics?.completed_assignments || 0),
      description: `${dashboard.statistics?.total_assignments || 0} total assignments`,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Average Rating',
      value: dashboard.employee?.rating?.toFixed(1) || '0.0',
      description: 'Based on all reviews',
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Total Services',
      value: String(dashboard.employee?.total_services || 0),
      description: `ID: ${employeeData.id}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ] : [
    {
      title: 'Today\'s Assignments',
      value: '0',
      description: 'Loading...',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Completed This Week',
      value: '0',
      description: 'Loading...',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Average Rating',
      value: '0.0',
      description: 'Loading...',
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Total Services',
      value: '0',
      description: 'Loading...',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled':
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const todayFormatted = new Date().toLocaleDateString('en-KE', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome back, {employeeData.name.split(' ')[0]}!</h1>
        <p className="text-slate-600">Here's your overview for today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>{stat.title}</CardDescription>
                  <div className={`p-2 ${stat.bgColor} rounded-lg`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <p className="text-sm text-slate-500">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Current Assignment Alert */}
      {dashboard?.statistics?.active_assignments > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Active Service in Progress</h3>
                <p className="text-sm text-slate-700 mb-3">
                  You have {dashboard.statistics.active_assignments} active assignment{dashboard.statistics.active_assignments > 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm">
                    <Navigation className="h-4 w-4 mr-2" />
                    Navigate
                  </Button>
                  <Button size="sm" variant="outline">
                    Update Status
                  </Button>
                  <Button size="sm" variant="outline">
                    Contact Customer
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Schedule */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
            <CardDescription>Your assigned appointments for {todayFormatted}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!isLoading && todayAppointments.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No appointments scheduled for today
                </div>
              ) : (
                todayAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-slate-500" />
                        <span className="font-semibold">{new Date(appointment.appointment_date).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</span>
                        <Badge className={getStatusColor(appointment.status)} variant="outline">
                          {getStatusLabel(appointment.status)}
                        </Badge>
                      </div>
                      <h4 className="font-medium mb-1">{appointment.service?.name || 'Unknown Service'}</h4>
                      <p className="text-sm text-slate-600 mb-1">
                        Customer: {appointment.customer?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-slate-600 mb-1">
                        Vehicle: {appointment.vehicle ? `${appointment.vehicle.make} ${appointment.vehicle.model}` : 'N/A'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-2">
                        <Navigation className="h-3 w-3" />
                        <span>{appointment.notes || 'No special instructions'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 mb-2">{appointment.service ? `${appointment.service.duration} min` : 'N/A'}</p>
                      {appointment.status === 'in-progress' ? (
                        <Button size="sm">View Details</Button>
                      ) : (
                        <Button size="sm" variant="outline">Start Service</Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Performance */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <Clock className="h-4 w-4 mr-2" />
                Clock In/Out
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Request Time Off
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <AlertCircle className="h-4 w-4 mr-2" />
                Report Issue
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>This Week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboard && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Completed</span>
                    </div>
                    <span className="font-semibold">{dashboard.statistics?.completed_assignments || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">In Progress</span>
                    </div>
                    <span className="font-semibold">{dashboard.statistics?.active_assignments || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <span className="text-sm">Total</span>
                    </div>
                    <span className="font-semibold">{dashboard.statistics?.total_assignments || 0}</span>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">Rating</span>
                      </div>
                      <span className="font-semibold">{dashboard.employee?.rating ? `${dashboard.employee.rating.toFixed(1)}/5` : 'N/A'}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Customer Feedback</CardTitle>
          <CardDescription>Latest reviews from your services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-8 text-slate-500">
              <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p>Customer feedback will appear here once reviews are submitted</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
