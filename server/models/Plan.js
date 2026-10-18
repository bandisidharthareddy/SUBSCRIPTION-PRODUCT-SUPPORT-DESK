import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  limits: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  features: {
    type: [String],
    default: []
  }
}, { timestamps: true });

export const Plan = mongoose.model('Plan', planSchema);
export default Plan;
