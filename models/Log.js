import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String },
  details: { type: String }
});

export default mongoose.model('Log', logSchema);
