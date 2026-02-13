const User = require('../models/User');
const Appointment = require('../models/Appointment');
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

  if (!user || user.role !== 'customer') {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user._id);
  res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
};

exports.register = async (req, res) => {
  try {
    const user = await User.create({
      ...req.body,
      role: 'customer'
    });

    const token = signToken(user._id);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  res.json(req.user);
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, req.body, {
      new: true,
      runValidators: true
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAppointments = async (req, res) => {
  const appointments = await Appointment.find({ customer: req.user._id }).populate('employee');
  res.json(appointments);
};

exports.createAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.create({
      ...req.body,
      customer: req.user._id
    });
    res.status(201).json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    res.json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};