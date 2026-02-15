import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { connectDB } from './config/database.js';
import adminRoutes from './routes/adminRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';

// Load appropriate env file based on NODE_ENV
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
} else {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Production: Trust proxy for secure connections
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

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