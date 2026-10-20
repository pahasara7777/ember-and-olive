import { useEffect, useState } from 'react';
import { api, formatDateTime, formatLkr } from '../../lib/api.js';

const WEEKDAY = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
const LIVE = ['placed', 'confirmed', 'preparing', 'ready', 'out-for-delivery'];
const kilo = (cents) => `${(cents / 100000).toFixed(1)}K`;

function Chart({ days }) {
  const W = 640, H = 240, L = 44, R = 20, T = 20, B = 30;
  const max = Math.max(...days.map((d) => d.revenueCents), 1);
  const step = Math.pow(10, Math.floor(Math.log10(max / 100)) + 2) / 100; // round the top of the axis to a tidy number of rupees
  const top = Math.max(Math.ceil(max / 100 / step) * step, 1) * 100;
  const x = (i) => L + ((W - L - R) / 6) * i;
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const pts = days.map((d, i) => `${x(i)},${y(d.revenueCents)}`).join(' ');
  const total = days.reduce((n, d) => n + d.revenueCents, 0);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Line chart of sales over seven days, ${formatLkr(total)} in total`}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={L} x2={W - R} y1={y(top * f)} y2={y(top * f)} stroke="#E6DFCE" />
          <text x="4" y={y(top * f) + 4} fontSize="12" fill="#5A574E" fontFamily="Inter, sans-serif">{Math.round((top * f) / 100000)}</text>
        </g>
      ))}
      {days.map((d, i) => <text key={d.date} x={x(i)} y={H - 8} fontSize="12" textAnchor="middle" fill="#5A574E" fontFamily="Inter, sans-serif">{WEEKDAY(d.date)}</text>)}
      <polyline points={pts} fill="none" stroke="#263B2D" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {days.map((d, i) => <circle key={d.date} cx={x(i)} cy={y(d.revenueCents)} r="5" fill="#A65F37"><title>{`${d.date}: ${formatLkr(d.revenueCents)}`}</title></circle>)}
    </svg>
  );
}

export default function Dashboard({ go }) {
  const [sum, setSum] = useState(null);
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/summary').then(setSum).catch((e) => setError(e.message));
    api('/admin/orders').then((d) => setOrders(d.orders.filter((o) => LIVE.includes(o.status)).slice(0, 6))).catch(() => {});
  }, []);
  useEffect(() => {
    if (!sum) return;
    api(`/admin/reservations?date=${sum.date}`).then((d) => setBookings(d.reservations.filter((r) => !['cancelled', 'no-show'].includes(r.status)).slice(0, 6))).catch(() => {});
  }, [sum]);

  if (error) return <p role="alert" className="alert">{error}</p>;
  if (!sum) return <p>Loading…</p>;
  const a = sum.attention;
  const items = [
    [a.placedOrders, 'new orders waiting to be accepted', 'Open', 'orders'],
    [a.newEnquiries, 'event and catering enquiries awaiting a reply', 'Review', 'enquiries'],
    [a.newMessages, 'contact messages not yet handled', 'Read', 'enquiries'],
    [a.pendingReviews, 'guest reviews waiting for moderation', 'Moderate', 'reviews'],
    [a.approvals, 'large parties need staff approval', 'Approve', 'bookings']
  ].filter(([n]) => n > 0);

  return (
    <>
      <div className="kpis">
        <div className="a-panel kpi"><p className="l">Today's orders</p><p className="v">{sum.orders}</p><p className="n">{a.placedOrders} awaiting action</p></div>
        <div className="a-panel kpi"><p className="l">Sales today</p><p className="v">{kilo(sum.revenueCents)}</p><p className="n">LKR · cancelled orders excluded</p></div>
        <div className="a-panel kpi"><p className="l">Reservations today</p><p className="v">{sum.reservations}</p><p className="n">{sum.guests} guests expected</p></div>
        <div className="a-panel kpi"><p className="l">Open enquiries</p><p className="v">{a.newEnquiries}</p><p className="n">Events and catering</p></div>
      </div>

      <div className="row-flex">
        <div className="a-panel wide">
          <div className="head"><h2>Sales, last 7 days</h2><p>LKR thousands · cancelled orders excluded</p></div>
          <Chart days={sum.last7} />
        </div>
        <div className="a-panel narrow">
          <h2>Today's reservations</h2>
          {bookings.length === 0 ? <p className="muted">None booked yet.</p> : (
            <table className="table">
              <thead><tr><th>Time</th><th>Guest</th><th>Status</th></tr></thead>
              <tbody>{bookings.map((b) => <tr key={b._id}><td>{formatDateTime(b.startsAt).split(', ').pop()}</td><td>{b.name} · {b.partySize}</td><td><span className="status">{b.status}</span></td></tr>)}</tbody>
            </table>
          )}
        </div>
      </div>

      <div className="a-panel scroll-x" style={{ marginBottom: 22 }}>
        <div className="head"><h2>Live orders</h2><button type="button" className="link" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => go('orders')}>All orders</button></div>
        {orders.length === 0 ? <p className="muted">No active orders.</p> : (
          <table className="table" style={{ minWidth: 560 }}>
            <thead><tr><th>Order</th><th>Customer</th><th>Type</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>{orders.map((o) => <tr key={o._id}><td><strong>{o.reference}</strong></td><td>{o.customer?.name}</td><td>{o.fulfillment}</td><td>{formatLkr(o.totals.totalCents)}</td><td><span className="status info">{o.status.replaceAll('-', ' ')}</span></td></tr>)}</tbody>
          </table>
        )}
      </div>

      <div className="row-flex">
        <div className="a-panel half">
          <h2>Best-selling dishes</h2>
          <p className="muted" style={{ margin: '0 0 6px', fontSize: 13 }}>Last 7 days</p>
          {sum.topDishes.length === 0 ? <p className="muted">No sales yet.</p> : (
            <table className="table">
              <thead><tr><th>Dish</th><th>Sold</th><th>Revenue</th></tr></thead>
              <tbody>{sum.topDishes.map((t) => <tr key={t.name}><td>{t.name}</td><td>{t.sold}</td><td>{formatLkr(t.revenueCents)}</td></tr>)}</tbody>
            </table>
          )}
        </div>
        <div className="a-panel half">
          <h2 style={{ marginBottom: 12 }}>Needs your attention</h2>
          {items.length === 0 ? <p className="muted">All clear.</p> : (
            <ul className="attn">{items.map(([n, text, cta, tab]) => <li key={text}><span>{n} {text}</span><button type="button" onClick={() => go(tab)}>{cta}</button></li>)}</ul>
          )}
        </div>
      </div>
    </>
  );
}
