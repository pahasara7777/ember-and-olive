import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.js';
import { HAS_DB, connectTestDb, disconnectTestDb } from './db.js';
import { MenuCategory, MenuItem, Order } from '../src/models/index.js';

const skip = !HAS_DB && 'set MONGODB_TEST_URI to run database tests';
let app, hummus, bass, soldOut;

const customer = { name: 'Amal Perera', email: 'amal@example.com', phone: '+94 77 123 4567' };
const pickup = (lines, extra = {}) => ({ customer, fulfillment: 'pickup', paymentMethod: 'cash-pickup', lines, ...extra });

before(async () => {
  if (skip) return;
  await connectTestDb('orders');
  const cat = await MenuCategory.create({ name: 'Mezze', slug: 'mezze' });
  const base = { category: cat._id, channels: ['pickup', 'delivery'] };
  hummus = await MenuItem.create({ ...base, name: 'Ember Hummus', slug: 'hummus', priceCents: 145000 });
  bass = await MenuItem.create({ ...base, name: 'Sea Bass', slug: 'sea-bass', priceCents: 485000 });
  soldOut = await MenuItem.create({ ...base, name: 'Panna Cotta', slug: 'panna', priceCents: 125000, availability: 'sold-out' });
  app = await startApp();
});
after(async () => { if (skip) return; app.close(); await disconnectTestDb(); });

test('menu endpoint lists dishes without internal fields', { skip }, async () => {
  const res = await app.call('GET', '/api/v1/menu');
  assert.equal(res.status, 200);
  assert.equal(res.json.items.length, 3);
  assert.equal(res.json.items[0].updatedBy, undefined);
  assert.equal(res.json.items[0].archived, undefined);
  assert.equal((await app.call('GET', '/api/v1/menu/hummus')).json.name, 'Ember Hummus');
  assert.equal((await app.call('GET', '/api/v1/menu/does-not-exist')).status, 404);
});

test('a guest can place a pickup order and the server sets the prices', { skip }, async () => {
  const res = await app.call('POST', '/api/v1/orders', { body: pickup([{ menuItem: String(hummus._id), quantity: 2 }]) });
  assert.equal(res.status, 201);
  assert.match(res.json.order.reference, /^EO-O-[A-Z0-9]{10}$/);
  assert.equal(res.json.order.totals.totalCents, 290000);
  assert.equal(res.json.order.status, 'placed');
});

test('client-supplied prices and totals are rejected, not trusted', { skip }, async () => {
  const lines = [{ menuItem: String(hummus._id), quantity: 1, priceCents: 1 }];
  assert.equal((await app.call('POST', '/api/v1/orders', { body: pickup(lines) })).status, 400);
  assert.equal((await app.call('POST', '/api/v1/orders', { body: { ...pickup([{ menuItem: String(hummus._id), quantity: 1 }]), totals: { totalCents: 1 } } })).status, 400);
});

test('invalid quantities, sold-out dishes and unknown dishes are refused', { skip }, async () => {
  const h = String(hummus._id);
  assert.equal((await app.call('POST', '/api/v1/orders', { body: pickup([{ menuItem: h, quantity: 0 }]) })).status, 400);
  assert.equal((await app.call('POST', '/api/v1/orders', { body: pickup([{ menuItem: h, quantity: -3 }]) })).status, 400);
  assert.equal((await app.call('POST', '/api/v1/orders', { body: pickup([{ menuItem: String(soldOut._id), quantity: 1 }]) })).status, 409);
  assert.equal((await app.call('POST', '/api/v1/orders', { body: pickup([{ menuItem: '64b000000000000000000001', quantity: 1 }]) })).status, 400);
});

test('delivery needs an address, the minimum spend, and adds the fee', { skip }, async () => {
  const b = String(bass._id);
  const delivery = { recipientName: 'Amal', line1: '12 Flower Road, Colombo 07' };
  const noAddr = await app.call('POST', '/api/v1/orders', { body: { customer, fulfillment: 'delivery', paymentMethod: 'cash-delivery', lines: [{ menuItem: b, quantity: 1 }] } });
  assert.equal(noAddr.status, 400);
  const ok = await app.call('POST', '/api/v1/orders', { body: { customer, fulfillment: 'delivery', paymentMethod: 'cash-delivery', delivery, lines: [{ menuItem: b, quantity: 1 }] } });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.order.totals.deliveryFeeCents, 35000);
  assert.equal(ok.json.order.totals.totalCents, 485000 + 35000);
  const low = await app.call('POST', '/api/v1/orders', { body: { customer, fulfillment: 'delivery', paymentMethod: 'cash-delivery', delivery, lines: [{ menuItem: String(hummus._id), quantity: 1 }] } });
  assert.equal(low.status, 400);
});

test('card payments are not accepted until a payment provider is wired in', { skip }, async () => {
  const res = await app.call('POST', '/api/v1/orders', { body: { ...pickup([{ menuItem: String(hummus._id), quantity: 1 }]), paymentMethod: 'card' } });
  assert.equal(res.status, 400);
});

test('the same idempotency key never creates two orders', { skip }, async () => {
  const body = pickup([{ menuItem: String(hummus._id), quantity: 1 }], { idempotencyKey: 'order-key-12345678' });
  const before = await Order.countDocuments();
  const first = await app.call('POST', '/api/v1/orders', { body });
  const second = await app.call('POST', '/api/v1/orders', { body });
  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(first.json.order.reference, second.json.order.reference);
  assert.equal(await Order.countDocuments(), before + 1);
  const other = await app.call('POST', '/api/v1/orders', { body: { ...body, customer: { ...customer, email: 'someone@else.com' } } });
  assert.equal(other.status, 409);
});

test('tracking by reference hides contact details and rejects bad references', { skip }, async () => {
  const created = await app.call('POST', '/api/v1/orders', { body: pickup([{ menuItem: String(hummus._id), quantity: 1 }]) });
  const ref = created.json.order.reference;
  const res = await app.call('GET', `/api/v1/orders/${ref}`);
  assert.equal(res.status, 200);
  const text = JSON.stringify(res.json);
  assert.ok(!text.includes('amal@example.com'));
  assert.ok(!text.includes('+94 77'));
  assert.equal(res.json.order.firstName, 'Amal');
  assert.equal((await app.call('GET', '/api/v1/orders/EO-O-AAAAAAAAAA')).status, 404);
  assert.equal((await app.call('GET', "/api/v1/orders/' OR '1'='1")).status, 404);
});

test('script tags in notes are stripped before storage', { skip }, async () => {
  const res = await app.call('POST', '/api/v1/orders', { body: pickup([{ menuItem: String(hummus._id), quantity: 1, notes: '<script>alert(1)</script>no onions' }], { notes: '<b onmouseover=x>hi</b>' }) });
  assert.equal(res.status, 201);
  const stored = await Order.findOne({ reference: res.json.order.reference });
  assert.equal(stored.lines[0].notes, 'alert(1)no onions');
  assert.equal(stored.notes, 'hi');
});
