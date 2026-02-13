const express = require('express');
const {
  login,
  getProfile,
  updateProfile,
  getAssignedAppointments,
  updateAppointmentStatus,
  getSchedule
} = require('../controllers/employeeController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);

router.use(protect, restrictTo('employee'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/appointments', getAssignedAppointments);
router.put('/appointments/:id/status', updateAppointmentStatus);
router.get('/schedule', getSchedule);

module.exports = router;