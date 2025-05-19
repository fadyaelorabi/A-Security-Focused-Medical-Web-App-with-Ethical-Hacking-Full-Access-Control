import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientUsername: { type: String, required: true }, // now stores the username
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorUsername: { type: String, required: true },  // now stores the username
  dateTime: { type: Date, required: true },
  reason: { type: String },
  status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' }
});

export default mongoose.model('Appointment', appointmentSchema);
