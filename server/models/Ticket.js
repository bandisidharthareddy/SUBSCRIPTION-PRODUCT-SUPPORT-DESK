import mongoose from 'mongoose';

const conversationMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['customer', 'assistant', 'specialist', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  citations: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const ticketSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160
  },
  question: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'waiting_customer', 'in_progress', 'resolved', 'escalated'],
    default: 'open',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  conversation: {
    type: [conversationMessageSchema],
    default: []
  },
  checks: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  resolution: {
    type: String,
    default: null
  },
  escalationReason: {
    type: String,
    default: null
  },
  relatedIncidentIds: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident'
    }],
    default: []
  }
}, { timestamps: true });

ticketSchema.index({ orgId: 1, createdBy: 1 });

export const Ticket = mongoose.model('Ticket', ticketSchema);
export default Ticket;
