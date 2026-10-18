import { z } from 'zod';
import { Ticket, ToolRun } from '../models/index.js';
import * as agentService from '../services/agentService.js';

export const supportChat = async (req, res) => {
  const schema = z.object({
    question: z.string().min(5).max(5000),
    version: z.string().max(30).optional()
  });
  const { question, version } = schema.parse(req.body);

  if (!req.session.orgId) {
    return res.status(403).json({ error: 'Customer organization scope is missing' });
  }

  const result = await agentService.answerSupport(question, req.session.orgId, null, version || '1.0');
  res.json(result);
};

export const supportAgent = async (req, res) => {
  const schema = z.object({
    question: z.string().min(5).max(5000),
    ticketId: z.string().optional(),
    version: z.string().max(30).optional()
  });
  const { question, ticketId, version } = schema.parse(req.body);

  let ticket = null;
  if (ticketId) {
    ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    // Scope check
    if (req.session.role === 'customer') {
      if (String(ticket.createdBy) !== req.session.userId || String(ticket.orgId) !== String(req.session.orgId)) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
    } else if (req.session.role === 'specialist') {
      if (String(ticket.assignedTo) !== req.session.userId) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
    }
  }

  const targetOrgId = req.session.role === 'customer' ? req.session.orgId : ticket?.orgId;
  if (!targetOrgId) {
    return res.status(400).json({ error: 'A ticket is required for staff investigation' });
  }

  const result = await agentService.answerSupport(question, targetOrgId, ticket, version || '1.0');

  if (ticket) {
    ticket.checks = result.checks;
    ticket.conversation.push({
      role: 'assistant',
      content: result.answer,
      citations: result.citations
    });
    await ticket.save();
  }

  res.json({
    ...result,
    ticketId: ticket ? String(ticket._id) : null
  });
};

export const getToolRuns = async (req, res) => {
  const ticketId = String(req.query.ticketId || '');
  if (!ticketId) {
    return res.status(400).json({ error: 'ticketId required' });
  }

  const runs = await ToolRun.find({ ticketId })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('tool status summary durationMs createdAt');

  res.json({ runs });
};
