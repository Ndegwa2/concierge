import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { User, Mail, Phone, MapPin, Lock, Eye, EyeOff, Loader2, CheckCircle2, XCircle, Briefcase, Users } from 'lucide-react';

interface SignUpModalProps {
  open: boolean;
  onClose: () => void;
  onSignUp: (user: any) => void;
  onSwitchToLogin: () => void;
}

interface PasswordValidation {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
}

type UserRole = 'customer' | 'employee';

export function SignUpModal({ open, onClose, onSignUp, onSwitchToLogin }: SignUpModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
    location: '',
    specialties: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  // Password validation state
  const getPasswordValidation = (password: string): PasswordValidation => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  });
  
  const passwordValidation = getPasswordValidation(formData.password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  
  // Email validation
  const isValidEmail = (email: string) => {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
  };
  
  // Phone validation (Kenyan format)
  const isValidPhone = (phone: string) => {
    if (!phone) return true; // Phone is optional
    const cleaned = phone.replace(/[\s-]/g, '');
    const pattern = /^(\+254|254|0)[17]\d{8}$/;
    return pattern.test(cleaned);
  };
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };
  
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };
  
  const validateForm = (): boolean => {
    // Check required fields
    if (!formData.name.trim()) {
      setError('Full name is required');
      return false;
    }
    
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    
    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    if (formData.phone && !isValidPhone(formData.phone)) {
      setError('Please enter a valid Kenyan phone number (e.g., 0712345678)');
      return false;
    }
    
    if (!isPasswordValid) {
      setError('Password does not meet the requirements');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    // Employee-specific validation
    if (selectedRole === 'employee' && !formData.location.trim()) {
      setError('Location is required for employee registration');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const requestBody: any = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        role: selectedRole,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
      };
      
      // Add employee-specific fields
      if (selectedRole === 'employee') {
        requestBody.location = formData.location.trim();
        requestBody.specialties = formData.specialties 
          ? formData.specialties.split(',').map(s => s.trim()).filter(Boolean)
          : [];
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // For customers: store tokens and auto-login
        if (data.data.access_token && selectedRole === 'customer') {
          localStorage.setItem('auth_token', data.data.access_token);
          localStorage.setItem('refresh_token', data.data.refresh_token);
          localStorage.setItem('user', JSON.stringify(data.data.user));
          onSignUp(data.data.user);
          onClose();
        } else if (data.data.requires_approval) {
          // For employees: show approval message
          onSignUp({ ...data.data.user, requires_approval: true });
          onClose();
        }
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          address: '',
          password: '',
          confirmPassword: '',
          location: '',
          specialties: '',
        });
        setTouched({});
        setSelectedRole('customer');
      } else {
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      password: '',
      confirmPassword: '',
      location: '',
      specialties: '',
    });
    setTouched({});
    setError(null);
    setSelectedRole('customer');
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create Account</DialogTitle>
          <DialogDescription>
            Join AutoConcierge for premium vehicle care services
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Role Selection */}
          <div className="space-y-3">
            <Label>I want to join as</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('customer')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  selectedRole === 'customer'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
              >
                <Users className={`h-6 w-6 ${selectedRole === 'customer' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="font-medium">Customer</span>
                <span className="text-xs text-muted-foreground text-center">Book services for your vehicles</span>
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedRole('employee')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  selectedRole === 'employee'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
              >
                <Briefcase className={`h-6 w-6 ${selectedRole === 'employee' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="font-medium">Employee</span>
                <span className="text-xs text-muted-foreground text-center">Join our concierge team</span>
              </button>
            </div>
            
            {selectedRole === 'employee' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Employee accounts require admin approval before activation. 
                  You'll be notified once your account is approved.
                </p>
              </div>
            )}
          </div>
          
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="signup-name">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>
          
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="signup-email">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                className={`pl-10 ${touched.email && formData.email && !isValidEmail(formData.email) ? 'border-red-500' : ''}`}
                disabled={isLoading}
              />
            </div>
            {touched.email && formData.email && !isValidEmail(formData.email) && (
              <p className="text-sm text-red-500">Please enter a valid email address</p>
            )}
          </div>
          
          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="signup-phone">Phone Number (Optional)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-phone"
                type="tel"
                placeholder="0712345678"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                className={`pl-10 ${touched.phone && formData.phone && !isValidPhone(formData.phone) ? 'border-red-500' : ''}`}
                disabled={isLoading}
              />
            </div>
            {touched.phone && formData.phone && !isValidPhone(formData.phone) && (
              <p className="text-sm text-red-500">Enter a valid Kenyan phone number</p>
            )}
          </div>
          
          {/* Employee-specific fields */}
          {selectedRole === 'employee' && (
            <>
              {/* Location Field */}
              <div className="space-y-2">
                <Label htmlFor="signup-location">
                  Preferred Work Location <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-location"
                    type="text"
                    placeholder="e.g., Nairobi CBD, Westlands, Kilimani"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    onBlur={() => handleBlur('location')}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              {/* Specialties Field */}
              <div className="space-y-2">
                <Label htmlFor="signup-specialties">Specialties (Optional)</Label>
                <Input
                  id="signup-specialties"
                  type="text"
                  placeholder="e.g., Luxury Vehicles, Detailing, Diagnostics"
                  value={formData.specialties}
                  onChange={(e) => handleInputChange('specialties', e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">Separate multiple specialties with commas</p>
              </div>
            </>
          )}
          
          {/* Address Field - only for customers */}
          {selectedRole === 'customer' && (
            <div className="space-y-2">
              <Label htmlFor="signup-address">Address (Optional)</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-address"
                  type="text"
                  placeholder="Nairobi, Kenya"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
          
          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="signup-password">
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                className="pl-10 pr-10"
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
            
            {/* Password Requirements */}
            {formData.password && (
              <div className="space-y-1 pt-2">
                <p className="text-sm font-medium text-muted-foreground">Password requirements:</p>
                <div className="grid grid-cols-2 gap-1">
                  <div className="flex items-center gap-1 text-sm">
                    {passwordValidation.length ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={passwordValidation.length ? 'text-green-600' : 'text-muted-foreground'}>
                      8+ characters
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    {passwordValidation.uppercase ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={passwordValidation.uppercase ? 'text-green-600' : 'text-muted-foreground'}>
                      Uppercase
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    {passwordValidation.lowercase ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={passwordValidation.lowercase ? 'text-green-600' : 'text-muted-foreground'}>
                      Lowercase
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    {passwordValidation.number ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={passwordValidation.number ? 'text-green-600' : 'text-muted-foreground'}>
                      Number
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="signup-confirm-password">
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                className={`pl-10 pr-10 ${
                  touched.confirmPassword && formData.confirmPassword && formData.password !== formData.confirmPassword
                    ? 'border-red-500'
                    : ''
                }`}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {touched.confirmPassword && formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-sm text-red-500">Passwords do not match</p>
            )}
          </div>
          
          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              selectedRole === 'customer' ? 'Create Account' : 'Submit Application'
            )}
          </Button>
          
          {/* Switch to Login */}
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-primary font-medium hover:underline"
            >
              Sign In
            </button>
          </div>
          
          {/* Terms */}
          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{' '}
            <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}