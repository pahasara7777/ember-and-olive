// Creates the first owner account. Staff accounts can never be created through the public API.
// Usage: OWNER_EMAIL=you@example.com OWNER_NAME="Your Name" npm run create-owner
// A random password is printed once; change it after the first sign-in.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { loadEnv } from '../config/env.js';
import { connectDb } from '../config/db.js';
import { User } from '../models/index.js';
import { hashPassword } from '../lib/password.js';
import { email } from '../lib/text.js';

const env = loadEnv();
const parsed = email.safeParse(process.env.OWNER_EMAIL);
if (!parsed.success) {
  console.error('Set OWNER_EMAIL to a valid email address.');
  process.exit(1);
}

await connectDb(env.MONGODB_URI);
if (await User.exists({ role: 'owner' })) {
  console.error('An owner account already exists. Use the admin dashboard to manage staff.');
  await mongoose.disconnect();
  process.exit(1);
}

const password = randomBytes(15).toString('base64url');
await User.create({ name: process.env.OWNER_NAME || 'Owner', email: parsed.data, passwordHash: await hashPassword(password), role: 'owner' });
console.log(`Owner created: ${parsed.data}\nTemporary password (shown once): ${password}`);
await mongoose.disconnect();
