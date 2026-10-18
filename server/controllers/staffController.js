import { z } from 'zod';
import { User } from '../models/index.js';
import * as ticketService from '../services/ticketService.js';

export const assignTicket = async (req, res) => {
  const schema = z.object({
    specialistId: z.string().min(1)
  });
  const { specialistId } = schema.parse(req.body);

  const ticket = await ticketService.assignTicket(
    req.params.id,
    specialistId,
    req.session.userId
  );

  res.json({ ticket });
};

export const getSpecialists = async (req, res) => {
  const specialists = await User.find({ role: 'specialist' }).select('name email');
  res.json({ specialists });
};
