import express from 'express';
import User from '../models/User.js';
import PatientRecord from '../models/PatientRecord.js';
import Prescription from '../models/Prescription.js';
import Log from '../models/Log.js'; // assuming you store logs in DB
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authorizeAdmin } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Secure all routes: only Admins allowed
router.use(authenticateToken, authorizeAdmin);

/**
 * 1. GET All Users
 */
router.get('/users', async (req, res) => {
  const users = await User.find().select('-password'); // exclude password
  res.json(users);
});

/**
 * 2. UPDATE User Role / Permissions
 */
router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  await User.findByIdAndUpdate(req.params.id, { role });
  res.json({ message: 'User role updated' });
});

/**
 * 3. Enable/Disable User Account
 */
router.put('/users/:id/status', async (req, res) => {
  const { isActive } = req.body; // true or false

  // Update and return the updated user document
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true } // return updated document
  );

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ isActive: user.isActive });
});


/**
 * 4. DELETE User
 */
router.delete('/users/:id', async (req, res) => {
  const deletedUser = await User.findByIdAndDelete(req.params.id);
  if (!deletedUser) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ message: 'User deleted' });
});

/**
 * 5. Full CRUD on all data 

 */
//USERS – Full CRUD
// Get all users (Read)
router.get('/users', async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

// Get single user
router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// Create user
router.post('/users', async (req, res) => {
  const newUser = new User(req.body);
  await newUser.save();
  res.status(201).json(newUser);
});

// Update user (e.g., role, email, etc.)
router.put('/users/:id', async (req, res) => {
  const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updatedUser);
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
});


// PATIENT RECORDS – Full CRUD
// Get all patient records
router.get('/records', async (req, res) => {
  const records = await PatientRecord.find().populate('doctorId patientId prescriptions');
  res.json(records);
});

// Get single patient record
router.get('/records/:id', async (req, res) => {
  const record = await PatientRecord.findById(req.params.id).populate('doctorId patientId prescriptions');
  if (!record) return res.status(404).json({ message: 'Record not found' });
  res.json(record);
});

// Create new patient record
router.post('/records', async (req, res) => {
  const newRecord = new PatientRecord(req.body);
  await newRecord.save();
  res.status(201).json(newRecord);
});

// Update patient record
router.put('/records/:id', async (req, res) => {
  const updated = await PatientRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

// Delete record
router.delete('/records/:id', async (req, res) => {
  await PatientRecord.findByIdAndDelete(req.params.id);
  res.json({ message: 'Record deleted' });
});

//PRESCRIPTIONS –  Full CRUD
// Get all prescriptions
router.get('/prescriptions', async (req, res) => {
  const prescriptions = await Prescription.find().populate('doctorId patientId');
  res.json(prescriptions);
});

// Get one
router.get('/prescriptions/:id', async (req, res) => {
  const pres = await Prescription.findById(req.params.id).populate('doctorId patientId');
  res.json(pres);
});

// Create
router.post('/prescriptions', async (req, res) => {
  const newPres = new Prescription(req.body);
  await newPres.save();
  res.status(201).json(newPres);
});

// Update
router.put('/prescriptions/:id', async (req, res) => {
  const updated = await Prescription.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

// Delete
router.delete('/prescriptions/:id', async (req, res) => {
  await Prescription.findByIdAndDelete(req.params.id);
  res.json({ message: 'Prescription deleted' });
});


/**
 * 6. View Logs for Suspicious Activity
 */
router.get('/logs', async (req, res) => {
  const logs = await Log.find().sort({ createdAt: -1 }).limit(100); // latest 100 logs
  res.json(logs);
});

export default router;