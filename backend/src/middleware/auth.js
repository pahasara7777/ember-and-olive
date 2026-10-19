import { User } from '../models/index.js';
import { COOKIE_NAME, verifySession } from '../lib/tokens.js';
import { HttpError } from './error.js';

// Reads the session cookie and attaches req.user. Anything wrong with the cookie means "not signed in".
export async function loadUser(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  const claims = verifySession(token, req.app.locals.env);
  if (!claims) return next();
  const user = await User.findById(claims.sub).select('+passwordChangedAt');
  const revoked = user?.passwordChangedAt && claims.iat * 1000 < user.passwordChangedAt.getTime();
  if (user && user.active && !revoked) req.user = user;
  next();
}

export function requireAuth(req, res, next) {
  next(req.user ? undefined : new HttpError(401, 'Please sign in'));
}

// Checked on the server for every protected route; hiding a button in the UI is not access control.
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new HttpError(401, 'Please sign in'));
  if (!roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have access to this'));
  next();
};

export const STAFF = ['host', 'kitchen', 'manager', 'owner'];
