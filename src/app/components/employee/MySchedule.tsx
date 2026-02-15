import { Calendar as CalendarIcon, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';

interface MyScheduleProps {
  employeeData: {
    name: string;
    id: string;
  };
}

export function MySchedule({ employeeData }: MyScheduleProps) {
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const currentDay = 'Mon'; // January 26, 2026 is Monday

  const schedule = {
    'Mon': [
      { time: '10:30 AM', customer: 'John Smith', service: 'Premium Car Wash', status: 'in-progress', location: 'Downtown' },
      { time: '1:00 PM', customer: 'Rachel Green', service: 'Oil Change', status: 'scheduled', location: 'Westside' },
      { time: '3:30 PM', customer: 'Tom Anderson', service: 'Tire Rotation', status: 'scheduled', location: 'Eastside' }
    ],
    'Tue': [
      { time: '9:00 AM', customer: 'Amy Chen', service: 'Vehicle Inspection', status: 'scheduled', location: 'Central' },
      { time: '11:30 AM', customer: 'Robert Lee', service: 'Brake Service', status: 'scheduled', location: 'Northside' },
      { time: '2:30 PM', customer: 'Jessica Brown', service: 'Full Detailing', status: 'scheduled', location: 'Downtown' }
    ],
    'Wed': [
      { time: '10:00 AM', customer: 'Kevin Park', service: 'Oil Change', status: 'scheduled', location: 'Westside' },
      { time: '1:30 PM', customer: 'Nicole Williams', service: 'Car Wash', status: 'scheduled', location: 'Eastside' }
    ],
    'Thu': [
      { time: '9:30 AM', customer: 'Daniel Kim', service: 'Tire Rotation', status: 'scheduled', location: 'Central' },
      { time: '12:00 PM', customer: 'Maria Garcia', service: 'Vehicle Inspection', status: 'scheduled', location: 'Downtown' },
      { time: '3:00 PM', customer: 'Chris Taylor', service: 'Oil Change', status: 'scheduled', location: 'Northside' }
    ],
    'Fri': [
      { time: '8:30 AM', customer: 'Linda Martinez', service: 'Premium Detailing', status: 'scheduled', location: 'Westside' },
      { time: '11:00 AM', customer: 'James Wilson', service: 'Car Wash', status: 'scheduled', location: 'Downtown' },
      { time: '2:00 PM', customer: 'Patricia Moore', service: 'Brake Service', status: 'scheduled', location: 'Central' }
    ],
    'Sat': [
      { time: '10:00 AM', customer: 'Steven Anderson', service: 'Full Detailing', status: 'scheduled', location: 'Eastside' },
      { time: '1:00 PM', customer: 'Barbara Thomas', service: 'Vehicle Inspection', status: 'scheduled', location: 'Northside' }
    ],
    'Sun': []
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled':
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

  const totalAppointmentsThisWeek = Object.values(schedule).reduce((sum, day) => sum + day.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Schedule</h1>
        <p className="text-slate-600">View your weekly appointment calendar</p>
      </div>

      {/* Week Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{totalAppointmentsThisWeek}</div>
                <p className="text-sm text-slate-600">This Week</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{schedule[currentDay].length}</div>
                <p className="text-sm text-slate-600">Today</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">32.5</div>
                <p className="text-sm text-slate-600">Hours This Week</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Calendar */}
      <div className="grid lg:grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const daySchedule = schedule[day as keyof typeof schedule] || [];
          const isToday = day === currentDay;
          const dateNum = 26 + index; // Starting from Jan 26

          return (
            <Card key={day} className={isToday ? 'border-blue-500 border-2' : ''}>
              <CardHeader className="pb-3">
                <div className="text-center">
                  <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-slate-600'}`}>
                    {day}
                  </div>
                  <div className={`text-2xl font-bold ${isToday ? 'text-blue-600' : ''}`}>
                    {dateNum}
                  </div>
                  {isToday && (
                    <Badge className="mt-2" variant="default">Today</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {daySchedule.length > 0 ? (
                  daySchedule.map((appointment, idx) => (
                    <div key={idx} className="p-2 bg-slate-50 rounded border text-xs">
                      <div className="font-medium mb-1">{appointment.time}</div>
                      <div className="text-slate-600 mb-1">{appointment.customer}</div>
                      <div className="text-slate-500 text-xs truncate mb-1">{appointment.service}</div>
                      <Badge className={`${getStatusColor(appointment.status)} text-xs`} variant="outline">
                        {getStatusLabel(appointment.status)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-slate-400 text-xs">
                    No appointments
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Today's Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule (Monday, January 26)</CardTitle>
          <CardDescription>Detailed view of your appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schedule[currentDay].map((appointment, index) => (
              <div key={index} className="flex items-start justify-between p-4 border rounded-lg hover:bg-slate-50">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span className="font-semibold">{appointment.time}</span>
                    </div>
                    <Badge className={getStatusColor(appointment.status)} variant="outline">
                      {getStatusLabel(appointment.status)}
                    </Badge>
                  </div>
                  <h4 className="font-medium mb-1">{appointment.service}</h4>
                  <p className="text-sm text-slate-600 mb-1">Customer: {appointment.customer}</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <MapPin className="h-3 w-3" />
                    <span>{appointment.location}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {appointment.status === 'scheduled' && (
                    <Button size="sm">Start</Button>
                  )}
                  {appointment.status === 'in-progress' && (
                    <Button size="sm" variant="default">View</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Availability Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Availability Settings</CardTitle>
          <CardDescription>Manage your working hours and time off</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium">Working Hours</p>
              <p className="text-sm text-slate-600">Monday - Saturday: 8:00 AM - 6:00 PM</p>
            </div>
            <Button variant="outline" size="sm">Edit</Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium">Time Off Requests</p>
              <p className="text-sm text-slate-600">No pending requests</p>
            </div>
            <Button variant="outline" size="sm">Request</Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium">Overtime This Month</p>
              <p className="text-sm text-slate-600">12.5 hours</p>
            </div>
            <Button variant="outline" size="sm">Details</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
