const User = require('../models/User');
const Appointment = require('../models/Appointment');
const ServicePartner = require('../models/ServicePartner');
const jwt = require('jsonwebtoken');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || user.role !== 'admin') {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user._id);
  res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
};

exports.getAllUsers = async (req, res) => {
  const users = await User.find();
  res.json(users);
};

exports.getAllAppointments = async (req, res) => {
  const appointments = await Appointment.find().populate('customer').populate('employee');
  res.json(appointments);
};

exports.getAllServicePartners = async (req, res) => {
  const partners = await ServicePartner.find();
  res.json(partners);
};

exports.createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.createServicePartner = async (req, res) => {
  try {
    const partner = await ServicePartner.create(req.body);
    res.status(201).json(partner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateServicePartner = async (req, res) => {
  try {
    const partner = await ServicePartner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    res.json(partner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteServicePartner = async (req, res) => {
  try {
    await ServicePartner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Service partner deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalAppointments = await Appointment.countDocuments();
  const totalPartners = await ServicePartner.countDocuments();
  const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
  const completedAppointments = await Appointment.countDocuments({ status: 'completed' });

  res.json({
    totalUsers,
    totalAppointments,
    totalPartners,
    pendingAppointments,
    completedAppointments
  });
};