import mongoose from 'mongoose';

export const ROLES = ['customer', 'host', 'kitchen', 'marketing', 'manager', 'owner'];

const addressSchema = new mongoose.Schema({
  label: String,
  recipientName: String,
  line1: { type: String, required: true },
  unit: String,
  landmark: String,
  instructions: String,
  zone: String
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: String,
    passwordHash: { type: String, required: true, select: false }, // scrypt hash, never the password
    passwordChangedAt: { type: Date, select: false }, // sessions issued before this are rejected
    role: { type: String, enum: ROLES, default: 'customer' },
    emailVerifiedAt: Date,
    addresses: [addressSchema],
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
    marketingConsent: { given: { type: Boolean, default: false }, at: Date, source: String },
    active: { type: Boolean, default: true },
    failedLogins: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, select: false }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
