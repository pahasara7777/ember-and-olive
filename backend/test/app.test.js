import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

// Runs without a database: checks routing, the 404 handler and the placeholder 501s.
test('API skeleton responds', async () => {
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true });

    assert.equal((await fetch(`${base}/api/v1/orders`, { method: 'POST' })).status, 501);
    assert.equal((await fetch(`${base}/api/v1/nope`)).status, 404);
  } finally {
    server.close();
  }
});
