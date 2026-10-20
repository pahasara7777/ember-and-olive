import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.js';
import { HAS_DB, connectTestDb, disconnectTestDb } from './db.js';
import { BlogPost, CateringEnquiry, ContactMessage, GalleryImage, Review } from '../src/models/index.js';

const skip = !HAS_DB && 'set MONGODB_TEST_URI to run database tests';
let app, member;

before(async () => {
  if (skip) return;
  await connectTestDb('content');
  await BlogPost.create([
    { title: 'Live', slug: 'live', status: 'published', publishAt: new Date(Date.now() - 1000), body: 'Hello' },
    { title: 'Draft', slug: 'draft', status: 'draft' },
    { title: 'Future', slug: 'future', status: 'published', publishAt: new Date(Date.now() + 86400000) }
  ]);
  await GalleryImage.create({ url: '/img/a.jpg', alt: 'Dining room', category: 'interior' });
  app = await startApp();
  member = await startApp();
  await member.call('POST', '/api/v1/auth/register', { body: { name: 'Member One', email: 'm@example.com', password: 'a-long-passphrase-1' } });
});
after(async () => { if (skip) return; app.close(); member.close(); await disconnectTestDb(); });

test('only live published posts are public', { skip }, async () => {
  const list = await app.call('GET', '/api/v1/blog');
  assert.deepEqual(list.json.posts.map((p) => p.slug), ['live']);
  assert.equal((await app.call('GET', '/api/v1/blog/draft')).status, 404);
  assert.equal((await app.call('GET', '/api/v1/blog/live')).status, 200);
  assert.equal((await app.call('GET', '/api/v1/gallery')).json.images.length, 1);
});

test('reviews need an account and stay hidden until approved', { skip }, async () => {
  const body = { rating: 5, text: 'Wonderful evening, the sea bass was perfect.' };
  assert.equal((await app.call('POST', '/api/v1/reviews', { body })).status, 401);
  const made = await member.call('POST', '/api/v1/reviews', { body });
  assert.equal(made.status, 201);
  assert.equal(made.json.review.status, 'pending');
  assert.equal((await app.call('GET', '/api/v1/reviews')).json.reviews.length, 0);
  await Review.updateOne({ status: 'pending' }, { status: 'published' });
  assert.equal((await app.call('GET', '/api/v1/reviews')).json.reviews.length, 1);
});

test('reviews cannot self-approve, self-verify, or inject markup', { skip }, async () => {
  const text = 'Lovely food and friendly staff all round.';
  assert.equal((await member.call('POST', '/api/v1/reviews', { body: { rating: 5, text, status: 'published' } })).status, 400);
  assert.equal((await member.call('POST', '/api/v1/reviews', { body: { rating: 5, text, verified: true } })).status, 400);
  assert.equal((await member.call('POST', '/api/v1/reviews', { body: { rating: 9, text } })).status, 400);
  await member.call('POST', '/api/v1/reviews', { body: { rating: 4, text: '<script>alert(1)</script>Great place to eat', displayName: '<b>Sam</b>' } });
  const stored = await Review.findOne({ displayName: 'Sam' });
  assert.equal(stored.text, 'alert(1)Great place to eat');
  assert.equal(stored.verified, false);
});

test('catering enquiries are validated and stored clean', { skip }, async () => {
  const ok = { name: 'Corp Events', email: 'events@corp.example', phone: '+94112345678', eventType: 'corporate', guests: 40, requirements: '<img src=x onerror=alert(1)>Vegetarian menu' };
  assert.equal((await app.call('POST', '/api/v1/catering-enquiries', { body: ok })).status, 201);
  assert.equal((await CateringEnquiry.findOne({ email: 'events@corp.example' })).requirements, 'Vegetarian menu');
  assert.equal((await app.call('POST', '/api/v1/catering-enquiries', { body: { ...ok, eventType: 'wedding' } })).status, 400);
  assert.equal((await app.call('POST', '/api/v1/catering-enquiries', { body: { ...ok, status: 'confirmed' } })).status, 400);
});

test('contact messages are validated and stored clean', { skip }, async () => {
  const ok = { name: 'Asha', email: 'asha@example.com', subject: 'Feedback', message: '<b>Lovely</b> evening' };
  assert.equal((await app.call('POST', '/api/v1/contact-messages', { body: ok })).status, 201);
  assert.equal((await ContactMessage.findOne({ email: 'asha@example.com' })).message, 'Lovely evening');
  assert.equal((await app.call('POST', '/api/v1/contact-messages', { body: { ...ok, subject: 'Spam' } })).status, 400);
  assert.equal((await app.call('POST', '/api/v1/contact-messages', { body: { ...ok, status: 'handled' } })).status, 400);
});
