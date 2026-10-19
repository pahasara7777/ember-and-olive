import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toUtc, durationMinutes, isBookable, assignTables, overlaps, weekdayOf } from '../src/lib/booking.js';

const now = new Date('2026-10-19T10:00:00Z'); // Monday 15:30 in Colombo

test('Colombo local time converts to UTC', () => {
  assert.equal(toUtc('2026-10-23', '19:30').toISOString(), '2026-10-23T14:00:00.000Z');
});

test('duration grows with party size', () => {
  assert.deepEqual([2, 4, 5, 8, 9, 12].map(durationMinutes), [90, 90, 120, 120, 150, 150]);
});

test('Mondays, odd times, short notice and far-future dates are not bookable', () => {
  assert.equal(weekdayOf('2026-10-26'), 1);
  assert.equal(isBookable('2026-10-26', '19:00', 2, now), false); // Monday
  assert.equal(isBookable('2026-10-23', '19:15', 2, now), false); // not a slot
  assert.equal(isBookable('2026-10-19', '19:00', 2, now), false); // today is a Monday too
});

test('Tuesday evening is bookable but inside the notice window is not', () => {
  assert.equal(isBookable('2026-10-20', '19:00', 2, now), true);
  assert.equal(isBookable('2026-10-20', '19:00', 2, new Date('2026-10-20T13:30:00Z')), false); // 30 min before
  assert.equal(isBookable('2027-03-01', '19:00', 2, now), false); // beyond 60 days
});

test('overlap is half-open, so back-to-back bookings are fine', () => {
  const t = (h) => new Date(`2026-10-23T${h}:00Z`);
  assert.equal(overlaps(t('10'), t('12'), t('12'), t('14')), false);
  assert.equal(overlaps(t('10'), t('12'), t('11'), t('13')), true);
});

const tables = [
  { _id: 't2', seats: 2 }, { _id: 't4a', seats: 4 }, { _id: 't4b', seats: 4 }, { _id: 't6', seats: 6 }
];
const at = (h, m = 0) => new Date(Date.UTC(2026, 9, 23, h, m));

test('smallest table that fits is chosen', () => {
  assert.deepEqual(assignTables(tables, [], at(14), at(15, 30), 2), ['t2']);
  assert.deepEqual(assignTables(tables, [], at(14), at(15, 30), 3), ['t4a']);
});

test('booked tables are skipped only while they overlap', () => {
  const booked = [{ tables: ['t2'], startsAt: at(14), endsAt: at(15, 30) }];
  assert.deepEqual(assignTables(tables, booked, at(14, 30), at(16), 2), ['t4a']);
  assert.deepEqual(assignTables(tables, booked, at(15, 30), at(17), 2), ['t2']);
});

test('large parties combine tables and full rooms return null', () => {
  assert.deepEqual(assignTables(tables, [], at(14), at(16, 30), 10), ['t6', 't4b']);
  const all = tables.map((t) => ({ tables: [t._id], startsAt: at(14), endsAt: at(16) }));
  assert.equal(assignTables(tables, all, at(14), at(15), 2), null);
  assert.equal(assignTables(tables, [], at(14), at(16), 40), null);
});
