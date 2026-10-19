import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanLine, isForbiddenFile } from './secret-patterns.mjs';

const rules = (line) => scanLine(line).map((h) => h.rule);

test('flags real-looking secrets', () => {
  assert.ok(rules('MONGODB_URI=mongodb+srv://appuser:Zx81kqPw93@cluster0.ab12c.mongodb.net/db').length);
  assert.ok(rules(`JWT_SECRET=${'a1b2c3d4'.repeat(8)}`).length);
  assert.ok(rules('-----BEGIN RSA PRIVATE KEY-----').length);
  assert.ok(rules('key = AKIAIOSFODNN7ABCDEFG').length);
  assert.ok(rules('const apiKey = "sk_live_abcdefghijklmnop1234"').length);
});

test('ignores placeholders and documentation examples', () => {
  assert.equal(rules('MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/db').length, 0);
  assert.equal(rules('JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_STRING_1234567').length, 0);
  assert.equal(rules('JWT_SECRET=').length, 0);
  assert.equal(rules("const x = 'hello world'").length, 0);
});

test('never prints the secret itself', () => {
  const [hit] = scanLine('MONGODB_URI=mongodb+srv://appuser:Zx81kqPw93@cluster0.ab12c.mongodb.net/db');
  assert.ok(!hit.preview.includes('Zx81kqPw93'));
});

test('env files are forbidden except the example', () => {
  assert.equal(isForbiddenFile('backend/.env'), true);
  assert.equal(isForbiddenFile('.env.production'), true);
  assert.equal(isForbiddenFile('backend/.env.example'), false);
});

test('fake passwords in test folders are allowed, the same line elsewhere is not', () => {
  const line = "const password = 'a-long-passphrase-1';";
  assert.equal(scanLine(line, 'backend/test/auth.test.js').length, 0);
  assert.equal(scanLine(line, 'backend/src/routes/auth.js').length, 1);
});
