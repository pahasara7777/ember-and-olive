import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.js';
import { HAS_DB, connectTestDb, disconnectTestDb } from './db.js';
import { hashPassword } from '../src/lib/password.js';
import { AuditLog, DiningTable, MenuCategory, MenuItem, Order, Reservation, Review, User, CateringEnquiry } from '../src/models/index.js';

const skip = !HAS_DB && 'set MONGODB_TEST_URI to run database tests';
const PASSWORD = 'a-long-passphrase-1';
const clients = {};
let hummus, order, booking, review, customerUser;

async function signedIn(role) {
  await User.create({ name: `${role} person`, email: `${role}@example.com`, passwordHash: await hashPassword(PASSWORD), role });
  const c = await startApp();
  assert.equal((await c.call('POST', '/api/v1/auth/login', { body: { email: `${role}@example.com`, password: PASSWORD } })).status, 200);
  return c;
}

before(async () => {
  if (skip) return;
  await connectTestDb('admin');
  for (const role of ['customer', 'host', 'kitchen', 'marketing', 'manager', 'owner']) clients[role] = await signedIn(role);
  clients.anon = await startApp();
  customerUser = await User.findOne({ role: 'customer' });
  const cat = await MenuCategory.create({ name: 'Mezze', slug: 'mezze' });
  hummus = await MenuItem.create({ category: cat._id, name: 'Hummus', slug: 'hummus', priceCents: 145000 });
  const t = await DiningTable.create({ label: 'T1', seats: 4 });
  const placed = await clients.anon.call('POST', '/api/v1/orders', { body: { customer: { name: 'A B', email: 'a@example.com', phone: '0771234567' }, fulfillment: 'pickup', paymentMethod: 'cash-pickup', lines: [{ menuItem: String(hummus._id), quantity: 1 }] } });
  order = await Order.findOne({ reference: placed.json.order.reference });
  booking = await Reservation.create({ reference: 'EO-R-TESTTEST22', name: 'G', email: 'g@example.com', phone: '0771234567', partySize: 2, startsAt: new Date(Date.now() + 86400000), endsAt: new Date(Date.now() + 90000000), tables: [t._id] });
  review = await Review.create({ user: customerUser._id, rating: 4, text: 'Nice evening out', displayName: 'A' });
  await CateringEnquiry.create({ name: 'E', email: 'e@example.com', phone: '0771234567', eventType: 'corporate' });
});
after(async () => { if (skip) return; Object.values(clients).forEach((c) => c.close()); await disconnectTestDb(); });

const GETS = ['/admin/summary', '/admin/orders', '/admin/reservations', '/admin/menu', '/admin/reviews', '/admin/enquiries', '/admin/messages', '/admin/users', '/admin/audit'];

test('signed-out visitors get 401 on every admin route', { skip }, async () => {
  for (const path of GETS) assert.equal((await clients.anon.call('GET', `/api/v1${path}`)).status, 401, path);
});

test('customers get 403 on every admin route', { skip }, async () => {
  for (const path of GETS) assert.equal((await clients.customer.call('GET', `/api/v1${path}`)).status, 403, path);
});

test('each role reaches only the routes meant for it', { skip }, async () => {
  const can = { host: ['/admin/orders', '/admin/reservations'], kitchen: ['/admin/orders', '/admin/menu'], marketing: ['/admin/reviews', '/admin/enquiries', '/admin/messages'], manager: GETS.filter((p) => !['/admin/users', '/admin/audit'].includes(p)), owner: GETS };
  for (const [role, allowed] of Object.entries(can)) {
    for (const path of GETS) {
      const status = (await clients[role].call('GET', `/api/v1${path}`)).status;
      assert.equal(status === 200, allowed.includes(path), `${role} ${path} -> ${status}`);
      if (!allowed.includes(path)) assert.equal(status, 403);
    }
  }
});

test('order status follows the allowed flow and is recorded', { skip }, async () => {
  const url = `/api/v1/admin/orders/${order.id}/status`;
  assert.equal((await clients.kitchen.call('PATCH', url, { body: { status: 'completed' } })).status, 409); // cannot skip steps
  assert.equal((await clients.kitchen.call('PATCH', url, { body: { status: 'cancelled' } })).status, 400); // needs a reason
  for (const status of ['confirmed', 'preparing', 'ready', 'completed']) assert.equal((await clients.kitchen.call('PATCH', url, { body: { status } })).status, 200, status);
  const done = await Order.findById(order.id);
  assert.equal(done.payment.status, 'paid');
  assert.equal((await clients.kitchen.call('PATCH', url, { body: { status: 'placed' } })).status, 409); // finished orders stay finished
  assert.ok((await AuditLog.countDocuments({ action: 'order.status' })) >= 4);
});

test('kitchen can mark a dish sold out but cannot change prices', { skip }, async () => {
  const url = `/api/v1/admin/menu/${hummus.id}`;
  assert.equal((await clients.kitchen.call('PATCH', url, { body: { availability: 'sold-out' } })).status, 200);
  assert.equal((await clients.kitchen.call('PATCH', url, { body: { priceCents: 1 } })).status, 403);
  assert.equal((await MenuItem.findById(hummus.id)).priceCents, 145000);
});

test('managers can change prices and it lands in the audit log', { skip }, async () => {
  const url = `/api/v1/admin/menu/${hummus.id}`;
  assert.equal((await clients.manager.call('PATCH', url, { body: { priceCents: 155000 } })).status, 200);
  assert.equal((await clients.manager.call('PATCH', url, { body: { priceCents: -5 } })).status, 400);
  assert.equal((await clients.manager.call('PATCH', url, { body: { priceCents: 1, name: 'Free food' } })).status, 400);
  const entry = await AuditLog.findOne({ action: 'menu.price.update' });
  assert.equal(entry.before.priceCents, 145000);
  assert.equal(entry.after.priceCents, 155000);
});

test('hosts update bookings, but marketing and kitchen cannot', { skip }, async () => {
  const url = `/api/v1/admin/reservations/${booking.id}`;
  assert.equal((await clients.host.call('PATCH', url, { body: { status: 'seated', internalNotes: 'VIP <b>guest</b>' } })).status, 200);
  assert.equal((await Reservation.findById(booking.id)).internalNotes, 'VIP guest');
  assert.equal((await clients.kitchen.call('PATCH', url, { body: { status: 'cancelled' } })).status, 403);
  assert.equal((await clients.marketing.call('PATCH', url, { body: { status: 'cancelled' } })).status, 403);
});

test('marketing moderates reviews that then go public', { skip }, async () => {
  const url = `/api/v1/admin/reviews/${review.id}`;
  assert.equal((await clients.host.call('PATCH', url, { body: { status: 'published' } })).status, 403);
  assert.equal((await clients.marketing.call('PATCH', url, { body: { status: 'published', ownerResponse: 'Thank you!' } })).status, 200);
  assert.equal((await clients.anon.call('GET', '/api/v1/reviews')).json.reviews.length, 1);
});

test('only the owner manages users, and not themselves', { skip }, async () => {
  const url = `/api/v1/admin/users/${customerUser.id}`;
  assert.equal((await clients.manager.call('PATCH', url, { body: { role: 'owner' } })).status, 403);
  assert.equal((await clients.owner.call('PATCH', url, { body: { role: 'host' } })).status, 200);
  const owner = await User.findOne({ role: 'owner' });
  assert.equal((await clients.owner.call('PATCH', `/api/v1/admin/users/${owner.id}`, { body: { role: 'customer' } })).status, 409);
  assert.equal((await clients.owner.call('PATCH', url, { body: { role: 'god' } })).status, 400);
});

test('deactivating a user ends their open session', { skip }, async () => {
  const target = await User.findOne({ role: 'host' });
  await new Promise((r) => setTimeout(r, 1100));
  assert.equal((await clients.owner.call('PATCH', `/api/v1/admin/users/${target.id}`, { body: { active: false } })).status, 200);
  assert.equal((await clients.customer.call('GET', '/api/v1/auth/me')).status, 401); // customer was promoted to host above, then deactivated
});

test('admin ids that are not ObjectIds are 404, not errors', { skip }, async () => {
  assert.equal((await clients.manager.call('PATCH', '/api/v1/admin/menu/not-an-id', { body: { featured: true } })).status, 404);
  assert.equal((await clients.manager.call('PATCH', '/api/v1/admin/menu/%7B%22%24ne%22%3Anull%7D', { body: { featured: true } })).status, 404);
});

test('the dashboard summary covers the last seven days and what needs attention', { skip }, async () => {
  const res = await clients.manager.call('GET', '/api/v1/admin/summary');
  assert.equal(res.status, 200);
  assert.equal(res.json.last7.length, 7);
  assert.equal(res.json.last7.at(-1).date, res.json.date);
  assert.ok(Array.isArray(res.json.topDishes));
  assert.equal(typeof res.json.attention.pendingReviews, 'number');
  assert.equal((await clients.kitchen.call('GET', '/api/v1/admin/summary')).status, 403); // revenue is not for floor staff
});
