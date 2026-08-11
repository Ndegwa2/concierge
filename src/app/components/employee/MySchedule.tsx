import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { api } from '@/services/api';

interface MyScheduleProps {
  employeeData: {
    name: string;
    id: string;
  };
}

interface ScheduleEntry {
  assignment_id: number;
  appointment_id: number;
  time: string;
  status: string;
  service?: string;
  customer: { name: string; phone: string };
}

export function MySchedule({ employeeData }: MyScheduleProps) {
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const currentDayIndex = today.getDay();
  const currentDay = weekDays[(currentDayIndex - 1 + 7) % 7];

  const [schedule, setSchedule] = useState<Record<string, ScheduleEntry[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);

        const response = await api.getMySchedule(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        if (response.success && response.data) {
          setSchedule(response.data.schedule || {});
        }
      } catch (err) {
        setError('Failed to load schedule');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, [today]);

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

  const totalAppointmentsThisWeek = Object.values(schedule).reduce((sum, day) => sum + day.length, 0);

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
                <div className="text-2xl font-bold">{schedule[currentDay]?.length || 0}</div>
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
                <div className="text-2xl font-bold">
                  {Object.values(schedule).reduce((sum, day) => 
                    sum + day.filter(a => a.status === 'in-progress').length, 0
                  )}
                </div>
                <p className="text-sm text-slate-600">In Progress</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Calendar */}
      <div className="grid lg:grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const daySchedule = schedule[day] || [];
          const isToday = day === currentDay;
          const dateNum = today.getDate() - currentDayIndex + index;
          if (dateNum <= 0 || dateNum > 31) return null;

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
                      <div className="text-slate-600 mb-1">{appointment.customer.name}</div>
                      <div className="text-slate-500 text-xs truncate mb-1">{appointment.service || 'N/A'}</div>
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
          <CardTitle>Today's Schedule ({today.toLocaleDateString('en-KE', { weekday: 'long' })})</CardTitle>
          <CardDescription>Detailed view of your appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schedule[currentDay]?.length > 0 ? (
              schedule[currentDay].map((appointment, index) => (
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
                    <h4 className="font-medium mb-1">{appointment.service || 'N/A'}</h4>
                    <p className="text-sm text-slate-600 mb-1">Customer: {appointment.customer.name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="h-3 w-3" />
                      <span>{appointment.customer.phone}</span>
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
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                No appointments scheduled for today
              </div>
            )}
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
              <p className="text-sm text-slate-600">Configure in your profile settings</p>
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
              <p className="text-sm text-slate-600">Calculated automatically from schedule</p>
            </div>
            <Button variant="outline" size="sm">Details</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
