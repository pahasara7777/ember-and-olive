// Creates one sample staff account per role (manager, host, kitchen, marketing) for local testing.
// Usage: npm run create-staff --workspace @ember-olive/backend
// Existing emails are left alone. Passwords are random, printed once, and only their hashes are stored.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { loadEnv } from '../config/env.js';
import { connectDb } from '../config/db.js';
import { User } from '../models/index.js';
import { hashPassword } from '../lib/password.js';

const ROLES = ['manager', 'host', 'kitchen', 'marketing'];

await connectDb(loadEnv().MONGODB_URI);
for (const role of ROLES) {
  const email = `${role}@example.com`;
  if (await User.exists({ email })) {
    console.log(`${role}: ${email} already exists, skipped`);
    continue;
  }
  const password = randomBytes(12).toString('base64url');
  await User.create({ name: `${role[0].toUpperCase()}${role.slice(1)} Staff`, email, passwordHash: await hashPassword(password), role });
  console.log(`${role}: ${email}  password: ${password}`);
}
await mongoose.disconnect();
