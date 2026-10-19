import { Router } from 'express';
import auth from './auth.js';
import menu from './menu.js';

const router = Router();

// Placeholder for endpoints that are planned but not built yet.
const todo = (req, res) => res.status(501).json({ error: { message: `Not implemented yet: ${req.method} ${req.originalUrl}` } });

router.use('/menu', menu);

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
router.use('/auth', auth);
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
