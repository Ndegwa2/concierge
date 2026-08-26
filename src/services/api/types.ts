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
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'overdue';
  notes?: string;
  total_amount?: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  reminder_sent?: boolean;
  overdue_notified?: boolean;
  vehicle?: Vehicle;
  service?: Service;
  customer?: { id: number; name: string; phone: string };
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
  status: string;
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  appointment_id: number;
  user_id: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'void';
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Company {
  id: number;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: Record<string, any>;
  billing_address?: Record<string, any>;
  payment_terms?: string;
  is_active: boolean;
  notes?: string;
  vehicle_count?: number;
  active_vehicle_count?: number;
  created_at: string;
  updated_at: string;
}

export interface FleetVehicle {
  id: number;
  company_id: number;
  make: string;
  model: string;
  year?: number;
  license_plate: string;
  vin?: string;
  status: string;
  assigned_employee_id?: number;
  last_service_date?: string;
  mileage_km: number;
  notes?: string;
  assigned_employee?: {
    id: number;
    employee_id: string;
    name?: string;
    status: string;
  };
  created_at: string;
  updated_at: string;
}

export interface FleetExpense {
  id: number;
  company_id: number;
  vehicle_id?: number;
  expense_type: string;
  description: string;
  amount: number;
  incurred_at: string;
  vehicle?: {
    license_plate: string;
    make: string;
    model: string;
  };
  created_at: string;
}

export interface FleetInvoice extends Invoice {
  company_id?: number;
  invoice_type: string;
  tax_amount: number;
  currency: string;
  due_date?: string;
  notes?: string;
  company?: Company;
  line_items?: InvoiceLineItem[];
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}
