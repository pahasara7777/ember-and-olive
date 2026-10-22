import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Coupon, DiningTable, LoyaltyTransaction, MenuCategory, MenuItem, Order, Reservation, Setting, StockItem, DayClose, User, DIETARY_TAGS, CHANNELS } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { STAFF, requireRole } from '../middleware/auth.js';
import { audit } from '../lib/audit.js';
import { objectId, plain, optionalPlain } from '../lib/text.js';
import { toUtc } from '../lib/booking.js';
import { getSettings } from '../lib/settings.js';

// Restaurant operations: kitchen board, floor, end-of-day, refunds, stock, customers, coupons, settings.
// Mounted inside the admin router, so every route already needs a signed-in staff member.
const router = Router();
const trusted = mongoose.trusted;
const FLOOR = requireRole(...STAFF);
const MGR = requireRole('manager', 'owner');
const OWNER = requireRole('owner');
const MARKETING = requireRole('marketing', 'manager', 'owner');

const byId = async (Model, id) => {
  const parsed = objectId.safeParse(id);
  const doc = parsed.success && (await Model.findById(parsed.data));
  if (!doc) throw new HttpError(404, 'Not found');
  return doc;
};
const colomboToday = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
const dayStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const DAY = 24 * 3600000;
const IS_CASH = (o) => String(o.payment?.method).startsWith('cash');
const PAID = ['paid', 'partially-refunded', 'refunded'];
const NOT_SALES = ['cancelled', 'payment-failed', 'payment-pending'];

// ---- Settings ----
router.get('/settings', FLOOR, async (req, res) => res.json({ settings: await getSettings() }));

router.patch('/settings', OWNER, async (req, res) => {
  const body = z.strictObject({
    servicePct: z.number().min(0).max(30).optional(),
    deliveryFeeCents: z.number().int().min(0).max(10_000_000).optional(),
    deliveryMinCents: z.number().int().min(0).max(100_000_000).optional()
  }).parse(req.body);
  const before = await getSettings();
  const settings = await Setting.findOneAndUpdate({ key: 'main' }, { $set: body }, { upsert: true, returnDocument: 'after', runValidators: true }).lean();
  await audit(req, 'settings.update', 'Setting', settings._id, before, body);
  res.json({ settings });
});

// ---- Kitchen display: live tickets, oldest first ----
router.get('/kitchen', FLOOR, async (req, res) => {
  const since = new Date(Date.now() - DAY);
  const orders = await Order.find({ status: trusted({ $in: ['placed', 'confirmed', 'preparing', 'ready'] }), createdAt: trusted({ $gte: since }) })
    .select('reference fulfillment table customer.name lines notes status createdAt scheduledFor').sort('createdAt').limit(100).lean();
  res.json({ orders });
});

// ---- Floor plan: each table free, reserved or occupied, with its open tab ----
router.get('/floor', FLOOR, async (req, res) => {
  const now = new Date();
  const [tables, tabs, bookings] = await Promise.all([
    DiningTable.find({ active: true }).sort('area label').lean(),
    Order.find({ source: 'pos', 'payment.status': 'pending', status: 'confirmed', table: trusted({ $exists: true }) }).select('table totals.totalCents').lean(),
    Reservation.find({ status: trusted({ $in: ['confirmed', 'seated'] }), startsAt: trusted({ $lt: new Date(now.getTime() + 90 * 60000) }), endsAt: trusted({ $gt: now }) }).select('name partySize startsAt status tables').lean()
  ]);
  const key = (s) => String(s).trim().toLowerCase();
  res.json({
    tables: tables.map((t) => {
      const tab = tabs.find((o) => key(o.table) === key(t.label));
      const booking = bookings.find((b) => b.tables.some((id) => String(id) === String(t._id)));
      const state = tab || booking?.status === 'seated' ? 'occupied' : booking ? 'reserved' : 'free';
      return { ...t, tab: tab ? { _id: tab._id, totalCents: tab.totals.totalCents } : null, booking: booking ?? null, state };
    })
  });
});

router.post('/tables', MGR, async (req, res) => {
  const body = z.strictObject({ label: plain(20), seats: z.number().int().min(1).max(30), area: z.enum(['main', 'private', 'terrace']).default('main') }).parse(req.body);
  if (await DiningTable.exists({ label: body.label })) throw new HttpError(409, 'A table with that name already exists');
  const table = await DiningTable.create(body);
  await audit(req, 'table.create', 'DiningTable', table._id, null, body);
  res.status(201).json({ table });
});

router.patch('/tables/:id', MGR, async (req, res) => {
  const body = z.strictObject({ seats: z.number().int().min(1).max(30).optional(), active: z.boolean().optional() }).parse(req.body);
  const table = await byId(DiningTable, req.params.id);
  const before = { seats: table.seats, active: table.active };
  Object.assign(table, body);
  await table.save();
  await audit(req, 'table.update', 'DiningTable', table._id, before, body);
  res.json({ table });
});

// ---- Refunds and voids: money goes back, the reason is kept ----
router.post('/orders/:id/refund', MGR, async (req, res) => {
  const body = z.strictObject({ reason: plain(200), amountCents: z.number().int().min(1).optional() }).parse(req.body);
  const order = await byId(Order, req.params.id);
  const pay = order.payment;
  if (!pay || !['paid', 'partially-refunded'].includes(pay.status)) throw new HttpError(409, 'Only a paid order can be refunded');
  const left = (pay.amountCents ?? 0) - pay.refundedCents;
  const amount = body.amountCents ?? left;
  if (amount > left) throw new HttpError(400, 'That is more than is left to refund');
  pay.refundedCents += amount;
  pay.status = pay.refundedCents >= pay.amountCents ? 'refunded' : 'partially-refunded';
  pay.events.push({ type: 'refund', at: new Date(), payload: { amountCents: amount, reason: body.reason, by: String(req.user._id) } });
  order.statusHistory.push({ status: order.status, at: new Date(), by: req.user._id, reason: `Refund of ${amount} cents: ${body.reason}` });
  await order.save();
  await audit(req, 'order.refund', 'Order', order._id, null, { amountCents: amount, reason: body.reason });
  res.json({ order });
});

// ---- End of day / reports ----
const salesBetween = (from, to) =>
  Order.find({ createdAt: trusted({ $gte: from, $lt: to }), status: trusted({ $nin: NOT_SALES }) })
    .select('createdAt source payment totals lines.name lines.quantity lines.lineTotalCents').limit(20000).lean();
// Cash kept: what was taken (the bill, not the note handed over) minus refunds.
const cashIn = (orders) => orders.filter((o) => IS_CASH(o) && PAID.includes(o.payment.status)).reduce((t, o) => t + (o.payment.amountCents ?? 0) - (o.payment.refundedCents ?? 0), 0);

router.get('/report', MGR, async (req, res) => {
  const q = z.object({ date: dayStr.optional(), days: z.coerce.number().int().min(1).max(31).default(1) }).parse(req.query);
  const end = q.date ?? colomboToday();
  const to = new Date(toUtc(end, '00:00').getTime() + DAY);
  const from = new Date(to.getTime() - q.days * DAY);
  const orders = await salesBetween(from, to);
  const col = (d) => new Date(d.getTime() + 5.5 * 3600000);
  const sum = (list, f) => list.reduce((t, o) => t + (f(o) ?? 0), 0);
  const paid = orders.filter((o) => PAID.includes(o.payment?.status));

  const days = Array.from({ length: q.days }, (_, i) => col(new Date(from.getTime() + i * DAY)).toISOString().slice(0, 10));
  const byDay = Object.fromEntries(days.map((d) => [d, { date: d, orders: 0, revenueCents: 0 }]));
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));
  const dishes = new Map();
  for (const o of orders) {
    const c = col(o.createdAt);
    const row = byDay[c.toISOString().slice(0, 10)];
    if (row) { row.orders += 1; row.revenueCents += o.totals.totalCents ?? 0; }
    hours[c.getUTCHours()].orders += 1;
    for (const l of o.lines) {
      const d = dishes.get(l.name) ?? { name: l.name, sold: 0, revenueCents: 0 };
      d.sold += l.quantity;
      d.revenueCents += l.lineTotalCents;
      dishes.set(l.name, d);
    }
  }
  res.json({
    from: days[0], to: end, orders: orders.length,
    grossCents: sum(orders, (o) => o.totals.totalCents),
    refundedCents: sum(paid, (o) => o.payment.refundedCents),
    discountCents: sum(orders, (o) => o.totals.discountCents),
    serviceCents: sum(orders, (o) => o.totals.serviceChargeCents),
    cashCents: cashIn(orders),
    cardCents: sum(paid.filter((o) => !IS_CASH(o)), (o) => o.payment.amountCents - o.payment.refundedCents),
    unpaidCents: sum(orders.filter((o) => o.payment?.status === 'pending'), (o) => o.totals.totalCents),
    posOrders: orders.filter((o) => o.source === 'pos').length,
    webOrders: orders.filter((o) => o.source !== 'pos').length,
    byDay: days.map((d) => byDay[d]),
    hours,
    topDishes: [...dishes.values()].sort((a, b) => b.sold - a.sold).slice(0, 10),
    close: q.days === 1 ? await DayClose.findOne({ date: end }).lean() : null
  });
});

router.post('/report/close', MGR, async (req, res) => {
  const body = z.strictObject({ date: dayStr, openingFloatCents: z.number().int().min(0).max(100_000_000), countedCashCents: z.number().int().min(0).max(1_000_000_000), note: optionalPlain(300) }).parse(req.body);
  const from = toUtc(body.date, '00:00');
  const expectedCashCents = body.openingFloatCents + cashIn(await salesBetween(from, new Date(from.getTime() + DAY)));
  const doc = { ...body, expectedCashCents, varianceCents: body.countedCashCents - expectedCashCents, closedBy: req.user._id };
  const close = await DayClose.findOneAndUpdate({ date: body.date }, { $set: doc }, { upsert: true, returnDocument: 'after' }).lean();
  await audit(req, 'day.close', 'DayClose', close._id, null, { date: body.date, varianceCents: doc.varianceCents });
  res.json({ close });
});

// ---- Menu: add and edit dishes (managers and owners; kitchen staff can only mark things sold out, in admin.js) ----
// shortcut: the photo is a small data URL (the browser shrinks it first) stored on the dish, because the site's CSP only allows same-origin images and there is no file store yet. Move to object storage when photos get bigger.
const MAX_IMAGE_CHARS = 45_000;
const photo = z.string().max(MAX_IMAGE_CHARS).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, 'Use a JPEG, PNG or WebP photo');
const dishFields = {
  name: plain(80),
  description: optionalPlain(500),
  category: objectId,
  priceCents: z.number().int().min(0).max(10_000_000),
  dietaryTags: z.array(z.enum(DIETARY_TAGS)).max(4),
  channels: z.array(z.enum(CHANNELS)).min(1),
  prepMinutes: z.number().int().min(1).max(240).nullable()
};
const slugify = (name) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'dish';

router.post('/menu', MGR, async (req, res) => {
  const body = z.strictObject({ ...dishFields, prepMinutes: dishFields.prepMinutes.optional(), image: photo.optional() }).parse(req.body);
  if (!(await MenuCategory.exists({ _id: body.category }))) throw new HttpError(400, 'Choose a category');
  const base = slugify(body.name);
  let slug = base;
  for (let n = 2; await MenuItem.exists({ slug }); n += 1) slug = `${base}-${n}`;
  const last = await MenuItem.findOne({ category: body.category }).sort('-sortOrder').select('sortOrder').lean();
  const { image, ...rest } = body;
  const item = await MenuItem.create({ ...rest, slug, sortOrder: (last?.sortOrder ?? 0) + 1, updatedBy: req.user._id, ...(image && { images: [{ url: image, alt: body.name }] }) });
  await audit(req, 'menu.create', 'MenuItem', item._id, null, { name: item.name, priceCents: item.priceCents });
  res.status(201).json({ item });
});

router.patch('/menu/:id/details', MGR, async (req, res) => {
  const body = z.strictObject({ ...Object.fromEntries(Object.entries(dishFields).map(([k, v]) => [k, v.optional()])), image: photo.nullable().optional() }).parse(req.body);
  const item = await byId(MenuItem, req.params.id);
  if (body.category && !(await MenuCategory.exists({ _id: body.category }))) throw new HttpError(400, 'Choose a category');
  const before = { name: item.name, category: String(item.category), channels: item.channels };
  const { image, ...rest } = body;
  Object.assign(item, rest, { updatedBy: req.user._id });
  if (image !== undefined) item.images = image ? [{ url: image, alt: item.name }] : [];
  await item.save();
  await audit(req, 'menu.details', 'MenuItem', item._id, before, { ...rest, photo: image === undefined ? undefined : image ? 'changed' : 'removed' });
  res.json({ item });
});

// ---- Stock ----
const STOCK_ROLES = requireRole('kitchen', 'manager', 'owner');
router.get('/stock', STOCK_ROLES, async (req, res) => res.json({ items: await StockItem.find({ active: true }).sort('name').lean() }));

router.post('/stock', MGR, async (req, res) => {
  const body = z.strictObject({ name: plain(80), unit: plain(12).default('pcs'), quantity: z.number().min(0).max(1_000_000).default(0), lowAt: z.number().min(0).max(1_000_000).default(0) }).parse(req.body);
  if (await StockItem.exists({ name: body.name })) throw new HttpError(409, 'That item already exists');
  const item = await StockItem.create(body);
  await audit(req, 'stock.create', 'StockItem', item._id, null, body);
  res.status(201).json({ item });
});

// delta is a counted movement (received, used, wasted). Kitchen may record movements; managers may also edit the item.
router.patch('/stock/:id', STOCK_ROLES, async (req, res) => {
  const body = z.strictObject({
    delta: z.number().min(-1_000_000).max(1_000_000).optional(), reason: optionalPlain(120),
    lowAt: z.number().min(0).max(1_000_000).optional(), unit: plain(12).optional(), active: z.boolean().optional()
  }).parse(req.body);
  if (req.user.role === 'kitchen' && ['lowAt', 'unit', 'active'].some((k) => body[k] !== undefined)) throw new HttpError(403, 'Kitchen staff can only record stock movements');
  const item = await byId(StockItem, req.params.id);
  const before = { quantity: item.quantity, lowAt: item.lowAt };
  if (body.delta !== undefined) {
    if (item.quantity + body.delta < 0) throw new HttpError(400, 'There is not that much in stock');
    item.quantity += body.delta;
  }
  for (const k of ['lowAt', 'unit', 'active']) if (body[k] !== undefined) item[k] = body[k];
  await item.save();
  await audit(req, 'stock.update', 'StockItem', item._id, before, { ...body, quantity: item.quantity });
  res.json({ item });
});

// ---- Customers and loyalty: managers and owners only (contact details) ----
router.get('/customers', MGR, async (req, res) => {
  const users = await User.find({ role: 'customer' }).select('name email phone createdAt').sort('-createdAt').limit(500).lean();
  const ids = users.map((u) => u._id);
  const [spend, points] = await Promise.all([
    Order.aggregate([{ $match: { user: { $in: ids }, status: { $nin: NOT_SALES } } }, { $group: { _id: '$user', orders: { $sum: 1 }, spentCents: { $sum: '$totals.totalCents' }, last: { $max: '$createdAt' } } }]),
    LoyaltyTransaction.aggregate([{ $match: { user: { $in: ids } } }, { $group: { _id: '$user', points: { $sum: '$points' } } }])
  ]);
  const s = new Map(spend.map((r) => [String(r._id), r]));
  const p = new Map(points.map((r) => [String(r._id), r.points]));
  res.json({
    customers: users.map((u) => {
      const row = s.get(String(u._id));
      return { ...u, orders: row?.orders ?? 0, spentCents: row?.spentCents ?? 0, lastOrder: row?.last ?? null, points: p.get(String(u._id)) ?? 0 };
    })
  });
});

router.post('/customers/:id/points', MGR, async (req, res) => {
  const body = z.strictObject({ points: z.number().int().min(-100000).max(100000).refine((n) => n !== 0, 'Enter a number of points'), note: plain(120) }).parse(req.body);
  const user = await byId(User, req.params.id);
  const [{ points = 0 } = {}] = await LoyaltyTransaction.aggregate([{ $match: { user: user._id } }, { $group: { _id: null, points: { $sum: '$points' } } }]);
  if (points + body.points < 0) throw new HttpError(400, 'That would take the balance below zero');
  await LoyaltyTransaction.create({ user: user._id, type: 'adjust', points: body.points, note: body.note });
  await audit(req, 'loyalty.adjust', 'User', user._id, { points }, { points: points + body.points, note: body.note });
  res.json({ points: points + body.points });
});

// ---- Coupons: anyone in marketing can draft one, only the owner switches it on ----
router.get('/coupons', MARKETING, async (req, res) => {
  const coupons = await Coupon.find().sort('-createdAt').limit(200).lean();
  res.json({ coupons: coupons.map(({ redemptions = [], ...c }) => ({ ...c, used: redemptions.length })) }); // the redemption list itself (guest ids) stays on the server
});

router.post('/coupons', MARKETING, async (req, res) => {
  const body = z.strictObject({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,20}$/, 'Use 3-20 letters, numbers, - or _'),
    type: z.enum(['percent', 'fixed', 'free-delivery']),
    value: z.number().int().min(0).max(100_000_000).default(0),
    minSpendCents: z.number().int().min(0).default(0),
    expiresAt: z.coerce.date().optional(),
    usageLimit: z.number().int().min(1).optional()
  }).refine((b) => b.type !== 'percent' || b.value <= 100, 'A percent coupon cannot be over 100').parse(req.body);
  if (await Coupon.exists({ code: body.code })) throw new HttpError(409, 'That code already exists');
  const coupon = await Coupon.create(body); // starts inactive
  await audit(req, 'coupon.create', 'Coupon', coupon._id, null, body);
  res.status(201).json({ coupon });
});

router.patch('/coupons/:id', MARKETING, async (req, res) => {
  const body = z.strictObject({ active: z.boolean().optional(), expiresAt: z.coerce.date().nullable().optional(), usageLimit: z.number().int().min(1).nullable().optional() }).parse(req.body);
  if (body.active === true && req.user.role !== 'owner') throw new HttpError(403, 'Only the owner can switch an offer on');
  const coupon = await byId(Coupon, req.params.id);
  const before = { active: coupon.active, expiresAt: coupon.expiresAt, usageLimit: coupon.usageLimit };
  Object.assign(coupon, body);
  await coupon.save();
  await audit(req, 'coupon.update', 'Coupon', coupon._id, before, body);
  res.json({ coupon });
});

export default router;
