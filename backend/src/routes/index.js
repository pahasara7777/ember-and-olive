import { Router } from 'express';
import auth from './auth.js';
import menu from './menu.js';
import orders from './orders.js';
import reservations from './reservations.js';
import account from './account.js';
import content from './content.js';
import admin from './admin.js';

const router = Router();

router.use('/menu', menu);

// Reservations
router.use('/reservations', reservations);

// Ordering (cash only for now; no card endpoints exist until a payment provider is chosen)
router.use('/orders', orders);

// Accounts
router.use('/auth', auth);
router.use('/account', account);

// Content: gallery, blog, reviews, catering enquiries
router.use('/', content);

// Staff only: every route inside checks the signed-in user's role on the server
router.use('/admin', admin);

export default router;
