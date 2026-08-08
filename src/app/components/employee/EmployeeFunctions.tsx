import type { ComponentType } from 'react';
import { 
  Navigation, 
  Phone, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  Send,
  Book,
  Wrench
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';

interface EmployeeFunctionsProps {
  employeeData: {
    name: string;
    id: string;
  };
}

interface FunctionAction {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  shortcut: string;
}

const functionCategories: { name: string; actions: FunctionAction[] }[] = [
  {
    name: 'Assignment Actions',
    actions: [
      { id: 'start-service', title: 'Start Service', description: 'Begin an assigned service appointment', icon: Navigation, shortcut: 'On scheduled assignments' },
      { id: 'complete-service', title: 'Complete Service', description: 'Mark a service as completed for the customer', icon: CheckCircle2, shortcut: 'On in-progress services' },
      { id: 'update-status', title: 'Update Status', description: 'Update the status of an ongoing assignment', icon: Clock, shortcut: 'On in-progress services' },
      { id: 'cancel-assignment', title: 'Cancel Assignment', description: 'Cancel an assigned appointment', icon: AlertCircle, shortcut: 'On cancellable assignments' },
    ]
  },
  {
    name: 'Customer Communication',
    actions: [
      { id: 'call-customer', title: 'Call Customer', description: 'Call the customer for an assigned appointment', icon: Phone, shortcut: 'From any assignment card' },
      { id: 'send-message', title: 'Send Message', description: 'Send a text message to the customer', icon: Send, shortcut: 'From any assignment card' },
    ]
  },
  {
    name: 'Navigation',
    actions: [
      { id: 'navigate-pickup', title: 'Navigate to Pickup', description: 'Open maps to the customer pickup location', icon: Navigation, shortcut: 'On active assignments' },
      { id: 'navigate-service', title: 'Navigate to Service Location', description: 'Open maps to the service location address', icon: Navigation, shortcut: 'On active assignments' },
    ]
  },
  {
    name: 'Time & Attendance',
    actions: [
      { id: 'clock-in-out', title: 'Clock In/Out', description: 'Record your work hours for the day', icon: Clock, shortcut: 'Always available' },
      { id: 'request-time-off', title: 'Request Time Off', description: 'Submit a time off request for approval', icon: Calendar, shortcut: 'Always available' },
    ]
  },
  {
    name: 'Support',
    actions: [
      { id: 'report-issue', title: 'Report Issue', description: 'Report a problem with an assignment or vehicle', icon: AlertCircle, shortcut: 'Always available' },
      { id: 'view-guidelines', title: 'View Guidelines', description: 'Review company policies and service guidelines', icon: Book, shortcut: 'Always available' },
    ]
  },
];

export function EmployeeFunctions({ employeeData: _employeeData }: EmployeeFunctionsProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Functions</h1>
        <p className="text-slate-600">Quick-reference guide for all available employee actions</p>
      </div>

      {functionCategories.map((category) => (
        <Card key={category.name}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-slate-600" />
              {category.name}
            </CardTitle>
            <CardDescription>
              {category.actions.length} available action{category.actions.length > 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {category.actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Card key={action.id} className="border border-slate-200 hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <Icon className="h-5 w-5 text-slate-700" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{action.title}</h3>
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {action.shortcut}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{action.description}</p>
                          <Button variant="outline" size="sm" className="mt-3">
                            <Icon className="h-4 w-4 mr-2" />
                            Run Action
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
