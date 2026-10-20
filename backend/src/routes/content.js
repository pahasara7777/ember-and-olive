import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { BlogPost, CateringEnquiry, ContactMessage, GalleryImage, Order, Review } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { formLimiter } from '../middleware/rateLimit.js';
import { plain, optionalPlain, email, phone } from '../lib/text.js';

const router = Router();

router.get('/gallery', async (req, res) => {
  res.json({ images: await GalleryImage.find().select('url alt caption category').sort('sortOrder').lean() });
});

router.get('/blog', async (req, res) => {
  const posts = await BlogPost.find({ status: 'published', publishAt: mongoose.trusted({ $not: { $gt: new Date() } }) })
    .select('title slug excerpt coverImage category publishAt')
    .sort('-publishAt')
    .lean();
  res.json({ posts });
});

router.get('/blog/:slug', async (req, res) => {
  const slug = z.string().regex(/^[a-z0-9-]{1,100}$/).safeParse(req.params.slug);
  const post = slug.success && (await BlogPost.findOne({ slug: slug.data, status: 'published' }).select('title slug excerpt body coverImage category publishAt').lean());
  if (!post) throw new HttpError(404, 'Post not found');
  res.json({ post }); // body is plain text; the website renders it as text, never as HTML
});

// Reviews are shown only after staff approve them.
router.get('/reviews', async (req, res) => {
  const reviews = await Review.find({ status: 'published' }).select('rating title text displayName ownerResponse verified createdAt').sort('-createdAt').limit(100).lean();
  res.json({ reviews });
});

const reviewBody = z.strictObject({ rating: z.number().int().min(1).max(5), title: optionalPlain(100), text: plain(1000, 10), displayName: optionalPlain(60) });

router.post('/reviews', requireAuth, formLimiter({ limit: 5 }), async (req, res) => {
  const body = reviewBody.parse(req.body);
  const hasEaten = await Order.exists({ user: req.user._id, status: 'completed' });
  const review = await Review.create({
    ...body,
    user: req.user._id,
    displayName: body.displayName || req.user.name.split(' ')[0],
    status: 'pending',
    verified: Boolean(hasEaten) // set by the server from real orders, never by the client
  });
  res.status(201).json({ review: { id: review.id, status: review.status } });
});

const cateringBody = z.strictObject({
  name: plain(80),
  company: optionalPlain(100),
  email,
  phone,
  eventType: z.enum(['private-dining', 'buyout', 'corporate', 'office-catering', 'private-catering']),
  eventDate: z.iso.date().optional(),
  guests: z.number().int().min(1).max(1000).optional(),
  location: optionalPlain(150),
  budget: optionalPlain(60),
  requirements: optionalPlain(1500)
});

router.post('/catering-enquiries', formLimiter({ limit: 10 }), async (req, res) => {
  const body = cateringBody.parse(req.body);
  await CateringEnquiry.create({ ...body, eventDate: body.eventDate && new Date(body.eventDate) });
  res.status(201).json({ ok: true });
});

const contactBody = z.strictObject({
  name: plain(80),
  email,
  subject: z.enum(['General question', 'Reservation help', 'Online order', 'Feedback', 'Careers']),
  message: plain(2000)
});

router.post('/contact-messages', formLimiter({ limit: 10 }), async (req, res) => {
  await ContactMessage.create(contactBody.parse(req.body));
  res.status(201).json({ ok: true });
});

export default router;
