export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'customer' | 'employee' | 'admin' | 'super_admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  employee?: EmployeeProfile;
}

export interface EmployeeProfile {
  id: number;
  user_id: number;
  employee_id: string;
  location: string;
  specialties: string[];
  rating: number;
  total_services: number;
  status: string;
  hired_at?: string;
  created_at: string;
  updated_at: string;
  department?: string;
  title?: string;
  employment_type?: string;
  start_date?: string;
  manager_id?: number;
  account_status?: string;
  exit_notes?: string;
  offboarding_checklist_completed?: boolean;
  base_salary?: number;
  hourly_rate?: number;
  pay_frequency?: string;
  bank_name?: string;
  bank_account_number?: string;
  health_plan_tier?: string;
}

export interface EmployeeDocument {
  id: number;
  employee_id: number;
  document_name: string;
  doc_type: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  is_verified: boolean;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export type Employee = EmployeeProfile;

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'employee';
  phone?: string;
  address?: string;
  location?: string;
  specialties?: string[];
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  duration: number;
  category: string;
  is_active: boolean;
}

export interface Vehicle {
  id: number;
  user_id: number;
  make: string;
  model: string;
  year: number;
  color?: string;
  license_plate?: string;
  vin?: string;
  odometer?: number;
  current_mileage?: number;
  last_service_mileage?: number;
  next_service_mileage?: number;
  insurance_expiry_date?: string;
  estimated_monthly_maintenance?: number;
  total_maintenance_ytd: number;
  is_active: boolean;
}

export interface Appointment {
  id: number;
  user_id: number;
  vehicle_id: number;
  service_id: number;
  partner_id?: number;
  appointment_date: string;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'overdue' | 'rescheduled';
  notes?: string;
  total_amount?: number;
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed';
  reminder_sent?: boolean;
  overdue_notified?: boolean;
  vehicle?: Vehicle;
  service?: Service;
  customer?: { id: number; name: string; phone: string };
  invoice?: Invoice;
}

export interface ServicePartner {
  id: number;
  name: string;
  contact_name: string;
  email?: string;
  phone: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  services_offered: string[];
  rating: number;
  total_services: number;
  is_active: boolean;
}

export interface Assignment {
  id: number;
  appointment_id: number;
  employee_id: number;
  status: 'assigned' | 'in-progress' | 'checklist_pending' | 'work_pending' | 'submitted' | 'verified' | 'completed' | 'cancelled';
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  appointment?: Appointment & {
    customer: { id: number; name: string; phone: string; email?: string };
    vehicle?: Vehicle;
    service?: Service;
  };
  employee?: {
    id: number;
    employee_id: string;
    user: { id: number; name: string; email: string };
  };
  checklist?: VehicleChecklist;
  work_record?: WorkRecord;
  invoice?: Invoice;
}
