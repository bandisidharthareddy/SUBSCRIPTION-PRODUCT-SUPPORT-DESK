import mongoose from 'mongoose';

const entitlementSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  feature: {
    type: String,
    required: true
  },
  allowed: {
    type: Boolean,
    default: false
  },
  limit: {
    type: Number,
    default: 0
  },
  used: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

entitlementSchema.index({ orgId: 1, feature: 1 }, { unique: true });

export const Entitlement = mongoose.model('Entitlement', entitlementSchema);
export default Entitlement;
