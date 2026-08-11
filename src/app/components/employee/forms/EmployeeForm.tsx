import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  FileText,
  Upload,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { toast } from 'sonner';
import { api } from '@/services/api';
import type { User, EmployeeProfile, EmployeeDocument, RegisterEmployeeData } from '@/services/api';
import { usePermission } from '@/hooks/usePermission';

export type EmploymentType = 'full_time' | 'part_time' | 'contractor';
export type AccountStatus = 'active' | 'onboarding' | 'suspended' | 'terminated';
export type PayFrequency = 'monthly' | 'bi_weekly' | 'weekly';
export type HealthPlanTier = 'basic' | 'standard' | 'premium';
export type DocType = 'id_proof' | 'tax_form' | 'certification' | 'contract' | 'other';

export interface EmployeeFormValues extends RegisterEmployeeData {
  employeeId?: number;
  confirmPassword?: string;
}

export const DEPARTMENTS = [
  'Operations',
  'Customer Service',
  'Maintenance',
  'Detailing',
  'Administration',
  'Management',
];

export const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contractor', label: 'Contractor' },
];

export const ACCOUNT_STATUSES: { value: AccountStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'terminated', label: 'Terminated' },
];

export const PAY_FREQUENCIES: { value: PayFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi_weekly', label: 'Bi-weekly' },
  { value: 'weekly', label: 'Weekly' },
];

export const HEALTH_PLAN_TIERS: { value: HealthPlanTier; label: string }[] = [
  { value: 'basic', label: 'Basic' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
];

export const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'id_proof', label: 'ID Proof' },
  { value: 'tax_form', label: 'Tax Form' },
  { value: 'certification', label: 'Certification' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' },
];

export interface EmployeeFormProps {
  mode: 'add' | 'edit';
  employeeId?: number;
  initialData?: Partial<EmployeeFormValues> & {
    user?: Partial<User>;
    employee?: Partial<EmployeeProfile>;
  };
  departments?: string[];
  managers?: Array<{ id: number; name: string; employee_id: string }>;
  onSubmit: (data: EmployeeFormValues) => Promise<void>;
  onCancel: () => void;
}

const defaultValues: Partial<EmployeeFormValues> = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  address: '',
  location: '',
  specialties: [],
  department: '',
  title: '',
  employment_type: 'full_time',
  start_date: '',
  account_status: 'onboarding',
  exit_notes: '',
  offboarding_checklist_completed: false,
  status: 'active',
};

export function EmployeeForm({
  mode,
  employeeId,
  initialData,
  departments = DEPARTMENTS,
  managers = [],
  onSubmit,
  onCancel,
}: EmployeeFormProps) {
  const { hasPermission } = usePermission();
  const canEditCompensation = hasPermission('employees', 'update') || hasPermission('users', 'update');
  const [activeTab, setActiveTab] = useState('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    defaultValues: mode === 'edit' && initialData
      ? {
          ...defaultValues,
          ...(initialData.user || {}),
          ...(initialData.employee || {}),
          specialties: initialData.employee?.specialties || [],
          confirmPassword: '',
          password: '',
        }
      : defaultValues,
  });

  const specialtiesValue = watch('specialties', []);
  const accountStatus = watch('account_status', 'active');

  const handleSpecialtyAdd = (specialty: string) => {
    if (specialty && !specialtiesValue.includes(specialty)) {
      setValue('specialties', [...specialtiesValue, specialty]);
    }
  };

  const handleSpecialtyRemove = (specialty: string) => {
    setValue(
      'specialties',
      specialtiesValue.filter((s) => s !== specialty)
    );
  };

  const handleSpecialtyInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = e.currentTarget;
      const value = input.value.trim();
      if (value) {
        handleSpecialtyAdd(value);
        input.value = '';
      }
    }
  };

  const handleFormSubmit = async (data: EmployeeFormValues) => {
    setUploadError(null);

    const payload: RegisterEmployeeData = {
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      password: data.password,
      location: data.location.trim(),
      phone: data.phone?.trim() || undefined,
      address: data.address?.trim() || undefined,
      specialties: data.specialties || [],
      department: data.department,
      title: data.title?.trim() || undefined,
      employment_type: data.employment_type,
      start_date: data.start_date,
      account_status: data.account_status,
      exit_notes: data.exit_notes?.trim() || undefined,
      offboarding_checklist_completed: data.offboarding_checklist_completed,
      status: data.status,
      base_salary: data.base_salary,
      hourly_rate: data.hourly_rate,
      pay_frequency: data.pay_frequency,
      bank_account_number: data.bank_account_number,
      bank_name: data.bank_name,
      health_plan_tier: data.health_plan_tier,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to save employee');
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    const name = watch('name');
    const email = watch('email');
    const location = watch('location');
    const password = watch('password');

    if (!name || !name.trim()) return false;
    if (!email || !email.trim()) return false;
    if (!location || !location.trim()) return false;
    if (mode === 'add' && (!password || password.length < 8)) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;

    return true;
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="compensation">Compensation & Benefits</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding / Offboarding</TabsTrigger>
          <TabsTrigger value="documents">Document Upload</TabsTrigger>
        </TabsList>

        {/* ===== Tab 1: Personal Info ===== */}
        <TabsContent value="personal" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Full name is required' }}
                  render={({ field }) => (
                    <Input
                      id="name"
                      placeholder="John Doe"
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? 'name-error' : undefined}
                      {...field}
                    />
                  )}
                />
                {errors.name && (
                  <p id="name-error" className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Controller
                    name="email"
                    control={control}
                    rules={{
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Please enter a valid email address',
                      },
                    }}
                    render={({ field }) => (
                      <Input
                        id="email"
                        type="email"
                        placeholder="employee@autoconcierge.co.ke"
                        className="pl-10"
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                        {...field}
                      />
                    )}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+254 712-345-678"
                        className="pl-10"
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Controller
                    name="address"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="address"
                        placeholder="Nairobi, Kenya"
                        className="pl-10"
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>

              {mode === 'add' && (
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="password"
                    control={control}
                    rules={{
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Password must be at least 8 characters' },
                      validate: {
                        uppercase: (v) =>
                          /[A-Z]/.test(v) || 'Must contain at least one uppercase letter',
                        lowercase: (v) =>
                          /[a-z]/.test(v) || 'Must contain at least one lowercase letter',
                        number: (v) => /\d/.test(v) || 'Must contain at least one number',
                      },
                    }}
                    render={({ field }) => (
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        aria-invalid={!!errors.password}
                        {...field}
                      />
                    )}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password.message}</p>
                  )}
                </div>
              )}

              {mode === 'add' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Controller
                    name="confirmPassword"
                    control={control}
                    rules={{
                      validate: (v) =>
                        v === watch('password') || 'Passwords do not match',
                    }}
                    render={({ field }) => (
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    )}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Tab 2: Employment Details ===== */}
        <TabsContent value="employment" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="department">
                  Department <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="department"
                  control={control}
                  rules={{ required: 'Department is required' }}
                  render={({ field }) => (
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      aria-invalid={!!errors.department}
                    >
                      <SelectTrigger id="department">
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.department && (
                  <p className="text-sm text-red-500">{errors.department.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Job Title / Role</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Controller
                    name="title"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="title"
                        placeholder="e.g. Senior Concierge, Team Lead"
                        className="pl-10"
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  Work Location <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Controller
                    name="location"
                    control={control}
                    rules={{ required: 'Work location is required' }}
                    render={({ field }) => (
                      <Input
                        id="location"
                        placeholder="e.g. Nairobi CBD, Westlands"
                        className="pl-10"
                        aria-invalid={!!errors.location}
                        {...field}
                      />
                    )}
                  />
                </div>
                {errors.location && (
                  <p className="text-sm text-red-500">{errors.location.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employment_type">Employment Type</Label>
                <Controller
                  name="employment_type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || 'full_time'} onValueChange={field.onChange}>
                      <SelectTrigger id="employment_type">
                        <SelectValue placeholder="Select employment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Controller
                    name="start_date"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="start_date"
                        type="date"
                        className="pl-10"
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager_id">Reports To (Manager)</Label>
                <Controller
                  name="manager_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(val) => field.onChange(val ? parseInt(val) : undefined)}
                    >
                      <SelectTrigger id="manager_id">
                        <SelectValue placeholder="Select a manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.length === 0 ? (
                          <SelectItem value="" disabled>
                            No managers available
                          </SelectItem>
                        ) : (
                          managers.map((mgr) => (
                            <SelectItem key={mgr.id} value={String(mgr.id)}>
                              {mgr.name} ({mgr.employee_id})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialties">Specialties</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {specialtiesValue.map((spec) => (
                    <Badge key={spec} variant="secondary" className="text-xs">
                      {spec}
                      <button
                        type="button"
                        onClick={() => handleSpecialtyRemove(spec)}
                        className="ml-2 hover:text-red-500"
                        aria-label={`Remove ${spec}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  id="specialties-input"
                  placeholder="Type and press Enter to add specialties (e.g., Luxury Vehicles, Detailing)"
                  onKeyDown={handleSpecialtyInput}
                  aria-label="Add specialties"
                />
                <p className="text-xs text-slate-500">Press Enter or comma to add each specialty.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Tab 3: Compensation & Benefits ===== */}
        <TabsContent value="compensation" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Compensation & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canEditCompensation && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You do not have permission to edit compensation details. Contact an administrator.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="base_salary">
                  {watch('employment_type') === 'full_time' || watch('employment_type') === 'part_time'
                    ? 'Annual Base Salary (KES)'
                    : 'Hourly Rate (KES)'}
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Controller
                    name="base_salary"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="base_salary"
                        type="number"
                        placeholder={
                          watch('employment_type') === 'contractor'
                            ? 'e.g. 5000'
                            : 'e.g. 450000'
                        }
                        className="pl-10"
                        min={0}
                        step="0.01"
                        disabled={!canEditCompensation}
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>

              {watch('employment_type') === 'contractor' && (
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Hourly Rate (KES)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Controller
                      name="hourly_rate"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="hourly_rate"
                          type="number"
                          placeholder="e.g. 5000"
                          className="pl-10"
                          min={0}
                          step="0.01"
                          disabled={!canEditCompensation}
                          {...field}
                        />
                      )}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="pay_frequency">Pay Frequency</Label>
                <Controller
                  name="pay_frequency"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      disabled={!canEditCompensation}
                    >
                      <SelectTrigger id="pay_frequency">
                        <SelectValue placeholder="Select pay frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAY_FREQUENCIES.map((freq) => (
                          <SelectItem key={freq.value} value={freq.value}>
                            {freq.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_account_number">Bank Account Number</Label>
                <Controller
                  name="bank_account_number"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="bank_account_number"
                      placeholder="e.g. 1234567890"
                      disabled={!canEditCompensation}
                      {...field}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Controller
                  name="bank_name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="bank_name"
                      placeholder="e.g. KCB, Equity Bank"
                      disabled={!canEditCompensation}
                      {...field}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="health_plan_tier">Health Plan Tier</Label>
                <Controller
                  name="health_plan_tier"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      disabled={!canEditCompensation}
                    >
                      <SelectTrigger id="health_plan_tier">
                        <SelectValue placeholder="Select health plan tier" />
                      </SelectTrigger>
                      <SelectContent>
                        {HEALTH_PLAN_TIERS.map((tier) => (
                          <SelectItem key={tier.value} value={tier.value}>
                            {tier.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Tab 4: Onboarding / Offboarding ===== */}
        <TabsContent value="onboarding" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding / Offboarding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account_status">
                  Account Status <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="account_status"
                  control={control}
                  rules={{ required: 'Account status is required' }}
                  render={({ field }) => (
                    <Select value={field.value || 'onboarding'} onValueChange={field.onChange}>
                      <SelectTrigger id="account_status">
                        <SelectValue placeholder="Select account status" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Employment Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || 'active'} onValueChange={field.onChange}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select employment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="off-duty">Off Duty</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {(accountStatus === 'suspended' || accountStatus === 'terminated') && (
                <div className="space-y-2">
                  <Label htmlFor="exit_notes">
                    Exit Notes {accountStatus === 'terminated' && <span className="text-red-500">*</span>}
                  </Label>
                  <Controller
                    name="exit_notes"
                    control={control}
                    rules={
                      accountStatus === 'terminated'
                        ? { required: 'Exit notes are required for terminated employees' }
                        : {}
                    }
                    render={({ field }) => (
                      <Textarea
                        id="exit_notes"
                        placeholder="Reason for suspension/termination, notes about offboarding process..."
                        rows={4}
                        {...field}
                      />
                    )}
                  />
                </div>
              )}

              {accountStatus === 'terminated' && (
                <div className="space-y-2">
                  <Label htmlFor="offboarding_checklist_completed">
                    Offboarding Checklist
                  </Label>
                  <Controller
                    name="offboarding_checklist_completed"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <input
                          id="offboarding_checklist_completed"
                          type="checkbox"
                          checked={field.value || false}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          aria-label="Mark offboarding checklist as completed"
                        />
                        <Label htmlFor="offboarding_checklist_completed" className="font-normal">
                          Confirm offboarding checklist has been completed
                        </Label>
                      </div>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Tab 5: Document Upload ===== */}
        <TabsContent value="documents" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Document Upload</CardTitle>
              <p className="text-sm text-slate-500">
                Attach HR documents (ID proof, tax forms, certifications).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <DocumentUploader
                employeeId={employeeId}
                onUploadSuccess={(doc: EmployeeDocument) => {
                  toast.success(`Document "${doc.document_name}" uploaded successfully`);
                }}
                onUploadError={(err: string) => {
                  setUploadError(err);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting || !isFormValid()}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {mode === 'add' ? 'Creating Employee...' : 'Saving Changes...'}
            </>
          ) : mode === 'add' ? (
            'Save Employee'
          ) : (
            'Save Changes'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ===== Document Upload Sub-component =====

interface DocumentUploaderProps {
  employeeId?: number;
  onUploadSuccess: (doc: EmployeeDocument) => void;
  onUploadError: (err: string) => void;
}

function DocumentUploader({ employeeId, onUploadSuccess, onUploadError }: DocumentUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType>('id_proof');
  const [docName, setDocName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!docName) setDocName(file.name);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !employeeId) {
      onUploadError('Please select a file and ensure employee is saved first');
      return;
    }

    setIsUploading(true);
    try {
      const response = await api.uploadEmployeeDocument(
        employeeId,
        selectedFile,
        docType,
        docName || selectedFile.name,
        false
      );

      if (response.success && response.data) {
        onUploadSuccess(response.data.document);
        setSelectedFile(null);
        setDocName('');
        setDocType('id_proof');
      } else {
        onUploadError(response.message || 'Upload failed');
      }
    } catch (err: any) {
      onUploadError(err?.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="doc_type">Document Type</Label>
        <Select value={docType} onValueChange={(val: DocType) => setDocType(val)}>
          <SelectTrigger id="doc_type">
            <SelectValue placeholder="Select document type" />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="doc_name">Document Name</Label>
        <Input
          id="doc_name"
          placeholder="Enter document name"
          value={docName}
          onChange={(e) => setDocName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="doc_file">
          File <span className="text-red-500">*</span>
        </Label>
        <Input
          id="doc_file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileChange}
          aria-describedby="doc_file_desc"
        />
        <p id="doc_file_desc" className="text-xs text-slate-500">
          Supported formats: PDF, JPG, PNG, DOC, DOCX (max 10MB)
        </p>
      </div>

      {selectedFile && (
        <div className="text-sm text-slate-600 space-y-1">
          <p><strong>File:</strong> {selectedFile.name}</p>
          <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          <p><strong>Type:</strong> {selectedFile.type || 'Unknown'}</p>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={handleUpload}
        disabled={isUploading || !selectedFile || !docName.trim()}
        aria-busy={isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </>
        )}
      </Button>
    </div>
  );
}