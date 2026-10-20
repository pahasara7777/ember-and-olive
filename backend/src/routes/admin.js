import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AuditLog, CateringEnquiry, ContactMessage, MenuItem, Order, Reservation, Review, User, ORDER_STATUSES, ROLES } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { ANY_STAFF, STAFF, requireRole } from '../middleware/auth.js';
import { audit } from '../lib/audit.js';
import { optionalPlain, objectId } from '../lib/text.js';
import { toUtc } from '../lib/booking.js';

const router = Router();
const trusted = mongoose.trusted;

// Every admin route needs a signed-in staff member; each route then narrows to the roles that may use it.
router.use(requireRole(...ANY_STAFF));
const FLOOR = requireRole(...STAFF); // marketing staff never see customer contact details

const byId = async (Model, id) => {
  const parsed = objectId.safeParse(id);
  const doc = parsed.success && (await Model.findById(parsed.data));
  if (!doc) throw new HttpError(404, 'Not found');
  return doc;
};

// ---- Dashboard ----
// Revenue figures are for management only.
router.get('/summary', requireRole('manager', 'owner'), async (req, res) => {
  const today = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10); // today's date in Colombo
  const from = toUtc(today, '00:00');
  const to = new Date(from.getTime() + 24 * 3600000);
  const [orders, reservations] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: from, $lt: to }, status: { $nin: ['cancelled', 'payment-failed'] } } },
      { $group: { _id: null, count: { $sum: 1 }, revenueCents: { $sum: '$totals.totalCents' } } }
    ]),
    Reservation.countDocuments({ startsAt: trusted({ $gte: from, $lt: to }), status: trusted({ $nin: ['cancelled', 'no-show'] }) })
  ]);
  res.json({ date: today, orders: orders[0]?.count ?? 0, revenueCents: orders[0]?.revenueCents ?? 0, reservations });
});

// ---- Orders: all staff ----
const NEXT = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'out-for-delivery'],
  'out-for-delivery': ['completed']
};

router.get('/orders', FLOOR, async (req, res) => {
  const status = z.enum(ORDER_STATUSES).optional().parse(req.query.status);
  const orders = await Order.find(status ? { status } : {}).sort('-createdAt').limit(100).lean();
  res.json({ orders });
});

router.patch('/orders/:id/status', FLOOR, async (req, res) => {
  const body = z.strictObject({ status: z.enum(ORDER_STATUSES), reason: optionalPlain(200) }).parse(req.body);
  const order = await byId(Order, req.params.id);
  if (!NEXT[order.status]?.includes(body.status)) throw new HttpError(409, `An order that is ${order.status} cannot become ${body.status}`);
  if (body.status === 'out-for-delivery' && order.fulfillment !== 'delivery') throw new HttpError(409, 'Only delivery orders can go out for delivery');
  if (body.status === 'cancelled' && !body.reason) throw new HttpError(400, 'Give a reason for cancelling');
  const before = order.status;
  order.status = body.status;
  order.statusHistory.push({ status: body.status, at: new Date(), by: req.user._id, reason: body.reason });
  if (body.status === 'completed' && order.payment?.method?.startsWith('cash')) order.payment.status = 'paid';
  if (body.status === 'cancelled' && order.payment?.status === 'pending') order.payment.status = 'cancelled';
  await order.save();
  await audit(req, 'order.status', 'Order', order._id, { status: before }, { status: body.status, reason: body.reason });
  res.json({ order });
});

// ---- Reservations: host, manager, owner ----
const FRONT = requireRole('host', 'manager', 'owner');

router.get('/reservations', FRONT, async (req, res) => {
  const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.date ?? new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10));
  const from = toUtc(day, '00:00');
  const reservations = await Reservation.find({ startsAt: trusted({ $gte: from, $lt: new Date(from.getTime() + 24 * 3600000) }) }).sort('startsAt').populate('tables', 'label seats').lean();
  res.json({ reservations });
});

router.patch('/reservations/:id', FRONT, async (req, res) => {
  const body = z
    .strictObject({ status: z.enum(['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show']).optional(), internalNotes: optionalPlain(500) })
    .parse(req.body);
  const booking = await byId(Reservation, req.params.id);
  const before = { status: booking.status, internalNotes: booking.internalNotes };
  if (body.status) booking.status = body.status;
  if (body.internalNotes !== undefined) booking.internalNotes = body.internalNotes;
  await booking.save();
  await audit(req, 'reservation.update', 'Reservation', booking._id, before, body);
  res.json({ reservation: booking });
});

// ---- Menu: kitchen may change availability; prices and visibility need a manager or owner ----
router.get('/menu', requireRole('kitchen', 'manager', 'owner'), async (req, res) => {
  res.json({ items: await MenuItem.find().sort('sortOrder').lean() });
});

router.patch('/menu/:id', requireRole('kitchen', 'manager', 'owner'), async (req, res) => {
  const body = z
    .strictObject({
      availability: z.enum(['available', 'unavailable', 'scheduled', 'sold-out']).optional(),
      priceCents: z.number().int().min(0).max(10_000_000).optional(),
      featured: z.boolean().optional(),
      archived: z.boolean().optional()
    })
    .parse(req.body);
  const touchesMoney = ['priceCents', 'featured', 'archived'].some((k) => body[k] !== undefined);
  if (touchesMoney && req.user.role === 'kitchen') throw new HttpError(403, 'Kitchen staff can only change availability');

  const item = await byId(MenuItem, req.params.id);
  const before = { availability: item.availability, priceCents: item.priceCents, featured: item.featured, archived: item.archived };
  Object.assign(item, body, { updatedBy: req.user._id });
  await item.save();
  await audit(req, body.priceCents !== undefined ? 'menu.price.update' : 'menu.update', 'MenuItem', item._id, before, body);
  res.json({ item });
});

// ---- Reviews and enquiries: marketing, manager, owner ----
const MARKETING = requireRole('marketing', 'manager', 'owner');

router.get('/reviews', MARKETING, async (req, res) => {
  const status = z.enum(['pending', 'published', 'rejected']).default('pending').parse(req.query.status);
  res.json({ reviews: await Review.find({ status }).sort('-createdAt').limit(100).lean() });
});

router.patch('/reviews/:id', MARKETING, async (req, res) => {
  const body = z.strictObject({ status: z.enum(['pending', 'published', 'rejected']).optional(), ownerResponse: optionalPlain(1000) }).parse(req.body);
  const review = await byId(Review, req.params.id);
  const before = { status: review.status };
  Object.assign(review, body);
  await review.save();
  await audit(req, 'review.moderate', 'Review', review._id, before, body);
  res.json({ review });
});

router.get('/enquiries', MARKETING, async (req, res) => {
  res.json({ enquiries: await CateringEnquiry.find().sort('-createdAt').limit(100).lean() });
});

router.patch('/enquiries/:id', MARKETING, async (req, res) => {
  const body = z.strictObject({ status: z.enum(['new', 'contacted', 'quoted', 'confirmed', 'lost']).optional(), staffNotes: optionalPlain(1000) }).parse(req.body);
  const enquiry = await byId(CateringEnquiry, req.params.id);
  Object.assign(enquiry, body);
  await enquiry.save();
  res.json({ enquiry });
});

router.get('/messages', MARKETING, async (req, res) => {
  res.json({ messages: await ContactMessage.find().sort('-createdAt').limit(100).lean() });
});

router.patch('/messages/:id', MARKETING, async (req, res) => {
  const body = z.strictObject({ status: z.enum(['new', 'handled']) }).parse(req.body);
  const message = await byId(ContactMessage, req.params.id);
  message.status = body.status;
  await message.save();
  res.json({ message });
});

// ---- People and audit trail: owner only ----
const OWNER = requireRole('owner');

router.get('/users', OWNER, async (req, res) => {
  res.json({ users: await User.find().select('name email role active createdAt').sort('-createdAt').limit(200).lean() });
});

router.patch('/users/:id', OWNER, async (req, res) => {
  const body = z.strictObject({ role: z.enum(ROLES).optional(), active: z.boolean().optional() }).parse(req.body);
  const user = await byId(User, req.params.id);
  if (user.id === req.user.id) throw new HttpError(409, 'You cannot change your own role or access');
  const before = { role: user.role, active: user.active };
  Object.assign(user, body);
  if (body.active === false) user.passwordChangedAt = new Date(); // ends their open sessions
  await user.save();
  await audit(req, 'user.update', 'User', user._id, before, body);
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active } });
});

router.get('/audit', OWNER, async (req, res) => {
  res.json({ entries: await AuditLog.find().sort('-createdAt').limit(200).lean() });
});

export default router;
