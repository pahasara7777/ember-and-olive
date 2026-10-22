import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { Empty, Search, Seg, Stat, Stats, Toolbar, ago } from '../../components/AdminUI.jsx';

// Ingredient counts. Kitchen records what came in and what went out; managers add items and set the alert level.
// shortcut: stock does not drop by itself when a dish sells (no recipes yet); staff record usage. Add recipes when the owner wants auto-deduct.
const UNITS = ['kg', 'g', 'l', 'ml', 'pcs', 'packs', 'bottles'];
const STARTERS = [['Chickpeas', 'kg'], ['Olive oil', 'l'], ['Tomatoes', 'kg'], ['Halloumi', 'kg'], ['Chicken', 'kg'], ['Rice', 'kg'], ['Flour', 'kg'], ['Eggs', 'pcs']];
const state = (i) => (i.quantity <= 0 ? 'out' : i.quantity <= i.lowAt ? 'low' : 'ok');
const LABEL = { out: 'Out of stock', low: 'Running low', ok: 'In stock' };
const num = (n) => Number(n.toFixed(2)).toLocaleString('en-LK');

// A ring that fills up to three times the alert level, so "low" always looks nearly empty.
function Ring({ item }) {
  const full = Math.max(item.lowAt * 3, item.quantity, 1);
  const p = Math.min(1, item.quantity / full);
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg className={`s-ring ${state(item)}`} viewBox="0 0 84 84" width="84" height="84" role="img" aria-label={`${Math.round(p * 100)} percent full`}>
      <circle cx="42" cy="42" r={r} fill="none" strokeWidth="9" className="track" />
      <circle cx="42" cy="42" r={r} fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 42 42)" className="fill" />
      <text x="42" y="47" textAnchor="middle" fontSize="15" fontWeight="700">{Math.round(p * 100)}%</text>
    </svg>
  );
}

function AddForm({ onClose, onSaved }) {
  const [f, setF] = useState({ name: '', unit: 'kg', quantity: '', lowAt: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [onClose]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/admin/stock', { method: 'POST', body: { name: f.name, unit: f.unit, quantity: Number(f.quantity) || 0, lowAt: Number(f.lowAt) || 0 } });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return createPortal(
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="Add a stock item" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dish-form" style={{ width: 'min(480px, 100%)' }} onSubmit={submit}>
        <header><h2>Add a stock item</h2><button type="button" className="icon-btn-s" onClick={onClose} aria-label="Close">✕</button></header>
        <div className="df-body">
          {error && <p role="alert" className="alert">{error}</p>}
          <fieldset><legend>Quick start</legend>
            <div className="df-chips">{STARTERS.map(([n, u]) => <button key={n} type="button" aria-pressed={f.name === n} onClick={() => setF({ ...f, name: n, unit: u })}>{n}</button>)}</div>
          </fieldset>
          <div className="df-row" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
            <label>Name<input required maxLength={80} placeholder="e.g. Chickpeas" value={f.name} onChange={set('name')} autoFocus /></label>
            <label>Unit<select value={f.unit} onChange={set('unit')}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
          </div>
          <div className="df-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <label>How much now<input type="number" min="0" step="any" placeholder="0" value={f.quantity} onChange={set('quantity')} /></label>
            <label>Warn me at or below<input type="number" min="0" step="any" placeholder="e.g. 5" value={f.lowAt} onChange={set('lowAt')} /></label>
          </div>
        </div>
        <footer>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add to stock'}</button>
        </footer>
      </form>
    </div>,
    document.querySelector('.admin') ?? document.body
  );
}

export default function Stock() {
  const { user } = useAuth();
  const manager = ['manager', 'owner'].includes(user.role);
  const [items, setItems] = useState([]);
  const [move, setMove] = useState({}); // id -> amount typed
  const [edit, setEdit] = useState({}); // id -> { lowAt, unit }
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => api('/admin/stock').then((d) => setItems(d.items)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const run = async (fn) => { setError(''); try { await fn(); load(); } catch (e) { setError(e.message); } };
  const change = (i, delta) => run(() => api(`/admin/stock/${i._id}`, { method: 'PATCH', body: { delta } }));
  const typed = (i, sign) => run(async () => {
    const n = Number(move[i._id]);
    if (!n) return;
    await api(`/admin/stock/${i._id}`, { method: 'PATCH', body: { delta: sign * n } });
    setMove({ ...move, [i._id]: '' });
  });
  const save = (i) => run(async () => {
    const e = edit[i._id];
    await api(`/admin/stock/${i._id}`, { method: 'PATCH', body: { lowAt: Number(e.lowAt) || 0, unit: e.unit || i.unit } });
    setEdit({ ...edit, [i._id]: undefined });
  });
  const remove = (i) => run(() => api(`/admin/stock/${i._id}`, { method: 'PATCH', body: { active: false } }));

  const low = items.filter((i) => state(i) === 'low');
  const out = items.filter((i) => state(i) === 'out');
  const tabs = [['all', 'All', () => true], ['attention', 'Needs attention', (i) => state(i) !== 'ok'], ['ok', 'In stock', (i) => state(i) === 'ok']];
  const order = { out: 0, low: 1, ok: 2 };
  const shown = items.filter((i) => tabs.find((t) => t[0] === filter)[2](i) && i.name.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => order[state(a)] - order[state(b)] || a.name.localeCompare(b.name));

  return (
    <div>
      <Stats>
        <Stat label="Items tracked" value={items.length} />
        <Stat label="Running low" value={low.length} tone={low.length ? 'bad' : 'good'} sub={low.length ? low.map((i) => i.name).slice(0, 3).join(', ') : 'nothing to reorder'} />
        <Stat label="Out of stock" value={out.length} tone={out.length ? 'bad' : 'mute'} sub={out.length ? out.map((i) => i.name).slice(0, 3).join(', ') : 'all items available'} />
      </Stats>
      <Toolbar>
        <Seg label="Show" value={filter} onChange={setFilter} options={tabs.map(([id, label, test]) => ({ id, label, count: items.filter(test).length }))} />
        <Search value={q} onChange={setQ} placeholder="Search stock" label="Search stock" />
        {manager && <button className="btn btn-primary small" onClick={() => setAdding(true)}>＋ Add item</button>}
      </Toolbar>
      {error && <p role="alert" className="alert">{error}</p>}

      <div className="st-grid">
        {shown.map((i) => {
          const s = state(i);
          const e = edit[i._id];
          return (
            <article key={i._id} className={`st-card ${s}`}>
              <header>
                <div><h3>{i.name}</h3><small>Updated {ago(i.updatedAt)}</small></div>
                <span className={`pill ${s === 'ok' ? 'ok' : 'cancelled'}`}>{LABEL[s]}</span>
              </header>
              <div className="st-mid">
                <Ring item={i} />
                <div><div className="st-qty">{num(i.quantity)}<small>{i.unit}</small></div><span className="sub">Warn at {num(i.lowAt)} {i.unit}</span></div>
              </div>
              <div className="st-step">
                <button type="button" onClick={() => change(i, -1)} disabled={i.quantity < 1} aria-label={`Use 1 ${i.unit} of ${i.name}`}>−1</button>
                <input type="number" min="0" step="any" placeholder={`Amount (${i.unit})`} aria-label={`Amount for ${i.name}`} value={move[i._id] ?? ''} onChange={(ev) => setMove({ ...move, [i._id]: ev.target.value })} />
                <button type="button" onClick={() => change(i, 1)} aria-label={`Add 1 ${i.unit} of ${i.name}`}>+1</button>
              </div>
              <div className="st-act">
                <button className="btn btn-primary small" disabled={!Number(move[i._id])} onClick={() => typed(i, 1)}>Received</button>
                <button className="btn btn-outline small" disabled={!Number(move[i._id])} onClick={() => typed(i, -1)}>Used / wasted</button>
                {manager && <button type="button" className="icon-btn-s" title="Edit alert level" aria-label={`Edit ${i.name}`} onClick={() => setEdit({ ...edit, [i._id]: e ? undefined : { lowAt: String(i.lowAt), unit: i.unit } })}>⚙</button>}
              </div>
              {e && (
                <div className="st-edit">
                  <label>Warn at<input type="number" min="0" step="any" value={e.lowAt} onChange={(ev) => setEdit({ ...edit, [i._id]: { ...e, lowAt: ev.target.value } })} /></label>
                  <label>Unit<select value={e.unit} onChange={(ev) => setEdit({ ...edit, [i._id]: { ...e, unit: ev.target.value } })}>{[...new Set([i.unit, ...UNITS])].map((u) => <option key={u}>{u}</option>)}</select></label>
                  <button className="btn btn-primary small" onClick={() => save(i)}>Save</button>
                  <button className="btn btn-outline small" onClick={() => remove(i)}>Remove item</button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {items.length === 0 && !error && (
        <Empty icon="📦" title="Start tracking your ingredients">
          {manager ? 'Add what the kitchen runs on (chickpeas, olive oil, chicken…). You get a warning when something runs low.' : 'A manager needs to add the first items.'}
        </Empty>
      )}
      {items.length === 0 && manager && <p className="empty-act"><button className="btn btn-primary" onClick={() => setAdding(true)}>＋ Add your first item</button></p>}
      {items.length > 0 && shown.length === 0 && <Empty icon="🔎" title="Nothing matches">Try another search or filter.</Empty>}
      {adding && <AddForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}
