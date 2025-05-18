import express from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import PatientRecord from '../models/PatientRecord.js';
import Prescription from '../models/Prescription.js';
import User from '../models/User.js';

const router = express.Router();

// Middleware: only authenticated doctors can access these routes
router.use(authenticateToken, authorizeRoles('Doctor'));

/**
 * CREATE: Add diagnosis + prescription to patient record
 */
router.post('/records/:patientId', async (req, res) => {
  try {
    const doctorId = req.user.id;
    const patientId = req.params.patientId;
    const { diagnosis, treatmentNotes, prescription } = req.body;

    // Validate patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'Patient') {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Create patient record
    const newRecord = new PatientRecord({
      doctor: doctorId,
      patient: patientId,
      diagnosis,
      treatmentNotes,
      isDraft: false
    });

    const savedRecord = await newRecord.save();

    // Optionally add prescription
    let savedPrescription = null;
    if (prescription && prescription.medications) {
      const newPrescription = new Prescription({
        recordId: savedRecord._id,
        medications: prescription.medications
      });
      savedPrescription = await newPrescription.save();
    }

    res.status(201).json({
      message: 'Record and prescription created successfully',
      record: savedRecord,
      prescription: savedPrescription
    });

  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * READ: View records of patients assigned to the doctor
 */
router.get('/patients/records', async (req, res) => {
  try {
    const doctorId = req.user.id;
    const records = await PatientRecord.find({ doctor: doctorId })
      .populate('patient', 'username email')
      .populate({
        path: 'prescription',
        model: Prescription
      });

    res.json({ records });
  } catch (error) {
    console.error('Error fetching patient records:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * UPDATE: Modify treatment notes in an existing record
 */
router.put('/records/:recordId', async (req, res) => {
  try {
    const doctorId = req.user.id;
    const recordId = req.params.recordId;
    const { treatmentNotes } = req.body;

    const record = await PatientRecord.findById(recordId);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    if (record.doctor.toString() !== doctorId) {
      return res.status(403).json({ message: 'Access denied: Not your record' });
    }

    record.treatmentNotes = treatmentNotes;
    await record.save();

    res.json({ message: 'Treatment notes updated', record });

  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * DELETE: Remove draft record (only if isDraft = true)
 */
router.delete('/records/:recordId', async (req, res) => {
  try {
    const doctorId = req.user.id;
    const recordId = req.params.recordId;

    const record = await PatientRecord.findById(recordId);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    if (record.doctor.toString() !== doctorId) {
      return res.status(403).json({ message: 'Access denied: Not your record' });
    }

    if (!record.isDraft) {
      return res.status(400).json({ message: 'Only draft records can be deleted' });
    }

    await PatientRecord.findByIdAndDelete(recordId);

    res.json({ message: 'Draft record deleted successfully' });
  } catch (error) {
    console.error('Error deleting draft record:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
