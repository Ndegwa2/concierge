import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Users, 
  DollarSign,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { adminApi, appointmentsApi } from '@/services/api';
import type { Appointment } from '@/services/api';

interface DashboardStats {
  total_users: number;
  total_services: number;
  total_vehicles: number;
  total_appointments: number;
  active_appointments: number;
  completed_appointments: number;
  total_revenue: number;
}

interface DashboardOverviewProps {}

export function DashboardOverview({}: DashboardOverviewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardResponse, appointmentsResponse] = await Promise.all([
        adminApi.getAdminDashboard(),
        appointmentsApi.getAllAppointmentsAdmin(),
      ]);

      if (dashboardResponse.success && dashboardResponse.data) {
        setStats(dashboardResponse.data.statistics);
        setRecentAppointments(dashboardResponse.data.recent_appointments || []);
      }

      if (appointmentsResponse.success && appointmentsResponse.data) {
        const allAppointments = appointmentsResponse.data.appointments || [];
        const sorted = allAppointments
          .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
          .slice(0, 5);
        setRecentAppointments(sorted);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
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

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
          <p className="text-slate-600">Loading dashboard data...</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-slate-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchDashboardData} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  const statCards = stats ? [
    {
      title: 'Total Revenue',
      value: `KES ${stats.total_revenue.toLocaleString()}`,
      change: `${stats.completed_appointments} completed`,
      trend: 'up' as const,
      icon: DollarSign,
      description: 'all time'
    },
    {
      title: 'Total Appointments',
      value: stats.total_appointments.toString(),
      change: `${stats.active_appointments} active`,
      trend: 'up' as const,
      icon: Calendar,
      description: 'all time'
    },
    {
      title: 'Total Customers',
      value: stats.total_users.toLocaleString(),
      change: `${stats.total_vehicles} vehicles`,
      trend: 'up' as const,
      icon: Users,
      description: 'registered'
    },
    {
      title: 'Active Appointments',
      value: stats.active_appointments.toString(),
      change: `${stats.total_services} services`,
      trend: 'up' as const,
      icon: Clock,
      description: 'available'
    }
  ] : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
        <p className="text-slate-600">Monitor your auto concierge operations at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.trend === 'up';
          return (
            <Card key={stat.title}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>{stat.title}</CardDescription>
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Icon className="h-4 w-4 text-slate-700" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="flex items-center gap-1 text-sm">
                  {isPositive ? (
                    <ArrowUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-green-600" />
                  )}
                  <span className="text-green-600 font-medium">{stat.change}</span>
                  <span className="text-slate-500">{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="text-sm">Pending</span>
              </div>
              <span className="font-semibold">
                {recentAppointments.filter(a => a.status === 'scheduled' || a.status === 'pending').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm">In Progress</span>
              </div>
              <span className="font-semibold">
                {recentAppointments.filter(a => a.status === 'in-progress' || a.status === 'confirmed').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">Completed</span>
              </div>
              <span className="font-semibold">{stats?.completed_appointments ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Appointments */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Appointments</CardTitle>
            <CardDescription>Latest service bookings and their status</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAppointments.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No recent appointments</p>
            ) : (
              <div className="space-y-4">
                {recentAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {appointment.customer?.name || `Customer #${appointment.user_id}`}
                        </span>
                        <span className="text-xs text-slate-500">#{appointment.id}</span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {appointment.service?.name || `Service #${appointment.service_id}`} - {appointment.vehicle?.make} {appointment.vehicle?.model}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(appointment.appointment_date).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge className={getStatusColor(appointment.status)}>
                        {getStatusLabel(appointment.status)}
                      </Badge>
                      {appointment.total_amount && (
                        <p className="text-xs text-slate-500">KES {Number(appointment.total_amount).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
