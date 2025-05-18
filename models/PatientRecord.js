import mongoose from 'mongoose';

const patientRecordSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  diagnoses: [{ type: String }], // should be encrypted before save
  notes: [{ type: String }],     // should be encrypted before save
  prescriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('PatientRecord', patientRecordSchema);
