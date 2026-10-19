import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import { testEnv } from './helpers.js';

let dir, server, base;

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'eo-static-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Ember</title>');
  writeFileSync(join(dir, '.env'), 'JWT_SECRET=super-secret-value');
  mkdirSync(join(dir, '.git'));
  writeFileSync(join(dir, '.git', 'config'), 'secret-git-config');
  server = createApp({ env: testEnv(), staticDir: dir }).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); rmSync(dir, { recursive: true, force: true }); });

test('the app shell is served for site routes', async () => {
  const res = await fetch(`${base}/menu`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Ember/);
});

test('dotfiles and hidden folders are never served', async () => {
  for (const path of ['/.env', '/.git/config']) {
    const res = await fetch(`${base}${path}`);
    const text = await res.text();
    assert.ok(!text.includes('super-secret-value') && !text.includes('secret-git-config'), path);
    assert.notEqual(res.status, 200, path);
  }
  // Traversal attempts may get the harmless app shell, but never a file from outside the folder.
  for (const path of ['/%2e%2e/%2e%2e/etc/passwd', '/..%2f..%2fetc/passwd']) {
    const text = await (await fetch(`${base}${path}`)).text();
    assert.ok(!text.includes('root:'), path);
  }
});

test('unknown API paths stay JSON 404s, not the app shell', async () => {
  const res = await fetch(`${base}/api/v1/nope`);
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /json/);
});
