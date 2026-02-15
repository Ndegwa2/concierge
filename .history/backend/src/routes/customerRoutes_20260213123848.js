const express = require('express');
const {
  login,
  register,
  getProfile,
  updateProfile,
  getAppointments,
  createAppointment,
  cancelAppointment
} = require('../controllers/customerController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/register', register);

router.use(protect, restrictTo('customer'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/appointments', getAppointments);
router.post('/appointments', createAppointment);
router.put('/appointments/:id/cancel', cancelAppointment);

module.exports = router;