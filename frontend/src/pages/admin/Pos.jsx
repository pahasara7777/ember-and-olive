import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, formatLkr } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { dishPhoto } from '../../lib/images.js';

// shortcut: one choice per modifier, no split bills, no adding items to an open tab, no tax, no cash-drawer shifts; add when the owner asks.
const DEFAULT_SERVICE_PCT = 10; // only until the owner's setting loads; the server prices the sale, this is just the preview

// Cash received, quick amounts and change; shared by a new sale and by settling an open tab.
function Pay({ total, method, setMethod, received, setReceived }) {
  const tendered = Math.round(Number(received) * 100) || 0;
  const change = tendered - total;
  const quick = [...new Set([total, ...[500, 1000, 5000].map((d) => Math.ceil(total / 100 / d) * d * 100)])]; // exact, then rounded up to common notes
  return (
    <>
      <select aria-label="Payment" value={method} onChange={(e) => setMethod(e.target.value)}><option value="cash">Cash</option><option value="card">Card (terminal)</option></select>
      {method === 'cash' && (
        <>
          <input type="number" inputMode="decimal" min="0" step="any" aria-label="Cash received (LKR)" placeholder="Cash received (LKR)" value={received} onChange={(e) => setReceived(e.target.value)} />
          <div className="pos-quick">{quick.map((q) => <button key={q} type="button" onClick={() => setReceived(String(q / 100))}>{q === total ? 'Exact' : formatLkr(q)}</button>)}</div>
          <p className={`pos-change${tendered && change < 0 ? ' short' : ''}`}><span>{change < 0 ? 'Still due' : 'Change'}</span><span>{formatLkr(Math.abs(tendered ? change : 0))}</span></p>
        </>
      )}
    </>
  );
}
const canPay = (method, received, total) => method !== 'cash' || Math.round(Number(received) * 100) >= total;

export default function Pos() {
  const { user } = useAuth();
  const manager = ['manager', 'owner'].includes(user?.role);
  const [menu, setMenu] = useState({ categories: [], items: [] });
  const [cart, setCart] = useState([]); // { item, quantity, notes, options: { [modifierId]: optionId } }
  const [cat, setCat] = useState('');
  const [table, setTable] = useState('');
  const [fulfillment, setFulfillment] = useState('dine-in');
  const [method, setMethod] = useState('cash');
  const [received, setReceived] = useState(''); // cash handed over, in rupees
  const [note, setNote] = useState('');
  const [service, setService] = useState(false);
  const [disc, setDisc] = useState({ type: 'percent', value: '' });
  const [view, setView] = useState('sale'); // 'sale' | 'tabs'
  const [tabs, setTabs] = useState([]);
  const [tab, setTab] = useState(null); // open tab being settled
  const [today, setToday] = useState(null);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [servicePct, setServicePct] = useState(DEFAULT_SERVICE_PCT);
  const [params] = useSearchParams(); // the Tables screen opens the POS for a table (?table=T1) or one of its tabs (?settle=<id>)

  useEffect(() => { api('/admin/settings').then((d) => setServicePct(d.settings.servicePct)).catch(() => {}); }, []);
  useEffect(() => { if (params.get('table')) setTable(params.get('table')); }, [params]);
  useEffect(() => { api('/menu').then(setMenu).catch((e) => setError(e.message)); }, []);
  const loadTabs = () => api('/admin/pos/tabs').then((r) => {
    setTabs(r.orders);
    const id = params.get('settle');
    const wanted = id && r.orders.find((o) => o._id === id);
    if (wanted) { setView('tabs'); setTab(wanted); }
  }).catch((e) => setError(e.message));
  const loadToday = () => manager && api('/admin/pos/today').then(setToday).catch(() => {});
  useEffect(() => { loadTabs(); loadToday(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const items = menu.items.filter((i) => i.availability === 'available' && i.channels.includes(fulfillment) && (!cat || i.category === cat));
  const unit = (l) => l.item.priceCents + l.item.modifiers.reduce((s, m) => s + (m.options.find((o) => o._id === l.options[m._id])?.priceCents ?? 0), 0);
  const subtotal = cart.reduce((s, l) => s + unit(l) * l.quantity, 0);
  const dv = Number(disc.value) || 0;
  const discount = Math.min(subtotal, disc.type === 'percent' ? Math.round((subtotal * Math.min(dv, 100)) / 100) : Math.round(dv * 100));
  const serviceCents = service && fulfillment === 'dine-in' ? Math.round(((subtotal - discount) * servicePct) / 100) : 0;
  const total = subtotal - discount + serviceCents;
  const tendered = Math.round(Number(received) * 100) || 0;
  // Same dish with no modifier chosen just bumps the quantity.
  const add = (item) => setCart((c) => {
    const i = c.findIndex((l) => l.item._id === item._id && !l.notes && !Object.values(l.options).some(Boolean));
    return i >= 0 ? c.map((l, n) => (n === i ? { ...l, quantity: Math.min(20, l.quantity + 1) } : l)) : [...c, { item, quantity: 1, notes: '', options: {} }];
  });
  const patch = (i, p) => setCart((c) => c.map((l, n) => (n === i ? { ...l, ...p } : l)));

  const done = (order) => { setReceipt(order); loadTabs(); loadToday(); };
  const run = async (fn) => { setError(''); try { await fn(); } catch (e) { setError(e.message); } };

  const sale = (payLater) => run(async () => {
    const lines = cart.map((l) => ({ menuItem: l.item._id, quantity: l.quantity, notes: l.notes || undefined, options: Object.values(l.options).filter(Boolean) }));
    const body = {
      fulfillment, table: table || undefined, paymentMethod: method, lines, notes: note || undefined,
      ...(payLater ? { payLater: true } : method === 'cash' && { tenderedCents: tendered }),
      ...(service && fulfillment === 'dine-in' && { serviceCharge: true }),
      ...(manager && dv > 0 && { discount: { type: disc.type, value: disc.type === 'percent' ? Math.round(dv) : Math.round(dv * 100) } })
    };
    const { order } = await api('/admin/pos/orders', { method: 'POST', body });
    setCart([]); setTable(''); setReceived(''); setNote(''); setService(false); setDisc({ type: 'percent', value: '' });
    done(order);
  });

  const settle = () => run(async () => {
    const { order } = await api(`/admin/pos/orders/${tab._id}/settle`, { method: 'POST', body: { paymentMethod: method, ...(method === 'cash' && { tenderedCents: tendered }) } });
    setTab(null); setReceived('');
    done(order);
  });

  if (receipt) {
    const t = receipt.totals;
    const open = receipt.payment.status === 'pending';
    const when = new Date(receipt.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' });
    return (
      <div className="receipt">
        <header>
          <h2>The Ember &amp; Olive</h2>
          <p>42 Gregory's Road, Colombo 07</p>
        </header>
        <dl className="rc-meta">
          <div><dt>Bill</dt><dd>{receipt.reference}</dd></div>
          <div><dt>Date</dt><dd>{when}</dd></div>
          <div><dt>{receipt.table ? 'Table' : 'Type'}</dt><dd>{receipt.table ?? (receipt.fulfillment === 'pickup' ? 'Takeaway' : receipt.fulfillment)}</dd></div>
        </dl>
        <ul className="rc-lines">
          {receipt.lines.map((l, i) => (
            <li key={i}>
              <span>{l.quantity} × {l.name}{(l.options.length > 0 || l.notes) && <small>{[...l.options.map((o) => o.name), l.notes].filter(Boolean).join(', ')}</small>}</span>
              <span>{formatLkr(l.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <dl className="rc-sum">
          <div><dt>Subtotal</dt><dd>{formatLkr(t.subtotalCents)}</dd></div>
          {t.discountCents > 0 && <div><dt>Discount</dt><dd>−{formatLkr(t.discountCents)}</dd></div>}
          {t.serviceChargeCents > 0 && <div><dt>Service charge ({servicePct}%)</dt><dd>{formatLkr(t.serviceChargeCents)}</dd></div>}
          <div className="rc-total"><dt>Total</dt><dd>{formatLkr(t.totalCents)}</dd></div>
          {open ? <div><dt>Payment</dt><dd>Open tab, not paid</dd></div> : <div><dt>Paid by</dt><dd>{receipt.payment.method === 'cash' ? 'Cash' : 'Card'}</dd></div>}
          {receipt.payment.tenderedCents != null && <><div><dt>Cash received</dt><dd>{formatLkr(receipt.payment.tenderedCents)}</dd></div><div><dt>Change</dt><dd>{formatLkr(receipt.payment.changeCents)}</dd></div></>}
        </dl>
        {receipt.notes && <p className="rc-note">Note: {receipt.notes}</p>}
        <p className="rc-thanks">Thank you for dining with us!</p>
        <div className="rc-actions">
          <button className="pos-btn" onClick={() => window.print()}>Print</button>
          <button className="pos-btn ghost" onClick={() => setReceipt(null)}>New sale</button>
        </div>
      </div>
    );
  }

  const bar = (
    <div className="pos-cats">
      <button aria-pressed={view === 'sale'} onClick={() => setView('sale')}>New sale</button>
      <button aria-pressed={view === 'tabs'} onClick={() => { setView('tabs'); setTab(null); loadTabs(); }}>Open tabs ({tabs.length})</button>
    </div>
  );
  const takings = today && (
    <p className="pos-today">Today · {today.sales} sales · Cash {formatLkr(today.cashCents)} · Card {formatLkr(today.cardCents)}{today.discountCents > 0 && ` · Discounts ${formatLkr(today.discountCents)}`}</p>
  );

  if (view === 'tabs') {
    return (
      <div className="pos">
        <div>
          {bar}{takings}
          {error && <p role="alert" className="alert">{error}</p>}
          <div className="pos-grid">
            {tabs.length === 0 && <p className="muted">No open tabs.</p>}
            {tabs.map((o) => (
              <button key={o._id} className="pos-tile" aria-pressed={tab?._id === o._id} onClick={() => { setTab(o); setReceived(''); }}>
                <span>{o.table ? `Table ${o.table}` : o.customer?.name}</span>
                <small>{formatLkr(o.totals.totalCents)} · {o.lines.reduce((s, l) => s + l.quantity, 0)} items</small>
              </button>
            ))}
          </div>
        </div>
        <aside className="pos-cart">
          <h2>{tab ? `Settle ${tab.table ? `Table ${tab.table}` : tab.reference}` : 'Pick a tab'}</h2>
          {tab && (
            <>
              {tab.lines.map((l, i) => <div key={i} className="pos-line"><div><span>{l.quantity}× {l.name}</span><span>{formatLkr(l.lineTotalCents)}</span></div></div>)}
              <p className="pos-total"><span>Total</span><span>{formatLkr(tab.totals.totalCents)}</span></p>
              <Pay total={tab.totals.totalCents} method={method} setMethod={setMethod} received={received} setReceived={setReceived} />
              <button className="pos-btn" disabled={!canPay(method, received, tab.totals.totalCents)} onClick={settle}>Take payment</button>
            </>
          )}
        </aside>
      </div>
    );
  }

  return (
    <div className="pos">
      <div>
        {bar}{takings}
        <div className="pos-cats">
          <button aria-pressed={!cat} onClick={() => setCat('')}>All</button>
          {menu.categories.map((c) => <button key={c._id} aria-pressed={cat === c._id} onClick={() => setCat(c._id)}>{c.name}</button>)}
        </div>
        <div className="pos-grid">
          {items.map((i) => (
            <button key={i._id} className="pos-tile" onClick={() => add(i)}>
              {dishPhoto(i) ? <img src={dishPhoto(i)} alt="" loading="lazy" /> : <div className="pos-ph" aria-hidden="true" />}
              <span>{i.name}</span><small>{formatLkr(i.priceCents)}</small>
            </button>
          ))}
        </div>
      </div>
      <aside className="pos-cart">
        <h2>Current sale</h2>
        {error && <p role="alert" className="alert">{error}</p>}
        <select aria-label="Type" value={fulfillment} onChange={(e) => { setFulfillment(e.target.value); setCart([]); }}><option value="dine-in">Dine-in</option><option value="pickup">Takeaway</option></select>
        {fulfillment === 'dine-in' && <input aria-label="Table" placeholder="Table" maxLength={20} value={table} onChange={(e) => setTable(e.target.value)} />}
        {cart.map((l, i) => (
          <div key={i} className="pos-line">
            <div><strong>{l.item.name}</strong><span>{formatLkr(unit(l) * l.quantity)}</span></div>
            <div><input type="number" aria-label={`Quantity of ${l.item.name}`} min="1" max="20" value={l.quantity} onChange={(e) => patch(i, { quantity: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} />
            <button className="pos-x" onClick={() => setCart((c) => c.filter((_, n) => n !== i))} aria-label={`Remove ${l.item.name}`}>✕</button></div>
            {l.item.modifiers.map((m) => (
              <select key={m._id} aria-label={m.name} value={l.options[m._id] ?? ''} onChange={(e) => patch(i, { options: { ...l.options, [m._id]: e.target.value } })}>
                <option value="">{m.name}{m.required ? ' *' : ''}</option>
                {m.options.map((o) => <option key={o._id} value={o._id}>{o.name}{o.priceCents ? ` +${formatLkr(o.priceCents)}` : ''}</option>)}
              </select>
            ))}
            <input aria-label={`Note for ${l.item.name}`} placeholder="Note (e.g. no onion)" maxLength={200} value={l.notes} onChange={(e) => patch(i, { notes: e.target.value })} />
          </div>
        ))}
        {cart.length > 0 && (
          <>
            <input aria-label="Order note" placeholder="Order note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
            {fulfillment === 'dine-in' && <label className="pos-check"><input type="checkbox" checked={service} onChange={(e) => setService(e.target.checked)} /> Service charge {servicePct}%</label>}
            {manager && (
              <div className="pos-disc">
                <select aria-label="Discount type" value={disc.type} onChange={(e) => setDisc({ type: e.target.value, value: '' })}><option value="percent">Discount %</option><option value="fixed">Discount LKR</option></select>
                <input type="number" min="0" step="any" aria-label="Discount value" placeholder="0" value={disc.value} onChange={(e) => setDisc({ ...disc, value: e.target.value })} />
              </div>
            )}
          </>
        )}
        {(discount > 0 || serviceCents > 0) && <p className="pos-sub"><span>Subtotal</span><span>{formatLkr(subtotal)}</span></p>}
        {discount > 0 && <p className="pos-sub"><span>Discount</span><span>−{formatLkr(discount)}</span></p>}
        {serviceCents > 0 && <p className="pos-sub"><span>Service charge</span><span>{formatLkr(serviceCents)}</span></p>}
        <p className="pos-total"><span>Total</span><span>{formatLkr(total)}</span></p>
        {cart.length > 0 && <Pay total={total} method={method} setMethod={setMethod} received={received} setReceived={setReceived} />}
        <button className="pos-btn" disabled={!cart.length || !canPay(method, received, total)} onClick={() => sale(false)}>Charge &amp; send to kitchen</button>
        {fulfillment === 'dine-in' && <button className="pos-btn ghost" disabled={!cart.length} onClick={() => sale(true)}>Open tab (pay later)</button>}
      </aside>
    </div>
  );
}
