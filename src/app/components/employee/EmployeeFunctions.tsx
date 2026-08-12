import { useState } from 'react';
import {
  Clock,
  Calendar,
  AlertCircle,
  BookText,
  Navigation,
  Phone,
  MessageSquare,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  MapPin,
  ChevronRight,
  History,
  Wrench,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import {
  useMyAssignments,
  useUpdateAssignmentStatus,
  useTimeLogs,
  useClockInOut,
  useTimeOffRequests,
  useRequestTimeOff,
  useIssueReports,
  useReportIssue,
} from '@/hooks/useApi';
import type { EmployeeAssignment } from '@/services/api';
import { UpdateAssignmentStatusModal } from './UpdateAssignmentStatusModal';
import { TimeOffModal, type TimeOffRequestData } from './TimeOffModal';
import { IssueReportModal, type IssueReportData } from './IssueReportModal';
import { ClockInOutModal } from './ClockInOutModal';
import { ViewGuidelinesModal } from './ViewGuidelinesModal';
import { HistoryModal } from './HistoryModal';

interface EmployeeFunctionsProps {
  employeeData: {
    name: string;
    id: string;
  };
}

export function EmployeeFunctions({ employeeData }: EmployeeFunctionsProps) {
  // --- Data fetching via React Query ---
  const { data: assignments = [], isLoading: assignmentsLoading, error: assignmentsError } = useMyAssignments();
  const { data: timeLogs, isLoading: timeLogsLoading } = useTimeLogs();
  const { data: timeOffData, isLoading: timeOffLoading } = useTimeOffRequests();
  const { data: issueData, isLoading: issuesLoading } = useIssueReports();

  // --- Mutations ---
  const updateStatusMutation = useUpdateAssignmentStatus();
  const clockInOutMutation = useClockInOut();
  const requestTimeOffMutation = useRequestTimeOff();
  const reportIssueMutation = useReportIssue();

  // --- Modal states ---
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<EmployeeAssignment | null>(null);
  const [timeOffModalOpen, setTimeOffModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [clockModalOpen, setClockModalOpen] = useState(false);
  const [clockAction, setClockAction] = useState<'in' | 'out'>('in');
  const [guidelinesModalOpen, setGuidelinesModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // --- Error state ---
  const [globalError, setGlobalError] = useState<string | null>(null);

  // --- Computed values ---
  const activeAssignments = assignments.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
  const upcomingAssignments = activeAssignments.filter(a => {
    const apptDate = new Date(a.appointment?.appointment_date || '');
    return apptDate >= new Date();
  });

  const isInOffice = timeLogs?.is_clocked_in ?? false;
  const totalHoursToday = timeLogs?.total_hours ?? 0;
  const pendingTimeOff = timeOffData?.pending_count ?? 0;
  const openIssues = issueData?.open_count ?? 0;

  // --- Event handlers ---
  const handleUpdateAssignmentStatus = async (status: string, notes?: string) => {
    if (!selectedAssignment) return;
    try {
      setGlobalError(null);
      await updateStatusMutation.mutateAsync({
        id: selectedAssignment.id,
        status,
        notes,
      });
      setSelectedAssignment(null);
      setStatusModalOpen(false);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to update assignment status');
    }
  };

  const handleClockIoU = async (action: 'in' | 'out', notes?: string) => {
    try {
      setGlobalError(null);
      await clockInOutMutation.mutateAsync({ action, notes });
      setClockModalOpen(false);
    } catch (err: any) {
      setGlobalError(err.message || `Failed to clock ${action}`);
    }
  };

  const handleRequestTimeOff = async (data: TimeOffModalData) => {
    try {
      setGlobalError(null);
      await requestTimeOffMutation.mutateAsync(data);
      setTimeOffModalOpen(false);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to submit time-off request');
    }
  };

  const handleReportIssue = async (data: IssueReportData) => {
    try {
      setGlobalError(null);
      await reportIssueMutation.mutateAsync(data);
      setIssueModalOpen(false);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to report issue');
    }
  };

  const handleNavigate = (address: string) => {
    const url = `https://maps.google.com/maps?q=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  const handleCallCustomer = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleSendMessage = (phone: string) => {
    window.location.href = `sms:${phone}`;
  };

  const handleClockClick = (action: 'in' | 'out') => {
    setClockAction(action);
    setClockModalOpen(true);
  };

  // --- Render assignment actions based on status ---
  const getAssignmentActions = (assignment: EmployeeAssignment) => {
    const { status } = assignment;
    const actions: React.ReactNode[] = [];

    if (status === 'assigned' || status === 'scheduled') {
      actions.push(
        <Button
          key="start"
          size="sm"
          className="flex-1"
          onClick={() => {
            setSelectedAssignment(assignment);
            setStatusModalOpen(true);
          }}
        >
          <PlayCircle className="h-4 w-4 mr-2" />
          Start Service
        </Button>
      );
      actions.push(
        <Button
          key="cancel"
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => {
            setSelectedAssignment(assignment);
            setStatusModalOpen(true);
          }}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      );
    }

    if (status === 'in-progress') {
      actions.push(
        <Button
          key="complete"
          size="sm"
          className="flex-1"
          onClick={() => {
            setSelectedAssignment(assignment);
            setStatusModalOpen(true);
          }}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Complete
        </Button>
      );
      actions.push(
        <Button
          key="update"
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => {
            setSelectedAssignment(assignment);
            setStatusModalOpen(true);
          }}
        >
          Update Status
        </Button>
      );
    }

    if (status === 'completed') {
      actions.push(
        <Button
          key="details"
          size="sm"
          variant="outline"
          className="flex-1"
        >
          View Details
        </Button>
      );
    }

    return actions;
  };

  if (assignmentsLoading || timeLogsLoading || timeOffLoading || issuesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (assignmentsError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load assignments. Please try again later.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Functions</h1>
        <p className="text-slate-600">
          Quick actions and tools for your daily work, {employeeData.name.split(' ')[0] || 'there'}
        </p>
      </div>

      {/* Global error */}
      {globalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      {/* Mutating state alerts */}
      {updateStatusMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to update assignment status. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Clock In/Out & Status Bar */}
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
                <span>{totalHoursToday} hours today</span>
              </div>
            </div>
            <div className="flex gap-2">
              {!isInOffice ? (
                <Button
                  size="sm"
                  onClick={() => handleClockClick('in')}
                  disabled={clockInOutMutation.isPending}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Clock In
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClockClick('out')}
                  disabled={clockInOutMutation.isPending}
                >
                  <PauseCircle className="h-4 w-4 mr-2" />
                  Clock Out
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setHistoryModalOpen(true)}
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for your daily workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setTimeOffModalOpen(true)}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs">Request Time Off</span>
              {pendingTimeOff > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {pendingTimeOff} pending
                </Badge>
              )}
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setIssueModalOpen(true)}
            >
              <AlertCircle className="h-5 w-5" />
              <span className="text-xs">Report Issue</span>
              {openIssues > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {openIssues} open
                </Badge>
              )}
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setGuidelinesModalOpen(true)}
            >
              <BookText className="h-5 w-5" />
              <span className="text-xs">View Guidelines</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => {
                const phone = 'tel:';
                window.location.href = phone;
              }}
            >
              <Phone className="h-5 w-5" />
              <span className="text-xs">Call Support</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => {
                const email = 'mailto:support@autoconcierge.com';
                window.location.href = email;
              }}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs">Message Support</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Assignments Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Assignments</CardTitle>
          <CardDescription>
            {upcomingAssignments.length} upcoming appointment(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeAssignments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Wrench className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p>No active assignments at the moment</p>
              <p className="text-xs mt-1">Check back later for new assignments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAssignments.map((assignment) => {
                const appt = assignment.appointment;
                const customer = appt?.customer;
                const service = appt?.service;
                const vehicle = appt?.vehicle;

                return (
                  <Card
                    key={assignment.id}
                    className="border border-slate-200 hover:shadow-md transition-shadow"
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">
                              {service?.name || 'Unknown Service'}
                            </h3>
                            <Badge variant="outline">
                              {assignment.status
                                .split('-')
                                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                .join(' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            Customer: {customer?.name || 'N/A'}
                          </p>
                          <p className="text-sm text-slate-600">
                            Vehicle: {vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : 'N/A'}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>

                      {appt?.appointment_date && (
                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(appt.appointment_date).toLocaleDateString('en-KE', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {new Date(appt.appointment_date).toLocaleTimeString('en-KE', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Contact & Navigation Row */}
                      <div className="flex items-center gap-2 mb-3">
                        {customer?.phone && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCallCustomer(customer.phone!)}
                            >
                              <Phone className="h-4 w-4 mr-1" />
                              Call
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendMessage(customer.phone!)}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              SMS
                            </Button>
                          </>
                        )}
                        {appt?.notes && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleNavigate(appt.notes!)}
                          >
                            <MapPin className="h-4 w-4 mr-1" />
                            Navigate
                          </Button>
                        )}
                      </div>

                      {/* Status-specific actions */}
                      <div className="flex gap-2">
                        {getAssignmentActions(assignment)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Tasks Summary */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Time Off</CardTitle>
            <CardDescription>Your time-off requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {timeOffData && timeOffData.requests.length > 0 ? (
              timeOffData.requests.slice(0, 3).map((request) => (
                <div key={request.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium capitalize">{request.request_type}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(request.start_date).toLocaleDateString('en-KE', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      -{' '}
                      {new Date(request.end_date).toLocaleDateString('en-KE', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {request.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 py-2">No time-off requests</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Issues</CardTitle>
            <CardDescription>Issues you reported</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {issueData && issueData.issues.filter(i => i.status === 'open' || i.status === 'in-progress').length > 0 ? (
              issueData.issues
                .filter(i => i.status === 'open' || i.status === 'in-progress')
                .slice(0, 3)
                .map((issue) => (
                  <div key={issue.id} className="flex items-start justify-between py-2 border-b last:border-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <p className="text-sm font-medium">{issue.title}</p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {issue.created_at && new Date(issue.created_at).toLocaleDateString('en-KE', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {issue.priority}
                    </Badge>
                  </div>
                ))
            ) : (
              <p className="text-sm text-slate-500 py-2">No open issues</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {selectedAssignment && (
        <UpdateAssignmentStatusModal
          open={statusModalOpen}
          onClose={() => {
            setStatusModalOpen(false);
            setSelectedAssignment(null);
          }}
          assignment={{
            id: selectedAssignment.id,
            status: selectedAssignment.status,
            appointment: {
              service: { name: selectedAssignment.appointment?.service?.name || 'Unknown' },
              customer: { name: selectedAssignment.appointment?.customer?.name || 'N/A' },
            },
          }}
          onSave={handleUpdateAssignmentStatus}
          isSubmitting={updateStatusMutation.isPending}
        />
      )}

      <ClockInOutModal
        open={clockModalOpen}
        onClose={() => setClockModalOpen(false)}
        action={clockAction}
        onConfirm={(notes) => handleClockIoU(clockAction, notes)}
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

      <ViewGuidelinesModal
        open={guidelinesModalOpen}
        onClose={() => setGuidelinesModalOpen(false)}
      />

      {timeOffData && issueData && (
        <HistoryModal
          open={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          timeOffRequests={timeOffData.requests}
          issues={issueData.issues}
        />
      )}
    </div>
  );
}
