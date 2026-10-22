import { Router } from 'express';
import { z } from 'zod';
import { MenuCategory, MenuItem } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { getSettings } from '../lib/settings.js';

const router = Router();

// Only fields the website needs; internal ones (updatedBy, archived, timestamps) stay on the server.
const ITEM_FIELDS = 'name slug description category priceCents images dietaryTags allergens availability featured prepMinutes modifiers channels maxPerOrder sortOrder';
const slugParam = z.string().regex(/^[a-z0-9-]{1,80}$/);

router.get('/', async (req, res) => {
  const [categories, items] = await Promise.all([
    MenuCategory.find({ active: true }).select('name slug sortOrder').sort('sortOrder').lean(),
    MenuItem.find({ archived: false }).select(ITEM_FIELDS).sort('sortOrder').lean()
  ]);
  res.json({ categories, items });
});

// Delivery rules the checkout page shows; must come before the /:slug route.
router.get('/rules', async (req, res) => {
  const { deliveryFeeCents, deliveryMinCents } = await getSettings();
  res.json({ deliveryFeeCents, deliveryMinCents });
});

router.get('/:slug', async (req, res) => {
  const slug = slugParam.safeParse(req.params.slug);
  const item = slug.success && (await MenuItem.findOne({ slug: slug.data, archived: false }).select(ITEM_FIELDS).lean());
  if (!item) throw new HttpError(404, 'Dish not found');
  res.json(item);
});

export default router;
