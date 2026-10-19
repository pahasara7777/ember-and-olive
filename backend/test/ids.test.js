import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newReference } from '../src/lib/ids.js';
import { reference } from '../src/lib/text.js';

test('references match the validator and do not repeat', () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const r = newReference('O');
    assert.equal(reference.safeParse(r).success, true);
    seen.add(r);
  }
  assert.equal(seen.size, 2000);
});
