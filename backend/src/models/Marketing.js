import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed', 'free-delivery'], required: true },
    value: { type: Number, default: 0 }, // percent (10 = 10%) or cents for fixed
    maxDiscountCents: Number,
    minSpendCents: { type: Number, default: 0 },
    startsAt: Date,
    expiresAt: Date,
    usageLimit: Number,
    perCustomerLimit: Number,
    firstOrderOnly: { type: Boolean, default: false },
    fulfillments: [{ type: String, enum: ['pickup', 'delivery'] }],
    eligibleCategories: [{ type: ObjectId, ref: 'MenuCategory' }],
    excludedItems: [{ type: ObjectId, ref: 'MenuItem' }],
    combinableWithLoyalty: { type: Boolean, default: false },
    redemptions: [{ order: { type: ObjectId, ref: 'Order' }, user: { type: ObjectId, ref: 'User' }, at: Date }],
    active: { type: Boolean, default: false } // offers start inactive until the owner approves
  },
  { timestamps: true }
);

// Ledger: the balance is the sum of points, never a single editable number.
const loyaltySchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    order: { type: ObjectId, ref: 'Order' },
    type: { type: String, enum: ['earn', 'redeem', 'expire', 'reverse', 'adjust'], required: true },
    points: { type: Number, required: true }, // positive to earn, negative to spend
    expiresAt: Date,
    note: String
  },
  { timestamps: true }
);
loyaltySchema.index({ user: 1, createdAt: -1 });

const reviewSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    order: { type: ObjectId, ref: 'Order' },
    reservation: { type: ObjectId, ref: 'Reservation' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: String,
    text: String,
    displayName: String,
    status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending' },
    verified: { type: Boolean, default: false }, // only set from a real order or visit
    ownerResponse: String,
    reports: [{ by: { type: ObjectId, ref: 'User' }, reason: String, at: Date }]
  },
  { timestamps: true }
);

const galleryImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, required: true },
    caption: String,
    category: { type: String, enum: ['food', 'interior', 'team', 'events', 'catering'], required: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: String,
    body: String,
    coverImage: { url: String, alt: String },
    category: { type: String, enum: ["Chef's Notes", 'Seasonal Ingredients', 'Events'] },
    author: { type: ObjectId, ref: 'User' },
    status: { type: String, enum: ['draft', 'scheduled', 'published', 'archived'], default: 'draft' },
    publishAt: Date,
    seo: { title: String, description: String }
  },
  { timestamps: true }
);

const cateringEnquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    company: String,
    email: { type: String, required: true },
    phone: { type: String, required: true },
    eventType: { type: String, enum: ['private-dining', 'buyout', 'corporate', 'office-catering', 'private-catering'], required: true },
    eventDate: Date,
    guests: Number,
    location: String,
    budget: String,
    requirements: String,
    attachmentUrl: String,
    status: { type: String, enum: ['new', 'contacted', 'quoted', 'confirmed', 'lost'], default: 'new' },
    staffNotes: String
  },
  { timestamps: true }
);

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: ObjectId, ref: 'User' },
    action: { type: String, required: true }, // e.g. "menu.price.update"
    entity: String,
    entityId: ObjectId,
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    ip: String
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Coupon = mongoose.model('Coupon', couponSchema);
export const LoyaltyTransaction = mongoose.model('LoyaltyTransaction', loyaltySchema);
export const Review = mongoose.model('Review', reviewSchema);
export const GalleryImage = mongoose.model('GalleryImage', galleryImageSchema);
export const BlogPost = mongoose.model('BlogPost', blogPostSchema);
export const CateringEnquiry = mongoose.model('CateringEnquiry', cateringEnquirySchema);
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
