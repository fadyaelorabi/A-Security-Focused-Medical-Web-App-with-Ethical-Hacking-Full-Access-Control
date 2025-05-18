import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  patientUsername: { type: String, required: true }, // now stores the username
  doctorUsername: { type: String, required: true },  // now stores the username
  dateTime: { type: Date, required: true },
  reason: { type: String },
  status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' }
});

export default mongoose.model('Appointment', appointmentSchema);
