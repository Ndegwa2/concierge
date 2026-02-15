# AutoConcierge Database Documentation

## Overview

The AutoConcierge database is a SQLite database designed to support the operations of the AutoConcierge vehicle care concierge service. It stores information about users, vehicles, services, appointments, and service history, providing a complete backend for the website.

## Database File

- **File Name:** `autoconcierge.db`
- **Type:** SQLite 3 database
- **Size:** Approximately 40KB (with sample data)
- **Location:** `/home/ndegwa/DREAM!/autoconcierge.db`

## Database Generation Script

### File: `database.py`

A Python script that automates database creation and initialization. Key features:

- **Database Connection:** Uses SQLite3 module to connect to the database
- **Table Creation:** Creates all necessary tables with appropriate constraints
- **Sample Data Population:** Inserts sample data for testing and development
- **Password Security:** Hashes passwords using SHA-256 algorithm
- **Error Handling:** Uses `INSERT OR IGNORE` to prevent duplicate entries

## Database Schema

### Table 1: `users`

Stores customer user account information.

| Field          | Type                | Description                          |
|----------------|---------------------|--------------------------------------|
| id             | INTEGER PRIMARY KEY | Unique user identifier (auto-increment) |
| name           | TEXT NOT NULL       | Full name of the user                |
| email          | TEXT NOT NULL UNIQUE | Email address (unique)                |
| password_hash  | TEXT NOT NULL       | Hashed password (SHA-256)            |
| phone          | TEXT                | Phone number (optional)              |
| address        | TEXT                | Physical address (optional)          |
| role           | TEXT DEFAULT 'customer' | User role (customer/admin)        |
| created_at     | TIMESTAMP           | Account creation timestamp           |
| updated_at     | TIMESTAMP           | Account last updated timestamp       |

### Table 2: `services`

Stores available vehicle care services.

| Field          | Type                | Description                          |
|----------------|---------------------|--------------------------------------|
| id             | INTEGER PRIMARY KEY | Unique service identifier            |
| name           | TEXT NOT NULL       | Service name                         |
| description    | TEXT                | Service description (optional)       |
| price          | DECIMAL(10, 2)      | Service price                        |
| duration       | INTEGER             | Estimated duration (minutes)         |
| category       | TEXT                | Service category                     |
| is_active      | INTEGER DEFAULT 1   | Active status (1 = active, 0 = inactive) |
| created_at     | TIMESTAMP           | Record creation timestamp            |
| updated_at     | TIMESTAMP           | Record last updated timestamp        |

### Table 3: `vehicles`

Stores customer vehicle information.

| Field          | Type                | Description                          |
|----------------|---------------------|--------------------------------------|
| id             | INTEGER PRIMARY KEY | Unique vehicle identifier            |
| user_id        | INTEGER             | Foreign key to users table           |
| make           | TEXT NOT NULL       | Vehicle make (e.g., Toyota)          |
| model          | TEXT NOT NULL       | Vehicle model (e.g., Camry)          |
| year           | INTEGER             | Year of manufacture                  |
| color          | TEXT                | Vehicle color                        |
| license_plate  | TEXT                | License plate number                 |
| vin            | TEXT                | Vehicle Identification Number        |
| odometer       | INTEGER             | Current odometer reading             |
| is_active      | INTEGER DEFAULT 1   | Active status                        |
| created_at     | TIMESTAMP           | Record creation timestamp            |
| updated_at     | TIMESTAMP           | Record last updated timestamp        |

### Table 4: `appointments`

Stores service appointment information.

| Field          | Type                | Description                          |
|----------------|---------------------|--------------------------------------|
| id             | INTEGER PRIMARY KEY | Unique appointment identifier        |
| user_id        | INTEGER             | Foreign key to users table           |
| vehicle_id     | INTEGER             | Foreign key to vehicles table        |
| service_id     | INTEGER             | Foreign key to services table        |
| appointment_date | TIMESTAMP        | Date and time of appointment         |
| status         | TEXT DEFAULT 'scheduled' | Appointment status (scheduled/confirmed/completed/cancelled) |
| notes          | TEXT                | Additional notes                     |
| total_amount   | DECIMAL(10, 2)      | Total amount to be paid              |
| payment_status | TEXT DEFAULT 'pending' | Payment status (pending/paid/failed) |
| created_at     | TIMESTAMP           | Record creation timestamp            |
| updated_at     | TIMESTAMP           | Record last updated timestamp        |

### Table 5: `service_history`

Stores past service records and reviews.

| Field          | Type                | Description                          |
|----------------|---------------------|--------------------------------------|
| id             | INTEGER PRIMARY KEY | Unique service history identifier    |
| user_id        | INTEGER             | Foreign key to users table           |
| vehicle_id     | INTEGER             | Foreign key to vehicles table        |
| service_id     | INTEGER             | Foreign key to services table        |
| appointment_id | INTEGER             | Foreign key to appointments table    |
| completed_date | TIMESTAMP           | Date service was completed           |
| notes          | TEXT                | Service notes                        |
| cost           | DECIMAL(10, 2)      | Actual cost of service               |
| rating         | INTEGER             | Customer rating (1-5 stars)          |
| review         | TEXT                | Customer review                      |
| created_at     | TIMESTAMP           | Record creation timestamp            |

### Table 6: `notifications`

Stores user notifications.

| Field          | Type                | Description                          |
|----------------|---------------------|--------------------------------------|
| id             | INTEGER PRIMARY KEY | Unique notification identifier       |
| user_id        | INTEGER             | Foreign key to users table           |
| title          | TEXT NOT NULL       | Notification title                   |
| message        | TEXT                | Notification message                 |
| is_read        | INTEGER DEFAULT 0   | Read status (1 = read, 0 = unread)   |
| created_at     | TIMESTAMP           | Notification creation timestamp      |

### Table 7: `admins`

Stores admin user accounts.

| Field          | Type                | Description                          |
|----------------|---------------------|--------------------------------------|
| id             | INTEGER PRIMARY KEY | Unique admin identifier              |
| name           | TEXT NOT NULL       | Admin's full name                    |
| email          | TEXT NOT NULL UNIQUE | Admin's email address (unique)       |
| password_hash  | TEXT NOT NULL       | Hashed password (SHA-256)            |
| role           | TEXT DEFAULT 'admin' | Admin role                          |
| created_at     | TIMESTAMP           | Account creation timestamp           |
| updated_at     | TIMESTAMP           | Account last updated timestamp       |

### Table 8: `payment_methods`

Stores customer payment method information.

| Field          | Type                | Description                          |
|----------------|---------------------|--------------------------------------|
| id             | INTEGER PRIMARY KEY | Unique payment method identifier     |
| user_id        | INTEGER             | Foreign key to users table           |
| card_number    | TEXT NOT NULL       | Card number (encrypted in production) |
| cardholder_name | TEXT NOT NULL       | Cardholder name                      |
| expiry_date    | TEXT NOT NULL       | Card expiry date                     |
| last_four_digits | TEXT              | Last 4 digits of card number         |
| is_default     | INTEGER DEFAULT 0   | Default payment method flag          |
| is_active      | INTEGER DEFAULT 1   | Active status                        |
| created_at     | TIMESTAMP           | Record creation timestamp            |
| updated_at     | TIMESTAMP           | Record last updated timestamp        |

### Table 9: `discount_codes`

Stores discount and promotion codes.

| Field          | Type                | Description                          |
|----------------|---------------------|--------------------------------------|
| id             | INTEGER PRIMARY KEY | Unique discount code identifier      |
| code           | TEXT NOT NULL UNIQUE | Discount code (e.g., WELCOME10)      |
| discount_type  | TEXT DEFAULT 'percentage' | Discount type (percentage/fixed) |
| value          | DECIMAL(10, 2)      | Discount value                       |
| minimum_spend  | DECIMAL(10, 2)      | Minimum spend required               |
| max_uses       | INTEGER             | Maximum number of uses               |
| used_count     | INTEGER DEFAULT 0   | Number of times used                 |
| start_date     | TIMESTAMP           | Discount valid from date             |
| end_date       | TIMESTAMP           | Discount valid to date               |
| is_active      | INTEGER DEFAULT 1   | Active status                        |
| created_at     | TIMESTAMP           | Record creation timestamp            |
| updated_at     | TIMESTAMP           | Record last updated timestamp        |

## Sample Data

The database comes with pre-populated sample data:

### Sample Users (3 customers)
- John Doe - john@example.com
- Jane Smith - jane@example.com
- Mike Johnson - mike@example.com

### Sample Admin
- Admin User - admin@autoconcierge.com (password: admin123)

### Sample Services (6 services)
1. Preventive Maintenance & Inspections ($99.99)
2. Repair Coordination ($149.99)
3. Car Wash & Detailing ($79.99)
4. Pick-Up & Drop-Off ($49.99)
5. Convenience & Lifestyle Support ($39.99)
6. Corporate & Fleet Concierge ($299.99)

### Sample Vehicles (4 vehicles)
- Toyota Camry (2022, Silver)
- Honda Accord (2021, Black)
- Ford Escape (2023, Blue)
- BMW X5 (2020, White)

### Sample Discount Codes (3 codes)
- WELCOME10: 10% off (min $50, max 100 uses)
- FIRSTORDER20: 20% off (min $100, max 50 uses)
- SUMMER50: $50 off (min $200, max 20 uses)

## Database Operations

### Creating the Database

```bash
python3 database.py
```

This command will:
1. Create the `autoconcierge.db` file
2. Create all tables with the specified schema
3. Insert sample data into the database
4. Display a success message

### Connecting to the Database

```python
import sqlite3
conn = sqlite3.connect('autoconcierge.db')
cursor = conn.cursor()
```

### Querying Data

```python
# Get all active services
cursor.execute("SELECT * FROM services WHERE is_active = 1")
services = cursor.fetchall()

# Get appointments for a specific user
user_id = 1
cursor.execute("SELECT * FROM appointments WHERE user_id = ?", (user_id,))
appointments = cursor.fetchall()
```

### Modifying Data

```python
# Create a new appointment
appointment_data = (
    1,  # user_id
    1,  # vehicle_id
    1,  # service_id
    '2024-12-25 14:00:00',  # appointment_date
    'scheduled',
    'Please wash and wax the car',
    99.99,
    'pending'
)
cursor.execute('''
    INSERT INTO appointments (user_id, vehicle_id, service_id, appointment_date, 
                           status, notes, total_amount, payment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
''', appointment_data)
conn.commit()
```

## Data Relationships

The database uses foreign key relationships to maintain data integrity:

```
users
├── vehicles
├── appointments
│   └── service_history
├── payment_methods
└── notifications

services
├── appointments
└── service_history

vehicles
├── appointments
└── service_history

discount_codes (standalone)
admins (standalone)
```

## Security Considerations

1. **Password Hashing:** All passwords are stored as SHA-256 hashes
2. **SQL Injection Protection:** Uses parameterized queries
3. **Data Validation:** Fields have appropriate constraints (NOT NULL, UNIQUE)
4. **Access Control:** Users and admins have separate tables with role-based permissions

## Performance Optimizations

1. **Indexes:** Primary keys are automatically indexed
2. **Data Types:** Uses appropriate data types for efficient storage
3. **Normalization:** Database is normalized to avoid redundancy
4. **Query Optimization:** Proper table structure for efficient querying

## Maintenance

### Backing Up the Database

```bash
cp autoconcierge.db autoconcierge_backup_$(date +%Y%m%d).db
```

### Vacuuming (Optimizing Database Size)

```python
conn.execute("VACUUM")
```

### Updating Schema

To update the database schema, modify the `database.py` script and run it again (will preserve existing data using `CREATE TABLE IF NOT EXISTS`).

## Future Enhancements

1. **Email Verification:** Add email verification status field to users table
2. **Push Notifications:** Add device tokens for push notifications
3. **Analytics:** Add tables for tracking user behavior and service statistics
4. **Multiple Locations:** Add location-based service availability
5. **Referral Program:** Add referral tracking functionality

## Conclusion

The AutoConcierge database provides a comprehensive backend for managing all aspects of the vehicle care concierge service. It is designed with scalability, security, and maintainability in mind, and comes with sample data to facilitate development and testing.