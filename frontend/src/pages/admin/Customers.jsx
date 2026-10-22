import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, formatLkr } from '../../lib/api.js';
import { Avatar, Empty, Search, Seg, Stat, Stats, Toolbar, ago } from '../../components/AdminUI.jsx';

// Guests with accounts: what they spend and their loyalty points. Managers and owners only (contact details).
// Tiers are a simple rule of thumb on spend (LKR), not stored anywhere; change the numbers here if the owner wants other levels.
const REGULAR = 2000000; // LKR 20,000 in cents
const VIP = 5000000; // LKR 50,000
const tier = (c) => (c.spentCents >= VIP ? 'VIP' : c.spentCents >= REGULAR || c.orders >= 4 ? 'Regular' : c.orders >= 1 ? 'Guest' : 'New');
const TIER_CLASS = { VIP: 'vip', Regular: 'reg', Guest: 'gst', New: 'new' };
const nextGoal = (c) => (c.spentCents >= VIP ? null : c.spentCents >= REGULAR ? ['VIP', VIP] : ['Regular', REGULAR]);
const SORTS = {
  recent: ['Latest order', (a, b) => new Date(b.lastOrder ?? 0) - new Date(a.lastOrder ?? 0)],
  spent: ['Top spenders', (a, b) => b.spentCents - a.spentCents],
  orders: ['Most orders', (a, b) => b.orders - a.orders],
  points: ['Most points', (a, b) => b.points - a.points]
};
const REASONS = ['Goodwill gift', 'Apology for a late order', 'Birthday bonus', 'Correction'];

function PointsDialog({ guest, onClose, onSaved }) {
  const [points, setPoints] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [onClose]);
  const n = Math.round(Number(points)) || 0;

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api(`/admin/customers/${guest._id}/points`, { method: 'POST', body: { points: n, note } });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return createPortal(
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={`Adjust points for ${guest.name}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dish-form" style={{ width: 'min(440px, 100%)' }} onSubmit={submit}>
        <header><h2>Adjust loyalty points</h2><button type="button" className="icon-btn-s" onClick={onClose} aria-label="Close">✕</button></header>
        <div className="df-body">
          <div className="cu-who"><Avatar name={guest.name} size={44} /><div><strong>{guest.name}</strong><span>Balance now <b>{guest.points}</b> points</span></div></div>
          {error && <p role="alert" className="alert">{error}</p>}
          <fieldset><legend>Points (use − to take away)</legend>
            <div className="df-chips">{[50, 100, 250, -50].map((v) => <button key={v} type="button" aria-pressed={n === v} onClick={() => setPoints(String(v))}>{v > 0 ? `+${v}` : v}</button>)}</div>
          </fieldset>
          <label>Custom amount<input type="number" step="1" placeholder="e.g. 75" value={points} onChange={(e) => setPoints(e.target.value)} /></label>
          <fieldset><legend>Reason</legend>
            <div className="df-chips">{REASONS.map((r) => <button key={r} type="button" aria-pressed={note === r} onClick={() => setNote(r)}>{r}</button>)}</div>
          </fieldset>
          <label>Or write your own<input maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          {n !== 0 && <p className="hint-box">New balance: <b>{guest.points + n}</b> points</p>}
        </div>
        <footer>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || !n || !note || guest.points + n < 0}>{busy ? 'Saving…' : 'Apply'}</button>
        </footer>
      </form>
    </div>,
    document.querySelector('.admin') ?? document.body
  );
}

export default function Customers() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [seg, setSeg] = useState('all');
  const [sort, setSort] = useState('recent');
  const [dialog, setDialog] = useState(null);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => api('/admin/customers').then((d) => setList(d.customers)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const segs = [['all', 'Everyone', () => true], ['VIP', 'VIP', (c) => tier(c) === 'VIP'], ['Regular', 'Regulars', (c) => tier(c) === 'Regular'], ['Guest', 'Guests', (c) => tier(c) === 'Guest'], ['New', 'New', (c) => tier(c) === 'New']];
  const test = segs.find((s) => s[0] === seg)[2];
  const shown = list.filter((c) => test(c) && `${c.name} ${c.email} ${c.phone ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())).sort(SORTS[sort][1]);
  const revenue = list.reduce((n, c) => n + c.spentCents, 0);
  const top = [...list].sort((a, b) => b.spentCents - a.spentCents)[0];

  return (
    <div>
      <Stats>
        <Stat label="Guests with accounts" value={list.length} sub={`${list.filter((c) => c.orders === 0).length} haven't ordered yet`} />
        <Stat label="Came back" value={list.filter((c) => c.orders > 1).length} tone="good" sub={list.length ? `${Math.round((list.filter((c) => c.orders > 1).length / list.length) * 100)}% ordered more than once` : ''} />
        <Stat label="Spent by account holders" value={formatLkr(revenue)} sub={top && top.spentCents ? `Top: ${top.name}` : ''} />
        <Stat label="Loyalty points held" value={list.reduce((n, c) => n + c.points, 0).toLocaleString('en-LK')} tone="mute" />
      </Stats>
      <Toolbar>
        <Seg label="Show" value={seg} onChange={setSeg} options={segs.map(([id, label, t]) => ({ id, label, count: list.filter(t).length }))} />
        <Search value={q} onChange={setQ} placeholder="Search name, email or phone" label="Search customers" />
        <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>{Object.entries(SORTS).map(([id, [label]]) => <option key={id} value={id}>{label}</option>)}</select>
      </Toolbar>
      {error && <p role="alert" className="alert">{error}</p>}
      {flash && <p role="status" className="flash">{flash}</p>}

      <div className="cu-grid">
        {shown.map((c) => {
          const t = tier(c);
          const goal = nextGoal(c);
          return (
            <article key={c._id} className="cu-card">
              <header>
                <Avatar name={c.name} size={48} />
                <div className="cu-name"><h3>{c.name}</h3><span className={`cu-tier ${TIER_CLASS[t]}`}>{t === 'VIP' ? '★ VIP' : t}</span></div>
              </header>
              <div className="cu-contact">
                <a href={`mailto:${c.email}`}>✉ {c.email}</a>
                {c.phone && <a href={`tel:${c.phone}`}>☎ {c.phone}</a>}
              </div>
              <dl className="cu-stats">
                <div><dt>Orders</dt><dd>{c.orders}</dd></div>
                <div><dt>Spent</dt><dd>{formatLkr(c.spentCents)}</dd></div>
                <div><dt>Points</dt><dd className="pts">{c.points}</dd></div>
              </dl>
              {goal ? (
                <div className="cu-goal"><div className="meter"><i style={{ width: `${Math.min(100, (c.spentCents / goal[1]) * 100)}%` }} /></div><small>{formatLkr(goal[1] - c.spentCents)} more to reach {goal[0]}</small></div>
              ) : <div className="cu-goal"><small>Top tier reached 🎉</small></div>}
              <footer>
                <small>{c.lastOrder ? `Last order ${ago(c.lastOrder)}` : 'No orders yet'}</small>
                <button type="button" className="btn btn-outline small" onClick={() => setDialog(c)}>Adjust points</button>
              </footer>
            </article>
          );
        })}
      </div>
      {shown.length === 0 && !error && <Empty icon="👥" title={list.length ? 'No guests match' : 'No guests yet'}>{list.length ? 'Try another search or filter.' : 'Guests who create an account on the website will be listed here with their orders and points.'}</Empty>}
      {dialog && <PointsDialog guest={dialog} onClose={() => setDialog(null)} onSaved={() => { setFlash(`Points updated for ${dialog.name}.`); setDialog(null); load(); setTimeout(() => setFlash(''), 4000); }} />}
    </div>
  );
}
