import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { csrfMiddleware } from './middleware/csrf.js';
import authRoutes from './routes/authRoutes.js';

export function createApp(options = {}) {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true
  }));
  app.use(express.json({ limit: '1mb' }));

  const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/subscription_support_desk';
  const sessionStore = options.sessionStore || MongoStore.create({
    mongoUrl,
    collectionName: 'sessions',
    ttl: 60 * 60 * 8
  });

  app.use(session({
    name: 'support.sid',
    secret: process.env.SESSION_SECRET || 'dev-only-change-this-session-secret-123456',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 8 * 60 * 60 * 1000
    }
  }));

  app.use('/api', csrfMiddleware);

  // Mount feature routes
  app.use('/api', authRoutes);

  // Placeholder for subsequent route mounts (help, tickets, agent, staff)
  if (options.extraRoutes) {
    options.extraRoutes(app);
  }

  // Central error handler
  app.use((err, req, res, next) => {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: err.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
      });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export default createApp();
