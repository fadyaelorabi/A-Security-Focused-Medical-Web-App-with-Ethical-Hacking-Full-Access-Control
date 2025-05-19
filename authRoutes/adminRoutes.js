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
  const userId = req.params.id;
  const { role } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log(`Role update failed: User with ID ${userId} not found`);
      return res.status(404).json({ message: 'User not found' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Log the role update action
    await Log.create({
      action: 'Role Update',
      userId: user._id,
      details: `Role changed from ${oldRole} to ${role} for user ${user.username}`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      timestamp: new Date()
    });

    res.json({ message: 'User role updated' });
  } catch (error) {
    console.error(`Error updating role for UserID=${userId}:`, error);
    res.status(500).json({ message: 'Server error updating user role' });
  }
});


/**
 * 3. Enable/Disable User Account
 */
router.put('/users/:id/status', async (req, res) => {
  const { isActive } = req.body; // true or false
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldStatus = user.isActive;
    user.isActive = isActive;
    await user.save();

    // Log the status change
    await Log.create({
      action: 'Account Status Update',
      userId: user._id,
      details: `Account status changed from ${oldStatus ? 'Active' : 'Inactive'} to ${isActive ? 'Active' : 'Inactive'} for user ${user.username}`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      timestamp: new Date()
    });

    res.json({ isActive: user.isActive });

  } catch (error) {
    console.error(`Error updating status for UserID=${userId}:`, error);
    res.status(500).json({ message: 'Server error updating user status' });
  }
});


/**
 * 4. DELETE User
 */
router.delete('/users/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    // Log the deletion
    await Log.create({
      action: 'User Deletion',
      userId: user._id,
      details: `User ${user.username} (ID: ${user._id}) was deleted`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      timestamp: new Date()
    });

    res.json({ message: 'User deleted' });

  } catch (error) {
    console.error(`Error deleting user with UserID=${userId}:`, error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
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
//test from hereeeeeeeeeeeeeee
// Update user
// Update user (PUT)
router.put('/users/:id', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log the update
    await Log.create({
      userId: req.user?._id, // or however you get the acting user
      action: `Updated user ${req.params.id}`,
      ipAddress: getIp(req),
      details: JSON.stringify(req.body),
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Server error updating user' });
  }
});

// Delete user (DELETE)
router.delete('/users/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log the deletion
    await Log.create({
      userId: req.user?._id,
      action: `Deleted user ${req.params.id}`,
      ipAddress: getIp(req),
      details: null,
    });

    return res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Server error deleting user' });
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

/// Create patient record (POST)
router.post('/records', async (req, res) => {
  try {
    const newRecord = new PatientRecord(req.body);
    await newRecord.save();

    await Log.create({
      userId: req.user?._id,
      action: `Created patient record ${newRecord._id}`,
      ipAddress: getIp(req),
      details: JSON.stringify(req.body),
    });

    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Error creating patient record:', error);
    res.status(500).json({ message: 'Server error creating patient record' });
  }
});

// Update patient record (PUT)
router.put('/records/:id', async (req, res) => {
  try {
    const updated = await PatientRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Patient record not found' });
    }

    await Log.create({
      userId: req.user?._id,
      action: `Updated patient record ${req.params.id}`,
      ipAddress: getIp(req),
      details: JSON.stringify(req.body),
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating patient record:', error);
    res.status(500).json({ message: 'Server error updating patient record' });
  }
});

// Delete patient record (DELETE)
router.delete('/records/:id', async (req, res) => {
  try {
    const deleted = await PatientRecord.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Patient record not found' });
    }

    await Log.create({
      userId: req.user?._id,
      action: `Deleted patient record ${req.params.id}`,
      ipAddress: getIp(req),
      details: null,
    });

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

// Create prescription (POST)
router.post('/prescriptions', async (req, res) => {
  try {
    const newPres = new Prescription(req.body);
    await newPres.save();

    await Log.create({
      userId: req.user?._id,
      action: `Created prescription ${newPres._id}`,
      ipAddress: getIp(req),
      details: JSON.stringify(req.body),
    });

    res.status(201).json(newPres);
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({ message: 'Server error creating prescription' });
  }
});

// Update prescription (PUT)
router.put('/prescriptions/:id', async (req, res) => {
  try {
    const updated = await Prescription.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Prescription not found' });

    await Log.create({
      userId: req.user?._id,
      action: `Updated prescription ${req.params.id}`,
      ipAddress: getIp(req),
      details: JSON.stringify(req.body),
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating prescription:', error);
    res.status(500).json({ message: 'Server error updating prescription' });
  }
});

// Delete prescription (DELETE)
router.delete('/prescriptions/:id', async (req, res) => {
  try {
    const deleted = await Prescription.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Prescription not found' });

    await Log.create({
      userId: req.user?._id,
      action: `Deleted prescription ${req.params.id}`,
      ipAddress: getIp(req),
      details: null,
    });

    res.json({ message: 'Prescription deleted' });
  } catch (error) {
    console.error('Error deleting prescription:', error);
    res.status(500).json({ message: 'Server error deleting prescription' });
  }
});



export default router;