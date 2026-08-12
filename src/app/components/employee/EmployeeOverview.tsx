import { useState } from 'react';
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
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { useEmployeeDashboard, useClockInOut, useTimeLogs } from '@/hooks/useApi';
import { useRequestTimeOff } from '@/hooks/useApi';
import { useReportIssue } from '@/hooks/useApi';
import { ClockInOutModal } from './ClockInOutModal';
import { TimeOffModal } from './TimeOffModal';
import { IssueReportModal } from './IssueReportModal';
import type { Appointment } from '@/services/api';

interface EmployeeOverviewProps {
  employeeData: {
    name: string;
    id: string;
  };
}

export function EmployeeOverview({ employeeData }: EmployeeOverviewProps) {
  const { data: dashboard, isLoading, error } = useEmployeeDashboard();
  const { data: timeLogs, isLoading: timeLogsLoading } = useTimeLogs();
  const clockInOutMutation = useClockInOut();
  const requestTimeOffMutation = useRequestTimeOff();
  const reportIssueMutation = useReportIssue();

  const [clockModalOpen, setClockModalOpen] = useState(false);
  const [clockAction, setClockAction] = useState<'in' | 'out'>('in');
  const [timeOffModalOpen, setTimeOffModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const isInOffice = timeLogs?.is_clocked_in ?? false;

  interface TimeOffPayload {
    request_type: 'vacation' | 'sick' | 'personal' | 'other';
    start_date: string;
    end_date: string;
    reason?: string;
  }

  interface IssuePayload {
    title: string;
    description: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    appointment_id?: number;
  }

  const handleClock = (action: 'in' | 'out', notes?: string) => {
    setClockAction(action);
    setClockModalOpen(true);
  };

  const handleClockSubmit = async (action: 'in' | 'out', notes?: string) => {
    try {
      setGlobalError(null);
      await clockInOutMutation.mutateAsync({ action, notes });
      setClockModalOpen(false);
    } catch (err: any) {
      setGlobalError(err.message || `Failed to clock ${action}`);
    }
  };

  const handleRequestTimeOff = async (data: TimeOffPayload) => {
    try {
      setGlobalError(null);
      await requestTimeOffMutation.mutateAsync(data);
      setTimeOffModalOpen(false);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to submit time-off request');
    }
  };

  const handleReportIssue = async (data: IssuePayload) => {
    try {
      setGlobalError(null);
      await reportIssueMutation.mutateAsync(data);
      setIssueModalOpen(false);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to report issue');
    }
  };

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

  if (error || globalError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {globalError || 'Failed to load dashboard data'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome back, {employeeData.name.split(' ')[0] || 'there'}!</h1>
        <p className="text-slate-600">Here's your overview for today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Today's Assignments</CardDescription>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {dashboard?.statistics?.today_assignments || 0}
            </div>
            <p className="text-sm text-slate-500">
              {dashboard?.statistics?.active_assignments || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Completed This Week</CardDescription>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {dashboard?.statistics?.completed_assignments || 0}
            </div>
            <p className="text-sm text-slate-500">
              {dashboard?.statistics?.total_assignments || 0} total assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Average Rating</CardDescription>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {dashboard?.employee?.rating ? dashboard.employee.rating.toFixed(1) : '0.0'}
            </div>
            <p className="text-sm text-slate-500">Based on all reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Services</CardDescription>
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {dashboard?.employee?.total_services || 0}
            </div>
            <p className="text-sm text-slate-500">ID: {employeeData.id}</p>
          </CardContent>
        </Card>
      </div>

      {/* Clock Status Bar */}
      {timeLogs && !timeLogsLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {isInOffice ? (
                    <PauseCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <PlayCircle className="h-5 w-5 text-slate-600" />
                  )}
                  <span className="font-medium">
                    {isInOffice ? 'Clocked In' : 'Clocked Out'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="h-4 w-4" />
                  <span>{timeLogs.total_hours} hours today</span>
                </div>
              </div>
              <Button
                size="sm"
                variant={isInOffice ? "outline" : "default"}
                onClick={() => handleClock(isInOffice ? 'out' : 'in')}
                disabled={clockInOutMutation.isPending}
              >
                {isInOffice ? (
                  <>
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Clock Out
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Clock In
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <Button size="sm" variant="outline">Update Status</Button>
                  <Button size="sm" variant="outline">Contact Customer</Button>
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
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">
                Loading today's schedule...
              </div>
            ) : !dashboard || (dashboard.statistics?.today_assignments || 0) === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No appointments scheduled for today
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                {dashboard?.statistics?.today_assignments || 0} appointment(s) scheduled for today
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Performance */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => handleClock(isInOffice ? 'out' : 'in')}
                disabled={clockInOutMutation.isPending || timeLogsLoading}
              >
                <Clock className="h-4 w-4 mr-2" />
                {isInOffice ? 'Clock Out' : 'Clock In'}
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => setTimeOffModalOpen(true)}
                disabled={requestTimeOffMutation.isPending}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Request Time Off
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => setIssueModalOpen(true)}
                disabled={reportIssueMutation.isPending}
              >
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
                <span className="font-semibold">
                  {dashboard?.statistics?.completed_assignments || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">In Progress</span>
                </div>
                <span className="font-semibold">
                  {dashboard?.statistics?.active_assignments || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span className="text-sm">Total</span>
                </div>
                <span className="font-semibold">
                  {dashboard?.statistics?.total_assignments || 0}
                </span>
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Rating</span>
                  </div>
                  <span className="font-semibold">
                    {dashboard?.employee?.rating
                      ? `${dashboard.employee.rating.toFixed(1)}/5`
                      : 'N/A'}
                  </span>
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
            <div className="text-center py-8 text-slate-500">
              <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p>Customer feedback will appear here once reviews are submitted</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <ClockInOutModal
        open={clockModalOpen}
        onClose={() => setClockModalOpen(false)}
        action={clockAction}
        onConfirm={(notes) => handleClockSubmit(clockAction, notes)}
        isSubmitting={clockInOutMutation.isPending}
      />

      <TimeOffModal
        open={timeOffModalOpen}
        onClose={() => setTimeOffModalOpen(false)}
        onSubmit={handleRequestTimeOff}
        isSubmitting={requestTimeOffMutation.isPending}
      />

      <IssueReportModal
        open={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        onSubmit={handleReportIssue}
        isSubmitting={reportIssueMutation.isPending}
      />
    </div>
  );
}
