import express from 'express';
import cookieParser from 'cookie-parser';
import api from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import { securityHeaders, corsPolicy, originGuard } from './middleware/security.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { rejectOperatorKeys } from './middleware/sanitize.js';
import { loadUser } from './middleware/auth.js';

export function createApp({ env }) {
  const app = express();
  app.locals.env = env;
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY); // so rate limits see the real client IP behind a proxy

  app.use(securityHeaders(env));
  app.use('/api', corsPolicy(env), apiLimiter(), originGuard(env), cookieParser(), express.json({ limit: '50kb' }), rejectOperatorKeys);

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/v1', loadUser, api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
