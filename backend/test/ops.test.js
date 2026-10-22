import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.js';
import { HAS_DB, connectTestDb, disconnectTestDb } from './db.js';
import { hashPassword } from '../src/lib/password.js';
import { DiningTable, MenuCategory, MenuItem, User } from '../src/models/index.js';

const skip = !HAS_DB && 'set MONGODB_TEST_URI to run database tests';
const PASSWORD = 'a-long-passphrase-1';
const c = {};
let hummus;

async function signedIn(role) {
  await User.create({ name: `${role} person`, email: `${role}@example.com`, passwordHash: await hashPassword(PASSWORD), role });
  const client = await startApp();
  assert.equal((await client.call('POST', '/api/v1/auth/login', { body: { email: `${role}@example.com`, password: PASSWORD } })).status, 200);
  return client;
}
const A = '/api/v1/admin';

before(async () => {
  if (skip) return;
  await connectTestDb('ops');
  for (const role of ['customer', 'host', 'kitchen', 'marketing', 'manager', 'owner']) c[role] = await signedIn(role);
  const cat = await MenuCategory.create({ name: 'Mezze', slug: 'mezze' });
  hummus = await MenuItem.create({ category: cat._id, name: 'Hummus', slug: 'hummus', priceCents: 145000 });
  await DiningTable.create({ label: 'T1', seats: 4 });
});
after(async () => { if (skip) return; Object.values(c).forEach((x) => x.close()); await disconnectTestDb(); });

const sale = (client, extra = {}) => client.call('POST', `${A}/pos/orders`, { body: { fulfillment: 'dine-in', table: 'T1', paymentMethod: 'cash', tenderedCents: 400000, lines: [{ menuItem: String(hummus._id), quantity: 2 }], ...extra } });

test('settings: floor staff can read, only the owner changes, and the service charge follows them', { skip }, async () => {
  assert.equal((await c.host.call('GET', `${A}/settings`)).json.settings.servicePct, 10);
  assert.equal((await c.manager.call('PATCH', `${A}/settings`, { body: { servicePct: 5 } })).status, 403);
  assert.equal((await c.owner.call('PATCH', `${A}/settings`, { body: { servicePct: 5 } })).status, 200);
  const res = await sale(c.host, { serviceCharge: true });
  assert.equal(res.json.order.totals.serviceChargeCents, 14500); // 5% of 2,900
  await c.owner.call('PATCH', `${A}/settings`, { body: { servicePct: 10 } });
});

test('floor shows a table occupied while it has an open tab; kitchen board lists the ticket', { skip }, async () => {
  const tab = await sale(c.host, { payLater: true });
  const floor = (await c.host.call('GET', `${A}/floor`)).json.tables;
  assert.equal(floor.find((t) => t.label === 'T1').state, 'occupied');
  assert.equal((await c.kitchen.call('GET', `${A}/kitchen`)).json.orders.some((o) => o._id === tab.json.order._id), true);
  assert.equal((await c.marketing.call('GET', `${A}/kitchen`)).status, 403);
});

test('refunds are manager-only, capped at what was paid, and reported', { skip }, async () => {
  const paid = (await sale(c.host)).json.order; // 2,900 cash
  const url = `${A}/orders/${paid._id}/refund`;
  assert.equal((await c.host.call('POST', url, { body: { reason: 'wrong dish' } })).status, 403);
  assert.equal((await c.manager.call('POST', url, { body: { reason: 'too much', amountCents: 999999999 } })).status, 400);
  const part = await c.manager.call('POST', url, { body: { reason: 'cold soup', amountCents: 100000 } });
  assert.equal(part.json.order.payment.status, 'partially-refunded');
  const rest = await c.manager.call('POST', url, { body: { reason: 'void' } });
  assert.equal(rest.json.order.payment.status, 'refunded');
  assert.equal((await c.manager.call('POST', url, { body: { reason: 'again' } })).status, 409);
});

test('end-of-day report counts cash kept and records the drawer variance', { skip }, async () => {
  await sale(c.host); // 2,900 in cash, kept
  const rep = await c.manager.call('GET', `${A}/report`);
  assert.equal(rep.status, 200);
  assert.equal(rep.json.cashCents > 0, true);
  assert.equal(rep.json.topDishes[0].name, 'Hummus');
  assert.equal((await c.host.call('GET', `${A}/report`)).status, 403);
  const date = rep.json.to;
  const close = await c.manager.call('POST', `${A}/report/close`, { body: { date, openingFloatCents: 500000, countedCashCents: 0 } });
  assert.equal(close.json.close.expectedCashCents, 500000 + rep.json.cashCents);
  assert.equal(close.json.close.varianceCents, -close.json.close.expectedCashCents);
});

test('stock: kitchen records movements only, never below zero', { skip }, async () => {
  const made = await c.manager.call('POST', `${A}/stock`, { body: { name: 'Chickpeas', unit: 'kg', quantity: 5, lowAt: 2 } });
  assert.equal(made.status, 201);
  assert.equal((await c.kitchen.call('POST', `${A}/stock`, { body: { name: 'Salt' } })).status, 403);
  const url = `${A}/stock/${made.json.item._id}`;
  assert.equal((await c.kitchen.call('PATCH', url, { body: { delta: -3 } })).json.item.quantity, 2);
  assert.equal((await c.kitchen.call('PATCH', url, { body: { delta: -9 } })).status, 400);
  assert.equal((await c.kitchen.call('PATCH', url, { body: { lowAt: 0 } })).status, 403);
});

test('coupons start off and only the owner switches them on', { skip }, async () => {
  const made = await c.marketing.call('POST', `${A}/coupons`, { body: { code: 'welcome10', type: 'percent', value: 10 } });
  assert.equal(made.status, 201);
  assert.equal(made.json.coupon.active, false);
  assert.equal((await c.marketing.call('POST', `${A}/coupons`, { body: { code: 'WELCOME10', type: 'percent', value: 10 } })).status, 409);
  const url = `${A}/coupons/${made.json.coupon._id}`;
  assert.equal((await c.marketing.call('PATCH', url, { body: { active: true } })).status, 403);
  assert.equal((await c.owner.call('PATCH', url, { body: { active: true } })).json.coupon.active, true);
});

test('customers list and loyalty adjustments are manager-only and cannot go negative', { skip }, async () => {
  const list = await c.manager.call('GET', `${A}/customers`);
  assert.equal(list.status, 200);
  assert.equal((await c.marketing.call('GET', `${A}/customers`)).status, 403);
  const id = list.json.customers[0]._id;
  assert.equal((await c.manager.call('POST', `${A}/customers/${id}/points`, { body: { points: 50, note: 'apology' } })).json.points, 50);
  assert.equal((await c.manager.call('POST', `${A}/customers/${id}/points`, { body: { points: -80, note: 'oops' } })).status, 400);
});

test('managers add and edit dishes; kitchen cannot; bad photos and categories are refused', { skip }, async () => {
  const cat = (await MenuCategory.findOne())._id.toString();
  const dish = { name: 'Lamb Kofta', description: 'Charred, with sumac onions', category: cat, priceCents: 285000, dietaryTags: ['spicy'], channels: ['dine-in', 'pickup'] };
  assert.equal((await c.kitchen.call('POST', `${A}/menu`, { body: dish })).status, 403);
  const made = await c.manager.call('POST', `${A}/menu`, { body: { ...dish, image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' } });
  assert.equal(made.status, 201);
  assert.equal(made.json.item.slug, 'lamb-kofta');
  assert.equal(made.json.item.images[0].alt, 'Lamb Kofta');
  assert.equal((await c.manager.call('POST', `${A}/menu`, { body: dish })).json.item.slug, 'lamb-kofta-2'); // same name, new slug
  assert.equal((await c.manager.call('POST', `${A}/menu`, { body: { ...dish, category: 'f'.repeat(24) } })).status, 400);
  assert.equal((await c.manager.call('POST', `${A}/menu`, { body: { ...dish, image: 'https://evil.example/x.jpg' } })).status, 400);
  assert.equal((await c.manager.call('POST', `${A}/menu`, { body: { ...dish, priceCents: -1 } })).status, 400);
  const url = `${A}/menu/${made.json.item._id}/details`;
  assert.equal((await c.kitchen.call('PATCH', url, { body: { name: 'Free' } })).status, 403);
  const edited = await c.manager.call('PATCH', url, { body: { name: 'Lamb Kofta Plate', priceCents: 295000, image: null } });
  assert.equal(edited.json.item.name, 'Lamb Kofta Plate');
  assert.equal(edited.json.item.images.length, 0);
});
