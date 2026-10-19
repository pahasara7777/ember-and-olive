import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { DiningTable, Reservation } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { formLimiter, lookupLimiter } from '../middleware/rateLimit.js';
import { SLOT_TIMES, assignTables, durationMinutes, isBookable, toUtc } from '../lib/booking.js';
import { newReference } from '../lib/ids.js';
import { plain, optionalPlain, email, phone, reference } from '../lib/text.js';

const router = Router();
const trusted = mongoose.trusted; // every operator below is written by us; user input only ever fills values
const ACTIVE = ['pending', 'confirmed', 'seated'];

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(d)), 'Invalid date');
const partySize = z.number().int().min(1).max(12);

const bookBody = z.strictObject({
  date,
  time: z.enum(SLOT_TIMES),
  partySize,
  name: plain(80),
  email,
  phone,
  occasion: optionalPlain(60),
  specialRequests: optionalPlain(500),
  accessibilityNeeds: optionalPlain(300),
  marketingConsent: z.boolean().default(false)
});

const overlapping = (start, end) => ({ status: trusted({ $in: ACTIVE }), startsAt: trusted({ $lt: end }), endsAt: trusted({ $gt: start }) });

// What the guest sees. internalNotes and table numbers stay with staff.
export const reservationView = (r) => ({
  reference: r.reference,
  status: r.status,
  startsAt: r.startsAt,
  partySize: r.partySize,
  name: r.name,
  occasion: r.occasion,
  specialRequests: r.specialRequests,
  accessibilityNeeds: r.accessibilityNeeds
});

router.get('/availability', async (req, res) => {
  const q = z.object({ date, partySize: z.coerce.number().int().min(1).max(12) }).parse({ date: req.query.date, partySize: req.query.partySize });
  const dayStart = toUtc(q.date, '00:00');
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
  const [tables, bookings] = await Promise.all([DiningTable.find({ active: true }).lean(), Reservation.find(overlapping(dayStart, dayEnd)).lean()]);
  const minutes = durationMinutes(q.partySize);
  const slots = SLOT_TIMES.filter((time) => isBookable(q.date, time, q.partySize)).map((time) => {
    const start = toUtc(q.date, time);
    const end = new Date(start.getTime() + minutes * 60000);
    return { time, available: assignTables(tables, bookings, start, end, q.partySize) !== null };
  });
  res.json({ date: q.date, partySize: q.partySize, slots });
});

router.post('/', formLimiter(), async (req, res) => {
  const body = bookBody.parse(req.body);
  if (!isBookable(body.date, body.time, body.partySize)) throw new HttpError(400, 'That time is not available for booking');

  const startsAt = toUtc(body.date, body.time);
  const endsAt = new Date(startsAt.getTime() + durationMinutes(body.partySize) * 60000);
  const [tables, bookings] = await Promise.all([DiningTable.find({ active: true }).lean(), Reservation.find(overlapping(startsAt, endsAt)).lean()]);
  const picked = assignTables(tables, bookings, startsAt, endsAt, body.partySize);
  const taken = new HttpError(409, 'Sorry, that time was just taken. Please pick another.');
  if (!picked) throw taken;

  const booking = await Reservation.create({
    reference: newReference('R'),
    user: req.user?._id,
    name: body.name,
    email: body.email,
    phone: body.phone,
    partySize: body.partySize,
    startsAt,
    endsAt,
    tables: picked,
    status: 'confirmed',
    occasion: body.occasion,
    specialRequests: body.specialRequests,
    accessibilityNeeds: body.accessibilityNeeds,
    marketingConsent: body.marketingConsent
  });

  // Insert first, then check: if anyone else holds one of these tables at this time, back out.
  // Two simultaneous requests may both back out (the guest retries) but can never both keep the table.
  const clash = await Reservation.exists({ _id: trusted({ $ne: booking._id }), tables: trusted({ $in: picked }), ...overlapping(startsAt, endsAt) });
  if (clash) {
    await Reservation.deleteOne({ _id: booking._id });
    throw taken;
  }
  res.status(201).json({ reservation: reservationView(booking) });
});

// Guests look up and cancel with their reference AND the email used to book.
async function findOwn(req) {
  const ref = reference.safeParse(req.params.reference);
  const mail = email.safeParse(req.method === 'GET' ? req.query.email : req.body?.email);
  const found = ref.success && mail.success && (await Reservation.findOne({ reference: ref.data, email: mail.data }));
  if (!found) throw new HttpError(404, 'Reservation not found');
  return found;
}

router.get('/:reference', lookupLimiter(), async (req, res) => {
  res.json({ reservation: reservationView(await findOwn(req)) });
});

router.patch('/:reference', lookupLimiter(), async (req, res) => {
  z.strictObject({ email, action: z.literal('cancel') }).parse(req.body);
  const found = await findOwn(req);
  if (!ACTIVE.includes(found.status) || found.startsAt < new Date()) throw new HttpError(409, 'This reservation can no longer be cancelled');
  found.status = 'cancelled';
  await found.save();
  res.json({ reservation: reservationView(found) });
});

export default router;
