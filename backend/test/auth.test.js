import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.js';
import { HAS_DB, connectTestDb, disconnectTestDb } from './db.js';
import { User } from '../src/models/index.js';

const skip = !HAS_DB && 'set MONGODB_TEST_URI to run database tests';
const good = { name: 'Amal Perera', email: 'amal@example.com', password: 'a-long-passphrase-1' };
let app;

before(async () => { if (skip) return; await connectTestDb('auth'); app = await startApp(); });
after(async () => { if (skip) return; app.close(); await disconnectTestDb(); });

test('register creates a customer, sets a hardened cookie and never returns the hash', { skip }, async () => {
  const res = await app.call('POST', '/api/v1/auth/register', { body: good });
  assert.equal(res.status, 201);
  assert.equal(res.json.user.role, 'customer');
  assert.equal(res.json.user.passwordHash, undefined);
  const cookie = res.set.find((c) => c.startsWith('eo_session='));
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  const stored = await User.findOne({ email: good.email }).select('+passwordHash');
  assert.ok(stored.passwordHash.startsWith('scrypt$'));
  assert.ok(!stored.passwordHash.includes(good.password));
});

test('register cannot be used to choose a role or smuggle extra fields', { skip }, async () => {
  app.clearCookie();
  const res = await app.call('POST', '/api/v1/auth/register', { body: { ...good, email: 'evil@example.com', role: 'owner' } });
  assert.equal(res.status, 400);
  assert.equal(await User.countDocuments({ email: 'evil@example.com' }), 0);
});

test('weak passwords, bad emails and duplicate accounts are refused', { skip }, async () => {
  assert.equal((await app.call('POST', '/api/v1/auth/register', { body: { ...good, email: 'b@example.com', password: 'short' } })).status, 400);
  assert.equal((await app.call('POST', '/api/v1/auth/register', { body: { ...good, email: 'not-an-email' } })).status, 400);
  assert.equal((await app.call('POST', '/api/v1/auth/register', { body: good })).status, 409);
});

test('names are stripped of markup', { skip }, async () => {
  const res = await app.call('POST', '/api/v1/auth/register', { body: { ...good, email: 'xss@example.com', name: '<img src=x onerror=alert(1)>Nimal' } });
  assert.equal(res.status, 201);
  assert.equal(res.json.user.name, 'Nimal');
});

test('login works, gives the same error for unknown user and wrong password', { skip }, async () => {
  app.clearCookie();
  const wrong = await app.call('POST', '/api/v1/auth/login', { body: { email: good.email, password: 'wrong-password-1' } });
  const unknown = await app.call('POST', '/api/v1/auth/login', { body: { email: 'nobody@example.com', password: 'wrong-password-1' } });
  assert.equal(wrong.status, 401);
  assert.deepEqual(wrong.json, unknown.json);
  const ok = await app.call('POST', '/api/v1/auth/login', { body: { email: good.email, password: good.password } });
  assert.equal(ok.status, 200);
  assert.equal((await app.call('GET', '/api/v1/auth/me')).json.user.email, good.email);
});

test('logout ends the session', { skip }, async () => {
  await app.call('POST', '/api/v1/auth/logout');
  assert.equal((await app.call('GET', '/api/v1/auth/me')).status, 401);
});

test('NoSQL injection in login fails', { skip }, async () => {
  const res = await app.call('POST', '/api/v1/auth/login', { body: { email: { $gt: '' }, password: { $gt: '' } } });
  assert.equal(res.status, 400);
});

test('account locks after repeated wrong passwords, even for the right one', { skip }, async () => {
  const email = 'lock@example.com';
  await app.call('POST', '/api/v1/auth/register', { body: { ...good, email } });
  app.clearCookie();
  for (let i = 0; i < 5; i++) await app.call('POST', '/api/v1/auth/login', { body: { email, password: 'wrong-password-1' } });
  const res = await app.call('POST', '/api/v1/auth/login', { body: { email, password: good.password } });
  assert.equal(res.status, 429);
});

test('changing the password signs out other sessions', { skip }, async () => {
  const email = 'change@example.com';
  await app.call('POST', '/api/v1/auth/register', { body: { ...good, email } });
  const oldCookie = app.cookie;
  // iat has one-second resolution, so wait until the change lands in a later second
  await new Promise((r) => setTimeout(r, 1100));
  const bad = await app.call('POST', '/api/v1/auth/password', { body: { currentPassword: 'nope-nope-nope', newPassword: 'another-passphrase-2' } });
  assert.equal(bad.status, 400);
  const ok = await app.call('POST', '/api/v1/auth/password', { body: { currentPassword: good.password, newPassword: 'another-passphrase-2' } });
  assert.equal(ok.status, 200);
  assert.equal((await app.call('GET', '/api/v1/auth/me')).status, 200); // the new session still works
  app.clearCookie();
  const res = await app.call('GET', '/api/v1/auth/me', { headers: { Cookie: oldCookie } });
  assert.equal(res.status, 401);
});

test('repeated failed logins are rate limited', { skip }, async () => {
  const limited = await startApp();
  try {
    let last;
    for (let i = 0; i < 11; i++) last = await limited.call('POST', '/api/v1/auth/login', { body: { email: 'ghost@example.com', password: 'wrong-password-1' } });
    assert.equal(last.status, 429);
    assert.ok(last.headers.get('ratelimit') || last.headers.get('ratelimit-policy'));
  } finally {
    limited.close();
  }
});
