import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['customer', 'specialist', 'knowledge_manager', 'supervisor'],
    default: 'customer'
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationCodeHash: String,
  verificationExpires: Date,
  resetCodeHash: String,
  resetExpires: Date
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
export default User;
