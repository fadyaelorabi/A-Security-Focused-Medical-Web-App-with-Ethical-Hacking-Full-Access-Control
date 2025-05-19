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

/*
// Create user
router.post('/users', async (req, res) => {
  const newUser = new User(req.body);
  await newUser.save();
  res.status(201).json(newUser);
});*/

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error updating user' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});



// PATIENT RECORDS – Full CRUD
// Get all patient records
router.get('/records', async (req, res) => {
  try {
    const records = await PatientRecord.find()
      .populate('patientId', 'username email name')  // pick only the fields you need
      .populate('doctorId', 'username email name')   // optional: show doctor info too
      .populate('prescriptions');                    // get prescription data

    res.json({ records });
  } catch (error) {
    console.error('Error fetching all patient records:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Get single patient record
router.get('/records/:id', async (req, res) => {
  const record = await PatientRecord.findById(req.params.id).populate('doctorId patientId prescriptions');
  if (!record) return res.status(404).json({ message: 'Record not found' });
  res.json(record);
});

// Create new patient record
router.post('/records', async (req, res) => {
  try {
    const newRecord = new PatientRecord(req.body);
    await newRecord.save();
    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Error creating patient record:', error);
    res.status(500).json({ message: 'Server error creating patient record' });
  }
});

// Update patient record
router.put('/records/:id', async (req, res) => {
  try {
    const updated = await PatientRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Patient record not found' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating patient record:', error);
    res.status(500).json({ message: 'Server error updating patient record' });
  }
});

// Delete record
router.delete('/records/:id', async (req, res) => {
  try {
    const deleted = await PatientRecord.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Patient record not found' });
    }
    res.json({ message: 'Record deleted' });
  } catch (error) {
    console.error('Error deleting patient record:', error);
    res.status(500).json({ message: 'Server error deleting patient record' });
  }
});


//PRESCRIPTIONS –  Full CRUD
// Get all prescriptions
router.get('/prescriptions', async (req, res) => {
  try {
    const prescriptions = await Prescription.find()
      .populate({
        path: 'recordId',
        populate: [
          { path: 'doctorId', select: 'username email name' },
          { path: 'patientId', select: 'username email name' }
        ]
      });
    res.json(prescriptions);
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({ message: 'Server error fetching prescriptions' });
  }
});

// Get one prescription by ID
router.get('/prescriptions/:id', async (req, res) => {
  try {
    // Prescriptions themselves don't have doctorId/patientId directly; they link to PatientRecord via recordId.
    const pres = await Prescription.findById(req.params.id)
      .populate({
        path: 'recordId',
        populate: [
          { path: 'doctorId', select: 'username email name' },
          { path: 'patientId', select: 'username email name' }
        ]
      });
    if (!pres) return res.status(404).json({ message: 'Prescription not found' });
    res.json(pres);
  } catch (error) {
    console.error('Error fetching prescription:', error);
    res.status(500).json({ message: 'Server error fetching prescription' });
  }
});

// Create prescription
router.post('/prescriptions', async (req, res) => {
  try {
    const newPres = new Prescription(req.body);
    await newPres.save();
    res.status(201).json(newPres);
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({ message: 'Server error creating prescription' });
  }
});

// Update prescription
router.put('/prescriptions/:id', async (req, res) => {
  try {
    const updated = await Prescription.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Prescription not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating prescription:', error);
    res.status(500).json({ message: 'Server error updating prescription' });
  }
});

// Delete prescription
router.delete('/prescriptions/:id', async (req, res) => {
  try {
    const deleted = await Prescription.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Prescription not found' });
    res.json({ message: 'Prescription deleted' });
  } catch (error) {
    console.error('Error deleting prescription:', error);
    res.status(500).json({ message: 'Server error deleting prescription' });
  }
});



/**
 * 6. View Logs for Suspicious Activity
 */
router.get('/logs', async (req, res) => {
  const logs = await Log.find().sort({ createdAt: -1 }).limit(100); // latest 100 logs
  res.json(logs);
});

export default router;