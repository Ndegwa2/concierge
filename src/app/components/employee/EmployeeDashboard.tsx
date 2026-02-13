import { useState } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  CheckSquare,
  User,
  LogOut,
  Menu,
  X,
  Car
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { EmployeeOverview } from './EmployeeOverview';
import { MyAssignments } from './MyAssignments';
import { MySchedule } from './MySchedule';
import { EmployeeProfile } from './EmployeeProfile';

interface EmployeeDashboardProps {
  onLogout: () => void;
}

export function EmployeeDashboard({ onLogout }: EmployeeDashboardProps) {
  const [currentSection, setCurrentSection] = useState<'overview' | 'assignments' | 'schedule' | 'profile'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mock employee data
  const employeeData = {
    name: 'Michael Chen',
    id: 'C-001',
    email: 'michael.chen@autoconcierge.com',
    phone: '+1 555-1001',
    location: 'Downtown District'
  };

  const navigation = [
    { id: 'overview', name: 'Overview', icon: LayoutDashboard },
    { id: 'assignments', name: 'My Assignments', icon: CheckSquare },
    { id: 'schedule', name: 'Schedule', icon: Calendar },
    { id: 'profile', name: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-slate-900 p-2 rounded-lg">
                <Car className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold">AutoConcierge</h1>
                <p className="text-xs text-slate-500">Employee Portal</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{employeeData.name}</p>
              <p className="text-xs text-slate-500">{employeeData.id}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r z-30
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentSection(item.id as any);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
                    ${isActive 
                      ? 'bg-slate-900 text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          {currentSection === 'overview' && <EmployeeOverview employeeData={employeeData} />}
          {currentSection === 'assignments' && <MyAssignments employeeData={employeeData} />}
          {currentSection === 'schedule' && <MySchedule employeeData={employeeData} />}
          {currentSection === 'profile' && <EmployeeProfile employeeData={employeeData} />}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
