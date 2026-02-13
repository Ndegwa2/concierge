const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const ServicePartner = require('../models/ServicePartner');

const seedData = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/auto-concierge');
    console.log('Connected to database');

    await User.deleteMany({});
    await Appointment.deleteMany({});
    await ServicePartner.deleteMany({});

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

    const partners = await ServicePartner.create([
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

    const appointments = await Appointment.create([
      {
        customer: customer._id,
        service: 'Oil Change',
        vehicle: {
          make: 'Toyota',
          model: 'Corolla',
          year: 2018,
          licensePlate: 'KAA 123A'
        },
        appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'pending',
        notes: 'Regular oil change'
      },
      {
        customer: customer._id,
        service: 'Full Service Wash',
        vehicle: {
          make: 'Honda',
          model: 'Civic',
          year: 2020,
          licensePlate: 'KBB 456B'
        },
        appointmentDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'confirmed',
        employee: employee._id,
        notes: 'Deep cleaning'
      }
    ]);

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