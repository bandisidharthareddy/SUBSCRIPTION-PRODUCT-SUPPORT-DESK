import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  org: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['member', 'admin', 'billing'],
    default: 'member'
  },
  status: {
    type: String,
    enum: ['active', 'invited', 'suspended'],
    default: 'active'
  }
}, { timestamps: true });

membershipSchema.index({ user: 1, org: 1 }, { unique: true });

export const Membership = mongoose.model('Membership', membershipSchema);
export default Membership;
