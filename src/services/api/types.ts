export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface ChatImage {
  id: number;
  original_filename: string;
  file_size?: number;
  mime_type: string;
  width?: number;
  height?: number;
  alt_text?: string;
  url: string;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** Optional image attachments on a user message (displayed inline). */
  images?: ChatImage[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * The `data` payload returned by login / register endpoints.
 * For regular customers the response contains tokens; for employee
 * registrations `requires_approval` is set instead (no tokens issued).
 */
export interface LoginData {
  user: User;
  access_token: string;
  refresh_token?: string;
  requires_approval?: boolean;
}

export type LoginResponse = ApiResponse<LoginData>;

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'customer' | 'employee' | 'concierge' | 'admin' | 'super_admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  employee?: EmployeeProfile;
}

/**
 * Fields a user may change about themselves through `PUT /auth/profile`.
 * Credentials (`email`, `password`) are deliberately excluded: they require the
 * current password and are sent through `authApi.updateCredentials`.
 */
export interface ProfileUpdate {
  name?: string;
  phone?: string;
  address?: string;
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
  /** Onboarding documents uploaded during registration (sent as FormData). */
  documents?: File[];
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
  service_history?: ServiceHistory;
}

export interface ServiceHistory {
  id: number;
  user_id: number;
  vehicle_id: number;
  service_id: number;
  appointment_id?: number;
  completed_date?: string;
  notes?: string;
  cost?: number;
  rating?: number;
  review?: string;
  created_at?: string;
}

export interface WorkRecordItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface WorkRecord {
  id: number;
  assignment_id: number;
  appointment_id: number;
  employee_id: number;
  customer_id: number;
  items: WorkRecordItem[];
  overall_notes?: string;
  labor_hours?: number;
  labor_rate?: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'submitted' | 'verified' | 'invoiced';
  submitted_at?: string;
  verified_at?: string;
  verified_by?: number;
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

export interface Invoice {
  id: number;
  invoice_number: string;
  appointment_id?: number;
  user_id?: number;
  total_amount: number;
  currency: string;
  status: 'draft' | 'pending_verification' | 'verified' | 'paid' | 'cancelled';
  payment_method?: string;
  notes?: string;
  tax_amount: number;
  discount_amount: number;
  line_items: InvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

export interface VehicleChecklist {
  id: number;
  assignment_id: number;
  overall_condition: string;
  notes?: string;
  items: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TimeOffRequest {
  id: number;
  employee_id: number;
  request_type: 'vacation' | 'sick' | 'personal' | 'other';
  start_date: string;
  end_date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  employee?: {
    id: number;
    employee_id: string;
    location?: string;
    department?: string;
    title?: string;
  };
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface TimeOffDecision {
  approved: boolean;
  notes?: string;
}

export interface ProofOfWorkMedia {
  id: number;
  assignment_id: number;
  client_id: number;
  uploaded_by: number;
  media_type: 'image' | 'video';
  mime_type: string;
  original_filename: string;
  file_size?: number;
  width?: number;
  height?: number;
  duration_seconds?: number;
  caption?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  thumbnail_url: string;
  original_url: string;
}

export interface Document {
  id: number;
  title: string;
  doc_type: 'work_order' | 'service_agreement' | 'invoice' | 'other';
  description: string | null;
  reference_id: number | null;
  reference_type: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  status: 'pending' | 'sent' | 'signed' | 'declined' | 'cancelled' | 'expired';
  expires_at: string | null;
  created_by: number;
  signed_by: number | null;
  signed_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentSignature {
  id: number;
  document_id: number;
  signer_name: string;
  signer_email: string;
  signer_id: number | null;
  signature_image_path: string | null;
  signature_image_name: string | null;
  signature_hash: string | null;
  signature_data: string | null;
  signer_ip: string | null;
  signer_user_agent: string | null;
  signer_location: string | null;
  status: 'pending' | 'captured' | 'verified' | 'rejected';
  verified_at: string | null;
  verified_by: number | null;
  rejection_reason: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignatureAuditEvent {
  id: number;
  document_id: number;
  event_type: string;
  actor_id: number | null;
  actor_type: string;
  actor_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
  document_hash: string | null;
  created_at: string;
}

