import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import jwt from 'jsonwebtoken';

const signToken = (id) => {
  return jwt.sign({ id: id.toString() }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  const user = await User.findOne({ email });

  if (!user || user.role !== 'employee') {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isMatch = await User.comparePassword(password, user.password);

  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
};

export const getProfile = async (req, res) => {
  res.json(req.user);
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = User.findByIdAndUpdate(userId, req.body);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAssignedAppointments = async (req, res) => {
  const employeeId = req.user.id;
  const appointments = Appointment.find({ employee: employeeId });
  
  // Add customer info
  const appointmentsWithPopulate = appointments.map(apt => {
    const customer = User.findById(apt.customer);
    return {
      ...apt,
      customer: customer || null
    };
  });
  
  res.json(appointmentsWithPopulate);
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const appointmentId = parseInt(req.params.id);
    
    const appointment = Appointment.findByIdAndUpdate(appointmentId, { status });
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Add customer info
    const customer = User.findById(appointment.customer);
    res.json({
      ...appointment,
      customer: customer || null
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getSchedule = async (req, res) => {
  const employeeId = req.user.id;
  const today = new Date().toISOString();
  
  const appointments = Appointment.find({ 
    employee: employeeId,
    status: { $in: ['confirmed', 'in-progress'] }
  });
  
  // Filter for future appointments and sort
  const futureAppointments = appointments
    .filter(apt => new Date(apt.appointmentDate) >= new Date(today))
    .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
  
  res.json(futureAppointments);
};