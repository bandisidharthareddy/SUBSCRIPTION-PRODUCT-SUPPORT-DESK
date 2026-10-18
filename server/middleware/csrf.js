import crypto from 'node:crypto';

const getCsrfSecret = () => process.env.CSRF_SECRET || 'dev-only-change-this-csrf-secret-123456';

export const csrfFor = sid => {
  if (!sid) return '';
  return crypto.createHmac('sha256', getCsrfSecret()).update(String(sid)).digest('hex');
};

export const safeEqual = (a, b) => {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};

export const csrfMiddleware = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!req.session || !req.session.userId) return next();
  
  const token = req.get('x-csrf-token');
  if (!safeEqual(token, csrfFor(req.sessionID))) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  next();
};
