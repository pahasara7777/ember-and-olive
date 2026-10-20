// Vercel serverless entry: the same Express app, with the website served by Vercel's CDN instead of Express.
import { loadEnv } from '../backend/src/config/env.js';
import { createApp } from '../backend/src/app.js';
import { connectDb } from '../backend/src/config/db.js';

const env = loadEnv();
const app = createApp({ env, staticDir: null });
// Connect once per warm instance; a failed attempt is retried on the next request.
let db;
const ready = () => (db ??= connectDb(env.MONGODB_URI).catch((e) => { db = null; throw e; }));

export default async function handler(req, res) {
  try { await ready(); } catch { return res.status(503).json({ error: 'Database unavailable' }); }
  return app(req, res);
}
