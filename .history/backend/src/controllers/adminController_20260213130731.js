import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import ServicePartner from '../models/ServicePartner.js';
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

  if (!user || user.role !== 'admin') {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isMatch = await User.comparePassword(password, user.password);

  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
};

export const getAllUsers = async (req, res) => {
  const users = User.find();
  res.json(users);
};

export const getAllAppointments = async (req, res) => {
  const appointments = Appointment.find();
  // Add customer and employee info
  const appointmentsWithPopulate = appointments.map(apt => {
    const customer = User.findById(apt.customer);
    const employee = apt.employee ? User.findById(apt.employee) : null;
    return {
      ...apt,
      customer: customer || null,
      employee: employee || null
    };
  });
  res.json(appointmentsWithPopulate);
};

export const getAllServicePartners = async (req, res) => {
  const partners = ServicePartner.find();
  // Parse services JSON
  const partnersWithParse = partners.map(p => ({
    ...p,
    services: p.services ? JSON.parse(p.services) : []
  }));
  res.json(partnersWithParse);
};

export const createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = User.findByIdAndUpdate(parseInt(req.params.id), req.body);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    User.findByIdAndDelete(parseInt(req.params.id));
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const createServicePartner = async (req, res) => {
  try {
    const partner = await ServicePartner.create(req.body);
    res.status(201).json(partner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateServicePartner = async (req, res) => {
  try {
    const partner = ServicePartner.findByIdAndUpdate(parseInt(req.params.id), req.body);
    if (!partner) {
      return res.status(404).json({ message: 'Service partner not found' });
    }
    res.json(partner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteServicePartner = async (req, res) => {
  try {
    ServicePartner.findByIdAndDelete(parseInt(req.params.id));
    res.json({ message: 'Service partner deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  const totalUsers = User.countDocuments();
  const totalAppointments = Appointment.countDocuments();
  const totalPartners = ServicePartner.countDocuments();
  const pendingAppointments = Appointment.countDocuments({ status: 'pending' });
  const completedAppointments = Appointment.countDocuments({ status: 'completed' });

  res.json({
    totalUsers,
    totalAppointments,
    totalPartners,
    pendingAppointments,
    completedAppointments
  });
};