# Auto Concierge API Documentation

## Base URL

http://localhost:5000/api

## Authentication

All endpoints (except login and register) require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-token-here>
```

## Admin Endpoints

### Admin Login
```
POST /admin/login
```
**Body:**
```json
{
  "email": "admin@autoconcierge.com",
  "password": "admin123"
}
```

### Get Dashboard Stats
```
GET /admin/stats
```

### Get All Users
```
GET /admin/users
```

### Create User
```
POST /admin/users
```
**Body:**
```json
{
  "name": "New User",
  "email": "user@example.com",
  "password": "password123",
  "role": "customer",
  "phone": "+254700000000"
}
```

### Update User
```
PUT /admin/users/:id
```
**Body:** (only fields to update)
```json
{
  "name": "Updated Name",
  "phone": "+254711111111"
}
```

### Delete User
```
DELETE /admin/users/:id
```

### Get All Appointments
```
GET /admin/appointments
```

### Get All Service Partners
```
GET /admin/partners
```

### Create Service Partner
```
POST /admin/partners
```
**Body:**
```json
{
  "name": "Partner Name",
  "contact": {
    "name": "Contact Person",
    "email": "contact@partner.com",
    "phone": "+254722222222"
  },
  "address": {
    "street": "123 Main St",
    "city": "Nairobi",
    "state": "Nairobi",
    "zipCode": "00100",
    "country": "Kenya"
  },
  "services": ["Service 1", "Service 2"],
  "rating": 4.5
}
```

### Update Service Partner
```
PUT /admin/partners/:id
```
**Body:** (only fields to update)

### Delete Service Partner
```
DELETE /admin/partners/:id
```

## Customer Endpoints

### Customer Login
```
POST /customers/login
```
**Body:**
```json
{
  "email": "jane@example.com",
  "password": "customer123"
}
```

### Customer Registration
```
POST /customers/register
```
**Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "customer123",
  "phone": "+254734567890"
}
```

### Get Profile
```
GET /customers/profile
```

### Update Profile
```
PUT /customers/profile
```
**Body:**
```json
{
  "name": "Jane Doe",
  "phone": "+254733333333"
}
```

### Get Appointments
```
GET /customers/appointments
```

### Create Appointment
```
POST /customers/appointments
```
**Body:**
```json
{
  "service": "Oil Change",
  "vehicle": {
    "make": "Toyota",
    "model": "Corolla",
    "year": 2018,
    "licensePlate": "KAA 123A"
  },
  "appointmentDate": "2024-06-15T10:00:00.000Z",
  "notes": "Regular oil change"
}
```

### Cancel Appointment
```
PUT /customers/appointments/:id/cancel
```

## Employee Endpoints

### Employee Login
```
POST /employees/login
```
**Body:**
```json
{
  "email": "john@autoconcierge.com",
  "password": "employee123"
}
```

### Get Profile
```
GET /employees/profile
```

### Update Profile
```
PUT /employees/profile
```
**Body:**
```json
{
  "name": "John Doe",
  "phone": "+254722222222"
}
```

### Get Assigned Appointments
```
GET /employees/appointments
```

### Update Appointment Status
```
PUT /employees/appointments/:id/status
```
**Body:**
```json
{
  "status": "in-progress"
}
```

Status options: pending, confirmed, in-progress, completed, cancelled

### Get Schedule
```
GET /employees/schedule
```

## Models

### User
```javascript
{
  id: ObjectId,
  name: String,
  email: String,
  password: String (hashed),
  role: String (admin/customer/employee),
  phone: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Appointment
```javascript
{
  id: ObjectId,
  customer: ObjectId (ref: User),
  service: String,
  vehicle: {
    make: String,
    model: String,
    year: Number,
    licensePlate: String
  },
  appointmentDate: Date,
  status: String,
  employee: ObjectId (ref: User),
  notes: String,
  totalPrice: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Service Partner
```javascript
{
  id: ObjectId,
  name: String,
  contact: {
    name: String,
    email: String,
    phone: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  services: [String],
  rating: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Error Responses

All error responses follow this format:
```json
{
  "message": "Error message"
}
```

Common status codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error