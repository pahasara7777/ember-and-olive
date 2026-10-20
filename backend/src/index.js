import 'dotenv/config';
import { loadEnv } from './config/env.js';
import { createApp } from './app.js';
import { connectDb } from './config/db.js';

const env = loadEnv(); // exits with a clear message if a secret or setting is missing or still a placeholder

await connectDb(env.MONGODB_URI);
createApp({ env }).listen(env.PORT, () => console.log(`API listening on port ${env.PORT} (${env.NODE_ENV})`));
