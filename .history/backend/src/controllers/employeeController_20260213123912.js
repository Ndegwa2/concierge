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

  if (!user || user.role !== 'employee') {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user._id);
  res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
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

exports.getAssignedAppointments = async (req, res) => {
  const appointments = await Appointment.find({ employee: req.user._id }).populate('customer');
  res.json(appointments);
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('customer');
    res.json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getSchedule = async (req, res) => {
  const appointments = await Appointment.find({
    employee: req.user._id,
    status: { $in: ['confirmed', 'in-progress'] },
    appointmentDate: { $gte: new Date() }
  }).sort('appointmentDate');
  res.json(appointments);
};