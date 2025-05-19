import express from 'express';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';  // Adjust path
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import Prescription from '../models/Prescription.js';
import PatientRecord from '../models/PatientRecord.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// Protect all routes: user must be authenticated and have Patient role
router.use(authenticateToken, authorizeRoles('Patient'));

// Create: Book an appointment
router.post('/appointments', async (req, res) => {
  try {
    console.log('req.user:', req.user);

    const patientUsername = req.user.username;
    const patientId = req.user.id;
    const { doctorUsername, dateTime, reason } = req.body;

    // Validate doctor exists and is a doctor
    const doctor = await User.findOne({ username: doctorUsername, role: 'Doctor' });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const newAppointment = new Appointment({
      patientId,
      patientUsername,
      doctorId: doctor._id,
      doctorUsername,
      dateTime,
      reason
    });

    await newAppointment.save();

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: newAppointment
    });
  } catch (err) {
    console.error('Error booking appointment:', err);
    res.status(500).json({ message: 'Server error booking appointment' });
  }
});


// Read: View own profile
router.get('/profile', async (req, res) => {
  try {
    const patientId = req.user.id;

    // Fetch user profile
    const user = await User.findById(patientId).select('-password -twoFASecret');

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Step 1: Find all patient records for this user
    const records = await PatientRecord.find({ patient: patientId });

    // Step 2: Extract their IDs
    const recordIds = records.map(record => record._id);

    // Step 3: Find prescriptions tied to those records
    const prescriptions = await Prescription.find({ recordId: { $in: recordIds } });

    res.json({
      profile: user,
      prescriptions
    });
  } catch (err) {
    console.error('Error fetching profile and prescriptions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Read: View own prescriptions
  router.get('/prescriptions', authenticateToken, authorizeRoles('Patient'), async (req, res) => {
    const patientId = req.user.id;

    try {
      // 1. Find all record IDs for the logged-in patient
      const records = await PatientRecord.find({ patientId }).select('_id doctorId');
      const recordIds = records.map(record => record._id);
      const doctorMap = new Map(records.map(record => [record._id.toString(), record.doctorId]));
  
      // 2. Fetch prescriptions linked to those records
      const prescriptions = await Prescription.find({ recordId: { $in: recordIds } });
  
      // 3. Optionally, include doctor username and email
      const uniqueDoctorIds = [...new Set(records.map(r => r.doctorId.toString()))];
      const doctors = await User.find({ _id: { $in: uniqueDoctorIds } }).select('username email');
      const doctorInfoMap = new Map(doctors.map(doc => [doc._id.toString(), doc]));
  
      // 4. Attach doctor info to each prescription
      const prescriptionsWithDoctor = prescriptions.map(pres => {
        const doctorId = doctorMap.get(pres.recordId.toString());
        const doctor = doctorInfoMap.get(doctorId?.toString());
        return {
          ...pres.toObject(),
          doctor: doctor ? {
            username: doctor.username,
            email: doctor.email
          } : null
        };
      });
  
      res.json({ prescriptions: prescriptionsWithDoctor });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching prescriptions' });
    }
  });


// Update: Edit contact info and password
  router.put('/profile', async (req, res) => {
    try {
      const userId = req.user.id;
      const { email, phone, address, oldPassword, newPassword } = req.body;

      // Find the user
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Update contact info if provided
      if (email) user.email = email;
      if (phone) user.phone = phone;
      if (address) user.address = address;

      // If user wants to change password, validate old password and update
      if (newPassword) {
        if (!oldPassword) {
          return res.status(400).json({ message: 'Old password is required to change password' });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
          return res.status(401).json({ message: 'Old password is incorrect' });
        }

        // Hash new password and save
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;
      }

      await user.save();

      res.json({ message: 'Profile updated successfully' });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error updating profile' });
    }
  });


// Delete: Cancel an appointment
router.delete('/appointments/:appointmentId', async (req, res) => {
  try {
    const patientId = req.user.id;
    const appointmentId = req.params.appointmentId;

    // Find appointment by ID
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if appointment belongs to the logged-in patient
    if (appointment.patientUsername !== req.user.username) {
      return res.status(403).json({ message: 'Access denied: You can only cancel your own appointments' });
    }

    // Delete appointment
    await Appointment.findByIdAndDelete(appointmentId);

    res.json({ message: `Appointment ${appointmentId} canceled successfully` });

  } catch (error) {
    console.error('Error canceling appointment:', error);
    res.status(500).json({ message: 'Server error canceling appointment' });
  }
});


export default router;
