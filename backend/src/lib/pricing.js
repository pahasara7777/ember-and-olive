import { HttpError } from '../middleware/error.js';

// Sample commercial rules from the brief; the owner must confirm them before launch.
export const DELIVERY_FEE_CENTS = 35000; // LKR 350
export const DELIVERY_MIN_CENTS = 200000; // LKR 2,000 minimum for delivery
export const MAX_LINE_QUANTITY = 20;
export const SERVICE_CHARGE_PCT = 10; // POS dine-in service charge, optional per sale

/**
 * Prices a cart from the menu as stored in the database. The browser only says WHICH dishes and options
 * it wants; every name, price and total here is recomputed on the server, in whole cents.
 * @param {Map<string, object>} menuById menu items keyed by id string
 * @param {Array<{menuItem: string, quantity: number, options?: string[], notes?: string}>} lines
 * @param {{deliveryFeeCents: number, deliveryMinCents: number}} [rules] the owner's settings; defaults are the sample brief values
 */
export function priceCart(menuById, lines, fulfillment, rules = { deliveryFeeCents: DELIVERY_FEE_CENTS, deliveryMinCents: DELIVERY_MIN_CENTS }) {
  const priced = lines.map((line) => {
    const item = menuById.get(line.menuItem);
    if (!item || item.archived) throw new HttpError(400, 'One of the dishes in your cart is no longer on the menu');
    if (item.availability !== 'available') throw new HttpError(409, `${item.name} is not available right now`);
    if (!item.channels.includes(fulfillment)) throw new HttpError(400, `${item.name} is not available for ${fulfillment}`);
    const max = Math.min(item.maxPerOrder || MAX_LINE_QUANTITY, MAX_LINE_QUANTITY);
    if (line.quantity > max) throw new HttpError(400, `You can order at most ${max} of ${item.name}`);

    const chosen = [...new Set(line.options ?? [])];
    const options = [];
    for (const modifier of item.modifiers ?? []) {
      const picked = modifier.options.filter((o) => chosen.includes(String(o._id)));
      if (modifier.required && picked.length === 0) throw new HttpError(400, `Choose a ${modifier.name} for ${item.name}`);
      if (picked.length > (modifier.maxSelect || 1)) throw new HttpError(400, `Too many ${modifier.name} choices for ${item.name}`);
      options.push(...picked.map((o) => ({ name: o.name, priceCents: o.priceCents })));
    }
    if (options.length !== chosen.length) throw new HttpError(400, `Invalid option for ${item.name}`);

    const unitPriceCents = item.priceCents + options.reduce((sum, o) => sum + o.priceCents, 0);
    return {
      menuItem: item._id,
      name: item.name,
      unitPriceCents,
      quantity: line.quantity,
      options,
      notes: line.notes,
      lineTotalCents: unitPriceCents * line.quantity
    };
  });

  const subtotalCents = priced.reduce((sum, l) => sum + l.lineTotalCents, 0);
  if (fulfillment === 'delivery' && subtotalCents < rules.deliveryMinCents) {
    throw new HttpError(400, `The minimum order for delivery is LKR ${(rules.deliveryMinCents / 100).toLocaleString('en-LK')}`);
  }
  const deliveryFeeCents = fulfillment === 'delivery' ? rules.deliveryFeeCents : 0;
  return {
    lines: priced,
    totals: { subtotalCents, discountCents: 0, deliveryFeeCents, serviceChargeCents: 0, taxCents: 0, loyaltyRedeemedCents: 0, totalCents: subtotalCents + deliveryFeeCents }
  };
}
