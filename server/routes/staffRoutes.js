import express from 'express';
import { asyncRoute, requireAuth, requireRole } from '../middleware/auth.js';
import * as staffController from '../controllers/staffController.js';

const router = express.Router();

router.post('/tickets/:id/assignment', requireAuth, requireRole('supervisor'), asyncRoute(staffController.assignTicket));
router.get('/specialists', requireAuth, requireRole('supervisor'), asyncRoute(staffController.getSpecialists));

export default router;
