import { Ticket, Assignment, User, Incident } from '../models/index.js';

export async function getScopedTicket(ticketId, sessionUser) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    const error = new Error('Ticket not found');
    error.status = 404;
    throw error;
  }

  const role = sessionUser?.role;
  const uid = String(sessionUser?.userId);
  const userOrg = String(sessionUser?.orgId || '');

  if (role === 'customer') {
    if (String(ticket.createdBy) !== uid || String(ticket.orgId) !== userOrg) {
      const error = new Error('Ticket not found');
      error.status = 404;
      throw error;
    }
  } else if (role === 'specialist') {
    if (String(ticket.assignedTo) !== uid) {
      const error = new Error('Ticket not found');
      error.status = 404;
      throw error;
    }
  } else if (!['supervisor', 'knowledge_manager'].includes(role)) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }

  return ticket;
}

export async function createTicket(orgId, userId, subject, question) {
  const lowerText = `${subject} ${question}`.toLowerCase();
  let feature = '';
  if (lowerText.includes('export')) feature = 'export';
  else if (lowerText.includes('login')) feature = 'login';
  else if (lowerText.includes('report')) feature = 'reports';

  let relatedIncidentIds = [];
  if (feature) {
    const matchingIncidents = await Incident.find({
      public: true,
      feature: new RegExp(feature, 'i'),
      status: { $in: ['investigating', 'identified', 'monitoring'] }
    }).select('_id');
    relatedIncidentIds = matchingIncidents.map(i => i._id);
  }

  return Ticket.create({
    orgId,
    createdBy: userId,
    subject,
    question,
    status: 'open',
    priority: 'normal',
    relatedIncidentIds,
    conversation: [
      {
        role: 'customer',
        content: question,
        createdAt: new Date()
      }
    ]
  });
}

export async function listTickets(sessionUser) {
  let filter = {};
  if (sessionUser.role === 'customer') {
    filter = { createdBy: sessionUser.userId, orgId: sessionUser.orgId };
  } else if (sessionUser.role === 'specialist') {
    filter = { assignedTo: sessionUser.userId };
  } else if (['supervisor', 'knowledge_manager'].includes(sessionUser.role)) {
    filter = {};
  } else {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }

  return Ticket.find(filter)
    .sort({ updatedAt: -1 })
    .limit(100)
    .select('-conversation -checks');
}

export async function updateTicketStatus(ticket, patch) {
  if (patch.status) ticket.status = patch.status;
  if (patch.priority) ticket.priority = patch.priority;
  await ticket.save();
  return ticket;
}

export async function resolveTicket(ticket, resolution) {
  ticket.resolution = resolution;
  ticket.status = 'resolved';
  await ticket.save();
  return ticket;
}

export async function escalateTicket(ticket, reason) {
  ticket.status = 'escalated';
  ticket.escalationReason = reason;
  await ticket.save();
  return ticket;
}

export async function assignTicket(ticketId, specialistId, supervisorId) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    const error = new Error('Ticket not found');
    error.status = 404;
    throw error;
  }

  const specialist = await User.findById(specialistId);
  if (!specialist || specialist.role !== 'specialist') {
    const error = new Error('Choose a valid specialist');
    error.status = 400;
    throw error;
  }

  ticket.assignedTo = specialist._id;
  await ticket.save();

  await Assignment.create({
    ticketId: ticket._id,
    specialistId: specialist._id,
    assignedBy: supervisorId,
    active: true
  });

  return ticket;
}

export async function getRelatedIssues(ticketId, sessionUser) {
  const ticket = await getScopedTicket(ticketId, sessionUser);

  // Fetch populated active incidents
  const incidents = await Incident.find({
    _id: { $in: ticket.relatedIncidentIds }
  }).select('title feature status severity summary updatedAt');

  // Correlate similar tickets while sanitizing all PII / customer conversation (GROUP-02)
  const keywords = ticket.subject.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const regexQuery = keywords.length > 0 ? keywords.join('|') : ticket.subject;

  const candidateTickets = await Ticket.find({
    _id: { $ne: ticket._id },
    subject: { $regex: regexQuery, $options: 'i' }
  })
  .select('_id subject status createdAt')
  .limit(5);

  return {
    ticketId: ticket._id,
    incidents,
    relatedTickets: candidateTickets.map(t => ({
      id: t._id,
      subject: t.subject,
      status: t.status,
      createdAt: t.createdAt
    }))
  };
}
