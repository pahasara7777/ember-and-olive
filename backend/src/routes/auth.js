import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { hashPassword, verifyPassword, burnPasswordCheck } from '../lib/password.js';
import { COOKIE_NAME, signSession, cookieOptions } from '../lib/tokens.js';
import { plain, email, phone } from '../lib/text.js';

const router = Router();

const password = z.string().min(10, 'Use at least 10 characters').max(128);
const registerBody = z.strictObject({ name: plain(80), email, phone: phone.optional(), password, marketingConsent: z.boolean().default(false) });
const loginBody = z.strictObject({ email, password: z.string().min(1).max(128) });
const changeBody = z.strictObject({ currentPassword: z.string().min(1).max(128), newPassword: password });

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, marketingConsent: u.marketingConsent?.given ?? false });

function startSession(req, res, user) {
  res.cookie(COOKIE_NAME, signSession(user.id, req.app.locals.env), cookieOptions(req.app.locals.env));
}

router.post('/register', authLimiter({ skipSuccessfulRequests: false, limit: 20 }), async (req, res) => {
  const body = registerBody.parse(req.body);
  const user = new User({
    name: body.name,
    email: body.email,
    phone: body.phone,
    passwordHash: await hashPassword(body.password),
    role: 'customer', // never taken from the request
    marketingConsent: { given: body.marketingConsent, at: body.marketingConsent ? new Date() : undefined, source: 'signup' }
  });
  try {
    await user.save();
  } catch (e) {
    if (e.code === 11000) throw new HttpError(409, 'We could not create that account');
    throw e;
  }
  startSession(req, res, user);
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', authLimiter(), async (req, res) => {
  const body = loginBody.parse(req.body);
  const user = await User.findOne({ email: body.email }).select('+passwordHash +failedLogins +lockedUntil');
  const fail = () => new HttpError(401, 'Invalid email or password');

  if (!user || !user.active) {
    await burnPasswordCheck(body.password);
    throw fail();
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) throw new HttpError(429, 'Too many failed attempts. Try again in 15 minutes.');

  if (!(await verifyPassword(body.password, user.passwordHash))) {
    user.failedLogins += 1;
    if (user.failedLogins >= MAX_FAILURES) {
      user.lockedUntil = new Date(Date.now() + LOCK_MS);
      user.failedLogins = 0;
    }
    await user.save();
    throw fail();
  }
  if (user.failedLogins || user.lockedUntil) {
    user.failedLogins = 0;
    user.lockedUntil = undefined;
    await user.save();
  }
  startSession(req, res, user);
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(req.app.locals.env), maxAge: undefined });
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.post('/password', requireAuth, authLimiter(), async (req, res) => {
  const body = changeBody.parse(req.body);
  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!(await verifyPassword(body.currentPassword, user.passwordHash))) throw new HttpError(400, 'Your current password is not correct');
  user.passwordHash = await hashPassword(body.newPassword);
  user.passwordChangedAt = new Date(); // signs out every other device
  await user.save();
  startSession(req, res, user);
  res.json({ ok: true });
});

export default router;
