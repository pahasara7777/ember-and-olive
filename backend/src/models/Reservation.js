import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  label: { type: String, required: true, unique: true }, // e.g. "T1"
  seats: { type: Number, required: true, min: 1 },
  area: { type: String, default: 'main' }, // main, private, terrace
  combinableWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DiningTable' }],
  active: { type: Boolean, default: true }
});

const reservationSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional, guests can book
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    partySize: { type: Number, required: true, min: 1, max: 12 },
    startsAt: { type: Date, required: true }, // stored in UTC, shown in Asia/Colombo
    endsAt: { type: Date, required: true }, // 90 min for 1-4 guests, 120 min for 5-8
    tables: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DiningTable' }],
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'],
      default: 'confirmed'
    },
    occasion: String,
    specialRequests: String,
    accessibilityNeeds: String,
    internalNotes: String, // staff only, never sent to the customer
    source: { type: String, enum: ['web', 'phone', 'walk-in'], default: 'web' },
    marketingConsent: { type: Boolean, default: false }
  },
  { timestamps: true }
);
// Supports overlap checks: find bookings on the same tables whose time ranges intersect.
reservationSchema.index({ tables: 1, startsAt: 1, endsAt: 1 });
reservationSchema.index({ startsAt: 1, status: 1 });

export const DiningTable = mongoose.model('DiningTable', tableSchema);
export const Reservation = mongoose.model('Reservation', reservationSchema);
