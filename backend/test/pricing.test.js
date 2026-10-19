import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceCart, DELIVERY_FEE_CENTS } from '../src/lib/pricing.js';

const item = (over = {}) => ({
  _id: 'a1', name: 'Ember Hummus', priceCents: 145000, availability: 'available', archived: false,
  channels: ['pickup', 'delivery'], modifiers: [], ...over
});
const menu = (...items) => new Map(items.map((i) => [String(i._id), i]));

test('prices come from the menu, never from the request', () => {
  const { lines, totals } = priceCart(menu(item()), [{ menuItem: 'a1', quantity: 2, priceCents: 1 }], 'pickup');
  assert.equal(lines[0].unitPriceCents, 145000);
  assert.equal(totals.totalCents, 290000);
});

test('delivery adds the fee and enforces the minimum', () => {
  const m = menu(item({ priceCents: 250000 }));
  assert.equal(priceCart(m, [{ menuItem: 'a1', quantity: 1 }], 'delivery').totals.totalCents, 250000 + DELIVERY_FEE_CENTS);
  assert.throws(() => priceCart(menu(item()), [{ menuItem: 'a1', quantity: 1 }], 'delivery'), /minimum/);
});

test('unknown, archived, unavailable and wrong-channel dishes are refused', () => {
  assert.throws(() => priceCart(menu(item()), [{ menuItem: 'zz', quantity: 1 }], 'pickup'), /no longer/);
  assert.throws(() => priceCart(menu(item({ archived: true })), [{ menuItem: 'a1', quantity: 1 }], 'pickup'), /no longer/);
  assert.throws(() => priceCart(menu(item({ availability: 'sold-out' })), [{ menuItem: 'a1', quantity: 1 }], 'pickup'), /not available/);
  assert.throws(() => priceCart(menu(item({ channels: ['dine-in'] })), [{ menuItem: 'a1', quantity: 1 }], 'pickup'), /not available for pickup/);
});

test('quantity limits apply', () => {
  assert.throws(() => priceCart(menu(item({ maxPerOrder: 3 })), [{ menuItem: 'a1', quantity: 4 }], 'pickup'), /at most 3/);
  assert.throws(() => priceCart(menu(item()), [{ menuItem: 'a1', quantity: 21 }], 'pickup'), /at most 20/);
});

test('modifier options add to the price and are validated', () => {
  const withMods = item({
    modifiers: [{ name: 'Size', required: true, maxSelect: 1, options: [{ _id: 'o1', name: 'Large', priceCents: 30000 }, { _id: 'o2', name: 'Small', priceCents: 0 }] }]
  });
  const ok = priceCart(menu(withMods), [{ menuItem: 'a1', quantity: 1, options: ['o1'] }], 'pickup');
  assert.equal(ok.lines[0].unitPriceCents, 175000);
  assert.throws(() => priceCart(menu(withMods), [{ menuItem: 'a1', quantity: 1 }], 'pickup'), /Choose a Size/);
  assert.throws(() => priceCart(menu(withMods), [{ menuItem: 'a1', quantity: 1, options: ['o1', 'o2'] }], 'pickup'), /Too many/);
  assert.throws(() => priceCart(menu(withMods), [{ menuItem: 'a1', quantity: 1, options: ['o1', 'fake'] }], 'pickup'), /Invalid option/);
});

test('totals are whole cents', () => {
  const { totals } = priceCart(menu(item({ priceCents: 123457 })), [{ menuItem: 'a1', quantity: 3 }], 'pickup');
  assert.ok(Number.isInteger(totals.totalCents));
});
