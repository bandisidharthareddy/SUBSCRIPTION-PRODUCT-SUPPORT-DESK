import express from 'express';
import { asyncRoute, requireAuth } from '../middleware/auth.js';
import { loginLimiter, recoveryLimiter } from '../middleware/rateLimit.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

router.get('/csrf', authController.getCsrf);
router.get('/me', authController.getMe);
router.post('/auth/signup', asyncRoute(authController.signup));
router.post('/auth/verify-email', asyncRoute(authController.verifyEmail));
router.post('/auth/login', loginLimiter, asyncRoute(authController.login));
router.post('/auth/logout', requireAuth, authController.logout);
router.post('/auth/recovery', recoveryLimiter, asyncRoute(authController.recovery));
router.post('/auth/reset-password', asyncRoute(authController.resetPassword));

export default router;
