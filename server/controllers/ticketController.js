import { z } from 'zod';
import * as ticketService from '../services/ticketService.js';

export const createTicket = async (req, res) => {
  const schema = z.object({
    subject: z.string().min(3).max(160),
    question: z.string().min(5).max(5000)
  });
  const { subject, question } = schema.parse(req.body);

  const ticket = await ticketService.createTicket(
    req.session.orgId,
    req.session.userId,
    subject,
    question
  );

  res.status(201).json({ ticket });
};

export const getTickets = async (req, res) => {
  const tickets = await ticketService.listTickets(req.session);
  res.json({ tickets });
};

export const getTicketById = async (req, res) => {
  const ticket = await ticketService.getScopedTicket(req.params.id, req.session);
  res.json({ ticket });
};

export const updateTicket = async (req, res) => {
  const schema = z.object({
    status: z.enum(['open', 'waiting_customer', 'in_progress', 'resolved', 'escalated']).optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional()
  });
  const patch = schema.parse(req.body);

  const ticket = await ticketService.getScopedTicket(req.params.id, req.session);
  const updated = await ticketService.updateTicketStatus(ticket, patch);
  res.json({ ticket: updated });
};

export const resolveTicket = async (req, res) => {
  const schema = z.object({
    resolution: z.string().min(10).max(4000)
  });
  const { resolution } = schema.parse(req.body);

  const ticket = await ticketService.getScopedTicket(req.params.id, req.session);
  const updated = await ticketService.resolveTicket(ticket, resolution);
  res.json({ ticket: updated });
};

export const escalateTicket = async (req, res) => {
  const schema = z.object({
    reason: z.string().min(5).max(1000)
  });
  const { reason } = schema.parse(req.body);

  const ticket = await ticketService.getScopedTicket(req.params.id, req.session);
  const updated = await ticketService.escalateTicket(ticket, reason);
  res.json({ ticket: updated });
};

export const getRelated = async (req, res) => {
  const related = await ticketService.getRelatedIssues(req.params.id, req.session);
  res.json(related);
};
