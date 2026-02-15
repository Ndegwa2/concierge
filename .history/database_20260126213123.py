import sqlite3
import datetime
import hashlib

def create_database():
    # Connect to SQLite database (creates if it doesn't exist)
    conn = sqlite3.connect('autoconcierge.db')
    cursor = conn.cursor()

    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            role TEXT DEFAULT 'customer',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create services table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price DECIMAL(10, 2),
            duration INTEGER,
            category TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create vehicles table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            make TEXT NOT NULL,
            model TEXT NOT NULL,
            year INTEGER,
            color TEXT,
            license_plate TEXT,
            vin TEXT,
            odometer INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # Create appointments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            vehicle_id INTEGER,
            service_id INTEGER,
            appointment_date TIMESTAMP,
            status TEXT DEFAULT 'scheduled',
            notes TEXT,
            total_amount DECIMAL(10, 2),
            payment_status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
            FOREIGN KEY (service_id) REFERENCES services (id)
        )
    ''')

    # Create service_history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS service_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            vehicle_id INTEGER,
            service_id INTEGER,
            appointment_id INTEGER,
            completed_date TIMESTAMP,
            notes TEXT,
            cost DECIMAL(10, 2),
            rating INTEGER,
            review TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
            FOREIGN KEY (service_id) REFERENCES services (id),
            FOREIGN KEY (appointment_id) REFERENCES appointments (id)
        )
    ''')

    # Create notifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT NOT NULL,
            message TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # Create admins table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create payment_methods table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS payment_methods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            card_number TEXT NOT NULL,
            cardholder_name TEXT NOT NULL,
            expiry_date TEXT NOT NULL,
            last_four_digits TEXT,
            is_default INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # Create discount_codes table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS discount_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            discount_type TEXT DEFAULT 'percentage',
            value DECIMAL(10, 2) NOT NULL,
            minimum_spend DECIMAL(10, 2),
            max_uses INTEGER,
            used_count INTEGER DEFAULT 0,
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Helper function to hash passwords
    def hash_password(password):
        return hashlib.sha256(password.encode()).hexdigest()

    # Insert sample admin user
    cursor.execute('''
        INSERT OR IGNORE INTO admins (name, email, password_hash)
        VALUES (?, ?, ?)
    ''', ('Admin User', 'admin@autoconcierge.com', hash_password('admin123')))

    # Insert sample services
    services = [
        ('Preventive Maintenance & Inspections', 'Routine vehicle health checks and preventive maintenance coordination', 99.99, 120, 'maintenance', 1),
        ('Repair Coordination', 'Vehicle delivery to and collection from approved garages', 149.99, 180, 'repair', 1),
        ('Car Wash & Detailing', 'Premium detailing services including interior, exterior, and engine bay', 79.99, 90, 'detailing', 1),
        ('Pick-Up & Drop-Off', 'Door-to-door vehicle collection and return with GPS tracking', 49.99, 60, 'convenience', 1),
        ('Convenience & Lifestyle Support', 'Fuel refilling, tyre checks, battery checks, and roadside assistance', 39.99, 45, 'convenience', 1),
        ('Corporate & Fleet Concierge', 'Fleet maintenance scheduling and multi-vehicle service coordination', 299.99, 240, 'corporate', 1)
    ]

    cursor.executemany('''
        INSERT OR IGNORE INTO services (name, description, price, duration, category, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', services)

    # Insert sample users
    users = [
        ('John Doe', 'john@example.com', hash_password('password123'), '+1234567890', '123 Main St, City', 'customer'),
        ('Jane Smith', 'jane@example.com', hash_password('password123'), '+0987654321', '456 Oak Ave, Town', 'customer'),
        ('Mike Johnson', 'mike@example.com', hash_password('password123'), '+1122334455', '789 Pine Rd, Village', 'customer')
    ]

    cursor.executemany('''
        INSERT OR IGNORE INTO users (name, email, password_hash, phone, address, role)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', users)

    # Insert sample vehicles
    vehicles = [
        (1, 'Toyota', 'Camry', 2022, 'Silver', 'ABC123', '1FTNE2CM1KFB93215', 15000, 1),
        (1, 'Honda', 'Accord', 2021, 'Black', 'XYZ789', 'JHMCG56826C042398', 22000, 1),
        (2, 'Ford', 'Escape', 2023, 'Blue', 'DEF456', '3FAHP0JA8DR229876', 8000, 1),
        (3, 'BMW', 'X5', 2020, 'White', 'GHI789', 'WBAXH3C50L5304215', 35000, 1)
    ]

    cursor.executemany('''
        INSERT OR IGNORE INTO vehicles (user_id, make, model, year, color, license_plate, vin, odometer, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', vehicles)

    # Insert sample discount codes
    discounts = [
        ('WELCOME10', 'percentage', 10.00, 50.00, 100, 0, datetime.datetime(2024, 1, 1), datetime.datetime(2024, 12, 31), 1),
        ('FIRSTORDER20', 'percentage', 20.00, 100.00, 50, 0, datetime.datetime(2024, 1, 1), datetime.datetime(2024, 12, 31), 1),
        ('SUMMER50', 'fixed', 50.00, 200.00, 20, 0, datetime.datetime(2024, 6, 1), datetime.datetime(2024, 8, 31), 1)
    ]

    cursor.executemany('''
        INSERT OR IGNORE INTO discount_codes (code, discount_type, value, minimum_spend, max_uses, used_count, start_date, end_date, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', discounts)

    # Commit changes and close connection
    conn.commit()
    conn.close()

    print("AutoConcierge database created successfully!")
    print("Tables created: users, services, vehicles, appointments, service_history, notifications, admins, payment_methods, discount_codes")
    print("Sample data inserted into services, users, vehicles, and discount_codes tables")

if __name__ == "__main__":
    create_database()