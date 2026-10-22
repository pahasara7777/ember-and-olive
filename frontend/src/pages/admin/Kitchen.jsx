import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';

// Live ticket board for the pass. Polls every few seconds; the server decides which moves are allowed.
const COLUMNS = [
  { id: 'new', title: 'New', statuses: ['placed', 'confirmed'], action: (o) => (o.status === 'placed' ? ['confirmed', 'Accept order'] : ['preparing', 'Start cooking']) },
  { id: 'cooking', title: 'Preparing', statuses: ['preparing'], action: () => ['ready', 'Mark ready'] },
  { id: 'ready', title: 'Ready', statuses: ['ready'], action: () => ['completed', 'Served / collected'] }
];
const TYPE = { 'dine-in': 'Dine-in', pickup: 'Takeaway', delivery: 'Delivery' };

// A short two-note chime for a new ticket; browsers only allow it after the first click on the page.
function chime(ctx) {
  [660, 880].forEach((hz, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = hz;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.18);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.3);
    o.start(ctx.currentTime + i * 0.18);
    o.stop(ctx.currentTime + i * 0.18 + 0.32);
  });
}

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [sound, setSound] = useState(true);
  const [done, setDone] = useState({}); // "orderId:line" -> true, a cook ticking dishes off (this screen only)
  const seen = useRef(null);
  const audio = useRef(null);

  const load = useCallback(() => api('/admin/kitchen').then((d) => {
    const fresh = d.orders.filter((o) => ['placed', 'confirmed'].includes(o.status)).map((o) => o._id);
    if (seen.current && fresh.some((id) => !seen.current.has(id)) && sound) {
      try { audio.current ??= new AudioContext(); chime(audio.current); } catch { /* no sound is fine */ }
    }
    seen.current = new Set(fresh);
    setOrders(d.orders);
    setNow(Date.now());
  }).catch((e) => setError(e.message)), [sound]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  async function move(id, status) {
    setError('');
    try { await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }); load(); } catch (e) { setError(e.message); }
  }
  const mins = (o) => Math.max(0, Math.round((now - new Date(o.createdAt)) / 60000));
  const urgency = (m) => (m >= 20 ? 'late' : m >= 10 ? 'warn' : 'ok');
  const active = orders.filter((o) => o.status !== 'ready').length;

  return (
    <div className="kds-wrap">
      <div className="kds-bar">
        <span className="live"><i /> Live</span>
        <span>{active} to cook · {orders.length - active} ready</span>
        <button type="button" className="kds-sound" aria-pressed={sound} onClick={() => setSound((s) => !s)}>{sound ? '🔔 Sound on' : '🔕 Sound off'}</button>
      </div>
      {error && <p role="alert" className="alert">{error}</p>}
      <div className="kds">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => col.statuses.includes(o.status));
          return (
            <section key={col.id} className={`kcol ${col.id}`} aria-label={col.title}>
              <h2><span>{col.title}</span><b>{list.length}</b></h2>
              {list.length === 0 && <p className="kempty">All clear</p>}
              {list.map((o) => {
                const [next, label] = col.action(o);
                const m = mins(o);
                return (
                  <article key={o._id} className={`ticket ${col.id === 'ready' ? 'ok' : urgency(m)}`}>
                    <header>
                      <div>
                        <strong>{o.table ? `Table ${o.table}` : o.customer?.name || TYPE[o.fulfillment]}</strong>
                        <span className="type">{TYPE[o.fulfillment] ?? o.fulfillment}</span>
                      </div>
                      <div className="age"><b>{m}</b><small>min</small></div>
                    </header>
                    <small className="ref">#{o.reference.slice(-5)}</small>
                    <ul>
                      {o.lines.map((l, i) => {
                        const key = `${o._id}:${i}`;
                        return (
                          <li key={i} className={done[key] ? 'done' : ''}>
                            <button type="button" onClick={() => setDone({ ...done, [key]: !done[key] })} aria-pressed={Boolean(done[key])}>
                              <b>{l.quantity}×</b>
                              <span>{l.name}{l.options?.length > 0 && <em>{l.options.map((x) => x.name).join(', ')}</em>}</span>
                            </button>
                            {l.notes && <p className="flag">⚠ {l.notes}</p>}
                          </li>
                        );
                      })}
                    </ul>
                    {o.notes && <p className="flag">📝 {o.notes}</p>}
                    <button className="act" onClick={() => move(o._id, next)}>{label}</button>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}
