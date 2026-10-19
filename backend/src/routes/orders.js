import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { MenuItem, Order } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { formLimiter, lookupLimiter } from '../middleware/rateLimit.js';
import { priceCart } from '../lib/pricing.js';
import { newReference } from '../lib/ids.js';
import { plain, optionalPlain, email, phone, objectId, reference } from '../lib/text.js';

const router = Router();

const line = z.strictObject({
  menuItem: objectId,
  quantity: z.number().int().min(1).max(20),
  options: z.array(objectId).max(10).optional(),
  notes: optionalPlain(200)
});

const orderBody = z
  .strictObject({
    idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/).optional(),
    customer: z.strictObject({ name: plain(80), email, phone }),
    fulfillment: z.enum(['pickup', 'delivery']),
    paymentMethod: z.enum(['cash-pickup', 'cash-delivery', 'card']),
    scheduledFor: z.iso.datetime().optional(),
    delivery: z
      .strictObject({ recipientName: plain(80), line1: plain(150), unit: optionalPlain(50), landmark: optionalPlain(100), instructions: optionalPlain(200), zone: optionalPlain(60) })
      .optional(),
    lines: z.array(line).min(1).max(30),
    notes: optionalPlain(300)
  })
  .superRefine((o, ctx) => {
    if (o.fulfillment === 'delivery' && !o.delivery) ctx.addIssue({ code: 'custom', path: ['delivery'], message: 'Delivery address is required' });
    if (o.fulfillment === 'pickup' && o.paymentMethod === 'cash-delivery') ctx.addIssue({ code: 'custom', path: ['paymentMethod'], message: 'Choose cash on pickup' });
    if (o.fulfillment === 'delivery' && o.paymentMethod === 'cash-pickup') ctx.addIssue({ code: 'custom', path: ['paymentMethod'], message: 'Choose cash on delivery' });
  });

// What a customer sees when tracking an order. No email, phone or street address.
export const trackingView = (o) => ({
  reference: o.reference,
  status: o.status,
  fulfillment: o.fulfillment,
  scheduledFor: o.scheduledFor,
  firstName: o.customer?.name?.split(' ')[0],
  lines: o.lines.map((l) => ({ name: l.name, quantity: l.quantity, options: l.options.map((x) => x.name), lineTotalCents: l.lineTotalCents })),
  totals: o.totals,
  payment: { method: o.payment?.method, status: o.payment?.status },
  statusHistory: o.statusHistory.map((h) => ({ status: h.status, at: h.at })),
  createdAt: o.createdAt
});

router.post('/', formLimiter(), async (req, res) => {
  const body = orderBody.parse(req.body);
  if (body.paymentMethod === 'card') throw new HttpError(400, 'Card payments are not available yet. Please choose cash.');

  if (body.idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey: body.idempotencyKey });
    if (existing) {
      if (existing.customer.email !== body.customer.email) throw new HttpError(409, 'That order key is already in use');
      return res.status(200).json({ order: trackingView(existing) });
    }
  }

  let scheduledFor;
  if (body.scheduledFor) {
    scheduledFor = new Date(body.scheduledFor);
    const minutes = (scheduledFor - Date.now()) / 60000;
    if (minutes < 30 || minutes > 7 * 24 * 60) throw new HttpError(400, 'Choose a time between 30 minutes and 7 days from now');
  }

  const ids = [...new Set(body.lines.map((l) => l.menuItem))];
  const items = await MenuItem.find({ _id: mongoose.trusted({ $in: ids }) }) // ids are already validated as ObjectIds;
  const priced = priceCart(new Map(items.map((i) => [String(i._id), i])), body.lines, body.fulfillment);

  const now = new Date();
  const order = await Order.create({
    reference: newReference('O'),
    idempotencyKey: body.idempotencyKey,
    user: req.user?._id,
    customer: body.customer,
    fulfillment: body.fulfillment,
    scheduledFor,
    delivery: body.fulfillment === 'delivery' ? body.delivery : undefined,
    ...priced,
    payment: { method: body.paymentMethod, status: 'pending', amountCents: priced.totals.totalCents },
    status: 'placed',
    statusHistory: [{ status: 'placed', at: now }],
    notes: body.notes
  });
  res.status(201).json({ order: trackingView(order) });
});

router.get('/:reference', lookupLimiter(), async (req, res) => {
  const ref = reference.safeParse(req.params.reference);
  const order = ref.success && (await Order.findOne({ reference: ref.data }));
  if (!order) throw new HttpError(404, 'Order not found');
  res.json({ order: trackingView(order) });
});

export default router;
