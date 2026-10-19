import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.js';
import { HAS_DB, connectTestDb, disconnectTestDb } from './db.js';
import { DiningTable, Reservation } from '../src/models/index.js';

const skip = !HAS_DB && 'set MONGODB_TEST_URI to run database tests';
let app;

// A Wednesday at least 10 days away (Colombo is closed on Mondays and bookings need notice).
function nextWednesday() {
  const d = new Date(Date.now() + 10 * 86400000);
  while (new Date(d.getTime() + 5.5 * 3600000).getUTCDay() !== 3) d.setUTCDate(d.getUTCDate() + 1);
  return new Date(d.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
}
const day = nextWednesday();
const guest = { name: 'Nimal Silva', email: 'nimal@example.com', phone: '0771234567' };
const book = (extra = {}) => ({ date: day, time: '19:00', partySize: 2, ...guest, ...extra });

before(async () => {
  if (skip) return;
  await connectTestDb('reservations');
  await DiningTable.create([{ label: 'T1', seats: 2 }, { label: 'T2', seats: 2 }]);
  app = await startApp();
});
after(async () => { if (skip) return; app.close(); await disconnectTestDb(); });

test('availability lists bookable slots and hides closed days', { skip }, async () => {
  const res = await app.call('GET', `/api/v1/reservations/availability?date=${day}&partySize=2`);
  assert.equal(res.status, 200);
  assert.ok(res.json.slots.length > 0);
  assert.ok(res.json.slots.every((s) => s.available));
  assert.equal((await app.call('GET', '/api/v1/reservations/availability?date=banana&partySize=2')).status, 400);
  assert.equal((await app.call('GET', `/api/v1/reservations/availability?date=${day}&partySize=99`)).status, 400);
});

test('a booking is confirmed with an unguessable reference and no staff-only fields', { skip }, async () => {
  const res = await app.call('POST', '/api/v1/reservations', { body: book() });
  assert.equal(res.status, 201);
  assert.match(res.json.reservation.reference, /^EO-R-[A-Z0-9]{10}$/);
  assert.equal(res.json.reservation.status, 'confirmed');
  assert.equal(res.json.reservation.internalNotes, undefined);
  assert.equal(res.json.reservation.tables, undefined);
});

test('the room fills up and the next guest is told so', { skip }, async () => {
  assert.equal((await app.call('POST', '/api/v1/reservations', { body: book({ email: 'b@example.com' }) })).status, 201);
  const third = await app.call('POST', '/api/v1/reservations', { body: book({ email: 'c@example.com' }) });
  assert.equal(third.status, 409);
  const avail = await app.call('GET', `/api/v1/reservations/availability?date=${day}&partySize=2`);
  assert.equal(avail.json.slots.find((s) => s.time === '19:00').available, false);
  assert.equal(avail.json.slots.find((s) => s.time === '12:00').available, true);
});

test('simultaneous requests for the last table never double-book it', { skip }, async () => {
  const results = await Promise.all(Array.from({ length: 6 }, (_, i) => app.call('POST', '/api/v1/reservations', { body: book({ time: '20:30', email: `race${i}@example.com` }) })));
  const ok = results.filter((r) => r.status === 201).length;
  assert.ok(ok <= 2, `expected at most 2 bookings for 2 tables, got ${ok}`);
  assert.equal(await Reservation.countDocuments({ startsAt: new Date(`${day}T20:30:00+05:30`) }), ok);
});

test('closed days, off-slot times, short notice and silly sizes are refused', { skip }, async () => {
  const monday = new Date(new Date(`${day}T12:00:00+05:30`).getTime() + 5 * 86400000).toISOString().slice(0, 10);
  assert.equal((await app.call('POST', '/api/v1/reservations', { body: book({ date: monday }) })).status, 400);
  assert.equal((await app.call('POST', '/api/v1/reservations', { body: book({ time: '19:07' }) })).status, 400);
  assert.equal((await app.call('POST', '/api/v1/reservations', { body: book({ date: '2020-01-01' }) })).status, 400);
  assert.equal((await app.call('POST', '/api/v1/reservations', { body: book({ partySize: 0 }) })).status, 400);
  assert.equal((await app.call('POST', '/api/v1/reservations', { body: book({ partySize: 13 }) })).status, 400);
  assert.equal((await app.call('POST', '/api/v1/reservations', { body: book({ status: 'seated' }) })).status, 400);
});

test('special requests are stripped of markup', { skip }, async () => {
  const res = await app.call('POST', '/api/v1/reservations', { body: book({ time: '12:00', specialRequests: '<script>alert(1)</script>Window seat' }) });
  assert.equal(res.status, 201);
  assert.equal(res.json.reservation.specialRequests, 'alert(1)Window seat');
});

test('lookup and cancel need the reference and the matching email', { skip }, async () => {
  const made = await app.call('POST', '/api/v1/reservations', { body: book({ time: '13:00', email: 'owner@example.com' }) });
  const ref = made.json.reservation.reference;
  assert.equal((await app.call('GET', `/api/v1/reservations/${ref}?email=owner@example.com`)).status, 200);
  assert.equal((await app.call('GET', `/api/v1/reservations/${ref}?email=other@example.com`)).status, 404);
  assert.equal((await app.call('GET', `/api/v1/reservations/${ref}`)).status, 404);
  assert.equal((await app.call('PATCH', `/api/v1/reservations/${ref}`, { body: { email: 'other@example.com', action: 'cancel' } })).status, 404);
  assert.equal((await app.call('PATCH', `/api/v1/reservations/${ref}`, { body: { email: 'owner@example.com', action: 'cancel', status: 'seated' } })).status, 400);
  const done = await app.call('PATCH', `/api/v1/reservations/${ref}`, { body: { email: 'owner@example.com', action: 'cancel' } });
  assert.equal(done.json.reservation.status, 'cancelled');
});
