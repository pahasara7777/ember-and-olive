import { useEffect, useState } from 'react';
import { api, formatLkr } from '../../lib/api.js';
import { dishPhoto } from '../../lib/images.js';

// shortcut: one choice per modifier (no multi-select), no discounts or split bills; add when the owner asks.
export default function Pos() {
  const [menu, setMenu] = useState({ categories: [], items: [] });
  const [cart, setCart] = useState([]); // { item, quantity, options: { [modifierId]: optionId } }
  const [cat, setCat] = useState('');
  const [table, setTable] = useState('');
  const [fulfillment, setFulfillment] = useState('dine-in');
  const [method, setMethod] = useState('cash');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => { api('/menu').then(setMenu).catch((e) => setError(e.message)); }, []);

  const items = menu.items.filter((i) => i.availability === 'available' && i.channels.includes(fulfillment) && (!cat || i.category === cat));
  const unit = (l) => l.item.priceCents + l.item.modifiers.reduce((s, m) => s + (m.options.find((o) => o._id === l.options[m._id])?.priceCents ?? 0), 0);
  const total = cart.reduce((s, l) => s + unit(l) * l.quantity, 0);
  const patch = (i, p) => setCart((c) => c.map((l, n) => (n === i ? { ...l, ...p } : l)));

  async function charge() {
    setError('');
    try {
      const lines = cart.map((l) => ({ menuItem: l.item._id, quantity: l.quantity, options: Object.values(l.options).filter(Boolean) }));
      const { order } = await api('/admin/pos/orders', { method: 'POST', body: { fulfillment, table: table || undefined, paymentMethod: method, lines } });
      setReceipt(order);
      setCart([]);
      setTable('');
    } catch (e) {
      setError(e.message);
    }
  }

  if (receipt) {
    return (
      <div className="receipt">
        <h2>Ember &amp; Olive</h2>
        <p>{receipt.reference} · {receipt.table ? `Table ${receipt.table}` : receipt.fulfillment} · {new Date(receipt.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })}</p>
        <table className="table"><tbody>
          {receipt.lines.map((l, i) => <tr key={i}><td>{l.quantity}× {l.name}{l.options.length > 0 && <small> ({l.options.map((o) => o.name).join(', ')})</small>}</td><td>{formatLkr(l.lineTotalCents)}</td></tr>)}
          <tr><th>Total ({receipt.payment.method})</th><th>{formatLkr(receipt.totals.totalCents)}</th></tr>
        </tbody></table>
        <button className="pos-btn" onClick={() => window.print()}>Print</button>{' '}
        <button className="pos-btn ghost" onClick={() => setReceipt(null)}>New sale</button>
      </div>
    );
  }

  return (
    <div className="pos">
      <div>
        <div className="pos-cats">
          <button aria-pressed={!cat} onClick={() => setCat('')}>All</button>
          {menu.categories.map((c) => <button key={c._id} aria-pressed={cat === c._id} onClick={() => setCat(c._id)}>{c.name}</button>)}
        </div>
        <div className="pos-grid">
          {items.map((i) => (
            <button key={i._id} className="pos-tile" onClick={() => setCart((c) => [...c, { item: i, quantity: 1, options: {} }])}>
              {dishPhoto(i.slug) ? <img src={dishPhoto(i.slug)} alt="" loading="lazy" /> : <div className="pos-ph" aria-hidden="true" />}
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
          </div>
        ))}
        <p className="pos-total"><span>Total</span><span>{formatLkr(total)}</span></p>
        <select aria-label="Payment" value={method} onChange={(e) => setMethod(e.target.value)}><option value="cash">Cash</option><option value="card">Card (terminal)</option></select>
        <button className="pos-btn" disabled={!cart.length} onClick={charge}>Charge &amp; send to kitchen</button>
      </aside>
    </div>
  );
}
