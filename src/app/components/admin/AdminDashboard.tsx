import { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  Car,
  LogOut,
  Menu,
  X,
  Truck,
  FileText,
  BarChart3,
  Wallet,
  ClipboardCheck,
  Building2,
  Home,
  CreditCard,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Truck as TruckIcon,
  DollarSign,
  PieChart,
  ClipboardList,
  UserCog,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { DashboardOverview } from './DashboardOverview';
import { AppointmentsManager } from './AppointmentsManager';
import { CustomersManager } from './CustomersManager';
import { ServicePartnersManager } from './ServicePartnersManager';
import { FleetManagement } from './FleetManagement';
import { Financials } from './Financials';
import { StaffAndLeave } from './StaffAndLeave';
import { POSView } from './POSView';
import { PendingEmployeesManager } from './PendingEmployeesManager';
import { PendingTimeOffManager } from './PendingTimeOffManager';
import { EmployeesManager } from './EmployeesManager';

interface AdminDashboardProps {
  onLogout: () => void;
}

type Section = 
  | 'overview' 
  | 'appointments' 
  | 'concierge-requests' 
  | 'pos'
  | 'fleet' 
  | 'financials' 
  | 'partners'
  | 'staff' 
  | 'leave'
  | 'customers';

type GroupId = 'operations' | 'management' | 'team-users';

const GROUP_LABELS: Record<GroupId, string> = {
  operations: 'Operations',
  management: 'Management',
  'team-users': 'Team & Users',
};

const GROUP_ICONS: Record<GroupId, typeof LayoutDashboard> = {
  operations: Briefcase,
  management: Building2,
  'team-users': Users,
};

const SECTION_CONFIG: Record<Section, { label: string; icon: typeof LayoutDashboard; group: GroupId }> = {
  overview: { label: 'Overview', icon: LayoutDashboard, group: 'operations' },
  appointments: { label: 'Appointments', icon: Calendar, group: 'operations' },
  'concierge-requests': { label: 'Concierge Requests', icon: ClipboardList, group: 'operations' },
  pos: { label: 'POS Terminal', icon: Wallet, group: 'operations' },
  fleet: { label: 'Fleet Management', icon: TruckIcon, group: 'management' },
  financials: { label: 'Financials', icon: DollarSign, group: 'management' },
  partners: { label: 'Service Partners', icon: Car, group: 'management' },
  staff: { label: 'Staff Management', icon: UserCog, group: 'team-users' },
  leave: { label: 'Leave Requests', icon: Calendar, group: 'team-users' },
  customers: { label: 'Customers', icon: Users, group: 'team-users' },
};

const GROUP_SECTIONS: Record<GroupId, Section[]> = {
  operations: ['overview', 'appointments', 'concierge-requests', 'pos'],
  management: ['fleet', 'financials', 'partners'],
  'team-users': ['staff', 'leave', 'customers'],
};

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [currentSection, setCurrentSection] = useState<Section>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<GroupId, boolean>>({
    operations: true,
    management: true,
    'team-users': true,
  });

  const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = storedUser ? JSON.parse(storedUser) : null;
  const displayName = user?.name || 'Admin';
  const displayEmail = user?.email || '';

  const toggleGroup = (groupId: GroupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleSectionClick = (section: Section) => {
    setCurrentSection(section);
    setSidebarOpen(false);
  };

const renderContent = () => {
        switch (currentSection) {
          case 'overview':
            return <DashboardOverview onNavigate={handleSectionClick} />;
          case 'appointments':
            return <AppointmentsManager />;
          case 'concierge-requests':
            return <PendingEmployeesManager />;
          case 'pos':
            return <POSView mode="admin" />;
          case 'fleet':
            return <FleetManagement />;
          case 'financials':
            return <Financials />;
          case 'partners':
            return <ServicePartnersManager />;
          case 'staff':
            return <EmployeesManager />;
          case 'leave':
            return <PendingTimeOffManager />;
          case 'customers':
            return <CustomersManager />;
          default:
            return <DashboardOverview onNavigate={handleSectionClick} />;
        }
      };

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
                <p className="text-xs text-slate-500">Admin Panel</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-slate-500">{displayEmail}</p>
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
          <nav className="p-4 space-y-4 overflow-y-auto h-full">
            {(['operations', 'management', 'team-users'] as GroupId[]).map((groupId) => {
              const isExpanded = expandedGroups[groupId];
              const sections = GROUP_SECTIONS[groupId];
              const GroupIcon = GROUP_ICONS[groupId];
              
              return (
                <div key={groupId} className="space-y-1">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(groupId)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors text-slate-600 hover:bg-slate-100 font-medium text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <GroupIcon className="h-4 w-4" />
                      <span>{GROUP_LABELS[groupId]}</span>
                    </div>
                    <span className="transition-transform duration-200 flex-shrink-0">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                  </button>

                  {/* Group Content */}
                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-0.5 border-l border-slate-200 pl-3 animate-in slide-in-from-top-2 duration-200">
                      {sections.map((sectionId) => {
                        const config = SECTION_CONFIG[sectionId];
                        const Icon = config.icon;
                        const isActive = currentSection === sectionId;
                        return (
                          <button
                            key={sectionId}
                            onClick={() => handleSectionClick(sectionId)}
                            className={`
                              w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors
                              ${isActive 
                                ? 'bg-slate-900 text-white' 
                                : 'text-slate-600 hover:bg-slate-100'
                              }
                            `}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium truncate">{config.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          {renderContent()}
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