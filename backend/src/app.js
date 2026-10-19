import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import api from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import { securityHeaders, corsPolicy, originGuard } from './middleware/security.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { rejectOperatorKeys } from './middleware/sanitize.js';
import { loadUser } from './middleware/auth.js';

const DEFAULT_STATIC_DIR = fileURLToPath(new URL('../../frontend/dist', import.meta.url));

// staticDir: in production the API also serves the built website, so the site and API share one origin
// (which is what lets the SameSite session cookie work without loosening CORS).
export function createApp({ env, staticDir = env.NODE_ENV === 'production' ? DEFAULT_STATIC_DIR : null }) {
  const app = express();
  app.locals.env = env;
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY); // so rate limits see the real client IP behind a proxy

  app.use(securityHeaders(env));
  app.use('/api', corsPolicy(env), apiLimiter(), originGuard(env), cookieParser(), express.json({ limit: '50kb' }), rejectOperatorKeys);

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/v1', loadUser, api);

  if (staticDir) {
    app.use(express.static(staticDir, { dotfiles: 'deny', index: false, maxAge: '1h' }));
    // Single-page app fallback. Dotfile paths (/.env, /.git/config) are never answered with the app shell.
    app.get(/^(?!\/api\/)(?!.*\/\.)\//, (req, res) => res.sendFile('index.html', { root: staticDir, dotfiles: 'deny' }));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
