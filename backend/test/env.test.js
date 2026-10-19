import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadEnv } from '../src/config/env.js';

const good = {
  MONGODB_URI: 'mongodb+srv://u:p@cluster.example.mongodb.net/db',
  CLIENT_ORIGIN: 'http://localhost:5173',
  JWT_SECRET: 'a'.repeat(40)
};

test('accepts a valid environment and applies defaults', () => {
  const env = loadEnv(good);
  assert.equal(env.PORT, 5000);
  assert.deepEqual(env.CLIENT_ORIGIN, ['http://localhost:5173']);
  assert.equal(env.TIMEZONE, 'Asia/Colombo');
});

test('rejects a missing database URI', () => {
  assert.throws(() => loadEnv({ ...good, MONGODB_URI: undefined }), /MONGODB_URI/);
});

test('rejects short and placeholder JWT secrets', () => {
  assert.throws(() => loadEnv({ ...good, JWT_SECRET: 'short' }), /JWT_SECRET/);
  assert.throws(() => loadEnv({ ...good, JWT_SECRET: 'REPLACE_WITH_A_LONG_RANDOM_STRING_1234567' }), /placeholder/);
});

test('requires https origins in production', () => {
  assert.throws(() => loadEnv({ ...good, NODE_ENV: 'production' }), /https/);
  assert.doesNotThrow(() => loadEnv({ ...good, NODE_ENV: 'production', CLIENT_ORIGIN: 'https://emberandolive.lk' }));
});

test('error messages never contain the secret values', () => {
  try {
    loadEnv({ ...good, JWT_SECRET: 'tooshort-but-secret-ish' });
  } catch (e) {
    assert.ok(!e.message.includes('tooshort-but-secret-ish'));
  }
});
