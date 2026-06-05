import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Shield, User as UserIcon, Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (userType: 'customer' | 'admin' | 'employee') => void;
  onSwitchToSignUp: () => void;
}

export function LoginModal({ open, onClose, onLogin, onSwitchToSignUp }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState('customer');
  
  // Form states
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customerEmail.toLowerCase().trim(),
          password: customerPassword,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store tokens
        if (data.data.access_token) {
          localStorage.setItem('auth_token', data.data.access_token);
          localStorage.setItem('refresh_token', data.data.refresh_token);
          localStorage.setItem('user', JSON.stringify(data.data.user));
        }
        
        onLogin('customer');
        onClose();
        
        // Reset form
        setCustomerEmail('');
        setCustomerPassword('');
      } else {
        setError(data.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: adminEmail.toLowerCase().trim(),
          password: adminPassword,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store tokens
        if (data.data.access_token) {
          localStorage.setItem('auth_token', data.data.access_token);
          localStorage.setItem('refresh_token', data.data.refresh_token);
          localStorage.setItem('user', JSON.stringify(data.data.user));
        }
        
        onLogin('admin');
        onClose();
        
        // Reset form
        setAdminEmail('');
        setAdminPassword('');
      } else {
        setError(data.message || 'Admin login failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/employee/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: employeeEmail.toLowerCase().trim(),
          password: employeePassword,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store tokens
        if (data.data.access_token) {
          localStorage.setItem('auth_token', data.data.access_token);
          localStorage.setItem('refresh_token', data.data.refresh_token);
          localStorage.setItem('user', JSON.stringify(data.data.user));
        }
        
        onLogin('employee');
        onClose();
        
        // Reset form
        setEmployeeEmail('');
        setEmployeePassword('');
      } else {
        setError(data.message || 'Employee login failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setCustomerEmail('');
    setCustomerPassword('');
    setAdminEmail('');
    setAdminPassword('');
    setEmployeeEmail('');
    setEmployeePassword('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Welcome Back</DialogTitle>
          <DialogDescription>
            Sign in to your account to continue
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="customer">Customer</TabsTrigger>
            <TabsTrigger value="employee">Employee</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="customer">
            <form onSubmit={handleCustomerLogin} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="customer@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customer-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={customerPassword}
                    onChange={(e) => setCustomerPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="employee">
            <form onSubmit={handleEmployeeLogin} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="employee-email">Employee Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="employee-email"
                    type="email"
                    placeholder="employee@autoconcierge.com"
                    value={employeeEmail}
                    onChange={(e) => setEmployeeEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="employee-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={employeePassword}
                    onChange={(e) => setEmployeePassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <UserIcon className="h-4 w-4" />
                <span>Employee portal access</span>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Employee Sign In'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="admin">
            <form onSubmit={handleAdminLogin} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@autoconcierge.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Shield className="h-4 w-4" />
                <span>Admin access</span>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Admin Sign In'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Switch to Sign Up */}
        <div className="text-center text-sm text-muted-foreground pt-4 border-t">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-primary font-medium hover:underline"
          >
            Create Account
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}