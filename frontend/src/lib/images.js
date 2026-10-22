// Photos for the sample menu. Items without a mapped photo fall back to a plain plate.
const BY_SLUG = {
  'ember-hummus': 'hummus', 'charred-halloumi': 'halloumi', 'chili-garlic-prawns': 'prawns',
  'smoky-aubergine-dip': 'aubergine', 'garden-greek-salad': 'salad', 'red-lentil-and-tomato-soup': 'soup',
  'garlic-and-olive-oil-spaghetti': 'pasta', 'wild-mushroom-risotto': 'risotto', 'slow-roasted-tomato-penne': 'pasta',
  'charcoal-grilled-sea-bass': 'sea-bass', 'lemon-and-rosemary-chicken': 'chicken', 'slow-braised-lamb-shank': 'lamb',
  'grilled-beef-sirloin': 'sirloin', 'spiced-chickpea-and-vegetable-bowl': 'chickpea', 'rosemary-crispy-potatoes': 'potatoes',
  'dark-chocolate-fondant': 'fondant', 'vanilla-panna-cotta': 'pannacotta', 'passion-fruit-iced-tea': 'tea'
};

export const photo = (name) => `/img/${name}.jpg`;
// Takes a dish (a photo uploaded in the admin wins) or just its slug (the sample photos).
export const dishPhoto = (dish) => (typeof dish === 'string' ? (BY_SLUG[dish] ? photo(BY_SLUG[dish]) : null) : dish?.images?.[0]?.url || dishPhoto(dish?.slug));
