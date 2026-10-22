// Fills the admin screens with believable sample activity so the dashboard, reports, kitchen and reservations have something to show.
//   npm run demo          add ~two weeks of sample orders, bookings, guests, reviews, messages and stock
//   npm run demo:clear    remove exactly those records again (it never touches anything it did not create)
// Everything it creates is recognisable: references start "EO-O-DEMO"/"EO-R-DEMO", guest emails end "@demo.invalid", stock names are listed below.
import 'dotenv/config';
import { randomInt, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { hashPassword } from '../lib/password.js';
import { toUtc } from '../lib/booking.js';
import { CateringEnquiry, ContactMessage, DiningTable, MenuItem, Order, Reservation, Review, StockItem, User } from '../models/index.js';

const DEMO_EMAIL = /@demo\.invalid$/;
const ORDER_REF = /^EO-O-DEMO/;
const BOOKING_REF = /^EO-R-DEMO/;
const STOCK = [['Chickpeas', 'kg', 18, 5], ['Olive oil', 'l', 3, 4], ['Halloumi', 'kg', 0, 2], ['Tomatoes', 'kg', 9.5, 6], ['Chicken', 'kg', 14, 8], ['Rice', 'kg', 40, 10], ['Flour', 'kg', 22, 10], ['Eggs', 'pcs', 60, 30], ['Lemons', 'kg', 2, 3]];
const GUESTS = ['Nimali Perera', 'Rajiv Fernando', 'Anusha Silva', 'Dilshan Jayasuriya', 'Sarah Wickramasinghe', 'Kasun Bandara', 'Priya Ratnam', 'Mohamed Rizwan', 'Tharushi Gunawardena', 'Ishan Weerasinghe', 'Maya de Silva', 'Chaminda Rodrigo'];
const REF_CHARS = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const ref = (kind) => `EO-${kind}-DEMO${Array.from({ length: 6 }, () => REF_CHARS[randomInt(REF_CHARS.length)]).join('')}`;
const pick = (list) => list[randomInt(list.length)];
const between = (a, b) => a + randomInt(b - a + 1);
const trusted = mongoose.trusted; // sanitizeFilter is on, so operators written in code must be marked as trusted
const colomboDay = (offset) => new Date(Date.now() + 5.5 * 3600000 + offset * 86400000).toISOString().slice(0, 10);

async function clear() {
  const orders = await Order.deleteMany({ reference: ORDER_REF });
  const bookings = await Reservation.deleteMany({ reference: BOOKING_REF });
  const users = await User.find({ email: DEMO_EMAIL }).select('_id');
  const reviews = await Review.deleteMany({ user: trusted({ $in: users.map((u) => u._id) }) });
  const guests = await User.deleteMany({ email: DEMO_EMAIL });
  const messages = await ContactMessage.deleteMany({ email: DEMO_EMAIL });
  const enquiries = await CateringEnquiry.deleteMany({ email: DEMO_EMAIL });
  const stock = await StockItem.deleteMany({ name: trusted({ $in: STOCK.map((s) => s[0]) }) });
  console.log(`Removed ${orders.deletedCount} orders, ${bookings.deletedCount} bookings, ${guests.deletedCount} guests, ${reviews.deletedCount} reviews, ${messages.deletedCount + enquiries.deletedCount} messages/enquiries, ${stock.deletedCount} stock items.`);
}

async function add() {
  const items = await MenuItem.find({ archived: false, availability: 'available' }).lean();
  if (items.length < 4) throw new Error('Add the menu first (npm run seed), the demo orders are made of real dishes.');
  const tables = await DiningTable.find({ active: true }).lean();
  const staff = await User.findOne({ role: trusted({ $in: ['owner', 'manager'] }) }).select('_id');
  await clear(); // re-running replaces the old demo records instead of piling up

  // Guests (cannot sign in: random password nobody knows)
  const passwordHash = await hashPassword(randomBytes(24).toString('hex'));
  const users = await User.insertMany(GUESTS.slice(0, 8).map((name, i) => ({ name, email: `guest${i + 1}@demo.invalid`, phone: `07712345${10 + i}`, passwordHash, role: 'customer' })));

  // Orders: two weeks, busier at weekends, lunch and dinner peaks (Colombo time)
  const orders = [];
  for (let back = 14; back >= 0; back -= 1) {
    const day = colomboDay(-back);
    const weekend = [5, 6].includes(new Date(`${day}T12:00:00Z`).getUTCDay());
    const count = (weekend ? between(12, 18) : between(5, 11)) - (back === 0 ? 4 : 0);
    for (let n = 0; n < Math.max(count, 3); n += 1) {
      const hour = pick([12, 13, 13, 14, 18, 19, 19, 20, 20, 21]);
      const at = toUtc(day, `${String(hour).padStart(2, '0')}:${String(between(0, 5) * 10).padStart(2, '0')}`);
      if (at > new Date()) continue; // nothing in the future
      const pos = randomInt(10) < 6;
      const lines = Array.from({ length: between(1, 4) }, () => { const it = pick(items); const quantity = between(1, 3); return { menuItem: it._id, name: it.name, unitPriceCents: it.priceCents, quantity, options: [], lineTotalCents: it.priceCents * quantity }; });
      const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0);
      const service = pos && randomInt(10) < 5 ? Math.round(subtotal * 0.1) : 0;
      const discount = pos && randomInt(12) === 0 ? Math.round(subtotal * 0.1) : 0;
      const total = subtotal + service - discount;
      const method = pos ? pick(['cash', 'cash', 'card']) : pick(['cash-pickup', 'cash-pickup', 'cash-delivery']);
      const cancelled = randomInt(30) === 0;
      const guest = !pos && randomInt(2) ? pick(users) : null;
      orders.push({
        reference: ref('O'), source: pos ? 'pos' : 'web', ...(guest && { user: guest._id }),
        customer: pos ? { name: `Table ${between(1, 20)}` } : { name: guest?.name ?? pick(GUESTS), email: guest?.email ?? 'guest@demo.invalid', phone: '0771234567' },
        fulfillment: pos ? 'dine-in' : pick(['pickup', 'pickup', 'delivery']), ...(pos && { table: String(between(1, 20)) }),
        lines, totals: { subtotalCents: subtotal, discountCents: discount, deliveryFeeCents: 0, serviceChargeCents: service, taxCents: 0, loyaltyRedeemedCents: 0, totalCents: total },
        payment: { method, status: cancelled ? 'cancelled' : 'paid', amountCents: total, ...(method === 'cash' && pos && !cancelled && { tenderedCents: Math.ceil(total / 100000) * 100000, changeCents: Math.ceil(total / 100000) * 100000 - total }) },
        status: cancelled ? 'cancelled' : 'completed',
        statusHistory: [{ status: cancelled ? 'cancelled' : 'completed', at, by: staff?._id }],
        createdAt: at, updatedAt: at
      });
    }
  }
  // A couple of live tickets right now, so the kitchen display and orders screen show something working
  for (const [status, mins] of [['preparing', 9], ['confirmed', 3]]) {
    const lines = [pick(items), pick(items)].map((it) => ({ menuItem: it._id, name: it.name, unitPriceCents: it.priceCents, quantity: 1, options: [], lineTotalCents: it.priceCents }));
    const total = lines.reduce((s, l) => s + l.lineTotalCents, 0);
    const at = new Date(Date.now() - mins * 60000);
    orders.push({ reference: ref('O'), source: 'pos', customer: { name: 'Table 7' }, fulfillment: 'dine-in', table: '7', lines, totals: { subtotalCents: total, totalCents: total }, payment: { method: 'cash', status: 'pending', amountCents: total }, status, statusHistory: [{ status, at }], createdAt: at, updatedAt: at });
  }
  await Order.insertMany(orders, { timestamps: false });

  // Bookings: today, tomorrow, and a few past days
  const bookings = [];
  const slots = ['12:30', '13:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
  for (const offset of [-3, -2, -1, 0, 0, 0, 1, 1, 2, 3]) {
    const day = colomboDay(offset);
    if (new Date(`${day}T12:00:00Z`).getUTCDay() === 1) continue; // closed Mondays
    const startsAt = toUtc(day, pick(slots));
    const partySize = between(2, 6);
    const fit = tables.filter((t) => t.seats >= partySize).sort((a, b) => a.seats - b.seats);
    const mine = fit.length ? [fit[randomInt(Math.min(fit.length, 4))]._id] : [];
    const guest = pick(GUESTS);
    bookings.push({
      reference: ref('R'), name: guest, email: `${guest.split(' ')[0].toLowerCase()}@demo.invalid`, phone: '0771234567', partySize, startsAt, endsAt: new Date(startsAt.getTime() + (partySize <= 4 ? 90 : 120) * 60000), tables: mine,
      status: offset < 0 ? 'completed' : offset === 0 && startsAt < new Date() ? 'seated' : 'confirmed',
      occasion: pick([undefined, undefined, 'Birthday', 'Anniversary']), specialRequests: pick([undefined, 'Window table please', 'One guest is vegan']), source: pick(['web', 'web', 'phone'])
    });
  }
  await Reservation.insertMany(bookings, { timestamps: false });

  // Reviews, messages, enquiries, stock
  const texts = [[5, 'Best sea bass in Colombo', 'Perfectly cooked, smoky and tender. Lovely service.'], [5, 'Our new family favourite', 'The lamb shank falls off the bone. Come hungry.'], [4, 'Great food, lively evening', 'Mezze were excellent. A little busy on Friday.']];
  await Review.insertMany(texts.map(([rating, title, text], i) => ({ user: users[i]._id, rating, title, text, displayName: users[i].name.split(' ')[0], status: i === 2 ? 'pending' : 'published' })));
  await ContactMessage.insertMany([{ name: 'Maya de Silva', email: 'maya@demo.invalid', subject: 'Reservation help', message: 'Can we move our booking on Saturday from 7pm to 8pm?' }, { name: 'Chaminda Rodrigo', email: 'chaminda@demo.invalid', subject: 'Feedback', message: 'Wonderful evening, thank you to the whole team.', status: 'handled' }]);
  await CateringEnquiry.insertMany([{ name: 'Priya Ratnam', company: 'Lanka Labs', email: 'priya@demo.invalid', phone: '0771234567', eventType: 'corporate', guests: 40, eventDate: new Date(Date.now() + 20 * 86400000), budget: 'LKR 250,000', requirements: 'Vegetarian options for about half the group.' }]);
  await StockItem.insertMany(STOCK.map(([name, unit, quantity, lowAt]) => ({ name, unit, quantity, lowAt })));
  console.log(`Added ${orders.length} orders, ${bookings.length} bookings, ${users.length} guests, ${texts.length} reviews, 3 messages/enquiries, ${STOCK.length} stock items.\nRemove them any time with: npm run demo:clear`);
}

const conn = await connectDb();
console.log(`Database: ${conn.name}`);
try {
  if (process.argv.includes('--clear')) await clear();
  else await add();
} finally {
  await mongoose.disconnect();
}
