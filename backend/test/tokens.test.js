import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { signSession, verifySession, cookieOptions } from '../src/lib/tokens.js';

const env = { JWT_SECRET: 'x'.repeat(40), NODE_ENV: 'development' };

test('a signed session verifies and carries the user id', () => {
  const claims = verifySession(signSession('64b000000000000000000001', env), env);
  assert.equal(claims.sub, '64b000000000000000000001');
});

test('tampered, wrong-secret, expired and alg=none tokens are refused', () => {
  const good = signSession('64b000000000000000000001', env);
  assert.equal(verifySession(good + 'x', env), null);
  assert.equal(verifySession(good, { ...env, JWT_SECRET: 'y'.repeat(40) }), null);
  const none = jwt.sign({ sub: 'admin' }, '', { algorithm: 'none' });
  assert.equal(verifySession(none, env), null);
  const expired = jwt.sign({}, env.JWT_SECRET, { subject: 'u', issuer: 'ember-and-olive', expiresIn: -10 });
  assert.equal(verifySession(expired, env), null);
  const wrongIssuer = jwt.sign({}, env.JWT_SECRET, { subject: 'u', issuer: 'someone-else' });
  assert.equal(verifySession(wrongIssuer, env), null);
});

test('cookie is httpOnly, SameSite=Lax and Secure in production', () => {
  assert.equal(cookieOptions(env).httpOnly, true);
  assert.equal(cookieOptions(env).sameSite, 'lax');
  assert.equal(cookieOptions(env).secure, false);
  assert.equal(cookieOptions({ ...env, NODE_ENV: 'production' }).secure, true);
});
