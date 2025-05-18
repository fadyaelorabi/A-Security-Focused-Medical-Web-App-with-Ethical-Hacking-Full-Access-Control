import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['Admin', 'Doctor', 'Patient'], required: true },
  isActive: { type: Boolean, default: true },
  twoFAEnabled: { type: Boolean, default: false },
  twoFASecret: { type: String },
  contactInfo: {
    phone: String,
    address: String
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
