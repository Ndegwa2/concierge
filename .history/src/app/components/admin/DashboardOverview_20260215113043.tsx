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

export function DashboardOverview() {
  const stats = [
    {
      title: 'Total Revenue',
      value: '$45,231',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      description: 'vs last month'
    },
    {
      title: 'Active Appointments',
      value: '23',
      change: '+5',
      trend: 'up',
      icon: Calendar,
      description: 'ongoing services'
    },
    {
      title: 'Total Customers',
      value: '1,234',
      change: '+8.2%',
      trend: 'up',
      icon: Users,
      description: 'vs last month'
    },
    {
      title: 'Avg. Service Time',
      value: '2.4 hrs',
      change: '-15 min',
      trend: 'down',
      icon: Clock,
      description: 'improvement'
    }
  ];

  const recentAppointments = [
    {
      id: 'A-1001',
      customer: 'John Smith',
      service: 'Premium Car Wash',
      vehicle: 'Tesla Model 3',
      concierge: 'Michael Chen',
      status: 'in-progress',
      time: '10:30 AM'
    },
    {
      id: 'A-1002',
      customer: 'Sarah Johnson',
      service: 'Oil Change',
      vehicle: 'BMW 5 Series',
      concierge: 'Emily Rodriguez',
      status: 'scheduled',
      time: '2:00 PM'
    },
    {
      id: 'A-1003',
      customer: 'Mike Wilson',
      service: 'Full Detailing',
      vehicle: 'Mercedes E-Class',
      concierge: 'David Park',
      status: 'in-progress',
      time: '9:00 AM'
    },
    {
      id: 'A-1004',
      customer: 'Emma Davis',
      service: 'Tire Rotation',
      vehicle: 'Audi A4',
      concierge: 'Pending',
      status: 'pending',
      time: '4:30 PM'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
        <p className="text-slate-600">Monitor your auto concierge operations at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
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
              <span className="font-semibold">8</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm">In Progress</span>
              </div>
              <span className="font-semibold">15</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">Completed</span>
              </div>
              <span className="font-semibold">42</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Issues</span>
              </div>
              <span className="font-semibold">2</span>
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
            <div className="space-y-4">
              {recentAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{appointment.customer}</span>
                      <span className="text-xs text-slate-500">#{appointment.id}</span>
                    </div>
                    <p className="text-sm text-slate-600">{appointment.service} - {appointment.vehicle}</p>
                    <p className="text-xs text-slate-500 mt-1">Concierge: {appointment.concierge}</p>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge className={getStatusColor(appointment.status)}>
                      {getStatusLabel(appointment.status)}
                    </Badge>
                    <p className="text-xs text-slate-500">{appointment.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Concierges</CardTitle>
          <CardDescription>Based on completed services this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'Michael Chen', services: 156, rating: 4.9, revenue: '$12,450' },
              { name: 'Emily Rodriguez', services: 142, rating: 4.8, revenue: '$11,320' },
              { name: 'David Park', services: 138, rating: 4.9, revenue: '$10,980' },
              { name: 'Sarah Kim', services: 125, rating: 4.7, revenue: '$9,875' }
            ].map((concierge, index) => (
              <div key={concierge.name} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{concierge.name}</p>
                  <p className="text-sm text-slate-500">{concierge.services} services completed</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{concierge.revenue}</p>
                  <p className="text-sm text-slate-500">★ {concierge.rating}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
