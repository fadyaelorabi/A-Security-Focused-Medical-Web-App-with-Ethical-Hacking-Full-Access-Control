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

    // 1. Validate patient exists and is of role "Patient"
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'Patient') {
      return res.status(404).json({ message: 'Patient not found or not a valid patient role' });
    }

    // 2. Normalize diagnosis and treatmentNotes to arrays if not already
    const diagnosesArray = Array.isArray(diagnosis) ? diagnosis : [diagnosis];
    const notesArray = Array.isArray(treatmentNotes) ? treatmentNotes : [treatmentNotes];

    // 3. Create Patient Record
    const newRecord = new PatientRecord({
      doctorId,
      patientId,
      diagnoses: diagnosesArray,
      notes: notesArray
    });

    const savedRecord = await newRecord.save();

    // 4. Create Prescription (if provided)
    let savedPrescription = null;
    if (prescription?.medication) {
      const newPrescription = new Prescription({
        recordId: savedRecord._id,
        medication: prescription.medication,
        dosage: prescription.dosage,
        instructions: prescription.instructions
      });
      savedPrescription = await newPrescription.save();

      savedRecord.prescriptions.push(savedPrescription._id);
      await savedRecord.save();
    }

    // 5. Return success response with patient username
    res.status(201).json({
      message: 'Record and prescription created successfully',
      patientUsername: patient.username,
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
  
      const records = await PatientRecord.find({ doctorId: doctorId })
        .populate('patientId', 'username email')
        .populate('prescriptions'); // populates array of Prescription documents
  
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
      let { treatmentNotes } = req.body;
  
      const record = await PatientRecord.findById(recordId);
      if (!record) return res.status(404).json({ message: 'Record not found' });
  
      if (record.doctorId.toString() !== doctorId) {
        return res.status(403).json({ message: 'Access denied: Not your record' });
      }
  
      // Normalize treatmentNotes to array if it isn't
      treatmentNotes = Array.isArray(treatmentNotes) ? treatmentNotes : [treatmentNotes];
  
      record.notes = treatmentNotes;  // update the 'notes' field
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

    if (record.doctorId.toString() !== doctorId) {
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
