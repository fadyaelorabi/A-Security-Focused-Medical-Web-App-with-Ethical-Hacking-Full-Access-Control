// server.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { authenticateToken, authorizeRoles } from './middlewares/authMiddleware.js';
import { rolesPermissions } from './config/rolesPermissions.js';
import patientRoutes from './authRoutes/patientRoutes.js';
import doctorRoutes from './authRoutes/doctorRoutes.js';
import { signup, login } from './controllers/authController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Example route
app.get('/', (req, res) => {
  res.send('Welcome to Secure Health API');
});

// Auth routes
app.use('/auth/patient', patientRoutes);
app.use('/auth/doctor', doctorRoutes);

// Public signup-log route
app.post('/signup', signup);
app.post('/login', login);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
