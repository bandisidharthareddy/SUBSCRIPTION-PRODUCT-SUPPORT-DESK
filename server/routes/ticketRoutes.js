import express from 'express';
import { asyncRoute, requireAuth, requireRole } from '../middleware/auth.js';
import * as ticketController from '../controllers/ticketController.js';

const router = express.Router();

router.post('/tickets', requireAuth, requireRole('customer'), asyncRoute(ticketController.createTicket));
router.get('/tickets', requireAuth, asyncRoute(ticketController.getTickets));
router.get('/tickets/:id', requireAuth, asyncRoute(ticketController.getTicketById));
router.patch('/tickets/:id', requireAuth, requireRole('specialist', 'supervisor'), asyncRoute(ticketController.updateTicket));
router.post('/tickets/:id/resolution', requireAuth, requireRole('specialist', 'supervisor'), asyncRoute(ticketController.resolveTicket));
router.post('/tickets/:id/escalation', requireAuth, requireRole('customer', 'specialist', 'supervisor'), asyncRoute(ticketController.escalateTicket));
router.get('/tickets/:id/related', requireAuth, asyncRoute(ticketController.getRelated));

export default router;
