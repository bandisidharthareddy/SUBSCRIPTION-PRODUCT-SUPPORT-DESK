import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    default: null
  }
}, { timestamps: true });

export const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
