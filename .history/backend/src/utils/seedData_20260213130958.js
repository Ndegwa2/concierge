import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import ServicePartner from '../models/ServicePartner.js';

const seedData = async () => {
  try {
    // Clear existing data
    db.exec('DELETE FROM appointments');
    db.exec('DELETE FROM service_partners');
    db.exec('DELETE FROM users');
    
    console.log('Connected to SQLite database');
    console.log('Cleared existing data');

    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@autoconcierge.com',
      password: adminPassword,
      role: 'admin',
      phone: '+254712345678'
    });

    const employeePassword = await bcrypt.hash('employee123', 12);
    const employee = await User.create({
      name: 'John Doe',
      email: 'john@autoconcierge.com',
      password: employeePassword,
      role: 'employee',
      phone: '+254723456789'
    });

    const customerPassword = await bcrypt.hash('customer123', 12);
    const customer = await User.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: customerPassword,
      role: 'customer',
      phone: '+254734567890'
    });

    await ServicePartner.createMany([
      {
        name: 'Quick Fix Auto Service',
        contact: {
          name: 'Mike Johnson',
          email: 'mike@quickfix.com',
          phone: '+254745678901'
        },
        address: {
          street: '123 Main Street',
          city: 'Nairobi',
          state: 'Nairobi',
          zipCode: '00100',
          country: 'Kenya'
        },
        services: ['Oil Change', 'Tire Rotation', 'Brake Repair'],
        rating: 4.5
      },
      {
        name: 'Premium Car Wash',
        contact: {
          name: 'Sarah Williams',
          email: 'sarah@premiumcarwash.com',
          phone: '+254756789012'
        },
        address: {
          street: '456 Oak Avenue',
          city: 'Nairobi',
          state: 'Nairobi',
          zipCode: '00100',
          country: 'Kenya'
        },
        services: ['Full Service Wash', 'Interior Cleaning', 'Waxing'],
        rating: 4.8
      }
    ]);

    await Appointment.create({
      customer: customer.id,
      service: 'Oil Change',
      vehicle: {
        make: 'Toyota',
        model: 'Corolla',
        year: 2018,
        licensePlate: 'KAA 123A'
      },
      appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      notes: 'Regular oil change'
    });

    await Appointment.create({
      customer: customer.id,
      service: 'Full Service Wash',
      vehicle: {
        make: 'Honda',
        model: 'Civic',
        year: 2020,
        licensePlate: 'KBB 456B'
      },
      appointmentDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'confirmed',
      employee: employee.id,
      notes: 'Deep cleaning'
    });

    console.log('Data seeded successfully!');
    console.log('Admin login:', { email: 'admin@autoconcierge.com', password: 'admin123' });
    console.log('Employee login:', { email: 'john@autoconcierge.com', password: 'employee123' });
    console.log('Customer login:', { email: 'jane@example.com', password: 'customer123' });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();