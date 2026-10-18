import mongoose from 'mongoose';

const toolRunSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    default: null,
    index: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  tool: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'incomplete'],
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  durationMs: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

export const ToolRun = mongoose.model('ToolRun', toolRunSchema);
export default ToolRun;
