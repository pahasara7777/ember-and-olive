import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.js';

let app;
before(async () => { app = await startApp(); });
after(() => app.close());

test('security headers are set and the server does not advertise Express', async () => {
  const res = await app.call('GET', '/api/health');
  const h = res.headers;
  assert.match(h.get('content-security-policy'), /default-src 'self'/);
  assert.match(h.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(h.get('content-security-policy'), /object-src 'none'/);
  assert.equal(h.get('x-content-type-options'), 'nosniff');
  assert.ok(h.get('strict-transport-security'));
  assert.equal(h.get('x-powered-by'), null);
  assert.ok(h.get('referrer-policy'));
});

test('CORS only allows the configured website origin', async () => {
  const ok = await app.call('GET', '/api/health', { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal(ok.headers.get('access-control-allow-credentials'), 'true');
  const evil = await app.call('GET', '/api/health', { headers: { Origin: 'https://evil.example' } });
  assert.equal(evil.headers.get('access-control-allow-origin'), null);
});

test('state-changing requests from another origin are refused', async () => {
  const res = await app.call('POST', '/api/v1/orders', { body: {}, headers: { Origin: 'https://evil.example' } });
  assert.equal(res.status, 403);
});

test('NoSQL operator keys and prototype pollution are rejected', async () => {
  const op = await app.call('POST', '/api/v1/orders', { body: { email: { $ne: null } } });
  assert.equal(op.status, 400);
  const proto = await app.call('POST', '/api/v1/orders', { body: '{"__proto__":{"role":"owner"}}' });
  assert.equal(proto.status, 400);
  const q = await app.call('GET', '/api/v1/menu?slug[$ne]=x');
  assert.equal(q.status, 400);
});

test('malformed JSON gets a clean 400 and oversized bodies a 413', async () => {
  const bad = await app.call('POST', '/api/v1/orders', { body: '{not json' });
  assert.equal(bad.status, 400);
  assert.deepEqual(bad.json, { error: { message: 'Malformed JSON' } });
  const big = await app.call('POST', '/api/v1/orders', { body: JSON.stringify({ x: 'a'.repeat(60_000) }) });
  assert.equal(big.status, 413);
});

test('errors do not leak stack traces or file paths', async () => {
  const res = await app.call('POST', '/api/v1/orders', { body: '{not json' });
  assert.ok(!JSON.stringify(res.json).includes('node_modules'));
  assert.ok(!JSON.stringify(res.json).includes('at '));
});
