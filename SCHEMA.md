# Database Schema

> **Source of truth:** this document is auto-generated from the SQLAlchemy models in `backend/app/services/*/models.py` and `backend/app/models.py`. Do not edit by hand — re-run the generator:
>
> ```bash
> cd backend && ../backend/venv/bin/python scripts/generate_schema_doc.py
> ```

Last generated: 2026-09-02 12:52:12 UTC

Total tables: **28**

## Contents

- [Auth](#auth)
  - [`payment_methods`](#payment_methods)
  - [`users`](#users)
- [Catalog](#catalog)
  - [`discount_codes`](#discount_codes)
  - [`services`](#services)
- [Vehicles](#vehicles)
  - [`vehicles`](#vehicles)
- [Appointments](#appointments)
  - [`appointments`](#appointments)
  - [`assignments`](#assignments)
  - [`service_history`](#service_history)
- [Employees](#employees)
  - [`employee_documents`](#employee_documents)
  - [`employee_time_logs`](#employee_time_logs)
  - [`employees`](#employees)
  - [`issue_reports`](#issue_reports)
  - [`time_off_requests`](#time_off_requests)
- [Partners](#partners)
  - [`service_partners`](#service_partners)
- [Admin](#admin)
  - [`activity_tracker`](#activity_tracker)
  - [`audit_logs`](#audit_logs)
  - [`system_metrics`](#system_metrics)
- [Fleets](#fleets)
  - [`companies`](#companies)
  - [`fleet_expenses`](#fleet_expenses)
  - [`fleet_vehicles`](#fleet_vehicles)
  - [`invoice_line_items`](#invoice_line_items)
  - [`invoices`](#invoices)
- [Payments](#payments)
  - [`payments`](#payments)
  - [`webhook_events`](#webhook_events)
- [Notifications](#notifications)
  - [`notifications`](#notifications)
- [Workflow](#workflow)
  - [`vehicle_checklists`](#vehicle_checklists)
  - [`work_records`](#work_records)
- [App](#app)
  - [`token_blocklist`](#token_blocklist)

---

## Auth

### `payment_methods`

**Primary key:** `id`
**Indexed columns:** `user_id, is_default, is_active`

**Foreign keys:**
- `user_id` → users.id ON DELETE CASCADE

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `user_id` | BIGINT | NO |  | INDEX FK |
| `payment_token` | VARCHAR(255) | YES |  |  |
| `card_brand` | VARCHAR(50) | YES |  |  |
| `last_four_digits` | VARCHAR(4) | YES |  |  |
| `cardholder_name` | VARCHAR(100) | YES |  |  |
| `expiry_date` | DATE | YES |  |  |
| `is_default` | BOOLEAN | YES |  | INDEX |
| `is_active` | BOOLEAN | YES |  | INDEX |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

### `users`

**Primary key:** `id`
**Unique columns:** `email`
**Indexed columns:** `role, is_admin, is_active`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `name` | VARCHAR(100) | NO |  |  |
| `email` | VARCHAR(120) | NO |  | UNIQUE |
| `password_hash` | VARCHAR(255) | NO |  |  |
| `phone` | EncryptedString(255) | YES |  |  |
| `address` | EncryptedString(255) | YES |  |  |
| `role` | VARCHAR(20) | YES |  | INDEX |
| `is_admin` | BOOLEAN | YES |  | INDEX |
| `is_active` | BOOLEAN | YES |  | INDEX |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

---

## Catalog

### `discount_codes`

**Primary key:** `id`
**Unique columns:** `code`
**Indexed columns:** `is_active`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `code` | VARCHAR(20) | NO |  | UNIQUE |
| `discount_type` | VARCHAR(20) | YES |  |  |
| `value` | NUMERIC(10, 2) | NO |  |  |
| `minimum_spend` | NUMERIC(10, 2) | YES |  |  |
| `max_uses` | INTEGER | YES |  |  |
| `used_count` | INTEGER | YES |  |  |
| `start_date` | DATETIME (tz) | YES |  |  |
| `end_date` | DATETIME (tz) | YES |  |  |
| `is_active` | BOOLEAN | YES |  | INDEX |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

### `services`

**Primary key:** `id`
**Indexed columns:** `name, category, is_active`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `name` | VARCHAR(100) | NO |  | INDEX |
| `description` | VARCHAR | YES |  |  |
| `price` | NUMERIC(10, 2) | YES |  |  |
| `duration` | INTEGER | YES |  |  |
| `category` | VARCHAR(50) | YES |  | INDEX |
| `is_active` | BOOLEAN | YES |  | INDEX |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

---

## Vehicles

### `vehicles`

**Primary key:** `id`
**Indexed columns:** `user_id, make, model, is_active`

**Foreign keys:**
- `user_id` → users.id ON DELETE CASCADE

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `user_id` | BIGINT | NO |  | INDEX FK |
| `make` | VARCHAR(50) | NO |  | INDEX |
| `model` | VARCHAR(50) | NO |  | INDEX |
| `year` | INTEGER | YES |  |  |
| `color` | VARCHAR(30) | YES |  |  |
| `license_plate` | VARCHAR(20) | YES |  |  |
| `vin` | VARCHAR(17) | YES |  |  |
| `odometer` | INTEGER | YES |  |  |
| `current_mileage` | INTEGER | YES |  |  |
| `last_service_mileage` | INTEGER | YES |  |  |
| `next_service_mileage` | INTEGER | YES |  |  |
| `insurance_expiry_date` | DATE | YES |  |  |
| `estimated_monthly_maintenance` | NUMERIC(10, 2) | YES |  |  |
| `total_maintenance_ytd` | NUMERIC(10, 2) | YES |  |  |
| `is_active` | BOOLEAN | YES |  | INDEX |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

---

## Appointments

### `appointments`

**Primary key:** `id`
**Indexed columns:** `user_id, vehicle_id, service_id, partner_id, appointment_date, status, payment_status, reminder_sent, overdue_notified`
**Check constraints:**
- `status IN ('scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rescheduled', 'overdue')`
- `payment_status IN ('pending', 'paid', 'refunded', 'failed')`

**Foreign keys:**
- `user_id` → users.id ON DELETE CASCADE
- `vehicle_id` → vehicles.id ON DELETE CASCADE
- `service_id` → services.id ON DELETE CASCADE
- `partner_id` → service_partners.id ON DELETE SET NULL

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `user_id` | BIGINT | NO |  | INDEX FK |
| `vehicle_id` | BIGINT | NO |  | INDEX FK |
| `service_id` | BIGINT | NO |  | INDEX FK |
| `partner_id` | BIGINT | YES |  | INDEX FK |
| `appointment_date` | DATETIME (tz) | NO |  | INDEX |
| `status` | VARCHAR(20) | YES |  | INDEX |
| `notes` | VARCHAR | YES |  |  |
| `total_amount` | NUMERIC(10, 2) | YES |  |  |
| `payment_status` | VARCHAR(20) | YES |  | INDEX |
| `reminder_sent` | BOOLEAN | YES |  | INDEX |
| `overdue_notified` | BOOLEAN | YES |  | INDEX |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

### `assignments`

**Primary key:** `id`
**Indexed columns:** `appointment_id, employee_id, status, assigned_at`
**Check constraints:**
- `status IN ('assigned', 'in-progress', 'checklist_pending', 'work_pending', 'submitted', 'verified', 'completed', 'cancelled')`

**Foreign keys:**
- `appointment_id` → appointments.id ON DELETE CASCADE
- `employee_id` → employees.id ON DELETE CASCADE

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `appointment_id` | BIGINT | NO |  | INDEX FK |
| `employee_id` | BIGINT | NO |  | INDEX FK |
| `status` | VARCHAR(20) | YES |  | INDEX |
| `assigned_at` | DATETIME (tz) | YES | now() | INDEX |
| `started_at` | DATETIME (tz) | YES |  |  |
| `completed_at` | DATETIME (tz) | YES |  |  |
| `notes` | VARCHAR | YES |  |  |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

### `service_history`

**Primary key:** `id`
**Indexed columns:** `user_id, vehicle_id, service_id, appointment_id`
**Check constraints:**
- `rating >= 0 AND rating <= 5`

**Foreign keys:**
- `user_id` → users.id ON DELETE CASCADE
- `vehicle_id` → vehicles.id ON DELETE CASCADE
- `service_id` → services.id ON DELETE CASCADE
- `appointment_id` → appointments.id ON DELETE SET NULL

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `user_id` | BIGINT | NO |  | INDEX FK |
| `vehicle_id` | BIGINT | NO |  | INDEX FK |
| `service_id` | BIGINT | NO |  | INDEX FK |
| `appointment_id` | BIGINT | YES |  | INDEX FK |
| `completed_date` | DATETIME (tz) | YES |  |  |
| `notes` | VARCHAR | YES |  |  |
| `cost` | NUMERIC(10, 2) | YES |  |  |
| `rating` | INTEGER | YES |  |  |
| `review` | VARCHAR | YES |  |  |
| `created_at` | DATETIME (tz) | YES | now() |  |

---

## Employees

### `employee_documents`

**Primary key:** `id`
**Indexed columns:** `employee_id, doc_type, uploaded_by, is_verified`
**Check constraints:**
- `doc_type IN ('id_proof', 'tax_form', 'certification', 'contract', 'other')`

**Foreign keys:**
- `employee_id` → employees.id ON DELETE CASCADE
- `uploaded_by` → users.id ON DELETE SET NULL

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `employee_id` | BIGINT | NO |  | INDEX FK |
| `document_name` | VARCHAR(255) | NO |  |  |
| `doc_type` | VARCHAR(50) | NO |  | INDEX |
| `file_path` | VARCHAR(500) | YES |  |  |
| `file_name` | VARCHAR(255) | YES |  |  |
| `file_size` | INTEGER | YES |  |  |
| `mime_type` | VARCHAR(100) | YES |  |  |
| `uploaded_by` | BIGINT | YES |  | INDEX FK |
| `is_verified` | BOOLEAN | YES |  | INDEX |
| `verified_at` | DATETIME (tz) | YES |  |  |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

### `employee_time_logs`

**Primary key:** `id`
**Indexed columns:** `employee_id, timestamp`
**Check constraints:**
- `action IN ('in', 'out')`

**Foreign keys:**
- `employee_id` → employees.id ON DELETE CASCADE

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `employee_id` | BIGINT | NO |  | INDEX FK |
| `action` | VARCHAR(10) | NO |  |  |
| `timestamp` | DATETIME (tz) | NO | now() | INDEX |
| `notes` | VARCHAR | YES |  |  |
| `created_at` | DATETIME (tz) | YES | now() |  |

### `employees`

**Primary key:** `id`
**Unique columns:** `user_id, employee_id`
**Indexed columns:** `location, status, department, employment_type, manager_id, account_status`
**Check constraints:**
- `account_status IN ('active', 'onboarding', 'suspended', 'terminated')`
- `rating >= 0.00 AND rating <= 5.00`
- `status IN ('active', 'off-duty', 'suspended', 'terminated', 'pending', 'rejected')`
- `employment_type IN ('full_time', 'part_time', 'contractor')`

**Foreign keys:**
- `user_id` → users.id ON DELETE CASCADE
- `manager_id` → employees.id ON DELETE SET NULL

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `user_id` | BIGINT | NO |  | UNIQUE FK |
| `employee_id` | VARCHAR(36) | NO |  | UNIQUE |
| `location` | VARCHAR(100) | YES |  | INDEX |
| `specialties` | JSONB | YES |  |  |
| `rating` | NUMERIC(3, 2) | YES |  |  |
| `total_services` | INTEGER | YES |  |  |
| `status` | VARCHAR(20) | YES |  | INDEX |
| `hired_at` | DATETIME (tz) | YES |  |  |
| `department` | VARCHAR(100) | YES |  | INDEX |
| `title` | VARCHAR(100) | YES |  |  |
| `employment_type` | VARCHAR(20) | YES |  | INDEX |
| `start_date` | DATETIME (tz) | YES |  |  |
| `manager_id` | BIGINT | YES |  | INDEX FK |
| `account_status` | VARCHAR(20) | YES |  | INDEX |
| `exit_notes` | VARCHAR | YES |  |  |
| `offboarding_checklist_completed` | BOOLEAN | YES |  |  |
| `base_salary` | NUMERIC(10, 2) | YES |  |  |
| `hourly_rate` | NUMERIC(10, 2) | YES |  |  |
| `pay_frequency` | VARCHAR(20) | YES |  |  |
| `bank_account_number` | EncryptedString(50) | YES |  |  |
| `bank_name` | VARCHAR(100) | YES |  |  |
| `health_plan_tier` | VARCHAR(20) | YES |  |  |

### `issue_reports`

**Primary key:** `id`
**Indexed columns:** `employee_id, appointment_id, priority, status`
**Check constraints:**
- `status IN ('open', 'in-progress', 'resolved', 'closed')`
- `priority IN ('low', 'medium', 'high', 'urgent')`

**Foreign keys:**
- `employee_id` → employees.id ON DELETE CASCADE
- `appointment_id` → appointments.id ON DELETE SET NULL

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `employee_id` | BIGINT | NO |  | INDEX FK |
| `appointment_id` | BIGINT | YES |  | INDEX FK |
| `title` | VARCHAR(200) | NO |  |  |
| `description` | VARCHAR | NO |  |  |
| `priority` | VARCHAR(20) | NO |  | INDEX |
| `status` | VARCHAR(20) | NO |  | INDEX |
| `resolution_notes` | VARCHAR | YES |  |  |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

### `time_off_requests`

**Primary key:** `id`
**Indexed columns:** `employee_id, start_date, end_date, status`
**Check constraints:**
- `status IN ('pending', 'approved', 'rejected', 'cancelled')`
- `request_type IN ('vacation', 'sick', 'personal', 'other')`

**Foreign keys:**
- `employee_id` → employees.id ON DELETE CASCADE

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `employee_id` | BIGINT | NO |  | INDEX FK |
| `request_type` | VARCHAR(20) | NO |  |  |
| `start_date` | DATETIME (tz) | NO |  | INDEX |
| `end_date` | DATETIME (tz) | NO |  | INDEX |
| `reason` | VARCHAR | YES |  |  |
| `status` | VARCHAR(20) | NO |  | INDEX |
| `admin_notes` | VARCHAR | YES |  |  |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

---

## Partners

### `service_partners`

**Primary key:** `id`
**Indexed columns:** `name, email, is_active`
**Check constraints:**
- `rating >= 0.00 AND rating <= 5.00`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `name` | VARCHAR(100) | NO |  | INDEX |
| `contact_name` | VARCHAR(100) | YES |  |  |
| `email` | VARCHAR(120) | YES |  | INDEX |
| `phone` | VARCHAR(20) | YES |  |  |
| `address` | JSONB | YES |  |  |
| `services_offered` | JSONB | YES |  |  |
| `rating` | NUMERIC(3, 2) | YES |  |  |
| `total_services` | INTEGER | YES |  |  |
| `is_active` | BOOLEAN | YES |  | INDEX |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

---

## Admin

### `activity_tracker`

**Primary key:** `id`
**Indexed columns:** `user_id, admin_id, activity_type, session_id, ip_address, created_at`

**Foreign keys:**
- `user_id` → users.id ON DELETE SET NULL
- `admin_id` → users.id ON DELETE SET NULL

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `user_id` | BIGINT | YES |  | INDEX FK |
| `admin_id` | BIGINT | YES |  | INDEX FK |
| `activity_type` | VARCHAR(50) | NO |  | INDEX |
| `activity_details` | JSONB | YES |  |  |
| `session_id` | VARCHAR(100) | YES |  | INDEX |
| `ip_address` | VARCHAR(45) | YES |  | INDEX |
| `user_agent` | VARCHAR(255) | YES |  |  |
| `duration_ms` | INTEGER | YES |  |  |
| `created_at` | DATETIME (tz) | YES | now() | INDEX |

### `audit_logs`

**Primary key:** `id`
**Indexed columns:** `user_id, admin_id, action, entity_type, entity_id, ip_address, status, created_at`
**Check constraints:**
- `status IN ('success', 'failed', 'error')`

**Foreign keys:**
- `user_id` → users.id ON DELETE SET NULL
- `admin_id` → users.id ON DELETE SET NULL

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `user_id` | BIGINT | YES |  | INDEX FK |
| `admin_id` | BIGINT | YES |  | INDEX FK |
| `action` | VARCHAR(50) | NO |  | INDEX |
| `entity_type` | VARCHAR(50) | NO |  | INDEX |
| `entity_id` | INTEGER | YES |  | INDEX |
| `old_values` | JSONB | YES |  |  |
| `new_values` | JSONB | YES |  |  |
| `ip_address` | VARCHAR(45) | YES |  | INDEX |
| `user_agent` | VARCHAR(255) | YES |  |  |
| `description` | VARCHAR | YES |  |  |
| `status` | VARCHAR(20) | YES |  | INDEX |
| `error_message` | VARCHAR | YES |  |  |
| `created_at` | DATETIME (tz) | YES | now() | INDEX |

### `system_metrics`

**Primary key:** `id`
**Indexed columns:** `metric_type, period_start, period_end`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `metric_type` | VARCHAR(50) | NO |  | INDEX |
| `metric_name` | VARCHAR(100) | NO |  |  |
| `metric_value` | NUMERIC(15, 2) | NO |  |  |
| `metric_unit` | VARCHAR(20) | YES |  |  |
| `period_start` | DATETIME (tz) | NO |  | INDEX |
| `period_end` | DATETIME (tz) | NO |  | INDEX |
| `extra_data` | JSONB | YES |  |  |
| `created_at` | DATETIME (tz) | YES | now() |  |

---

## Fleets

### `companies`

**Primary key:** `id`
**Indexed columns:** `name, is_active`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `name` | VARCHAR(255) | NO |  | INDEX |
| `contact_name` | VARCHAR(255) | YES |  |  |
| `email` | VARCHAR(255) | YES |  |  |
| `phone` | VARCHAR(50) | YES |  |  |
| `address` | JSONB | YES |  |  |
| `billing_address` | JSONB | YES |  |  |
| `payment_terms` | VARCHAR(100) | YES |  |  |
| `is_active` | BOOLEAN | YES |  | INDEX |
| `notes` | VARCHAR | YES |  |  |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

### `fleet_expenses`

**Primary key:** `id`
**Indexed columns:** `company_id, vehicle_id, expense_type, incurred_at`

**Foreign keys:**
- `company_id` → companies.id ON DELETE CASCADE
- `vehicle_id` → fleet_vehicles.id ON DELETE SET NULL
- `created_by` → users.id

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `company_id` | BIGINT | NO |  | INDEX FK |
| `vehicle_id` | BIGINT | YES |  | INDEX FK |
| `expense_type` | VARCHAR(50) | NO |  | INDEX |
| `description` | VARCHAR(255) | NO |  |  |
| `amount` | NUMERIC(10, 2) | NO |  |  |
| `incurred_at` | DATETIME (tz) | NO |  | INDEX |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `created_by` | BIGINT | YES |  | FK |

### `fleet_vehicles`

**Primary key:** `id`
**Unique columns:** `license_plate, vin`
**Indexed columns:** `company_id, status, assigned_employee_id`

**Foreign keys:**
- `company_id` → companies.id ON DELETE CASCADE
- `assigned_employee_id` → employees.id

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `company_id` | BIGINT | NO |  | INDEX FK |
| `make` | VARCHAR(100) | NO |  |  |
| `model` | VARCHAR(100) | NO |  |  |
| `year` | INTEGER | YES |  |  |
| `license_plate` | VARCHAR(50) | YES |  | UNIQUE |
| `vin` | VARCHAR(50) | YES |  | UNIQUE |
| `status` | VARCHAR(50) | YES |  | INDEX |
| `assigned_employee_id` | BIGINT | YES |  | INDEX FK |
| `last_service_date` | DATETIME (tz) | YES |  |  |
| `mileage_km` | INTEGER | YES |  |  |
| `notes` | VARCHAR | YES |  |  |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

### `invoice_line_items`

**Primary key:** `id`
**Indexed columns:** `invoice_id`

**Foreign keys:**
- `invoice_id` → invoices.id ON DELETE CASCADE

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `invoice_id` | BIGINT | NO |  | INDEX FK |
| `description` | VARCHAR(255) | NO |  |  |
| `quantity` | INTEGER | YES |  |  |
| `unit_price` | NUMERIC(10, 2) | NO |  |  |
| `total_price` | NUMERIC(10, 2) | NO |  |  |
| `created_at` | DATETIME (tz) | YES | now() |  |

### `invoices`

**Primary key:** `id`
**Unique columns:** `invoice_number`
**Indexed columns:** `appointment_id, user_id, company_id, status`
**Check constraints:**
- `status IN ('draft', 'sent', 'paid', 'void')`

**Foreign keys:**
- `appointment_id` → appointments.id ON DELETE CASCADE
- `user_id` → users.id ON DELETE CASCADE
- `company_id` → companies.id ON DELETE SET NULL

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `invoice_number` | VARCHAR(50) | NO |  | UNIQUE |
| `appointment_id` | BIGINT | YES |  | INDEX FK |
| `user_id` | BIGINT | YES |  | INDEX FK |
| `company_id` | BIGINT | YES |  | INDEX FK |
| `total_amount` | NUMERIC(10, 2) | NO |  |  |
| `status` | VARCHAR(20) | NO |  | INDEX |
| `invoice_type` | VARCHAR(20) | YES |  |  |
| `tax_amount` | NUMERIC(10, 2) | YES |  |  |
| `currency` | VARCHAR(3) | YES |  |  |
| `due_date` | DATETIME (tz) | YES |  |  |
| `notes` | VARCHAR | YES |  |  |
| `pdf_path` | VARCHAR(255) | YES |  |  |
| `sent_at` | DATETIME (tz) | YES |  |  |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

---

## Payments

### `payments`

**Primary key:** `id`
**Unique columns:** `payment_reference`
**Indexed columns:** `invoice_id, appointment_id, user_id, status`
**Check constraints:**
- `method IN ('mpesa', 'card', 'cash', 'bank_transfer')`
- `status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')`

**Foreign keys:**
- `invoice_id` → invoices.id ON DELETE CASCADE
- `appointment_id` → appointments.id ON DELETE CASCADE
- `user_id` → users.id ON DELETE CASCADE

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `payment_reference` | VARCHAR(50) | NO |  | UNIQUE |
| `invoice_id` | BIGINT | NO |  | INDEX FK |
| `appointment_id` | BIGINT | NO |  | INDEX FK |
| `user_id` | BIGINT | NO |  | INDEX FK |
| `amount` | NUMERIC(10, 2) | NO |  |  |
| `currency` | VARCHAR(3) | YES |  |  |
| `method` | VARCHAR(20) | NO |  |  |
| `status` | VARCHAR(20) | NO |  | INDEX |
| `mpesa_receipt_number` | VARCHAR(50) | YES |  |  |
| `mpesa_phone_number` | VARCHAR(20) | YES |  |  |
| `mpesa_transaction_date` | DATETIME (tz) | YES |  |  |
| `card_last_four` | VARCHAR(4) | YES |  |  |
| `card_brand` | VARCHAR(50) | YES |  |  |
| `merchant_request_id` | VARCHAR(100) | YES |  |  |
| `checkout_request_id` | VARCHAR(100) | YES |  |  |
| `failure_reason` | VARCHAR | YES |  |  |
| `notes` | VARCHAR | YES |  |  |
| `paid_at` | DATETIME (tz) | YES |  |  |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

### `webhook_events`

**Primary key:** `id`
**Indexed columns:** `source, external_event_id, status`
**Check constraints:**
- `status IN ('unprocessed', 'processing', 'processed', 'failed')`
- `source IN ('mpesa', 'card', 'bank_transfer', 'other')`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `source` | VARCHAR(30) | NO |  | INDEX |
| `external_event_id` | VARCHAR(200) | NO |  | INDEX |
| `payload` | JSON | NO |  |  |
| `status` | VARCHAR(20) | NO |  | INDEX |
| `attempts` | INTEGER | NO |  |  |
| `last_error` | VARCHAR | YES |  |  |
| `received_at` | DATETIME (tz) | NO | now() |  |
| `processed_at` | DATETIME (tz) | YES |  |  |

---

## Notifications

### `notifications`

**Primary key:** `id`
**Indexed columns:** `user_id, notification_type, is_read`

**Foreign keys:**
- `user_id` → users.id ON DELETE CASCADE

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `user_id` | BIGINT | NO |  | INDEX FK |
| `title` | VARCHAR(100) | NO |  |  |
| `message` | VARCHAR | YES |  |  |
| `notification_type` | VARCHAR(50) | YES |  | INDEX |
| `is_read` | BOOLEAN | YES |  | INDEX |
| `created_at` | DATETIME (tz) | YES | now() |  |

---

## Workflow

### `vehicle_checklists`

**Primary key:** `id`
**Unique columns:** `assignment_id`
**Indexed columns:** `appointment_id, employee_id, overall_condition, submitted_at`
**Check constraints:**
- `overall_condition IN ('excellent', 'good', 'fair', 'poor')`

**Foreign keys:**
- `assignment_id` → assignments.id ON DELETE CASCADE
- `appointment_id` → appointments.id ON DELETE CASCADE
- `employee_id` → employees.id ON DELETE CASCADE

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `assignment_id` | BIGINT | NO |  | UNIQUE FK |
| `appointment_id` | BIGINT | NO |  | INDEX FK |
| `employee_id` | BIGINT | NO |  | INDEX FK |
| `items` | JSONB | NO |  |  |
| `overall_condition` | VARCHAR(20) | NO |  | INDEX |
| `notes` | VARCHAR | YES |  |  |
| `photos` | JSONB | YES |  |  |
| `submitted_at` | DATETIME (tz) | YES |  | INDEX |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

### `work_records`

**Primary key:** `id`
**Unique columns:** `assignment_id`
**Indexed columns:** `appointment_id, employee_id, customer_id, status, submitted_at, verified_at, verified_by`
**Check constraints:**
- `status IN ('draft', 'submitted', 'verified', 'invoiced')`

**Foreign keys:**
- `assignment_id` → assignments.id ON DELETE CASCADE
- `appointment_id` → appointments.id ON DELETE CASCADE
- `employee_id` → employees.id ON DELETE CASCADE
- `customer_id` → users.id ON DELETE CASCADE
- `verified_by` → users.id ON DELETE SET NULL

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGINT | NO |  | PK |
| `assignment_id` | BIGINT | NO |  | UNIQUE FK |
| `appointment_id` | BIGINT | NO |  | INDEX FK |
| `employee_id` | BIGINT | NO |  | INDEX FK |
| `customer_id` | BIGINT | NO |  | INDEX FK |
| `items` | JSONB | NO |  |  |
| `overall_notes` | VARCHAR | YES |  |  |
| `labor_hours` | NUMERIC(5, 2) | YES |  |  |
| `labor_rate` | NUMERIC(10, 2) | YES |  |  |
| `subtotal` | NUMERIC(10, 2) | YES |  |  |
| `tax_amount` | NUMERIC(10, 2) | YES |  |  |
| `total_amount` | NUMERIC(10, 2) | YES |  |  |
| `status` | VARCHAR(20) | NO |  | INDEX |
| `submitted_at` | DATETIME (tz) | YES |  | INDEX |
| `verified_at` | DATETIME (tz) | YES |  | INDEX |
| `verified_by` | BIGINT | YES |  | INDEX FK |
| `created_at` | DATETIME (tz) | YES | now() |  |
| `updated_at` | DATETIME (tz) | YES | now() |  |

---

## App

### `token_blocklist`

**Primary key:** `id`
**Unique columns:** `jti`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | INTEGER | NO |  | PK |
| `jti` | VARCHAR(36) | NO |  | UNIQUE |
| `created_at` | DATETIME | YES |  |  |
| `expires_at` | DATETIME | NO |  |  |
