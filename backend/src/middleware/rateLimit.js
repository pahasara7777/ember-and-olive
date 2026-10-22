import { rateLimit } from 'express-rate-limit';

const make = (opts) =>
  rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { message: 'Too many requests. Please wait a moment and try again.' } },
    // shortcut: in-memory counters reset on restart and are per-instance, move to a shared store if you run several API servers
    ...opts
  });

// Whole API, per IP.
// Signed-in staff screens (kitchen board, floor, orders) poll every few seconds, and a whole restaurant shares one IP, so /admin is not counted here; it needs a session anyway.
export const apiLimiter = (opts = {}) => make({ windowMs: 15 * 60 * 1000, limit: 300, skip: (req) => req.path.startsWith('/v1/admin'), ...opts });
// Sign-in and sign-up: only failures count, so real customers are not locked out by their own successes.
export const authLimiter = (opts = {}) => make({ windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true, ...opts });
// Public forms that create records or send mail (reservations, orders, enquiries, reviews).
export const formLimiter = (opts = {}) => make({ windowMs: 60 * 60 * 1000, limit: 30, ...opts });
// Looking up an order or reservation by reference: slows anyone trying to guess references.
export const lookupLimiter = (opts = {}) => make({ windowMs: 15 * 60 * 1000, limit: 60, ...opts });
