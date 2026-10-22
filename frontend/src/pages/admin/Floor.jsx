import { useCallback, useEffect, useState } from 'react';
import { api, formatLkr } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';

const time = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' });
const STATES = [['all', 'All'], ['free', 'Free'], ['reserved', 'Reserved soon'], ['occupied', 'Occupied']];

// A table drawn with its chairs, so a glance tells size and state.
function Table({ t, onOpen, onRemove }) {
  const top = Math.ceil(t.seats / 2);
  const chairs = (n) => <div className="chairs">{Array.from({ length: n }, (_, i) => <span key={i} />)}</div>;
  const note = t.tab ? `Tab ${formatLkr(t.tab.totalCents)}` : t.booking ? `${t.booking.name} · ${time(t.booking.startsAt)}` : 'Free';
  return (
    <div className={`tbl ${t.state}`}>
      <button type="button" onClick={onOpen} aria-label={`Table ${t.label}, ${t.seats} seats, ${t.state}. ${note}`}>
        {chairs(top)}
        <div className="top"><strong>{t.label}</strong><span>{t.seats} seats</span></div>
        {chairs(t.seats - top)}
        <em>{note}</em>
      </button>
      {onRemove && <button type="button" className="tbl-x" onClick={onRemove} aria-label={`Remove table ${t.label}`}>✕</button>}
    </div>
  );
}

// Every table at a glance. Tapping one opens the POS for it (or its open tab).
export default function Floor({ go }) {
  const { user } = useAuth();
  const manager = ['manager', 'owner'].includes(user.role);
  const [tables, setTables] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ label: '', seats: 2, area: 'main' });

  const load = useCallback(() => api('/admin/floor').then((d) => setTables(d.tables.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })))).catch((e) => setError(e.message)), []);
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const run = async (fn) => { setError(''); try { await fn(); load(); } catch (e) { setError(e.message); } };
  const add = (e) => { e.preventDefault(); run(async () => { await api('/admin/tables', { method: 'POST', body: { ...form, seats: Number(form.seats) } }); setForm({ label: '', seats: 2, area: 'main' }); }); };
  const open = (t) => (t.tab ? go('pos', { settle: t.tab._id }) : go('pos', { table: t.label }));
  const count = (s) => tables.filter((t) => s === 'all' || t.state === s).length;
  const areas = [...new Set(tables.map((t) => t.area))];

  return (
    <div>
      {error && <p role="alert" className="alert">{error}</p>}
      <div className="floor-top">
        <div className="chips" role="group" aria-label="Show tables">
          {STATES.map(([id, label]) => <button key={id} type="button" className={`chip-f ${id}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label} <b>{count(id)}</b></button>)}
        </div>
        <p className="muted-line">{tables.reduce((n, t) => n + t.seats, 0)} seats · refreshes every 15 s</p>
      </div>
      {areas.map((area) => {
        const list = tables.filter((t) => t.area === area && (filter === 'all' || t.state === filter));
        return (
          <section key={area} className="a-panel area">
            <div className="head"><h2 style={{ textTransform: 'capitalize', margin: 0 }}>{area}</h2><p>{list.length} tables</p></div>
            <div className="floor">
              {list.map((t) => <Table key={t._id} t={t} onOpen={() => open(t)} onRemove={manager ? () => run(() => api(`/admin/tables/${t._id}`, { method: 'PATCH', body: { active: false } })) : null} />)}
              {list.length === 0 && <p className="muted-line">No {filter} tables here.</p>}
            </div>
          </section>
        );
      })}
      {tables.length === 0 && !error && <p className="muted">No tables yet.</p>}
      {manager && (
        <form className="inline-form table-add" onSubmit={add}>
          <h2>Add a table</h2>
          <input aria-label="Table name" placeholder="Name (e.g. T21)" required maxLength={20} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <input aria-label="Seats" type="number" min="1" max="30" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
          <select aria-label="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}><option value="main">Main</option><option value="private">Private</option><option value="terrace">Terrace</option></select>
          <button className="btn btn-primary small">Add table</button>
        </form>
      )}
    </div>
  );
}
