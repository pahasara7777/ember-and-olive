// Sample gallery and journal content for the demo site. The owner replaces it with real photos and articles.
const img = (name) => `/img/${name}.jpg`;

export const galleryImages = [
  ['dining', 'Candlelit private dining table', 'Private dining', 'events'],
  ['sea-bass', 'Grilled whole sea bass', 'Food', 'food'],
  ['prawns', 'Prawns in chili garlic sauce', 'Food', 'food'],
  ['chef', 'Chef cooking over the charcoal grill', 'Team', 'team'],
  ['lamb', 'Slow-braised lamb shank', 'Food', 'food'],
  ['hummus', 'Hummus with flatbread', 'Food', 'food'],
  ['halloumi', 'Charred halloumi salad', 'Food', 'food'],
  ['steak-risotto', 'Steak with risotto', 'Food', 'food'],
  ['fondant', 'Chocolate fondant with ice cream', 'Desserts', 'food'],
  ['tea', 'Iced drink with orange and strawberry', 'Drinks', 'food'],
  ['chicken', 'Roasted chicken platter', 'Catering', 'catering'],
  ['prawns-grill', 'Grilled prawns in a hot pan', 'Food', 'food']
].map(([file, alt, caption, category], sortOrder) => ({ url: img(file), alt, caption, category, sortOrder }));

const days = (n) => new Date(Date.now() - n * 86400000);

export const blogPosts = [
  {
    title: 'The Story Behind Our Charcoal Grill',
    slug: 'story-behind-our-charcoal-grill',
    category: "Chef's Notes",
    excerpt: 'Why we cook over coals, what it does to fish and lamb, and the small rituals that start every service.',
    cover: ['chef', 'Chef cooking over the charcoal grill'],
    publishAt: days(3),
    body: `Every service at The Ember & Olive starts the same way: someone lights the coals about two hours before the doors open.

We use charcoal because it gives a dry, even heat that can be pushed hot enough to blister the skin of a sea bass without drying the flesh. Gas cannot give you that smoke, and a pan cannot give you that edge.

Lamb gets the opposite treatment. We braise it slowly first, then finish it near the embers so the surface picks up a little char and the smell of the grill.

The last ritual before service is tasting the fire: a piece of bread, a drizzle of olive oil, a pinch of salt, held over the coals. If it tastes right, we open.`
  },
  {
    title: 'A Guide to Mediterranean Sharing Plates',
    slug: 'guide-to-mediterranean-sharing-plates',
    category: "Chef's Notes",
    excerpt: 'How to order mezze for the table, and what goes well together.',
    cover: ['hummus', 'Hummus with flatbread'],
    publishAt: days(10),
    body: `A good mezze table has contrast. Start with something creamy, like hummus or the smoky aubergine dip, then add something sharp and fresh, like the Greek salad.

Add one hot plate for every two guests: charred halloumi or chili garlic prawns work well. Finish with one grilled main to share.

As a rule of thumb, order two or three small plates per person and one main for every two. Ask the team if you are unsure, and tell us about any allergies when you order.`
  },
  {
    title: 'Seasonal Ingredients We Love in Sri Lanka',
    slug: 'seasonal-ingredients-we-love-in-sri-lanka',
    category: 'Seasonal Ingredients',
    excerpt: 'The local produce that shapes our menu through the year.',
    cover: ['chickpea', 'Chickpea and vegetable salad'],
    publishAt: days(21),
    body: `Mediterranean technique works well with Sri Lankan produce. Ripe tomatoes, lime, curry leaf, green chilies and fresh coastal fish all find a place on our menu.

We change our specials with the market, so what you eat in one month may not be on the table in the next.

Supplier details will be added here once confirmed by the owner.`
  }
];
