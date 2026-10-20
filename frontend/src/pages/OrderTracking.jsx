import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, formatDateTime, formatLkr } from '../lib/api.js';
import '../styles/checkout.css';

const STEPS = ['placed', 'confirmed', 'preparing', 'ready', 'completed'];

export default function OrderTracking() {
  const { reference } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    const load = () => api(`/orders/${encodeURIComponent(reference)}`).then((d) => live && setOrder(d.order)).catch(() => live && setError('We could not find that order. Check the reference and try again.'));
    load();
    const timer = setInterval(load, 30000); // refresh every 30 s while the page is open
    return () => { live = false; clearInterval(timer); };
  }, [reference]);

  if (error) return <section className="page container"><p role="alert" className="alert">{error}</p></section>;
  if (!order) return <section className="page container"><p>Loading…</p></section>;

  const reached = STEPS.indexOf(order.status);
  return (
    <section className="container track">
      <p className="eyebrow">Order received</p>
      <h1>Thank you{order.firstName ? `, ${order.firstName}` : ''}.</h1>
      <p style={{ margin: '12px 0 0' }}>Your order reference is</p>
      <p className="ref" aria-label={`Reference ${order.reference}`}>{order.reference}</p>
      <p className="muted" style={{ margin: 0 }}>Keep it to check progress. This page refreshes by itself.</p>
      <p role="status" style={{ margin: '20px 0 0' }}>Status: <span className="tag">{order.status.replaceAll('-', ' ')}</span></p>
      {order.status !== 'cancelled' && (
        <ol className="stepper" aria-label="Order progress">
          {STEPS.map((s, i) => <li key={s} className={i <= reached ? 'done' : ''} aria-current={i === reached ? 'step' : undefined}>{s}</li>)}
        </ol>
      )}
      <div className="panel">
        <ul className="rows">
          {order.lines.map((l, i) => <li key={i}><span>{l.quantity} × {l.name}</span><span>{formatLkr(l.lineTotalCents)}</span></li>)}
          {order.totals.deliveryFeeCents > 0 && <li><span>Delivery</span><span>{formatLkr(order.totals.deliveryFeeCents)}</span></li>}
        </ul>
        <p className="tot"><span>Total</span><span>{formatLkr(order.totals.totalCents)}</span></p>
        <p className="muted" style={{ margin: '12px 0 0', fontSize: 14 }}>Placed {formatDateTime(order.createdAt)} · pay by {order.payment.method === 'cash-delivery' ? 'cash on delivery' : 'cash at pickup'}</p>
      </div>
    </section>
  );
}
