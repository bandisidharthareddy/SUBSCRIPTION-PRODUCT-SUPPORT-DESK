import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, Organization, Membership } from '../models/index.js';
import { csrfFor, safeEqual } from '../middleware/csrf.js';

const emailSchema = z.string().email().max(254).transform(s => s.toLowerCase());
const passwordSchema = z.string().min(10).max(128);
const hashCode = code => crypto.createHash('sha256').update(String(code)).digest('hex');

export const signup = async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(80),
    email: emailSchema,
    password: passwordSchema,
    organization: z.string().min(1).max(80)
  });
  const data = schema.parse(req.body);

  const existingUser = await User.findOne({ email: data.email });
  if (existingUser) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const orgSlug = data.organization.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  let org = await Organization.findOne({ slug: orgSlug });
  if (!org) {
    org = await Organization.create({
      name: data.organization,
      slug: orgSlug
    });
  }

  const code = String(crypto.randomInt(100000, 999999));
  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await User.create({
    name: data.name,
    email: data.email,
    passwordHash,
    role: 'customer',
    orgId: org._id,
    emailVerified: false,
    verificationCodeHash: hashCode(code),
    verificationExpires: new Date(Date.now() + 15 * 60 * 1000)
  });

  await Membership.create({
    user: user._id,
    org: org._id,
    role: 'admin',
    status: 'active'
  });

  console.log(`[DEV EMAIL VERIFICATION] ${user.email}: ${code}`);
  res.status(201).json({
    message: 'Account created. Enter the verification code printed in the API console.',
    userId: user._id
  });
};

export const verifyEmail = async (req, res) => {
  const schema = z.object({
    email: emailSchema,
    code: z.string().length(6)
  });
  const { email, code } = schema.parse(req.body);

  const user = await User.findOne({ email });
  if (
    !user ||
    !user.verificationExpires ||
    user.verificationExpires < Date.now() ||
    !safeEqual(user.verificationCodeHash, hashCode(code))
  ) {
    return res.status(400).json({ error: 'Invalid or expired verification code' });
  }

  user.emailVerified = true;
  user.verificationCodeHash = undefined;
  user.verificationExpires = undefined;
  await user.save();

  res.json({ message: 'Email verified. You can log in.' });
};

export const login = async (req, res) => {
  const schema = z.object({
    email: emailSchema,
    password: z.string().min(1).max(128)
  });
  const { email, password } = schema.parse(req.body);

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.emailVerified) {
    return res.status(403).json({ error: 'Verify your email before logging in' });
  }

  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'Could not create session' });

    Object.assign(req.session, {
      userId: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      orgId: user.orgId ? String(user.orgId) : null
    });

    req.session.save(saveErr => {
      if (saveErr) return res.status(500).json({ error: 'Could not save session' });
      res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          orgId: user.orgId
        },
        csrf: csrfFor(req.sessionID)
      });
    });
  });
};

export const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('support.sid');
    res.json({ message: 'Logged out' });
  });
};

export const recovery = async (req, res) => {
  const schema = z.object({ email: emailSchema });
  const { email } = schema.parse(req.body);

  const user = await User.findOne({ email });
  if (user) {
    const code = String(crypto.randomInt(100000, 999999));
    user.resetCodeHash = hashCode(code);
    user.resetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    console.log(`[DEV PASSWORD RECOVERY] ${email}: ${code}`);
  }

  res.json({ message: 'If the account exists, a recovery code has been sent.' });
};

export const resetPassword = async (req, res) => {
  const schema = z.object({
    email: emailSchema,
    code: z.string().length(6),
    password: passwordSchema
  });
  const { email, code, password } = schema.parse(req.body);

  const user = await User.findOne({ email });
  if (
    !user ||
    !user.resetExpires ||
    user.resetExpires < Date.now() ||
    !safeEqual(user.resetCodeHash, hashCode(code))
  ) {
    return res.status(400).json({ error: 'Invalid or expired recovery code' });
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetCodeHash = undefined;
  user.resetExpires = undefined;
  await user.save();

  res.json({ message: 'Password updated' });
};

export const getMe = (req, res) => {
  const user = req.session && req.session.userId ? {
    id: req.session.userId,
    name: req.session.name,
    email: req.session.email,
    role: req.session.role,
    orgId: req.session.orgId
  } : null;

  res.json({
    user,
    csrf: csrfFor(req.sessionID)
  });
};

export const getCsrf = (req, res) => {
  res.json({ token: csrfFor(req.sessionID) });
};
