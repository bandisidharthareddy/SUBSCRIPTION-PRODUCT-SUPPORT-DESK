import express from 'express';
import { asyncRoute, requireAuth, requireRole } from '../middleware/auth.js';
import * as agentController from '../controllers/agentController.js';

const router = express.Router();

router.post('/support-chat', requireAuth, asyncRoute(agentController.supportChat));
router.post('/support-agent', requireAuth, requireRole('customer', 'specialist', 'supervisor'), asyncRoute(agentController.supportAgent));
router.get('/tool-runs', requireAuth, requireRole('specialist', 'supervisor'), asyncRoute(agentController.getToolRuns));

export default router;
