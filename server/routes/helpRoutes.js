import express from 'express';
import { asyncRoute, requireAuth, requireRole } from '../middleware/auth.js';
import * as helpController from '../controllers/helpController.js';

const router = express.Router();

// Public routes
router.get('/help', asyncRoute(helpController.getHelpArticles));
router.get('/status', asyncRoute(helpController.getStatus));

// Knowledge Manager protected routes
router.get('/help-drafts', requireAuth, requireRole('knowledge_manager'), asyncRoute(helpController.getHelpDrafts));
router.post('/help-drafts', requireAuth, requireRole('knowledge_manager'), asyncRoute(helpController.createHelpDraft));
router.post('/help-drafts/:id/publish', requireAuth, requireRole('knowledge_manager'), asyncRoute(helpController.publishHelpDraft));

export default router;
