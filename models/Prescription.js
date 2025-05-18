import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientRecord', required: true },
  medication: { type: String, required: true },
  dosage: { type: String },
  instructions: { type: String }
});

export default mongoose.model('Prescription', prescriptionSchema);
