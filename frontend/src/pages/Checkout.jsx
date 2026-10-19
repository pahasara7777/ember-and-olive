import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatLkr } from '../lib/api.js';
import { useCart } from '../lib/cart.jsx';
import { useAuth } from '../lib/auth.jsx';
import { Field, FormError, fieldError } from '../components/Form.jsx';

export default function Checkout() {
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  // One key per checkout attempt: pressing the button twice cannot place two orders.
  const idempotencyKey = useMemo(() => crypto.randomUUID().replaceAll('-', ''), []);
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', fulfillment: 'pickup', line1: '', landmark: '', instructions: '', notes: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (cart.lines.length === 0) return <section className="page container"><h1>Checkout</h1><p>Your cart is empty.</p></section>;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const delivery = form.fulfillment === 'delivery' ? { recipientName: form.name, line1: form.line1, landmark: form.landmark || undefined, instructions: form.instructions || undefined } : undefined;
    try {
      const { order } = await api('/orders', {
        method: 'POST',
        body: {
          idempotencyKey,
          customer: { name: form.name, email: form.email, phone: form.phone },
          fulfillment: form.fulfillment,
          paymentMethod: form.fulfillment === 'delivery' ? 'cash-delivery' : 'cash-pickup',
          delivery,
          notes: form.notes || undefined,
          lines: cart.lines.map((l) => ({ menuItem: l.id, quantity: l.quantity }))
        }
      });
      cart.clear();
      navigate(`/order-tracking/${order.reference}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page container narrow">
      <h1>Checkout</h1>
      <p className="muted">{cart.count} item(s) · {formatLkr(cart.subtotalCents)} before delivery. Payment is cash on {form.fulfillment === 'delivery' ? 'delivery' : 'pickup'}.</p>
      <form onSubmit={submit} noValidate>
        <FormError error={error} />
        <fieldset>
          <legend>How would you like it?</legend>
          <label><input type="radio" name="fulfillment" value="pickup" checked={form.fulfillment === 'pickup'} onChange={set('fulfillment')} /> Pickup</label>
          <label><input type="radio" name="fulfillment" value="delivery" checked={form.fulfillment === 'delivery'} onChange={set('fulfillment')} /> Delivery (LKR 350, minimum LKR 2,000)</label>
        </fieldset>
        <Field label="Your name" value={form.name} onChange={set('name')} autoComplete="name" required maxLength={80} error={fieldError(error, 'customer.name')} />
        <Field label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required error={fieldError(error, 'customer.email')} />
        <Field label="Phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" required error={fieldError(error, 'customer.phone')} />
        {form.fulfillment === 'delivery' && (
          <>
            <Field label="Delivery address" value={form.line1} onChange={set('line1')} autoComplete="street-address" required maxLength={150} error={fieldError(error, 'delivery.line1')} />
            <Field label="Landmark (optional)" value={form.landmark} onChange={set('landmark')} maxLength={100} />
            <Field label="Instructions for the rider (optional)" value={form.instructions} onChange={set('instructions')} maxLength={200} />
          </>
        )}
        <Field label="Notes for the kitchen (optional)" as="textarea" rows={3} value={form.notes} onChange={set('notes')} maxLength={300} hint="Allergies matter: tell us here and call us to confirm." />
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Placing order…' : 'Place order'}</button>
      </form>
    </section>
  );
}
