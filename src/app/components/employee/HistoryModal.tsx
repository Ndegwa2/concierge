import { Clock, AlertCircle, X, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import type { TimeOffRequest, IssueReport } from '@/services/api';

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  timeOffRequests: TimeOffRequest[];
  issues: IssueReport[];
}

export function HistoryModal({
  open,
  onClose,
  timeOffRequests,
  issues,
}: HistoryModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'resolved':
      case 'closed':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    return <AlertCircle className="h-4 w-4 text-orange-600" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            History &amp; Records
          </DialogTitle>
          <DialogDescription>
            View your time-off requests and issue reports
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="time-off" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="time-off">Time Off ({timeOffRequests.length})</TabsTrigger>
            <TabsTrigger value="issues">Issues ({issues.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="time-off" className="flex-1">
            <ScrollArea className="h-full">
              <div className="space-y-3 py-4">
                {timeOffRequests.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No time-off requests submitted
                  </div>
                ) : (
                  timeOffRequests.map((request) => (
                    <div
                      key={request.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium capitalize">
                            {request.request_type}
                          </p>
                          <p className="text-sm text-slate-600">
                            {formatDate(request.start_date)} -{' '}
                            {formatDate(request.end_date)}
                          </p>
                          {request.reason && (
                            <p className="text-sm text-slate-500">
                              {request.reason}
                            </p>
                          )}
                        </div>
                        <Badge
                          className={getStatusColor(request.status)}
                          variant="outline"
                        >
                          {request.status}
                        </Badge>
                      </div>
                      {request.admin_notes && (
                        <div className="p-2 bg-slate-50 rounded text-sm">
                          <span className="font-medium text-slate-700">
                            Admin Notes:
                          </span>{' '}
                          <span className="text-slate-600">
                            {request.admin_notes}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="issues" className="flex-1">
            <ScrollArea className="h-full">
              <div className="space-y-3 py-4">
                {issues.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No issues reported
                  </div>
                ) : (
                  issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getPriorityIcon(issue.priority)}
                            <p className="font-medium">{issue.title}</p>
                          </div>
                          <p className="text-sm text-slate-600">
                            {formatDate(issue.created_at)}
                          </p>
                          <p className="text-sm text-slate-500">
                            {issue.description}
                          </p>
                        </div>
                        <Badge
                          className={getStatusColor(issue.status)}
                          variant="outline"
                        >
                          {issue.status}
                        </Badge>
                      </div>
                      {issue.resolution_notes && (
                        <div className="p-2 bg-slate-50 rounded text-sm">
                          <span className="font-medium text-slate-700">
                            Resolution:
                          </span>{' '}
                          <span className="text-slate-600">
                            {issue.resolution_notes}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="pt-2 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
