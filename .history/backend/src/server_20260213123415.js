const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/database');
const adminRoutes = require('./routes/adminRoutes');
const customerRoutes = require('./routes/customerRoutes');
const employeeRoutes = require('./routes/employeeRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/admin', adminRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/employees', employeeRoutes);

app.get('/api/health', (req, res) => {
  res.json({ message: 'Auto Concierge API is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});