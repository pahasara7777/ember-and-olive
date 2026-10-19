import { Router } from 'express';
import { z } from 'zod';
import { Order, Reservation } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { trackingView } from './orders.js';
import { reservationView } from './reservations.js';
import { publicUser } from './auth.js';
import { plain, phone } from '../lib/text.js';

const router = Router();
router.use(requireAuth);

// Every query below filters by req.user, so one customer can never read another's records.
router.get('/orders', async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort('-createdAt').limit(50);
  res.json({ orders: orders.map(trackingView) });
});

router.get('/reservations', async (req, res) => {
  const bookings = await Reservation.find({ user: req.user._id }).sort('-startsAt').limit(50);
  res.json({ reservations: bookings.map(reservationView) });
});

// Only these three fields can be edited; role, email and active are not part of the schema.
const profileBody = z.strictObject({ name: plain(80).optional(), phone: phone.optional(), marketingConsent: z.boolean().optional() });

router.patch('/profile', async (req, res) => {
  const body = profileBody.parse(req.body);
  if (body.name) req.user.name = body.name;
  if (body.phone) req.user.phone = body.phone;
  if (body.marketingConsent !== undefined) req.user.marketingConsent = { given: body.marketingConsent, at: new Date(), source: 'account' };
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

export default router;
