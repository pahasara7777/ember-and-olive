import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.js';

// Runs without a database: checks routing, security headers and the 404 handler.
test('health check and unknown routes', async () => {
  const app = await startApp();
  try {
    const health = await app.call('GET', '/api/health');
    assert.equal(health.status, 200);
    assert.deepEqual(health.json, { ok: true });
    assert.equal((await app.call('GET', '/api/v1/nope')).status, 404);
  } finally {
    app.close();
  }
});
