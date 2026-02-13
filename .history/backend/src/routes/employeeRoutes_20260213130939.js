import express from 'express';
import {
  login,
  getProfile,
  updateProfile,
  getAssignedAppointments,
  updateAppointmentStatus,
  getSchedule
} from '../controllers/employeeController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);

router.use(protect, restrictTo('employee'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/appointments', getAssignedAppointments);
router.put('/appointments/:id/status', updateAppointmentStatus);
router.get('/schedule', getSchedule);

export default router;