import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Shield, User as UserIcon } from 'lucide-react';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (userType: 'customer' | 'admin' | 'employee') => void;
}

export function LoginModal({ open, onClose, onLogin }: LoginModalProps) {
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');

  const handleCustomerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - any credentials work
    onLogin('customer');
    onClose();
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - any credentials work
    onLogin('admin');
    onClose();
  };

  const handleEmployeeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - any credentials work
    onLogin('employee');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome Back</DialogTitle>
          <DialogDescription>
            Sign in to your account to continue
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="customer" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="customer">Customer</TabsTrigger>
            <TabsTrigger value="employee">Employee</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="customer">
            <form onSubmit={handleCustomerLogin} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  placeholder="customer@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-password">Password</Label>
                <Input
                  id="customer-password"
                  type="password"
                  placeholder="••••••••"
                  value={customerPassword}
                  onChange={(e) => setCustomerPassword(e.target.value)}
                  required
                />
              </div>
              <div className="text-sm text-slate-500">
                Demo: Use any credentials to login
              </div>
              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="employee">
            <form onSubmit={handleEmployeeLogin} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="employee-email">Employee Email</Label>
                <Input
                  id="employee-email"
                  type="email"
                  placeholder="employee@autoconcierge.com"
                  value={employeeEmail}
                  onChange={(e) => setEmployeeEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-password">Password</Label>
                <Input
                  id="employee-password"
                  type="password"
                  placeholder="••••••••"
                  value={employeePassword}
                  onChange={(e) => setEmployeePassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <UserIcon className="h-4 w-4" />
                <span>Employee portal access - Demo mode</span>
              </div>
              <Button type="submit" className="w-full">
                Employee Sign In
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="admin">
            <form onSubmit={handleAdminLogin} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@autoconcierge.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Shield className="h-4 w-4" />
                <span>Admin access - Demo mode</span>
              </div>
              <Button type="submit" className="w-full">
                Admin Sign In
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}