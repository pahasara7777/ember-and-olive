import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatLkr } from '../lib/api.js';
import { useCart } from '../lib/cart.jsx';
import { useAuth } from '../lib/auth.jsx';
import { dishPhoto } from '../lib/images.js';
import { Field, FormError, fieldError } from '../components/Form.jsx';
import '../styles/checkout.css';

// Mirrors the server's rules for display only; the server prices every order again.
const DEFAULT_RULES = { deliveryFeeCents: 35000, deliveryMinCents: 200000 }; // until the owner's settings load
const ZONES = ['Colombo 07', 'Colombo 05 / 06', 'Other (check coverage)'];

export default function Checkout() {
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  // One key per checkout attempt: pressing the button twice cannot place two orders.
  const idempotencyKey = useMemo(() => crypto.randomUUID().replaceAll('-', ''), []);
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', line1: '', unit: '', zone: ZONES[0], landmark: '', notes: '', when: 'asap', at: '' });
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rules, setRules] = useState(DEFAULT_RULES);
  useEffect(() => { api('/menu/rules').then(setRules).catch(() => {}); }, []);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const delivery = cart.fulfilment === 'delivery';

  if (cart.lines.length === 0) {
    return (
      <section className="container page">
        <h1>Checkout</h1>
        <p>Your order is empty.</p>
        <Link to="/menu" className="btn btn-primary">Browse the menu</Link>
      </section>
    );
  }

  const fee = delivery ? rules.deliveryFeeCents : 0;
  const total = cart.subtotalCents + fee;
  const belowMin = delivery && cart.subtotalCents < rules.deliveryMinCents;

  async function submit(e) {
    e.preventDefault();
    if (!agree) return setError({ message: 'Please accept the purchase terms and cancellation policy.' });
    setBusy(true);
    setError(null);
    try {
      const { order } = await api('/orders', {
        method: 'POST',
        body: {
          idempotencyKey,
          customer: { name: form.name, email: form.email, phone: form.phone },
          fulfillment: cart.fulfilment,
          paymentMethod: delivery ? 'cash-delivery' : 'cash-pickup',
          // Times are entered as Colombo time (UTC+05:30) and sent as UTC.
          scheduledFor: form.when === 'later' && form.at ? new Date(`${form.at}:00+05:30`).toISOString() : undefined,
          delivery: delivery ? { recipientName: form.name, line1: form.line1, unit: form.unit || undefined, zone: form.zone, landmark: form.landmark || undefined } : undefined,
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
    <section className="container">
      <div className="checkout-head">
        <h1>Checkout</h1>
        <ol className="progress" aria-label="Checkout steps">
          <li className="on">1 · Order</li><li className="on">2 · Your details</li><li>3 · Payment</li><li>4 · Confirmation</li>
        </ol>
      </div>
      <div className="co-layout">
        <form className="co-form" onSubmit={submit} noValidate id="checkout-form">
          <FormError error={error} />
          <fieldset>
            <legend>Fulfilment</legend>
            <div className="opt-grid">
              <label className="opt"><input type="radio" name="ful" checked={!delivery} onChange={() => cart.setFulfilment('pickup')} /><span><b>Pickup</b><span>Free · ready in about 25 minutes</span></span></label>
              <label className="opt"><input type="radio" name="ful" checked={delivery} onChange={() => cart.setFulfilment('delivery')} /><span><b>Delivery</b><span>{formatLkr(rules.deliveryFeeCents)} · minimum order {formatLkr(rules.deliveryMinCents)}</span></span></label>
            </div>
            <div className="field" style={{ marginTop: 18, maxWidth: 360 }}>
              <label htmlFor="c-when">Time</label>
              <select id="c-when" value={form.when} onChange={set('when')}>
                <option value="asap">As soon as possible</option>
                <option value="later">Schedule for later (30+ minutes ahead)</option>
              </select>
              {form.when === 'later' && <input type="datetime-local" aria-label="Scheduled time (Colombo)" value={form.at} onChange={set('at')} required />}
            </div>
          </fieldset>

          <div>
            <h2>Your details</h2>
            <div className="form-grid">
              <Field label="Full name" value={form.name} onChange={set('name')} autoComplete="name" required maxLength={80} error={fieldError(error, 'customer.name')} />
              <Field label="Mobile number" type="tel" placeholder="+94" value={form.phone} onChange={set('phone')} autoComplete="tel" required error={fieldError(error, 'customer.phone')} />
              <div className="full"><Field label="Email address (for your receipt)" type="email" value={form.email} onChange={set('email')} autoComplete="email" required error={fieldError(error, 'customer.email')} /></div>
            </div>
            {!user && <p className="muted" style={{ fontSize: 14, margin: '12px 0 0' }}>Ordering as a guest. <Link to="/login" className="link">Sign in</Link> to see your order history.</p>}
          </div>

          {delivery && (
            <div>
              <h2>Delivery address</h2>
              <div className="form-grid">
                <div className="full"><Field label="Street address" value={form.line1} onChange={set('line1')} autoComplete="street-address" required maxLength={150} error={fieldError(error, 'delivery.line1')} /></div>
                <Field label="Apartment, building or unit" value={form.unit} onChange={set("unit")} maxLength={50} />
                <Field label="Delivery zone" as="select" value={form.zone} onChange={set('zone')}>{ZONES.map((z) => <option key={z}>{z}</option>)}</Field>
                <div className="full"><Field label="Landmark" value={form.landmark} onChange={set('landmark')} maxLength={100} /></div>
              </div>
              <p className="hint-box" style={{ marginTop: 12 }}>Outside our delivery zones? We will explain, and you can switch to pickup without losing your cart.</p>
              {belowMin && <p role="alert" className="alert" style={{ marginTop: 12 }}>Delivery needs a minimum order of {formatLkr(rules.deliveryMinCents)}. Add a dish or switch to pickup.</p>}
            </div>
          )}

          <fieldset>
            <legend>Payment</legend>
            <div className="stack">
              <label className="opt"><input type="radio" name="pay" disabled /><span><b>Card, paid securely online</b><span>Coming soon. Card payments are not switched on yet.</span></span></label>
              <label className="opt"><input type="radio" name="pay" checked readOnly /><span><b>Cash on {delivery ? 'delivery' : 'pickup'}</b><span>Pay the restaurant {delivery ? 'rider' : 'team'} when you receive your order</span></span></label>
            </div>
            <div className="field" style={{ marginTop: 18 }}>
              <label htmlFor="c-notes">Notes for the kitchen (optional)</label>
              <textarea id="c-notes" rows={3} maxLength={300} value={form.notes} onChange={set('notes')} />
              <small>Allergies matter: tell us here and call us to confirm.</small>
            </div>
            <label className="check" style={{ marginTop: 22 }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>I accept the <Link to="/terms" className="link">purchase terms</Link> and cancellation policy.</span>
            </label>
          </fieldset>
        </form>

        <aside className="summary" aria-label="Order summary">
          <h2>Order summary</h2>
          {cart.lines.map((l) => (
            <div key={l.id} className="sum-line">
              {dishPhoto(l.slug) ? <img src={dishPhoto(l.slug)} alt="" /> : <div className="plate" aria-hidden="true" />}
              <div className="info">
                <p className="nm">{l.name}</p>
                <span className="qty">
                  <button type="button" aria-label={`Remove one ${l.name}`} onClick={() => cart.setQuantity(l.id, l.quantity - 1)}>−</button>
                  <output aria-label={`${l.name} quantity`}>{l.quantity}</output>
                  <button type="button" aria-label={`Add one ${l.name}`} onClick={() => cart.setQuantity(l.id, l.quantity + 1)}>+</button>
                </span>
              </div>
              <span style={{ fontWeight: 500 }}>{formatLkr(l.priceCents * l.quantity)}</span>
            </div>
          ))}
          <div className="coupon-row">
            <label htmlFor="c-coupon" className="sr-only">Coupon code</label>
            <input id="c-coupon" type="text" placeholder="Coupon code" disabled />
            <button type="button" className="btn btn-outline" disabled>Apply</button>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Coupons are not live yet.</p>
          <dl className="totals">
            <dt>Items subtotal</dt><dd>{formatLkr(cart.subtotalCents)}</dd>
            <dt>{delivery ? 'Delivery' : 'Pickup'}</dt><dd>{formatLkr(fee)}</dd>
            <dt>Service charge</dt><dd>{formatLkr(0)}</dd>
            <dt className="grand">Total</dt><dd className="grand">{formatLkr(total)}</dd>
          </dl>
          <p className="fine">Prices are recalculated by our server when you place the order.</p>
          <button type="submit" form="checkout-form" className="btn btn-primary block" disabled={busy || belowMin}>{busy ? 'Placing order…' : `Place order · ${formatLkr(total)}`}</button>
        </aside>
      </div>
    </section>
  );
}
