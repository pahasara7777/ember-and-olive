import helmet from 'helmet';
import cors from 'cors';
import { HttpError } from './error.js';

export function securityHeaders(env) {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        styleSrcAttr: ["'unsafe-inline'"], // React inline style props only; no inline <style> or scripts
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null
      }
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' }
  });
}

// Only the configured website origins may call the API from a browser.
export function corsPolicy(env) {
  const allowed = new Set(env.CLIENT_ORIGIN);
  return cors({
    origin: (origin, cb) => cb(null, !origin || allowed.has(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    maxAge: 600
  });
}

// CSRF defence in depth: a state-changing request from a browser must come from our own site.
export function originGuard(env) {
  const allowed = new Set(env.CLIENT_ORIGIN);
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    // Same host as the one being called is our own site (a cross-site forgery always carries the attacker's origin).
    const sameHost = origin && new URL(origin).host === (req.get('x-forwarded-host') ?? req.get('host'));
    if (origin && !allowed.has(origin) && !sameHost) return next(new HttpError(403, 'Request origin not allowed'));
    next();
  };
}
