
import { useState } from 'react';
import { Menu, X, Car, User, Calendar } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { usePermission } from '@/hooks/usePermission';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onLoginClick?: () => void;
  isLoggedIn?: boolean;
}

export function Header({ currentView, onNavigate, onLoginClick, isLoggedIn }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hasPermission, isLoading } = usePermission();

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            <div className="bg-slate-900 p-2 rounded-lg">
              <Car className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl">AutoConcierge</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => onNavigate('home')}
              className={`hover:text-slate-900 transition-colors ${
                currentView === 'home' ? 'text-slate-900 font-medium' : 'text-slate-600'
              }`}
            >
              Services
            </button>
            <button
              onClick={() => onNavigate('appointments')}
              className={`hover:text-slate-900 transition-colors ${
                currentView === 'appointments' ? 'text-slate-900 font-medium' : 'text-slate-600'
              }`}
            >
              My Appointments
            </button>
            <button
              onClick={() => onNavigate('how-it-works')}
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              How It Works
            </button>
            <Button variant="outline" size="sm" onClick={onLoginClick}>
              <User className="h-4 w-4 mr-2" />
              {isLoggedIn ? 'Profile' : 'Sign In'}
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col gap-4">
              <button
                onClick={() => {
                  onNavigate('home');
                  setMobileMenuOpen(false);
                }}
                className="text-left px-2 py-1 hover:text-slate-900"
              >
                Services
              </button>
              <button
                onClick={() => {
                  onNavigate('appointments');
                  setMobileMenuOpen(false);
                }}
                className="text-left px-2 py-1 hover:text-slate-900"
              >
                My Appointments
              </button>
              <button
                onClick={() => {
                  onNavigate('how-it-works');
                  setMobileMenuOpen(false);
                }}
                className="text-left px-2 py-1 hover:text-slate-900"
              >
                How It Works
              </button>
              <Button variant="outline" size="sm" className="w-fit" onClick={onLoginClick}>
                <User className="h-4 w-4 mr-2" />
                {isLoggedIn ? 'Profile' : 'Sign In'}
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
</path>
<line_count>
85
</line_count>
</write_to_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "completed", "description": "Update navigation menu to use permission-based rendering"}, {"status": "in_progress", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "pending", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/hooks/usePermission.ts"}
</path>
</read_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "completed", "description": "Update navigation menu to use permission-based rendering"}, {"status": "in_progress", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "pending", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/contexts/RBACContext.tsx"}
</path>
</read_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "completed", "description": "Update navigation menu to use permission-based rendering"}, {"status": "in_progress", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "in_progress", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/types/rbac.ts"}
</path>
</read_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "completed", "description": "Update navigation menu to use permission-based rendering"}, {"status": "in_progress", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "in_progress", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/app/components/admin/AdminDashboard.tsx"}
</path>
</read_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "completed", "description": "Update navigation menu to use permission-based rendering"}, {"status": "in_progress", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "in_progress", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/app/components/admin/AppointmentsManager.tsx"}
</path>
</read_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "completed", "description": "Update navigation menu to use permission-based rendering"}, {"status": "in_progress", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "in_progress", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/app/components/admin/CustomersManager.tsx"}
</path>
</read_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "completed", "description": "Update navigation menu to use permission-based rendering"}, {"status": "in_progress", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "in_progress", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/app/components/admin/ConciergeManager.tsx"}
</path>
</read_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "completed", "description": "Update navigation menu to use permission-based rendering"}, {"status": "in_progress", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "in_progress", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/app/components/admin/ServicePartnersManager.tsx"}
</path>
</read_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "completed", "description": "Update navigation menu to use permission-based rendering"}, {"status": "in_progress", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "in_progress", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/app/components/admin/DashboardOverview.tsx"}
</path>
</read_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "completed", "description": "Update navigation menu to use permission-based rendering"}, {"status": "in_progress", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "in_progress", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/app/components/admin/PendingEmployeesManager.tsx"}
</path>
</read_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "completed", "description": "Update navigation menu to use permission-based rendering"}, {"status": "in_progress", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "in_progress", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/app/components/employee/MyAssignments.tsx"}
</path>
</read_file>
<|tool_call_begin|>update_todo_list<|tool_call_argument|>{"todos": [{"status": "completed", "description": "Analyze existing authentication and context structure"}, {"status": "completed", "description": "Create RBAC context provider with API integration"}, {"status": "completed", "description": "Implement custom hook for permission checking"}, {"status": "completed", "description": "Create Protect wrapper component for conditional rendering"}, {"status": "completed", "description": "Update navigation menu to use permission-based rendering"}, {"status": "in_progress", "description": "Update action buttons in admin components to respect permissions"}, {"status": "pending", "description": "Ensure loading and error states are handled properly"}, {"status": "in_progress", "description": "Implement strict TypeScript types for roles and permissions"}]}
</update_todo_list>
<|tool_call_begin|>read_file<|tool_call_argument|>{"path": "src/app/components/admin/AdminDashboard.tsx"}
</path>
</read_file>
<|tool_call_begin
