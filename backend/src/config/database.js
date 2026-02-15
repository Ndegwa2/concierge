import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../auto-concierge.db');

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'customer', 'employee')) DEFAULT 'customer',
    phone TEXT NOT NULL,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer INTEGER NOT NULL,
    service TEXT NOT NULL,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_year INTEGER,
    vehicle_licensePlate TEXT,
    appointmentDate TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'confirmed', 'in-progress', 'completed', 'cancelled')) DEFAULT 'pending',
    employee INTEGER,
    notes TEXT,
    totalPrice REAL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (employee) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS service_partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address_street TEXT,
    address_city TEXT,
    address_state TEXT,
    address_zipCode TEXT,
    address_country TEXT,
    services TEXT,
    rating REAL DEFAULT 0,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const connectDB = () => {
  console.log(`SQLite Connected: ${dbPath}`);
};

export default db;
export { connectDB };