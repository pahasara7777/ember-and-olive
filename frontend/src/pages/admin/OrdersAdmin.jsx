import { useCallback, useEffect, useState } from 'react';
import { api, formatLkr } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { Empty, Seg, Search, Stat, Stats, Toolbar, ago } from '../../components/AdminUI.jsx';

// The server decides which changes are allowed; this only decides which buttons to offer.
const NEXT = { placed: ['confirmed'], confirmed: ['preparing'], preparing: ['ready'], ready: ['completed', 'out-for-delivery'], 'out-for-delivery': ['completed'] };
const LABEL = { confirmed: 'Accept', preparing: 'Start cooking', ready: 'Mark ready', completed: 'Complete', 'out-for-delivery': 'Out for delivery' };
const CANCELLABLE = ['placed', 'confirmed', 'preparing'];
const ACTIVE = ['placed', 'confirmed', 'preparing', 'ready', 'out-for-delivery'];
const BAR = { placed: '#d97706', confirmed: '#c9520a', preparing: '#f47b20', ready: '#16a34a', 'out-for-delivery': '#92400e', completed: '#94a3b8', cancelled: '#dc2626' };
const TYPE = { 'dine-in': ['Dine-in', 'dine'], pickup: ['Takeaway', 'take'], delivery: ['Delivery', 'del'] };
const STEPS = [['placed', 'Placed'], ['confirmed', 'Accepted'], ['preparing', 'Cooking'], ['ready', 'Ready'], ['completed', 'Done']];
const PAY = { cash: 'Cash', card: 'Card', 'cash-pickup': 'Cash on pickup', 'cash-delivery': 'Cash on delivery' };
const mins = (o) => Math.max(0, Math.round((Date.now() - new Date(o.createdAt)) / 60000));
const unpaid = (o) => o.payment?.status === 'pending' && o.status !== 'cancelled';

export default function OrdersAdmin() {
  const { user } = useAuth();
  const manager = ['manager', 'owner'].includes(user.role);
  const [orders, setOrders] = useState([]);
  const [reasons, setReasons] = useState({});
  const [refunds, setRefunds] = useState({}); // id -> { reason, amount }
  const [filter, setFilter] = useState('active');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => api('/admin/orders').then((d) => setOrders(d.orders)).catch((e) => setError(e.message)), []);
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const run = async (fn) => { setError(''); try { await fn(); load(); } catch (e) { setError(e.message); } };
  const move = (id, status) => run(() => api(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status, reason: reasons[id] || undefined } }));
  const refund = (o) => run(async () => {
    const r = refunds[o._id] ?? {};
    await api(`/admin/orders/${o._id}/refund`, { method: 'POST', body: { reason: r.reason, ...(r.amount && { amountCents: Math.round(Number(r.amount) * 100) }) } });
    setRefunds({ ...refunds, [o._id]: {} });
  });

  const tabs = [
    { id: 'active', label: 'Active', test: (o) => ACTIVE.includes(o.status) },
    { id: 'unpaid', label: 'Unpaid', test: unpaid },
    { id: 'done', label: 'Completed', test: (o) => o.status === 'completed' },
    { id: 'cancelled', label: 'Cancelled', test: (o) => o.status === 'cancelled' },
    { id: 'all', label: 'All', test: () => true }
  ];
  const shown = orders.filter((o) => tabs.find((t) => t.id === filter).test(o) && `${o.reference} ${o.customer?.name} ${o.table ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div>
      <Stats>
        <Stat label="Active orders" value={orders.filter((o) => ACTIVE.includes(o.status)).length} sub="in the kitchen or on the way" />
        <Stat label="Ready to serve" value={orders.filter((o) => o.status === 'ready').length} tone="good" sub="waiting at the pass" />
        <Stat label="Waiting for payment" value={formatLkr(orders.filter(unpaid).reduce((s, o) => s + o.totals.totalCents, 0))} tone="bad" sub={`${orders.filter(unpaid).length} open orders`} />
      </Stats>
      <Toolbar>
        <Seg label="Show" value={filter} onChange={setFilter} options={tabs.map((t) => ({ id: t.id, label: t.label, count: orders.filter(t.test).length }))} />
        <Search value={q} onChange={setQ} placeholder="Search order, guest or table" label="Search orders" />
      </Toolbar>
      {error && <p role="alert" className="alert">{error}</p>}

      <div className="a-list">
        {shown.map((o) => {
          const [typeLabel, typeClass] = TYPE[o.fulfillment] ?? [o.fulfillment, ''];
          const canRefund = manager && ['paid', 'partially-refunded'].includes(o.payment?.status);
          return (
            <article key={o._id} className="a-row stripe" style={{ '--bar': BAR[o.status] }}>
              <div className="grow">
                <h3>{o.table ? `Table ${o.table}` : o.customer?.name || 'Guest'} <span className={`a-tag ${typeClass}`}>{typeLabel}</span></h3>
                <span className="sub">#{o.reference.slice(-5)} · {ago(o.createdAt)}{o.customer?.phone && ` · ${o.customer.phone}`}</span>
                <div className="chips-i">{o.lines.map((l, i) => <span key={i}>{l.quantity}× {l.name}</span>)}</div>
                {o.notes && <span className="sub">📝 {o.notes}</span>}
                {o.status !== 'cancelled' && (
                  <ol className="o-steps" aria-label={`Progress: ${o.status}`}>
                    {STEPS.map(([id, label], i) => {
                      const at = Math.max(0, STEPS.findIndex(([s]) => s === (o.status === 'out-for-delivery' ? 'ready' : o.status)));
                      return <li key={id} className={i < at ? 'done' : i === at ? 'now' : ''}><i />{label}</li>;
                    })}
                  </ol>
                )}
              </div>
              <div className="mid">
                {ACTIVE.includes(o.status) && <span className={`age ${mins(o) >= 30 ? 'late' : mins(o) >= 15 ? 'warn' : ''}`}>⏱ {mins(o)} min</span>}
                <span className="sub">{PAY[o.payment?.method] ?? o.payment?.method}{o.payment?.status === 'paid' ? ' · paid' : ''}</span>
                {o.payment?.changeCents > 0 && <span className="sub">Change {formatLkr(o.payment.changeCents)}</span>}
              </div>
              <div>
                <div className="money">{formatLkr(o.totals.totalCents)}</div>
                <span className={`pill ${o.status}`}>{o.status.replaceAll('-', ' ')}</span>
                {unpaid(o) && <span className="pill placed" style={{ marginLeft: 6 }}>unpaid</span>}
                {o.payment?.refundedCents > 0 && <span className="sub">Refunded {formatLkr(o.payment.refundedCents)}</span>}
              </div>
              <div className="acts">
                {(NEXT[o.status] ?? []).filter((s) => s !== 'out-for-delivery' || o.fulfillment === 'delivery').map((s) => <button key={s} className="btn btn-primary small" onClick={() => move(o._id, s)}>{LABEL[s]}</button>)}
                {(CANCELLABLE.includes(o.status) || canRefund) && (
                  <details className="more">
                    <summary>More</summary>
                    <div>
                      {CANCELLABLE.includes(o.status) && (
                        <label>Cancel this order
                          <input placeholder="Reason (required)" maxLength={200} value={reasons[o._id] ?? ''} onChange={(e) => setReasons({ ...reasons, [o._id]: e.target.value })} />
                          <button className="btn btn-outline small" disabled={!reasons[o._id]} onClick={() => move(o._id, 'cancelled')}>Cancel order</button>
                        </label>
                      )}
                      {canRefund && (
                        <label>Refund
                          <input placeholder="Reason (required)" maxLength={200} value={refunds[o._id]?.reason ?? ''} onChange={(e) => setRefunds({ ...refunds, [o._id]: { ...refunds[o._id], reason: e.target.value } })} />
                          <input type="number" min="0" step="any" placeholder="Amount in LKR (blank = all)" value={refunds[o._id]?.amount ?? ''} onChange={(e) => setRefunds({ ...refunds, [o._id]: { ...refunds[o._id], amount: e.target.value } })} />
                          <button className="btn btn-outline small" disabled={!refunds[o._id]?.reason} onClick={() => refund(o)}>Refund</button>
                        </label>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {shown.length === 0 && !error && <Empty icon="🧾" title="No orders here">{filter === 'active' ? 'New orders appear here as soon as they are placed.' : 'Nothing matches this filter.'}</Empty>}
    </div>
  );
}
