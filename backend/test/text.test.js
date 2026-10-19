import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, plain, email, phone, reference } from '../src/lib/text.js';

test('cleanText removes tags, brackets and control characters', () => {
  assert.equal(cleanText('<script>alert(1)</script>Hello'), 'alert(1)Hello');
  assert.equal(cleanText('<img src=x onerror=alert(1)>Table'), 'Table');
  assert.equal(cleanText('<<script>script>x'), 'scriptx');
  assert.equal(cleanText('a\u0000b\u0007c'), 'abc');
  assert.equal(cleanText('  Anniversary dinner  '), 'Anniversary dinner');
});

test('cleanText keeps normal punctuation and unicode', () => {
  assert.equal(cleanText("O'Brien & Sons – café"), "O'Brien & Sons – café");
});

test('plain enforces length after cleaning', () => {
  assert.equal(plain(5).safeParse('<b></b>').success, false);
  assert.equal(plain(5).safeParse('abcdef').success, false);
  assert.equal(plain(5).parse(' abc '), 'abc');
});

test('email, phone and reference validators', () => {
  assert.equal(email.parse('  Guest@Example.COM '), 'guest@example.com');
  assert.equal(email.safeParse('nope').success, false);
  assert.equal(phone.safeParse('+94 77 123 4567').success, true);
  assert.equal(phone.safeParse('<script>').success, false);
  assert.equal(reference.parse('eo-o-abcd234567'), 'EO-O-ABCD234567');
  assert.equal(reference.safeParse("EO-O-' OR 1=1").success, false);
});
