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
          <line x1={L} x2={W - R} y1={y(top * f)} y2={y(top * f)} stroke="#e8ecf3" />
          <text x="4" y={y(top * f) + 4} fontSize="12" fill="#6b7280" fontFamily="Inter, sans-serif">{Math.round((top * f) / 100000)}</text>
        </g>
      ))}
      {days.map((d, i) => <text key={d.date} x={x(i)} y={H - 8} fontSize="12" textAnchor="middle" fill="#6b7280" fontFamily="Inter, sans-serif">{WEEKDAY(d.date)}</text>)}
      <polygon points={`${x(0)},${y(0)} ${pts} ${x(6)},${y(0)}`} fill="#2563eb" opacity="0.1" />
      <polyline points={pts} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {days.map((d, i) => <circle key={d.date} cx={x(i)} cy={y(d.revenueCents)} r="5" fill="#2563eb"><title>{`${d.date}: ${formatLkr(d.revenueCents)}`}</title></circle>)}
    </svg>
  );
}

function Bars({ days }) {
  const max = Math.max(...days.map((d) => d.orders), 1);
  const best = days.reduce((b, d) => (d.orders > b.orders ? d : b), days[0]);
  return (
    <div className="bars" role="img" aria-label={`Orders per day over seven days, busiest ${WEEKDAY(best.date)} with ${best.orders}`}>
      {days.map((d) => (
        <div key={d.date} className={d === best && d.orders > 0 ? 'bar top' : 'bar'}>
          <span className="n">{d.orders}</span><i style={{ height: `${(d.orders / max) * 100}%` }} /><span>{WEEKDAY(d.date)}</span>
        </div>
      ))}
    </div>
  );
}

// Change versus yesterday; null when there is nothing to compare against.
const delta = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);
const Delta = ({ pct }) => (pct === null ? <span className="n">vs. yesterday: no data</span> : <span className={pct < 0 ? 'dl down' : 'dl up'}>{pct < 0 ? '▼' : '▲'} {Math.abs(pct)}% <em>vs. yesterday</em></span>);

function Gauge({ pct }) {
  const len = Math.PI * 80; // half circle, radius 80
  return (
    <svg className="gauge" viewBox="0 0 200 120" role="img" aria-label={pct === null ? 'No repeat guests data' : `${pct}% repeat guests`}>
      <path d="M20 100a80 80 0 0 1 160 0" fill="none" stroke="var(--soft)" strokeWidth="16" strokeLinecap="round" />
      {pct !== null && <path d="M20 100a80 80 0 0 1 160 0" fill="none" stroke="#2563eb" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(pct / 100) * len} ${len}`} />}
      <text x="100" y="92" textAnchor="middle" fontSize="30" fontWeight="600" fill="var(--ink)" fontFamily="Poppins, sans-serif">{pct === null ? '–' : `${pct}%`}</text>
    </svg>
  );
}

// Answers come from the numbers already on this page, not from an AI service.
function answer(q, sum, week) {
  const t = q.toLowerCase();
  const a = sum.attention;
  const best = sum.last7.reduce((b, d) => (d.orders > b.orders ? d : b), sum.last7[0]);
  if (/sale|revenue|money|income/.test(t)) return `Sales today: ${formatLkr(sum.revenueCents)}. Last 7 days: ${formatLkr(week)}.`;
  if (/order/.test(t)) return `${sum.orders} orders today, ${a.placedOrders} waiting to be accepted.`;
  if (/reserv|book|guest/.test(t)) return `${sum.reservations} reservations today, ${sum.guests} guests expected.`;
  if (/best|dish|top|sell/.test(t)) return sum.topDishes.length ? `Top dish this week: ${sum.topDishes[0].name} (${sum.topDishes[0].sold} sold).` : 'No sales yet this week.';
  if (/busy|busiest|day/.test(t)) return best.orders ? `Busiest day this week: ${WEEKDAY(best.date)} with ${best.orders} orders.` : 'No orders yet this week.';
  if (/repeat|loyal|return/.test(t)) return sum.repeatRate === null ? 'No guest emails on orders yet.' : `${sum.repeatRate}% of guests ordering this week ordered more than once.`;
  if (/attention|wait|review|enquir|message|todo/.test(t)) return `Waiting: ${a.placedOrders} orders, ${a.pendingReviews} reviews, ${a.newEnquiries} enquiries, ${a.newMessages} messages, ${a.approvals} approvals.`;
  return 'Try asking about sales, orders, reservations, best dishes, the busiest day, repeat guests or what needs attention.';
}

const cell = (v) => `"${String(v).replaceAll('"', '""')}"`;
function exportCsv(sum) {
  const rows = [['Date', 'Orders', 'Sales (LKR)'], ...sum.last7.map((d) => [d.date, d.orders, d.revenueCents / 100]), [], ['Dish', 'Sold', 'Revenue (LKR)'], ...sum.topDishes.map((t) => [t.name, t.sold, t.revenueCents / 100])];
  const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv' }));
  Object.assign(document.createElement('a'), { href: url, download: `sales-${sum.date}.csv` }).click();
  URL.revokeObjectURL(url);
}

const WIDGETS = [
  ['sales', 'Total sales', 'Seven-day sales line'],
  ['busiest', 'Busiest day', 'Orders per day'],
  ['reservations', "Today's reservations", 'Who is booked in'],
  ['attention', 'Needs your attention', 'Waiting items with shortcuts'],
  ['live', 'Live orders', 'Orders in progress'],
  ['repeat', 'Repeat guests', 'Share of guests who ordered again'],
  ['assistant', 'Quick answers', "Ask about today's numbers"],
  ['dishes', 'Best-selling dishes', 'Top five this week']
];
const ALL = WIDGETS.map(([id]) => id);
const load = () => { try { return JSON.parse(localStorage.getItem('admin-widgets')) ?? ALL; } catch { return ALL; } };

export default function Dashboard({ go }) {
  const [sum, setSum] = useState(null);
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [shown, setShown] = useState(load);
  const [picker, setPicker] = useState(false);
  const [ask, setAsk] = useState('');
  const [reply, setReply] = useState('');
  const on = (id) => shown.includes(id);
  const toggle = (id) => setShown((cur) => {
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    try { localStorage.setItem('admin-widgets', JSON.stringify(next)); } catch { /* not persisted */ }
    return next;
  });

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
  const [yest, now] = sum.last7.slice(-2);
  const week = sum.last7.reduce((n, d) => n + d.revenueCents, 0);
  const items = [
    [a.placedOrders, 'new orders waiting to be accepted', 'Open', 'orders'],
    [a.newEnquiries, 'event and catering enquiries awaiting a reply', 'Review', 'enquiries'],
    [a.newMessages, 'contact messages not yet handled', 'Read', 'enquiries'],
    [a.pendingReviews, 'guest reviews waiting for moderation', 'Moderate', 'reviews'],
    [a.approvals, 'large parties need staff approval', 'Approve', 'bookings']
  ].filter(([n]) => n > 0);

  return (
    <>
      <div className="toolbar">
        <button type="button" className="ghost" onClick={() => setPicker(true)}>＋ Add widget</button>
        <button type="button" className="solid" onClick={() => exportCsv(sum)}>⭳ Export</button>
      </div>
      {picker && (
        <div className="modal-back" onClick={() => setPicker(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Add widget" onClick={(e) => e.stopPropagation()}>
            <div className="head"><h2>Add widget</h2><button type="button" className="round" onClick={() => setPicker(false)} aria-label="Close">✕</button></div>
            <ul>{WIDGETS.map(([id, name, hint]) => (
              <li key={id}><div><strong>{name}</strong><p>{hint}</p></div><button type="button" className={on(id) ? 'ghost' : 'solid'} onClick={() => toggle(id)}>{on(id) ? 'Remove' : 'Select'}</button></li>
            ))}</ul>
          </div>
        </div>
      )}
      <div className="kpis">
        <div className="a-panel kpi"><p className="l">Today's orders</p><p className="v">{sum.orders}</p><Delta pct={delta(now.orders, yest.orders)} /></div>
        <div className="a-panel kpi"><p className="l">Sales today</p><p className="v">{kilo(sum.revenueCents)}</p><Delta pct={delta(now.revenueCents, yest.revenueCents)} /></div>
        <div className="a-panel kpi"><p className="l">Reservations today</p><p className="v">{sum.reservations}</p><p className="n">{sum.guests} guests expected</p></div>
        <div className="a-panel kpi"><p className="l">Open enquiries</p><p className="v">{a.newEnquiries}</p><p className="n">Events and catering</p></div>
      </div>

      <div className="row-flex">
        {on('sales') && (
        <div className="a-panel wide">
          <div className="head"><h2>Total sales</h2><p>Last 7 days · LKR thousands</p></div>
          <p className="big">{formatLkr(week)}</p>
          <Chart days={sum.last7} />
        </div>
        )}
        {on('busiest') && (
        <div className="a-panel narrow">
          <div className="head"><h2>Busiest day</h2><p>Orders per day</p></div>
          <Bars days={sum.last7} />
        </div>
        )}
      </div>

      <div className="row-flex">
        {on('reservations') && (
        <div className="a-panel wide">
          <h2>Today's reservations</h2>
          {bookings.length === 0 ? <p className="muted">None booked yet.</p> : (
            <table className="table">
              <thead><tr><th>Time</th><th>Guest</th><th>Status</th></tr></thead>
              <tbody>{bookings.map((b) => <tr key={b._id}><td>{formatDateTime(b.startsAt).split(', ').pop()}</td><td>{b.name} · {b.partySize}</td><td><span className="status">{b.status}</span></td></tr>)}</tbody>
            </table>
          )}
        </div>
        )}
        {on('attention') && (
        <div className="a-panel narrow">
          <h2 style={{ marginBottom: 12 }}>Needs your attention</h2>
          {items.length === 0 ? <p className="muted">All clear.</p> : (
            <ul className="attn">{items.map(([n, text, cta, tab]) => <li key={text}><span>{n} {text}</span><button type="button" onClick={() => go(tab)}>{cta}</button></li>)}</ul>
          )}
        </div>
        )}
      </div>

      {on('live') && (
      <div className="a-panel scroll-x" style={{ marginBottom: 22 }}>
        <div className="head"><h2>Live orders</h2><button type="button" className="link" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => go('orders')}>All orders</button></div>
        {orders.length === 0 ? <p className="muted">No active orders.</p> : (
          <table className="table" style={{ minWidth: 560 }}>
            <thead><tr><th>Order</th><th>Customer</th><th>Type</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>{orders.map((o) => <tr key={o._id}><td><strong>{o.reference}</strong></td><td>{o.customer?.name}</td><td>{o.fulfillment}</td><td>{formatLkr(o.totals.totalCents)}</td><td><span className="status info">{o.status.replaceAll('-', ' ')}</span></td></tr>)}</tbody>
          </table>
        )}
      </div>
      )}

      <div className="row-flex">
        {on('repeat') && (
          <div className="a-panel narrow">
            <div className="head"><h2>Repeat guests</h2><p>This week</p></div>
            <Gauge pct={sum.repeatRate} />
            <p className="muted" style={{ textAlign: 'center', margin: 0, fontSize: 13 }}>Guests who ordered more than once</p>
          </div>
        )}
        {on('assistant') && (
          <div className="a-panel wide">
            <div className="head"><h2>Quick answers</h2><p>From today's dashboard numbers</p></div>
            {reply && <p className="reply" role="status">{reply}</p>}
            <form className="ask" onSubmit={(e) => { e.preventDefault(); setReply(answer(ask, sum, week)); setAsk(''); }}>
              <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask about sales, orders, reservations…" aria-label="Ask a question" required />
              <button type="submit" className="solid">Ask</button>
            </form>
          </div>
        )}
      </div>

      <div className="row-flex">
        {on('dishes') && (
        <div className="a-panel full">
          <h2>Best-selling dishes</h2>
          <p className="muted" style={{ margin: '0 0 6px', fontSize: 13 }}>Last 7 days</p>
          {sum.topDishes.length === 0 ? <p className="muted">No sales yet.</p> : (
            <table className="table">
              <thead><tr><th>Dish</th><th>Sold</th><th>Revenue</th></tr></thead>
              <tbody>{sum.topDishes.map((t) => <tr key={t.name}><td>{t.name}</td><td>{t.sold}</td><td>{formatLkr(t.revenueCents)}</td></tr>)}</tbody>
            </table>
          )}
        </div>
        )}
      </div>
    </>
  );
}
