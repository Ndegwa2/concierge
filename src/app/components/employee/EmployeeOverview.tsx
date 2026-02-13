import { 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Star,
  Calendar,
  AlertCircle,
  Navigation,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';

interface EmployeeOverviewProps {
  employeeData: {
    name: string;
    id: string;
    email: string;
    phone: string;
    location: string;
  };
}

export function EmployeeOverview({ employeeData }: EmployeeOverviewProps) {
  const todayAppointments = [
    {
      id: 'A-1001',
      customer: 'John Smith',
      service: 'Premium Car Wash',
      vehicle: 'Tesla Model 3',
      time: '10:30 AM',
      location: '123 Main St, Downtown',
      status: 'in-progress',
      estimatedDuration: '45 min'
    },
    {
      id: 'A-1007',
      customer: 'Rachel Green',
      service: 'Oil Change',
      vehicle: 'Honda Civic',
      time: '1:00 PM',
      location: '789 Oak Ave, Westside',
      status: 'upcoming',
      estimatedDuration: '60 min'
    },
    {
      id: 'A-1012',
      customer: 'Tom Anderson',
      service: 'Tire Rotation',
      vehicle: 'Ford F-150',
      time: '3:30 PM',
      location: '456 Pine Rd, Eastside',
      status: 'upcoming',
      estimatedDuration: '40 min'
    }
  ];

  const stats = [
    {
      title: 'Today\'s Assignments',
      value: '3',
      description: '2 remaining',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Completed This Week',
      value: '18',
      description: '+3 from last week',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Average Rating',
      value: '4.9',
      description: 'Based on 156 reviews',
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Earnings This Month',
      value: '$3,245',
      description: '+12% from last month',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'upcoming':
        return 'bg-green-100 text-green-800 border-green-200';
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
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Active Service in Progress</h3>
              <p className="text-sm text-slate-700 mb-3">
                Premium Car Wash for John Smith - Tesla Model 3
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

      {/* Today's Schedule */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
            <CardDescription>Your assigned appointments for Monday, January 26, 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span className="font-semibold">{appointment.time}</span>
                      <Badge className={getStatusColor(appointment.status)} variant="outline">
                        {getStatusLabel(appointment.status)}
                      </Badge>
                    </div>
                    <h4 className="font-medium mb-1">{appointment.service}</h4>
                    <p className="text-sm text-slate-600 mb-1">
                      Customer: {appointment.customer}
                    </p>
                    <p className="text-sm text-slate-600 mb-1">
                      Vehicle: {appointment.vehicle}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-2">
                      <Navigation className="h-3 w-3" />
                      <span>{appointment.location}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500 mb-2">{appointment.estimatedDuration}</p>
                    {appointment.status === 'in-progress' ? (
                      <Button size="sm">View Details</Button>
                    ) : (
                      <Button size="sm" variant="outline">Start Service</Button>
                    )}
                  </div>
                </div>
              ))}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Completed</span>
                </div>
                <span className="font-semibold">18</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">In Progress</span>
                </div>
                <span className="font-semibold">1</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span className="text-sm">Upcoming</span>
                </div>
                <span className="font-semibold">2</span>
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Efficiency</span>
                  </div>
                  <span className="font-semibold">96%</span>
                </div>
              </div>
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
            {[
              {
                customer: 'Sarah Johnson',
                rating: 5,
                comment: 'Michael was professional and handled my car with great care. Excellent service!',
                service: 'Full Detailing',
                date: 'Jan 24, 2026'
              },
              {
                customer: 'David Brown',
                rating: 5,
                comment: 'Very punctual and kept me updated throughout the entire process. Highly recommend!',
                service: 'Oil Change',
                date: 'Jan 22, 2026'
              },
              {
                customer: 'Emma Wilson',
                rating: 4,
                comment: 'Great service overall. Car came back looking brand new!',
                service: 'Premium Car Wash',
                date: 'Jan 20, 2026'
              }
            ].map((feedback, index) => (
              <div key={index} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{feedback.customer}</p>
                    <p className="text-sm text-slate-500">{feedback.service}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < feedback.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-2">{feedback.comment}</p>
                <p className="text-xs text-slate-500">{feedback.date}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
