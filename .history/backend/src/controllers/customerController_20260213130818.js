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

  if (!user || user.role !== 'customer') {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isMatch = await User.comparePassword(password, user.password);

  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
};

export const register = async (req, res) => {
  try {
    const user = await User.create({
      ...req.body,
      role: 'customer'
    });

    const token = signToken(user.id);
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
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

export const getAppointments = async (req, res) => {
  const customerId = req.user.id;
  const appointments = Appointment.find({ customer: customerId });
  
  // Add employee info
  const appointmentsWithPopulate = appointments.map(apt => {
    const employee = apt.employee ? User.findById(apt.employee) : null;
    return {
      ...apt,
      employee: employee || null
    };
  });
  
  res.json(appointmentsWithPopulate);
};

export const createAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.create({
      ...req.body,
      customer: req.user.id
    });
    res.status(201).json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const appointment = Appointment.findByIdAndUpdate(
      parseInt(req.params.id),
      { status: 'cancelled' }
    );
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};