import mongoose from 'mongoose';

export const DIETARY_TAGS = ['vegan', 'vegetarian', 'gluten-free', 'spicy'];
export const CHANNELS = ['dine-in', 'pickup', 'delivery'];

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const optionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  priceCents: { type: Number, default: 0, min: 0 }
});

const modifierSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Size", "Extras"
  required: { type: Boolean, default: false },
  maxSelect: { type: Number, default: 1 },
  options: [optionSchema]
});

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
    priceCents: { type: Number, required: true, min: 0, validate: Number.isInteger }, // LKR x 100
    images: [{ url: String, alt: String }],
    dietaryTags: [{ type: String, enum: DIETARY_TAGS }],
    allergens: [String],
    availability: { type: String, enum: ['available', 'unavailable', 'scheduled', 'sold-out'], default: 'available' },
    availableFrom: Date,
    availableUntil: Date,
    featured: { type: Boolean, default: false },
    prepMinutes: Number,
    modifiers: [modifierSchema],
    channels: { type: [{ type: String, enum: CHANNELS }], default: CHANNELS },
    maxPerOrder: Number,
    sortOrder: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);
menuItemSchema.index({ category: 1, sortOrder: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

export const MenuCategory = mongoose.model('MenuCategory', categorySchema);
export const MenuItem = mongoose.model('MenuItem', menuItemSchema);
