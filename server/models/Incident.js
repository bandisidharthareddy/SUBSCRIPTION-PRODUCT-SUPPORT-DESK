import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  feature: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['investigating', 'identified', 'monitoring', 'resolved'],
    default: 'investigating'
  },
  severity: {
    type: String,
    enum: ['minor', 'major', 'critical'],
    default: 'minor'
  },
  summary: {
    type: String,
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  public: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

incidentSchema.index({ public: 1, status: 1 });
incidentSchema.index({ feature: 1 });

export const Incident = mongoose.model('Incident', incidentSchema);
export default Incident;
