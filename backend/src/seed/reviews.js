// Adds sample published reviews without touching the menu. Safe to re-run. Run: npm run seed:reviews
// These are fictional placeholders (verified=false); remove them once real guest reviews exist.
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { Review } from '../models/index.js';

const SAMPLE_USER = new mongoose.Types.ObjectId('000000000000000000000001');

const reviews = [
  [5, 'Best sea bass in Colombo', 'The charcoal-grilled sea bass was perfectly cooked, smoky and tender. Lovely service and a warm, relaxed room.', 'Nimali'],
  [5, 'Our new family favourite', 'We came for a birthday dinner and everyone left happy. The lamb shank falls off the bone and the fondant is a must.', 'Rajiv'],
  [4, 'Great food, lively evening', 'Mezze to start were excellent, especially the halloumi. A little busy on Friday but the staff handled it well.', 'Anusha'],
  [5, 'Perfect for a date night', 'Candlelit, cosy and the mushroom risotto was creamy and rich. We will definitely be back.', 'Dilshan'],
  [5, 'Brunch done right', 'Weekend brunch was fresh and generous. The passion fruit iced tea was a lovely touch.', 'Sarah'],
  [4, 'Honest cooking', 'Simple ingredients treated with care. The chili garlic prawns had just the right kick.', 'Kasun'],
  [5, 'Private dining was seamless', 'We hosted a small team dinner upstairs. Friendly planning, great menu and everything arrived on time.', 'Priya'],
  [4, 'Lovely vegetarian options', 'Plenty for non-meat eaters. The spiced chickpea bowl and smoky aubergine dip were standouts.', 'Mohamed']
];

await connectDb();
await Review.deleteMany({ user: SAMPLE_USER });
await Review.insertMany(reviews.map(([rating, title, text, displayName]) => ({ user: SAMPLE_USER, rating, title, text, displayName, status: 'published', verified: false })));
console.log(`Added ${reviews.length} sample reviews.`);
await mongoose.disconnect();
