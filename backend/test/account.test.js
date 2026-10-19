import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.js';
import { HAS_DB, connectTestDb, disconnectTestDb } from './db.js';
import { MenuCategory, MenuItem, User } from '../src/models/index.js';

const skip = !HAS_DB && 'set MONGODB_TEST_URI to run database tests';
let alice, bob, hummus;

const reg = (a, email, name) => a.call('POST', '/api/v1/auth/register', { body: { name, email, password: 'a-long-passphrase-1' } });
const order = (a) => a.call('POST', '/api/v1/orders', { body: { customer: { name: 'X Y', email: 'x@example.com', phone: '0771234567' }, fulfillment: 'pickup', paymentMethod: 'cash-pickup', lines: [{ menuItem: String(hummus._id), quantity: 1 }] } });

before(async () => {
  if (skip) return;
  await connectTestDb('account');
  const cat = await MenuCategory.create({ name: 'Mezze', slug: 'mezze' });
  hummus = await MenuItem.create({ category: cat._id, name: 'Hummus', slug: 'hummus', priceCents: 145000 });
  alice = await startApp();
  bob = await startApp();
  await reg(alice, 'alice@example.com', 'Alice A');
  await reg(bob, 'bob@example.com', 'Bob B');
});
after(async () => { if (skip) return; alice.close(); bob.close(); await disconnectTestDb(); });

test('account routes require sign-in', { skip }, async () => {
  const anon = await startApp();
  try {
    for (const path of ['/account/orders', '/account/reservations', '/auth/me']) assert.equal((await anon.call('GET', `/api/v1${path}`)).status, 401);
    assert.equal((await anon.call('PATCH', '/api/v1/account/profile', { body: { name: 'x' } })).status, 401);
  } finally {
    anon.close();
  }
});

test('customers only ever see their own orders', { skip }, async () => {
  const mine = (await order(alice)).json.order.reference;
  const theirs = (await order(bob)).json.order.reference;
  const aliceOrders = (await alice.call('GET', '/api/v1/account/orders')).json.orders.map((o) => o.reference);
  assert.deepEqual(aliceOrders, [mine]);
  assert.ok(!aliceOrders.includes(theirs));
});

test('profile edits cannot change role, email or active flag', { skip }, async () => {
  assert.equal((await alice.call('PATCH', '/api/v1/account/profile', { body: { role: 'owner' } })).status, 400);
  assert.equal((await alice.call('PATCH', '/api/v1/account/profile', { body: { email: 'new@example.com' } })).status, 400);
  const ok = await alice.call('PATCH', '/api/v1/account/profile', { body: { name: '<b>Alice</b> Silva', marketingConsent: true } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.user.name, 'Alice Silva');
  assert.equal((await User.findOne({ email: 'alice@example.com' })).role, 'customer');
});
