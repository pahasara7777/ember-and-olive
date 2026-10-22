import mongoose from 'mongoose';

// One document holds the shop rules the owner can change without a deploy.
const settingSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  servicePct: { type: Number, default: 10, min: 0, max: 30 }, // POS dine-in service charge
  deliveryFeeCents: { type: Number, default: 35000, min: 0 },
  deliveryMinCents: { type: Number, default: 200000, min: 0 }
});

const stockSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    unit: { type: String, default: 'pcs' },
    quantity: { type: Number, default: 0 },
    lowAt: { type: Number, default: 0 }, // flagged when quantity is at or below this
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// End-of-day cash count: expected comes from the sales, counted from the drawer.
const dayCloseSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // Colombo day, YYYY-MM-DD
    openingFloatCents: { type: Number, default: 0 },
    expectedCashCents: Number,
    countedCashCents: Number,
    varianceCents: Number,
    note: String,
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const Setting = mongoose.model('Setting', settingSchema);
export const StockItem = mongoose.model('StockItem', stockSchema);
export const DayClose = mongoose.model('DayClose', dayCloseSchema);
