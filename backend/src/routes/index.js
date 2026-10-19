import { Router } from 'express';
import { MenuCategory, MenuItem } from '../models/index.js';

const router = Router();

// Placeholder for endpoints that are planned but not built yet.
const todo = (req, res) => res.status(501).json({ error: { message: `Not implemented yet: ${req.method} ${req.originalUrl}` } });

// Public menu: the one read endpoint wired up, as a pattern for the rest.
router.get('/menu', async (req, res) => {
  const [categories, items] = await Promise.all([
    MenuCategory.find({ active: true }).sort('sortOrder').lean(),
    MenuItem.find({ archived: false }).sort('sortOrder').lean()
  ]);
  res.json({ categories, items });
});
router.get('/menu/:slug', async (req, res) => {
  const item = await MenuItem.findOne({ slug: req.params.slug, archived: false }).lean();
  if (!item) return res.status(404).json({ error: { message: 'Dish not found' } });
  res.json(item);
});

// Reservations
router.get('/reservations/availability', todo);
router.post('/reservations', todo);
router.patch('/reservations/:reference', todo);

// Ordering and payments
router.post('/orders', todo);
router.get('/orders/:reference', todo);
router.post('/payments/checkout', todo);
router.post('/payments/webhook', todo);

// Accounts
router.post('/auth/register', todo);
router.post('/auth/login', todo);
router.post('/auth/logout', todo);
router.get('/account/orders', todo);

// Content
router.get('/reviews', todo);
router.post('/reviews', todo);
router.post('/catering-enquiries', todo);
router.get('/blog', todo);
router.get('/gallery', todo);

// Admin (role checks go on these routes)
router.use('/admin', todo);

export default router;
