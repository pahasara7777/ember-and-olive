// Loads the sample menu and tables from the client brief. Run: npm run seed
// Prices are illustrative and must be approved by the owner before launch.
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { MenuCategory, MenuItem, DiningTable, GalleryImage, BlogPost } from '../models/index.js';
import { galleryImages, blogPosts } from './content.js';

const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const lkr = (n) => n * 100; // store money as cents

const categories = ['Small Plates & Mezze', 'Salads & Soups', 'Pasta & Grains', 'From the Grill', 'Mains', 'Sides', 'Desserts', 'Beverages', 'Weekend Brunch', 'Seasonal Specials'];

const dishes = [
  ['Small Plates & Mezze', 'Ember Hummus', 1450, 'Creamy chickpea hummus, extra-virgin olive oil, smoked paprika, herbs and warm flatbread.', ['vegetarian']],
  ['Small Plates & Mezze', 'Charred Halloumi', 1950, 'Grilled halloumi with lemon, honey, oregano and seasonal greens.', ['vegetarian', 'gluten-free']],
  ['Small Plates & Mezze', 'Chili Garlic Prawns', 2650, 'Sautéed prawns with garlic, chili, parsley and a lemon butter sauce.', ['gluten-free', 'spicy'], ['shellfish']],
  ['Small Plates & Mezze', 'Smoky Aubergine Dip', 1550, 'Fire-roasted aubergine, tahini, lemon, pomegranate and toasted seeds.', ['vegan', 'gluten-free'], ['sesame']],
  ['Salads & Soups', 'Garden Greek Salad', 1850, 'Tomatoes, cucumber, olives, red onion, feta, oregano and lemon dressing.', ['vegetarian', 'gluten-free'], ['milk']],
  ['Salads & Soups', 'Red Lentil & Tomato Soup', 1250, 'Slow-simmered lentils, tomato, roasted cumin and fresh coriander.', ['vegan', 'gluten-free']],
  ['Pasta & Grains', 'Garlic & Olive Oil Spaghetti', 2250, 'Spaghetti tossed with garlic, olive oil, parsley and chili flakes.', ['vegan'], ['gluten']],
  ['Pasta & Grains', 'Wild Mushroom Risotto', 2950, 'Creamy Arborio rice, sautéed mushrooms, Parmesan and thyme.', ['vegetarian'], ['milk']],
  ['Pasta & Grains', 'Slow-Roasted Tomato Penne', 2450, 'Penne with roasted tomato sauce, basil, garlic and aged Parmesan.', ['vegetarian'], ['gluten', 'milk']],
  ['From the Grill', 'Charcoal-Grilled Sea Bass', 4850, 'Fresh sea bass, lemon-herb oil, seasonal vegetables and roasted potatoes.', ['gluten-free'], ['fish']],
  ['From the Grill', 'Lemon & Rosemary Chicken', 3250, 'Marinated chicken, rosemary jus, roasted potatoes and seasonal greens.', []],
  ['Mains', 'Slow-Braised Lamb Shank', 4950, 'Tender lamb braised with herbs, tomato and red wine, served with potato purée.', []],
  ['From the Grill', 'Grilled Beef Sirloin', 4650, 'Grilled sirloin, peppercorn sauce, seasonal vegetables and crispy potatoes.', []],
  ['Mains', 'Spiced Chickpea & Vegetable Bowl', 2450, 'Chickpeas, seasonal vegetables, herbs, tahini and a warm spice dressing.', ['vegan'], ['sesame']],
  ['Sides', 'Rosemary Crispy Potatoes', 850, 'Golden potatoes with rosemary, sea salt and roasted garlic.', ['vegan']],
  ['Desserts', 'Dark Chocolate Fondant', 1450, 'Warm chocolate cake with a soft centre, served with vanilla ice cream.', ['vegetarian'], ['milk', 'egg', 'gluten']],
  ['Desserts', 'Vanilla Panna Cotta', 1250, 'Vanilla cream dessert with seasonal fruit and berry coulis.', ['vegetarian'], ['milk']],
  ['Beverages', 'Passion Fruit Iced Tea', 950, 'Freshly brewed tea, passion fruit, citrus and a touch of sweetness.', ['vegan', 'gluten-free']]
];

// shortcut: placeholder floor plan (72 seats); replace with the real layout from management.
const tables = [
  ...Array.from({ length: 8 }, (_, i) => ({ label: `T${i + 1}`, seats: 2 })),
  ...Array.from({ length: 8 }, (_, i) => ({ label: `T${i + 9}`, seats: 4 })),
  ...Array.from({ length: 4 }, (_, i) => ({ label: `T${i + 17}`, seats: 6 }))
];

await connectDb();
await Promise.all([MenuCategory.deleteMany({}), MenuItem.deleteMany({}), DiningTable.deleteMany({}), GalleryImage.deleteMany({}), BlogPost.deleteMany({})]);

const cats = await MenuCategory.insertMany(categories.map((name, i) => ({ name, slug: slug(name), sortOrder: i })));
const catId = Object.fromEntries(cats.map((c) => [c.name, c._id]));

await MenuItem.insertMany(
  dishes.map(([cat, name, price, description, dietaryTags, allergens = []], i) => ({
    name, slug: slug(name), description, category: catId[cat], priceCents: lkr(price),
    dietaryTags, allergens, sortOrder: i,
    featured: ['Charcoal-Grilled Sea Bass', 'Slow-Braised Lamb Shank', 'Chili Garlic Prawns', 'Wild Mushroom Risotto'].includes(name)
  }))
);
await DiningTable.insertMany(tables);
await GalleryImage.insertMany(galleryImages);
await BlogPost.insertMany(blogPosts.map(({ cover, ...p }) => ({ ...p, status: 'published', coverImage: { url: `/img/${cover[0]}.jpg`, alt: cover[1] } })));

const seats = tables.reduce((s, t) => s + t.seats, 0);
console.log(`Seeded ${cats.length} categories, ${dishes.length} dishes, ${tables.length} tables (${seats} seats), ${galleryImages.length} photos, ${blogPosts.length} articles.`);
await mongoose.disconnect();
