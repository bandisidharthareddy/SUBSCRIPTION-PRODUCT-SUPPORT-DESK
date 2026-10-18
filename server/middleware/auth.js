export const asyncRoute = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.session || !roles.includes(req.session.role)) {
    return res.status(403).json({ error: 'Insufficient permission' });
  }
  next();
};

export const requireOrg = (req, res, next) => {
  if (!req.session || !req.session.orgId) {
    return res.status(403).json({ error: 'Customer organization scope is missing' });
  }
  next();
};
