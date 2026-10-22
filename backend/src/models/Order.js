import mongoose from 'mongoose';

export const ORDER_STATUSES = [
  'payment-pending', 'placed', 'confirmed', 'preparing', 'ready', 'out-for-delivery',
  'completed', 'cancelled', 'payment-failed'
];

// Snapshot of the item at order time, so later menu edits never change old orders.
const lineSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name: { type: String, required: true },
  unitPriceCents: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  options: [{ name: String, priceCents: Number }],
  notes: String,
  lineTotalCents: { type: Number, required: true }
});

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ['card', 'cash', 'cash-pickup', 'cash-delivery'], required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded', 'partially-refunded'], default: 'pending' },
    gatewayRef: String, // id from the payment provider, never card data
    amountCents: Number,
    tenderedCents: Number, // POS cash: what the guest handed over
    changeCents: Number, // POS cash: what went back
    refundedCents: { type: Number, default: 0 },
    events: [{ type: { type: String }, at: Date, payload: mongoose.Schema.Types.Mixed }]
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    idempotencyKey: { type: String, unique: true, sparse: true }, // stops double submission
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional, guest checkout allowed
    customer: { name: String, email: String, phone: String },
    fulfillment: { type: String, enum: ['dine-in', 'pickup', 'delivery'], required: true },
    table: String, // POS dine-in orders
    source: { type: String, enum: ['web', 'pos'], default: 'web' },
    scheduledFor: Date,
    delivery: { recipientName: String, line1: String, unit: String, landmark: String, instructions: String, zone: String },
    lines: { type: [lineSchema], validate: (v) => v.length > 0 },
    totals: {
      subtotalCents: Number,
      discountCents: { type: Number, default: 0 },
      deliveryFeeCents: { type: Number, default: 0 },
      serviceChargeCents: { type: Number, default: 0 },
      taxCents: { type: Number, default: 0 },
      loyaltyRedeemedCents: { type: Number, default: 0 },
      totalCents: Number
    },
    coupon: { code: String, coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' } },
    payment: paymentSchema,
    status: { type: String, enum: ORDER_STATUSES, default: 'payment-pending' },
    statusHistory: [{ status: String, at: Date, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reason: String }],
    notes: String
  },
  { timestamps: true }
);
orderSchema.index({ createdAt: -1, status: 1 });

export default mongoose.model('Order', orderSchema);
