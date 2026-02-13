const express = require('express');
const {
  login,
  getAllUsers,
  getAllAppointments,
  getAllServicePartners,
  createUser,
  updateUser,
  deleteUser,
  createServicePartner,
  updateServicePartner,
  deleteServicePartner,
  getDashboardStats
} = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);

router.use(protect, restrictTo('admin'));

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/appointments', getAllAppointments);
router.get('/partners', getAllServicePartners);
router.post('/partners', createServicePartner);
router.put('/partners/:id', updateServicePartner);
router.delete('/partners/:id', deleteServicePartner);

module.exports = router;