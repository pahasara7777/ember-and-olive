import 'dotenv/config';
import { loadEnv } from './config/env.js';
import { createApp } from './app.js';
import { connectDb } from './config/db.js';

const env = loadEnv(); // exits with a clear message if a secret or setting is missing or still a placeholder
const onVercel = Boolean(process.env.VERCEL);
// On Vercel the website is a separate service, so the API serves no static files.
const app = createApp({ env, ...(onVercel && { staticDir: null }) });

if (!onVercel) {
  await connectDb(env.MONGODB_URI);
  app.listen(env.PORT, () => console.log(`API listening on port ${env.PORT} (${env.NODE_ENV})`));
}

// Serverless entry: connect once per warm instance; a failed attempt is retried on the next request.
let db;
const ready = () => (db ??= connectDb(env.MONGODB_URI).catch((e) => { db = null; throw e; }));

export default async function handler(req, res) {
  try { await ready(); } catch { return res.status(503).json({ error: 'Database unavailable' }); }
  // shortcut: the service may strip the /api prefix, so put it back; drop this once confirmed it is kept.
  if (!req.url.startsWith('/api')) req.url = `/api${req.url}`;
  return app(req, res);
}
