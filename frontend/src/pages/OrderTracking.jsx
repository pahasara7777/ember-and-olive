import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, formatDateTime, formatLkr } from '../lib/api.js';

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
    <section className="page container narrow">
      <h1>Thank you{order.firstName ? `, ${order.firstName}` : ''}</h1>
      <p>Your order reference is <strong>{order.reference}</strong>. Keep it to check progress.</p>
      <p className="status" role="status">Status: <strong>{order.status.replaceAll('-', ' ')}</strong></p>
      {order.status !== 'cancelled' && (
        <ol className="steps" aria-label="Order progress">
          {STEPS.map((s, i) => <li key={s} className={i <= reached ? 'done' : ''} aria-current={i === reached ? 'step' : undefined}>{s}</li>)}
        </ol>
      )}
      <ul className="lines">
        {order.lines.map((l, i) => <li key={i}><span>{l.quantity} × {l.name}</span><span>{formatLkr(l.lineTotalCents)}</span></li>)}
      </ul>
      {order.totals.deliveryFeeCents > 0 && <p>Delivery {formatLkr(order.totals.deliveryFeeCents)}</p>}
      <p className="price">Total {formatLkr(order.totals.totalCents)}</p>
      <p className="muted">Placed {formatDateTime(order.createdAt)} · pay by {order.payment.method === 'cash-delivery' ? 'cash on delivery' : 'cash at pickup'}</p>
    </section>
  );
}
