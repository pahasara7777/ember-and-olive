import { Router } from 'express';
import auth from './auth.js';
import menu from './menu.js';
import orders from './orders.js';
import reservations from './reservations.js';
import account from './account.js';
import content from './content.js';

const router = Router();

// Placeholder for endpoints that are planned but not built yet.
const todo = (req, res) => res.status(501).json({ error: { message: `Not implemented yet: ${req.method} ${req.originalUrl}` } });

router.use('/menu', menu);

// Reservations
router.use('/reservations', reservations);

// Ordering and payments
router.use('/orders', orders);
router.post('/payments/checkout', todo);
router.post('/payments/webhook', todo);

// Accounts
router.use('/auth', auth);
router.use('/account', account);

// Content: gallery, blog, reviews, catering enquiries
router.use('/', content);

// Admin (role checks go on these routes)
router.use('/admin', todo);

export default router;
