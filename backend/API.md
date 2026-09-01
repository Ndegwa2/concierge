# Auto Concierge API Documentation

## Base URL

```
http://localhost:5000/api
```

## Authentication

All endpoints (except public auth endpoints) require JWT authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <your-access-token>
```

Refresh tokens are used to obtain new access tokens via `/api/auth/refresh`.

---

## Table of Contents

- [Authentication](#authentication)
- [Services](#services)
- [Vehicles](#vehicles)
- [Appointments](#appointments)
- [Employees](#employees)
- [Admin](#admin)
- [Notifications](#notifications)
- [Partners](#partners)
- [Fleets](#fleets)
- [Payments](#payments)
- [AI Chat](#ai-chat)
- [Workflow](#workflow)
- [Health](#health)

---

## Authentication

Base path: `/api/auth`

### Register
```http
POST /api/auth/register
```

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "customer",
  "phone": "+254712345678",
  "address": "123 Main St, Nairobi"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { ... },
    "access_token": "...",
    "refresh_token": "..."
  }
}
```

- `role` must be `customer` or `employee`.
- Employees require admin approval before they can log in.

### Customer Login
```http
POST /api/auth/login
```

**Body:**
```json
{
  "email": "customer@example.com",
  "password": "password"
}
```

### Employee Login
```http
POST /api/auth/employee/login
```

**Body:**
```json
{
  "email": "employee@example.com",
  "password": "password"
}
```

### Admin Login
```http
POST /api/auth/admin/login
```

**Body:**
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

### Refresh Token
```http
POST /api/auth/refresh
```
Requires: `Authorization: Bearer <refresh-token>`

### Logout
```http
POST /api/auth/logout
```
Requires: `Authorization: Bearer <access-token>`

### Verify Token
```http
GET /api/auth/verify-token
```
Requires: `Authorization: Bearer <access-token>`

### Get Profile
```http
GET /api/auth/profile
```
Requires: `Authorization: Bearer <access-token>`

### Update Profile
```http
PUT /api/auth/profile
```
Requires: `Authorization: Bearer <access-token>`

**Body:**
```json
{
  "name": "Updated Name",
  "phone": "+254700000000",
  "address": "New Address"
}
```

### Change Password
```http
POST /api/auth/change-password
```
Requires: `Authorization: Bearer <access-token>`

**Body:**
```json
{
  "current_password": "oldPassword123",
  "new_password": "newSecurePass456"
}
```

### Admin: Create Admin Account
```http
POST /api/auth/admin/create
```
Requires: `Authorization: Bearer <access-token>` (admin or super_admin)

**Body:**
```json
{
  "name": "New Admin",
  "email": "newadmin@example.com",
  "password": "SecurePass123",
  "role": "admin"
}
```

### Admin: Get Pending Employees
```http
GET /api/auth/admin/pending-employees
```
Requires: `Authorization: Bearer <access-token>` (admin or super_admin)

### Admin: Approve/Reject Employee
```http
POST /api/auth/admin/approve-employee/{user_id}
```
Requires: `Authorization: Bearer <access-token>` (admin or super_admin)

**Body:**
```json
{
  "action": "approve"
}
```

### Admin: Update Employee Status
```http
PUT /api/auth/admin/employees/{user_id}/status
```
Requires: `Authorization: Bearer <access-token>` (admin or super_admin)

**Body:**
```json
{
  "status": "active"
}
```

---

## Services

Base path: `/api/services`

### List Services
```http
GET /api/services/
```

### Get Service
```http
GET /api/services/{id}
```

---

## Vehicles

Base path: `/api/vehicles`

Requires: `Authorization: Bearer <access-token>` (customer, admin, employee)

### List Vehicles
```http
GET /api/vehicles/
```

### Create Vehicle
```http
POST /api/vehicles/
```

**Body:**
```json
{
  "make": "Toyota",
  "model": "Camry",
  "year": 2022,
  "color": "Silver",
  "license_plate": "KAA 123A",
  "vin": "JTDBU4EE9B0123456",
  "current_mileage": 45000
}
```

### Get Vehicle
```http
GET /api/vehicles/{id}
```

### Update Vehicle
```http
PUT /api/vehicles/{id}
```

**Body:**
```json
{
  "color": "Black",
  "current_mileage": 46000
}
```

### Delete Vehicle
```http
DELETE /api/vehicles/{id}
```

---

## Appointments

Base path: `/api/appointments`

Requires: `Authorization: Bearer <access-token>`

### List Appointments
```http
GET /api/appointments/?status=scheduled
```

### Get Appointment
```http
GET /api/appointments/{id}
```

### Create Appointment
```http
POST /api/appointments/
```

**Body:**
```json
{
  "vehicle_id": 1,
  "service_id": 2,
  "appointment_date": "2024-12-25T10:00:00+03:00",
  "notes": "Regular oil change and inspection"
}
```

### Update Appointment
```http
PUT /api/appointments/{id}
```

**Body:**
```json
{
  "status": "confirmed",
  "appointment_date": "2024-12-25T14:00:00+03:00"
}
```

### Cancel Appointment
```http
DELETE /api/appointments/{id}
```

### Confirm Vehicle Return
```http
POST /api/appointments/{id}/confirm-return
```

**Body:**
```json
{
  "service_rating": 5,
  "condition_rating": 4,
  "review": "Excellent service, very professional team."
}
```

---

## Employees

Base path: `/api/employees`

### Employee Dashboard
```http
GET /api/employees/dashboard
```
Requires: `Authorization: Bearer <access-token>` (employee)

### Get My Assignments
```http
GET /api/employees/assignments?status=assigned
```
Requires: `Authorization: Bearer <access-token>` (employee)

### Update Assignment Status
```http
PUT /api/employees/assignments/{id}
```
Requires: `Authorization: Bearer <access-token>` (employee)

**Body:**
```json
{
  "status": "in-progress",
  "notes": "Starting work on vehicle"
}
```

### Get My Schedule
```http
GET /api/employees/schedule?start_date=2024-01-01&end_date=2024-12-31
```
Requires: `Authorization: Bearer <access-token>` (employee)

### Get Employee Profile
```http
GET /api/employees/profile
```
Requires: `Authorization: Bearer <access-token>` (employee)

### Update Employee Profile
```http
PUT /api/employees/profile
```
Requires: `Authorization: Bearer <access-token>` (employee)

**Body:**
```json
{
  "name": "Updated Name",
  "phone": "+254700000000"
}
```

### Clock In/Out
```http
POST /api/employees/clock
```
Requires: `Authorization: Bearer <access-token>` (employee)

**Body:**
```json
{
  "action": "in",
  "notes": "Starting shift"
}
```

### Get Time Logs
```http
GET /api/employees/time-logs
```
Requires: `Authorization: Bearer <access-token>` (employee)

### Request Time Off
```http
POST /api/employees/time-off
```
Requires: `Authorization: Bearer <access-token>` (employee)

**Body:**
```json
{
  "request_type": "vacation",
  "start_date": "2024-12-20T00:00:00+03:00",
  "end_date": "2024-12-27T00:00:00+03:00",
  "reason": "Family holiday"
}
```

### Get Time Off Requests
```http
GET /api/employees/time-off
```
Requires: `Authorization: Bearer <access-token>` (employee)

### Report Issue
```http
POST /api/employees/issues
```
Requires: `Authorization: Bearer <access-token>` (employee)

**Body:**
```json
{
  "title": "Vehicle lift malfunctioning",
  "description": "The hydraulic lift on bay 3 is leaking oil",
  "priority": "high",
  "appointment_id": 42
}
```

### Get Issue Reports
```http
GET /api/employees/issues
```
Requires: `Authorization: Bearer <access-token>` (employee)

---

## Admin

Base path: `/api/admin`

All endpoints require: `Authorization: Bearer <access-token>` (admin or super_admin)

### Dashboard Stats
```http
GET /api/admin/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total_users": 150,
      "total_appointments": 420,
      "total_services": 12,
      "total_vehicles": 85,
      "active_appointments": 23,
      "completed_appointments": 395,
      "total_revenue": 1250000
    },
    "recent_appointments": [ ... ]
  }
}
```

### List Users
```http
GET /api/admin/users?status=active&role=customer&search=john
```

### Get User
```http
GET /api/admin/users/{id}
```

### List Appointments
```http
GET /api/admin/appointments?status=scheduled
```

### Get Service History
```http
GET /api/admin/service-history?limit=50&service_id=1&start_date=2024-01-01&end_date=2024-12-31
```

### Create Notification
```http
POST /api/admin/notifications
```

**Body:**
```json
{
  "user_id": 1,
  "title": "Appointment Reminder",
  "message": "Your appointment is scheduled for tomorrow at 10:00 AM"
}
```

### Create Discount Code
```http
POST /api/admin/discounts
```

**Body:**
```json
{
  "code": "WELCOME20",
  "discount_type": "percentage",
  "value": 20,
  "minimum_spend": 100,
  "max_uses": 50,
  "start_date": "2024-01-01T00:00:00+03:00",
  "end_date": "2024-12-31T23:59:59+03:00"
}
```

---

## Notifications

Base path: `/api/notifications`

Requires: `Authorization: Bearer <access-token>`

### List Notifications
```http
GET /api/notifications/?unread_only=true
```

### Mark Notification Read
```http
PUT /api/notifications/{id}/read
```

### Mark All as Read
```http
PUT /api/notifications/read-all
```

---

## Partners

Base path: `/api/partners`

### List Partners (Public)
```http
GET /api/partners/?service=Oil+Change&location=Nairobi
```

### Get Partner
```http
GET /api/partners/{id}
```

---

### Partner Admin Endpoints

Base path: `/api/partners/admin`

Requires: `Authorization: Bearer <access-token>` (admin)

### List All Partners
```http
GET /api/partners/admin
```

### Create Partner
```http
POST /api/partners/admin
```

**Body:**
```json
{
  "name": "AutoFix Garage",
  "contact_name": "Jane Doe",
  "email": "jane@autofix.co.ke",
  "phone": "+254712345678",
  "address": {
    "street": "123 Moi Avenue",
    "city": "Nairobi",
    "country": "Kenya"
  },
  "services_offered": ["Oil Change", "Tire Rotation"],
  "rating": 4.5
}
```

### Get Partner
```http
GET /api/partners/admin/{id}
```

### Update Partner
```http
PUT /api/partners/admin/{id}
```

**Body:**
```json
{
  "rating": 4.8,
  "services_offered": ["Oil Change", "Brake Repair", "Tire Rotation"]
}
```

### Deactivate Partner
```http
DELETE /api/partners/admin/{id}
```

### Activate Partner
```http
PUT /api/partners/admin/{id}/activate
```

### Update Partner Services
```http
PUT /api/partners/admin/{id}/services
```

**Body:**
```json
{
  "services": ["Oil Change", "Brake Repair"]
}
```

### Update Partner Rating
```http
PUT /api/partners/admin/{id}/rating
```

**Body:**
```json
{
  "rating": 4.5
}
```

### Get Partner Statistics
```http
GET /api/partners/admin/statistics
```

---

## Fleets

Base path: `/api/fleets`

Requires: `Authorization: Bearer <access-token>` (admin)

### List Companies
```http
GET /api/fleets/companies?search=ABC&page=1&per_page=20
```

### Create Company
```http
POST /api/fleets/companies
```

**Body:**
```json
{
  "name": "ABC Logistics Ltd",
  "email": "fleet@abclogistics.co.ke",
  "phone": "+254712345678",
  "address": {
    "street": "456 Industrial Area",
    "city": "Nairobi",
    "country": "Kenya"
  },
  "contact_person": "John Manager",
  "industry": "Transport"
}
```

### Get Company
```http
GET /api/fleets/companies/{id}
```

### Update Company
```http
PUT /api/fleets/companies/{id}
```

### Delete Company
```http
DELETE /api/fleets/companies/{id}
```

### Get Company Vehicles
```http
GET /api/fleets/companies/{id}/vehicles
```

### Add Fleet Vehicle
```http
POST /api/fleets/companies/{id}/vehicles
```

**Body:**
```json
{
  "make": "Toyota",
  "model": "Hilux",
  "year": 2023,
  "license_plate": "KCA 456B",
  "vin": "JTDBU4EE9B0123456",
  "mileage": 15000
}
```

### Update Fleet Vehicle
```http
PUT /api/fleets/vehicles/{id}
```

### Delete Fleet Vehicle
```http
DELETE /api/fleets/vehicles/{id}
```

### Get Company Expenses
```http
GET /api/fleets/companies/{id}/expenses?start=2024-01-01&end=2024-12-31
```

### Add Company Expense
```http
POST /api/fleets/companies/{id}/expenses
```

**Body:**
```json
{
  "expense_type": "fuel",
  "amount": 15000,
  "description": "Full tank diesel",
  "expense_date": "2024-06-15T10:00:00+03:00",
  "vehicle_id": 1
}
```

### Delete Fleet Expense
```http
DELETE /api/fleets/expenses/{id}
```

### Get Company Invoices
```http
GET /api/fleets/companies/{id}/invoices
```

### Generate Fleet Invoice
```http
POST /api/fleets/companies/{id}/invoices
```

**Body:**
```json
{
  "period_start": "2024-01-01",
  "period_end": "2024-01-31",
  "line_items": [
    {
      "description": "Oil Change - KBZ 123A",
      "quantity": 1,
      "unit_price": 5000,
      "total_price": 5000
    }
  ],
  "tax_amount": 250,
  "currency": "KES",
  "due_date": "2024-02-15",
  "notes": "Monthly fleet maintenance invoice"
}
```

### Get Fleet Invoice
```http
GET /api/fleets/invoices/{id}
```

### Download Fleet Invoice PDF
```http
GET /api/fleets/invoices/{id}/pdf
```

### Send Fleet Invoice
```http
POST /api/fleets/invoices/{id}/send
```

### Bulk Generate Statements
```http
POST /api/fleets/companies/bulk-statement
```

**Body:**
```json
{
  "company_ids": [1, 2, 3],
  "period_start": "2024-01-01",
  "period_end": "2024-01-31",
  "due_date": "2024-02-15",
  "notes": "Monthly fleet statements"
}
```

---

## Payments

Base path: `/api/payments`

Requires: `Authorization: Bearer <access-token>`

### Initiate M-Pesa STK Push
```http
POST /api/payments/mpesa/stk-push
```

**Body:**
```json
{
  "appointment_id": 1,
  "phone_number": "254712345678"
}
```

### Get Payment
```http
GET /api/payments/{id}
```

### Check Payment Status
```http
GET /api/payments/{id}/status
```

### Get Payments for Appointment
```http
GET /api/payments/appointment/{appointment_id}
```

---

## AI Chat

Base path: `/api/ai-chat`

### Chat with AI
```http
POST /api/ai-chat/chat
```

**Body:**
```json
{
  "message": "What services do you offer?",
  "conversation_history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help you today?" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "We offer a wide range of auto concierge services including..."
  }
}
```

---

## Workflow

Base path: `/api/workflow`

Requires: `Authorization: Bearer <access-token>` (employee, admin)

### Get Assignment Detail
```http
GET /api/workflow/assignments/{id}
```

### Start Assignment
```http
POST /api/workflow/assignments/{id}/start
```

### Get Checklist
```http
GET /api/workflow/assignments/{id}/checklist
```

### Create/Update Checklist
```http
PUT /api/workflow/assignments/{id}/checklist
```

**Body:**
```json
{
  "items": [
    {
      "category": "exterior",
      "item": "Scratch on bumper",
      "condition": "damaged",
      "photo_url": "https://..."
    }
  ],
  "overall_condition": "good",
  "notes": "Minor wear and tear",
  "photos": ["https://..."]
}
```

### Submit Checklist
```http
POST /api/workflow/assignments/{id}/checklist/submit
```

### Get Work Record
```http
GET /api/workflow/assignments/{id}/work-record
```

### Create Work Record
```http
POST /api/workflow/assignments/{id}/work-record
```

**Body:**
```json
{
  "items": [
    {
      "service_type": "Oil Change",
      "description": "Synthetic oil replacement",
      "quantity": 1,
      "unit_price": 5000,
      "total_price": 5000
    }
  ],
  "overall_notes": "All services completed successfully",
  "labor_hours": 2.5,
  "labor_rate": 2000
}
```

### Update Work Record
```http
PUT /api/workflow/work-records/{id}
```

### Submit Work Record
```http
POST /api/workflow/assignments/{id}/work-record/submit
```

### Verify Work Record
```http
POST /api/workflow/assignments/{id}/work-record/verify
```

**Body:**
```json
{
  "approved": true,
  "notes": "Work verified and approved"
}
```

### Generate Invoice from Assignment
```http
POST /api/workflow/assignments/{id}/invoice
```

**Body:**
```json
{
  "tax_amount": 2500,
  "discount_amount": 1000,
  "notes": "Thank you for your business",
  "line_items": [
    {
      "description": "Oil Change",
      "quantity": 1,
      "unit_price": 5000,
      "total_price": 5000
    }
  ]
}
```

### Get Invoice
```http
GET /api/workflow/invoices/{appointment_id}
```

### Send Invoice
```http
POST /api/workflow/invoices/{id}/send
```

### Admin: Get Pending Verifications
```http
GET /api/workflow/admin/pending-verifications
```
Requires: `Authorization: Bearer <access-token>` (admin)

### Employee: Dashboard Data
```http
GET /api/workflow/employees/dashboard
```
Requires: `Authorization: Bearer <access-token>` (employee)

---

## Health

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "service": "AutoConcierge Backend",
  "request_id": "uuid"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource does not exist |
| 409 | Conflict - Resource already exists (e.g., duplicate email) |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
