# Ndegwa Auto Concierge - Database Documentation

## Overview

The Auto Concierge backend uses **SQLAlchemy ORM** with support for both **SQLite** (development) and **PostgreSQL 16** (production). Database migrations are managed with **Flask-Migrate (Alembic)**.

The schema is defined across modular domain services under `backend/app/services/`.

## Database Engines

### Development
- **Engine:** SQLite 3
- **File:** `autoconcierge.db` (auto-created)
- **Migrations:** Applied automatically on app startup via `db.create_all()`

### Production
- **Engine:** PostgreSQL 16
- **Connection:** `DATABASE_URL` environment variable
- **Read Replica:** Optional `DATABASE_READ_URL` for analytics queries
- **Connection Pooling:** `pool_size=20`, `max_overflow=0`, `pool_recycle=1800`

## Entity-Relationship Overview

```
users
├── payment_methods
├── vehicles
├── appointments
│   ├── service_history
│   ├── assignments
│   └── invoices
├── notifications
├── employees
│   ├── employee_documents
│   ├── employee_time_logs
│   ├── time_off_requests
│   └── issue_reports
└── payments

services
├── appointments
├── service_history
└── discount_codes

service_partners
├── appointments
└── invoices

companies (fleets)
├── fleet_vehicles
├── fleet_expenses
└── invoices
```

## Schema Details

### 1. users

Stores all user accounts (customers, employees, admins).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique user identifier |
| name | String(100) | NOT NULL | Full name |
| email | String(120) | UNIQUE, NOT NULL, INDEX | Email address |
| password_hash | String(255) | NOT NULL | bcrypt hashed password |
| phone | EncryptedString(255) | | Phone number (encrypted at rest) |
| address | EncryptedString(255) | | Physical address (encrypted at rest) |
| role | String(20) | DEFAULT 'customer', INDEX | User role |
| is_admin | Boolean | DEFAULT False, INDEX | Admin flag |
| is_active | Boolean | DEFAULT True, INDEX | Account active flag |
| created_at | DateTime(timezone=True) | server_default=now() | Account creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Last update timestamp |

**Roles:** `customer`, `employee`, `concierge`, `admin`, `super_admin`

### 2. payment_methods

Stores customer payment method information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| user_id | BigInteger | FOREIGN KEY(users.id), INDEX | Owning user |
| payment_token | String(255) | | Payment gateway token |
| card_brand | String(50) | | Card brand (Visa, Mastercard, etc.) |
| last_four_digits | String(4) | | Last 4 digits of card |
| cardholder_name | String(100) | | Cardholder name |
| expiry_date | Date | | Card expiry date |
| is_default | Boolean | DEFAULT False, INDEX | Default payment method flag |
| is_active | Boolean | DEFAULT True, INDEX | Active status |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Update timestamp |

### 3. services

Available service offerings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| name | String(100) | NOT NULL, INDEX | Service name |
| description | Text | | Service description |
| price | Numeric(10,2) | | Service price |
| duration | Integer | | Estimated duration (minutes) |
| category | String(50) | INDEX | Service category |
| is_active | Boolean | DEFAULT True, INDEX | Active status |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Update timestamp |

### 4. discount_codes

Promotional and discount codes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| code | String(20) | UNIQUE, NOT NULL, INDEX | Discount code |
| discount_type | String(20) | DEFAULT 'percentage' | `percentage` or `fixed` |
| value | Numeric(10,2) | NOT NULL | Discount value |
| minimum_spend | Numeric(10,2) | | Minimum spend required |
| max_uses | Integer | | Maximum number of uses |
| used_count | Integer | DEFAULT 0 | Number of times used |
| start_date | DateTime(timezone=True) | | Valid from date |
| end_date | DateTime(timezone=True) | | Valid to date |
| is_active | Boolean | DEFAULT True, INDEX | Active status |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Update timestamp |

### 5. vehicles

Customer vehicle information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| user_id | BigInteger | FOREIGN KEY(users.id), INDEX | Owning customer |
| make | String(50) | NOT NULL, INDEX | Vehicle make |
| model | String(50) | NOT NULL, INDEX | Vehicle model |
| year | Integer | | Manufacture year |
| color | String(30) | | Vehicle color |
| license_plate | String(20) | | License plate number |
| vin | String(17) | | Vehicle Identification Number |
| odometer | Integer | | Current odometer reading |
| current_mileage | Integer | | Current mileage reading |
| last_service_mileage | Integer | | Mileage at last service |
| next_service_mileage | Integer | | Next recommended service mileage |
| insurance_expiry_date | Date | | Insurance policy expiry date |
| estimated_monthly_maintenance | Numeric(10,2) | | Estimated monthly maintenance cost |
| total_maintenance_ytd | Numeric(10,2) | DEFAULT 0.0 | Total maintenance cost YTD |
| is_active | Boolean | DEFAULT True, INDEX | Active status |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Update timestamp |

### 6. appointments

Service appointment records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| user_id | BigInteger | FOREIGN KEY(users.id), INDEX | Customer |
| vehicle_id | BigInteger | FOREIGN KEY(vehicles.id), INDEX | Vehicle |
| service_id | BigInteger | FOREIGN KEY(services.id), INDEX | Service |
| partner_id | BigInteger | FOREIGN KEY(service_partners.id), INDEX | Service partner |
| appointment_date | DateTime(timezone=True) | NOT NULL, INDEX | Appointment date/time |
| status | String(20) | DEFAULT 'scheduled', INDEX | `scheduled`, `confirmed`, `in-progress`, `completed`, `cancelled`, `rescheduled`, `overdue` |
| notes | Text | | Additional notes |
| total_amount | Numeric(10,2) | | Total amount to be paid |
| payment_status | String(20) | DEFAULT 'pending', INDEX | `pending`, `paid`, `refunded`, `failed` |
| reminder_sent | Boolean | DEFAULT False, INDEX | Reminder sent flag |
| overdue_notified | Boolean | DEFAULT False, INDEX | Overdue notification sent flag |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Update timestamp |

### 7. service_history

Completed service records and customer reviews.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| user_id | BigInteger | FOREIGN KEY(users.id), INDEX | Customer |
| vehicle_id | BigInteger | FOREIGN KEY(vehicles.id), INDEX | Vehicle |
| service_id | BigInteger | FOREIGN KEY(services.id), INDEX | Service |
| appointment_id | BigInteger | FOREIGN KEY(appointments.id), INDEX | Source appointment |
| completed_date | DateTime(timezone=True) | | Service completion date |
| notes | Text | | Service notes |
| cost | Numeric(10,2) | | Actual cost |
| rating | Integer | | Customer rating (0-5) |
| review | Text | | Customer review text |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |

### 8. assignments

Employee assignments to appointments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| appointment_id | BigInteger | FOREIGN KEY(appointments.id), INDEX | Appointment |
| employee_id | BigInteger | FOREIGN KEY(employees.id), INDEX | Employee |
| status | String(20) | DEFAULT 'assigned', INDEX | `assigned`, `in-progress`, `checklist_pending`, `work_pending`, `submitted`, `verified`, `completed`, `cancelled` |
| assigned_at | DateTime(timezone=True) | server_default=now(), INDEX | Assignment timestamp |
| started_at | DateTime(timezone=True) | | Work start timestamp |
| completed_at | DateTime(timezone=True) | | Work completion timestamp |
| notes | Text | | Assignment notes |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Update timestamp |

### 9. notifications

User notifications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| user_id | BigInteger | FOREIGN KEY(users.id), INDEX | Recipient |
| title | String(100) | NOT NULL | Notification title |
| message | Text | | Notification message |
| notification_type | String(50) | DEFAULT 'info', INDEX | `info`, `warning`, `success`, `error` |
| is_read | Boolean | DEFAULT False, INDEX | Read status |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |

### 10. employees

Extended employee profiles linked to users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| user_id | BigInteger | FOREIGN KEY(users.id), UNIQUE, INDEX | Linked user account |
| employee_id | String(36) | UNIQUE, NOT NULL, INDEX | UUID employee identifier |
| location | String(100) | INDEX | Work location |
| specialties | JSONB | | List of specialties |
| rating | Numeric(3,2) | DEFAULT 0.0 | Employee rating (0.00-5.00) |
| total_services | Integer | DEFAULT 0 | Total services completed |
| status | String(20) | DEFAULT 'active', INDEX | `active`, `off-duty`, `suspended`, `terminated`, `pending`, `rejected` |
| hired_at | DateTime(timezone=True) | | Hire date |
| department | String(100) | INDEX | Department name |
| title | String(100) | | Job title |
| employment_type | String(20) | DEFAULT 'full_time', INDEX | `full_time`, `part_time`, `contractor` |
| start_date | DateTime(timezone=True) | | Employment start date |
| manager_id | BigInteger | FOREIGN KEY(employees.id), INDEX | Manager reference |
| account_status | String(20) | DEFAULT 'onboarding', INDEX | `active`, `onboarding`, `suspended`, `terminated` |
| exit_notes | Text | | Exit/offboarding notes |
| offboarding_checklist_completed | Boolean | DEFAULT False | Offboarding completion flag |
| base_salary | Numeric(10,2) | | Base salary |
| hourly_rate | Numeric(10,2) | | Hourly rate |
| pay_frequency | String(20) | | Pay frequency |
| bank_account_number | EncryptedString(50) | | Bank account (encrypted at rest) |
| bank_name | String(100) | | Bank name |
| health_plan_tier | String(20) | | Health plan tier |

### 11. employee_documents

Employee uploaded documents.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| employee_id | BigInteger | FOREIGN KEY(employees.id), INDEX | Employee |
| document_name | String(255) | NOT NULL | Document display name |
| doc_type | String(50) | NOT NULL, INDEX | `id_proof`, `tax_form`, `certification`, `contract`, `other` |
| file_path | String(500) | | Server file path |
| file_name | String(255) | | Original file name |
| file_size | Integer | | File size in bytes |
| mime_type | String(100) | | File MIME type |
| uploaded_by | BigInteger | FOREIGN KEY(users.id), INDEX | Uploader user |
| is_verified | Boolean | DEFAULT False, INDEX | Verification status |
| verified_at | DateTime(timezone=True) | | Verification timestamp |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Update timestamp |

### 12. employee_time_logs

Employee clock in/out records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| employee_id | BigInteger | FOREIGN KEY(employees.id), INDEX | Employee |
| action | String(10) | NOT NULL | `in` or `out` |
| timestamp | DateTime(timezone=True) | NOT NULL, INDEX | Action timestamp |
| notes | Text | | Optional notes |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |

### 13. time_off_requests

Employee time-off requests.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| employee_id | BigInteger | FOREIGN KEY(employees.id), INDEX | Employee |
| request_type | String(20) | NOT NULL | `vacation`, `sick`, `personal`, `other` |
| start_date | DateTime(timezone=True) | NOT NULL, INDEX | Start date/time |
| end_date | DateTime(timezone=True) | NOT NULL, INDEX | End date/time |
| reason | Text | | Request reason |
| status | String(20) | DEFAULT 'pending', NOT NULL, INDEX | `pending`, `approved`, `rejected`, `cancelled` |
| admin_notes | Text | | Admin response notes |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Update timestamp |

### 14. issue_reports

Employee issue reports.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| employee_id | BigInteger | FOREIGN KEY(employees.id), INDEX | Reporting employee |
| appointment_id | BigInteger | FOREIGN KEY(appointments.id), INDEX | Related appointment |
| title | String(200) | NOT NULL | Issue title |
| description | Text | NOT NULL | Issue description |
| priority | String(20) | DEFAULT 'medium', NOT NULL, INDEX | `low`, `medium`, `high`, `urgent` |
| status | String(20) | DEFAULT 'open', NOT NULL, INDEX | `open`, `in-progress`, `resolved`, `closed` |
| resolution_notes | Text | | Resolution details |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Update timestamp |

### 15. service_partners

Third-party service providers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| name | String(100) | NOT NULL, INDEX | Partner name |
| contact_name | String(100) | | Contact person name |
| email | String(120) | INDEX | Contact email |
| phone | String(20) | | Contact phone |
| address | JSONB | | Address object |
| services_offered | JSONB | | List of services offered |
| rating | Numeric(3,2) | DEFAULT 0.0 | Partner rating (0.00-5.00) |
| total_services | Integer | DEFAULT 0 | Total services completed |
| is_active | Boolean | DEFAULT True, INDEX | Active status |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Update timestamp |

### 16. invoices

Invoice records for appointments and fleet services.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| invoice_number | String(50) | NOT NULL, UNIQUE | Invoice number |
| appointment_id | BigInteger | FOREIGN KEY(appointments.id), UNIQUE | Related appointment |
| user_id | BigInteger | FOREIGN KEY(users.id), INDEX | Customer |
| company_id | BigInteger | FOREIGN KEY(companies.id), INDEX | Fleet company (if applicable) |
| total_amount | Numeric(10,2) | NOT NULL | Invoice total |
| tax_amount | Numeric(10,2) | | Tax amount |
| discount_amount | Numeric(10,2) | DEFAULT 0.0 | Discount amount |
| status | String(20) | DEFAULT 'draft' | `draft`, `sent`, `paid`, `overdue`, `cancelled` |
| pdf_path | String(500) | | Generated PDF path |
| sent_at | DateTime(timezone=True) | | Sent timestamp |
| due_date | DateTime(timezone=True) | | Payment due date |
| notes | Text | | Additional notes |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Update timestamp |

### 17. invoice_line_items

Line items for invoices.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| invoice_id | BigInteger | FOREIGN KEY(invoices.id), INDEX | Parent invoice |
| description | String(255) | NOT NULL | Item description |
| quantity | Numeric(10,2) | DEFAULT 1 | Item quantity |
| unit_price | Numeric(10,2) | NOT NULL | Price per unit |
| total_price | Numeric(10,2) | NOT NULL | Total price |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |

### 18. companies

Fleet/company accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| name | String(100) | NOT NULL, INDEX | Company name |
| email | String(120) | | Company email |
| phone | String(20) | | Company phone |
| address | JSONB | | Company address |
| contact_person | String(100) | | Primary contact |
| industry | String(100) | | Industry type |
| is_active | Boolean | DEFAULT True, INDEX | Active status |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Update timestamp |

### 19. fleet_vehicles

Vehicles belonging to fleet companies.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| company_id | BigInteger | FOREIGN KEY(companies.id), INDEX | Owning company |
| make | String(50) | NOT NULL | Vehicle make |
| model | String(50) | NOT NULL | Vehicle model |
| year | Integer | | Manufacture year |
| license_plate | String(20) | | License plate |
| vin | String(17) | | VIN |
| mileage | Integer | DEFAULT 0 | Current mileage |
| status | String(20) | DEFAULT 'active' | `active`, `in-service`, `retired` |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Update timestamp |

### 20. fleet_expenses

Fleet expense records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| company_id | BigInteger | FOREIGN KEY(companies.id), INDEX | Company |
| vehicle_id | BigInteger | FOREIGN KEY(fleet_vehicles.id), INDEX | Vehicle |
| expense_type | String(50) | NOT NULL | Expense type |
| amount | Numeric(10,2) | NOT NULL | Expense amount |
| description | Text | | Expense description |
| expense_date | DateTime(timezone=True) | NOT NULL | Date of expense |
| receipt_path | String(500) | | Receipt file path |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Update timestamp |

### 21. payments

Payment transaction records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| payment_reference | String(50) | UNIQUE, NOT NULL, INDEX | External payment reference |
| invoice_id | BigInteger | FOREIGN KEY(invoices.id), INDEX | Related invoice |
| appointment_id | BigInteger | FOREIGN KEY(appointments.id), INDEX | Related appointment |
| user_id | BigInteger | FOREIGN KEY(users.id), INDEX | Paying user |
| amount | Numeric(10,2) | NOT NULL | Payment amount |
| currency | String(3) | DEFAULT 'KES' | Currency code |
| method | String(20) | NOT NULL | `mpesa`, `card`, `cash`, `bank_transfer` |
| status | String(20) | DEFAULT 'pending', NOT NULL, INDEX | `pending`, `processing`, `completed`, `failed`, `cancelled`, `refunded` |
| mpesa_receipt_number | String(50) | | M-Pesa receipt number |
| mpesa_phone_number | String(20) | | M-Pesa phone number |
| mpesa_transaction_date | DateTime(timezone=True) | | M-Pesa transaction date |
| card_last_four | String(4) | | Last 4 digits of card |
| card_brand | String(50) | | Card brand |
| merchant_request_id | String(100) | | M-Pesa merchant request ID |
| checkout_request_id | String(100) | | M-Pesa checkout request ID |
| failure_reason | Text | | Failure reason |
| notes | Text | | Additional notes |
| paid_at | DateTime(timezone=True) | | Payment timestamp |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| updated_at | DateTime(timezone=True) | server_default=now(), onupdate=now() | Update timestamp |

### 22. webhook_events

Persisted raw inbound webhook payloads (e.g., M-Pesa Daraja callbacks).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| source | String(30) | NOT NULL, INDEX | `mpesa`, `card`, `bank_transfer`, `other` |
| external_event_id | String(200) | NOT NULL, INDEX | Provider event ID |
| payload | JSON | NOT NULL | Raw webhook payload |
| status | String(20) | DEFAULT 'unprocessed', NOT NULL, INDEX | `unprocessed`, `processing`, `processed`, `failed` |
| attempts | Integer | DEFAULT 0, NOT NULL | Processing attempts |
| last_error | Text | | Last error message |
| received_at | DateTime(timezone=True) | NOT NULL | Receipt timestamp |
| processed_at | DateTime(timezone=True) | | Processing timestamp |

### 23. audit_logs

System audit trail for security and compliance.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| user_id | BigInteger | FOREIGN KEY(users.id) | User who performed action |
| admin_id | BigInteger | FOREIGN KEY(users.id) | Admin who performed action |
| action | String(50) | NOT NULL | Action performed |
| entity_type | String(50) | | Affected entity type |
| entity_id | BigInteger | | Affected entity ID |
| old_values | JSONB | | Previous values |
| new_values | JSONB | | New values |
| ip_address | String(45) | | Client IP address |
| user_agent | String(255) | | Client user agent |
| status | String(20) | DEFAULT 'success' | `success`, `failed` |
| error_message | Text | | Error details if failed |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |

### 24. system_metrics

System performance and health metrics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| metric_name | String(100) | NOT NULL, INDEX | Metric name |
| metric_value | Numeric(15,4) | | Metric value |
| metric_unit | String(50) | | Unit of measurement |
| tags | JSONB | | Additional tags |
| recorded_at | DateTime(timezone=True) | NOT NULL, INDEX | Recording timestamp |

### 25. activity_tracker

User activity tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| user_id | BigInteger | FOREIGN KEY(users.id), INDEX | User |
| admin_id | BigInteger | FOREIGN KEY(users.id), INDEX | Admin |
| action | String(100) | NOT NULL | Action performed |
| resource_type | String(50) | | Resource type |
| resource_id | BigInteger | | Resource ID |
| ip_address | String(45) | | IP address |
| user_agent | String(255) | | User agent |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |

### 26. token_blocklist

Persistent JWT token revocation list.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigInteger | PRIMARY KEY | Unique identifier |
| jti | String(36) | NOT NULL, UNIQUE, INDEX | JWT ID |
| created_at | DateTime(timezone=True) | server_default=now() | Creation timestamp |
| expires_at | DateTime(timezone=True) | NOT NULL | Token expiration |

## Security Features

- **Password Hashing:** bcrypt with salt
- **Field Encryption:** Sensitive fields (phone, address, bank account) encrypted at rest using `cryptography`
- **SQL Injection Prevention:** SQLAlchemy ORM with parameterized queries
- **Access Control:** Role-based decorators (`admin_required`, `role_required`, `employee_required`)
- **Row-Level Security:** PostgreSQL RLS policies via `request.user_id` and `request.user_role` session variables
- **Rate Limiting:** Flask-Limiter with Redis storage (production) or in-memory (development)
- **CSRF Protection:** Flask-WTF CSRFProtect (exempt for JWT API endpoints)
- **Audit Logging:** Comprehensive audit trail for all sensitive actions
- **Token Revocation:** Persistent JWT blocklist with Redis-backed lookups

## Migrations

Database migrations are managed with Flask-Migrate (Alembic).

```bash
# Generate a new migration
cd backend
flask db migrate -m "Description of change"

# Apply migrations
flask db upgrade

# Rollback last migration
flask db downgrade
```

## Indexes

The schema includes indexes on frequently queried columns:
- Foreign keys (`user_id`, `vehicle_id`, `service_id`, `employee_id`, etc.)
- Status fields (`status`, `payment_status`, `is_active`)
- Date fields (`appointment_date`, `created_at`)
- Lookup fields (`email`, `code`, `name`)

PostgreSQL-specific optimizations include JSONB indexes on `address`, `services_offered`, and `specialties` fields.
