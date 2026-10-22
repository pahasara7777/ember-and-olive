import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { Avatar, Empty } from '../../components/AdminUI.jsx';

// Same closed day as the website booking form (backend/src/lib/booking.js).
const CLOSED_WEEKDAY = 1; // Monday
const FROM = 11; // the timeline runs 11:00 to 23:00 (Colombo time)
const TO = 23;
const STATUSES = ['confirmed', 'seated', 'completed', 'no-show', 'cancelled'];
const COLOR = { pending: '#d97706', confirmed: '#c9520a', seated: '#16a34a', completed: '#94a3b8', cancelled: '#dc2626', 'no-show': '#dc2626' };

const today = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
const shift = (d, n) => new Date(new Date(`${d}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
const dow = (d) => new Date(`${d}T12:00:00Z`).getUTCDay();
const hours = (iso) => { const d = new Date(new Date(iso).getTime() + 5.5 * 3600000); return d.getUTCHours() + d.getUTCMinutes() / 60; }; // Colombo hour of day
const clock = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' });
const pct = (h) => Math.min(100, Math.max(0, ((h - FROM) / (TO - FROM)) * 100));
const natural = (a, b) => a.label.localeCompare(b.label, undefined, { numeric: true });
const TICKS = Array.from({ length: TO - FROM - 1 }, (_, i) => FROM + 1 + i); // one label per hour, not on the very edges

export default function BookingsAdmin() {
  const [date, setDate] = useState(today());
  const [list, setList] = useState([]);
  const [tables, setTables] = useState([]);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(() => api(`/admin/reservations?date=${encodeURIComponent(date)}`).then((d) => setList(d.reservations)).catch((e) => setError(e.message)), [date]);
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => { api('/admin/floor').then((d) => setTables(d.tables.sort(natural))).catch(() => {}); }, []);

  async function update(id, body) {
    setError('');
    try {
      await api(`/admin/reservations/${id}`, { method: 'PATCH', body });
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  const active = list.filter((r) => !['cancelled', 'no-show'].includes(r.status));
  const closed = dow(date) === CLOSED_WEEKDAY;
  const isToday = date === today();
  const nowPct = isToday ? pct(hours(new Date().toISOString())) : null;
  const week = Array.from({ length: 7 }, (_, i) => shift(date, i - 3));
  const sorted = [...list].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  const unseated = active.filter((r) => !r.tables?.length);
  const onTable = (t) => active.filter((r) => r.tables?.some((x) => (x._id ?? x.label) === t._id || x.label === t.label));
  const busy = tables.filter((t) => onTable(t).length > 0);
  const rows = showAll ? tables : busy; // by default only tables that have a booking, so the timeline is not 20 empty lines
  const guests = active.reduce((n, r) => n + r.partySize, 0);
  const summary = [
    [active.length, 'bookings'], [guests, 'guests'], [list.filter((r) => r.status === 'seated').length, 'seated now'],
    [list.filter((r) => ['confirmed', 'pending'].includes(r.status)).length, 'still to arrive']
  ];

  return (
    <div className="rs">
      <div className="rs-head">
        <div className="week" role="group" aria-label="Pick a day">
          <button type="button" className="wk-nav" onClick={() => setDate(shift(date, -7))} aria-label="Previous week">‹</button>
          {week.map((d) => (
            <button key={d} type="button" aria-pressed={d === date} className={`${d === today() ? 'is-today' : ''}${dow(d) === CLOSED_WEEKDAY ? ' is-closed' : ''}`} onClick={() => setDate(d)}>
              <small>{new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })}</small>
              <b>{d.slice(8)}</b>
            </button>
          ))}
          <button type="button" className="wk-nav" onClick={() => setDate(shift(date, 7))} aria-label="Next week">›</button>
        </div>
        <div className="rs-tools">
          <input type="date" aria-label="Jump to a date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          {!isToday && <button className="btn btn-primary small" onClick={() => setDate(today())}>Today</button>}
        </div>
      </div>

      <div className="rs-sum">
        {summary.map(([n, l]) => <span key={l}><b>{n}</b> {l}</span>)}
        {closed && <em>Closed on Mondays: the website offers no bookings today.</em>}
      </div>
      {error && <p role="alert" className="alert">{error}</p>}

      <section className="a-panel tl">
        <div className="head"><h2>Tables timeline</h2><p>{showAll ? `All ${tables.length} tables` : `${busy.length} of ${tables.length} tables booked`} · hover a bar for details</p></div>
        {tables.length === 0 ? <p className="muted">No tables yet.</p> : (
          <div className="tl-scroll">
            <div className="tl-grid">
              <div className="tl-row tl-top">
                <div className="tl-label" />
                <div className="tl-track">{TICKS.map((h) => <span key={h} style={{ left: `${pct(h)}%` }}>{h}:00</span>)}</div>
              </div>
              {unseated.length > 0 && (
                <div className="tl-row">
                  <div className="tl-label warn">No table</div>
                  <div className="tl-track">{unseated.map((r) => <Bar key={r._id} r={r} />)}</div>
                </div>
              )}
              {rows.map((t) => (
                <div key={t._id} className="tl-row">
                  <div className="tl-label"><b>{t.label}</b><small>{t.seats}</small></div>
                  <div className="tl-track">{onTable(t).map((r) => <Bar key={r._id} r={r} />)}</div>
                </div>
              ))}
              {rows.length === 0 && unseated.length === 0 && <div className="tl-empty">No bookings yet, so every table is free.</div>}
              {nowPct !== null && nowPct > 0 && nowPct < 100 && <div className="tl-now" style={{ '--p': nowPct / 100 }}><i>Now</i></div>}
            </div>
          </div>
        )}
        {tables.length > 0 && <button type="button" className="tl-toggle" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show only booked tables' : `Show all ${tables.length} tables`}</button>}
      </section>

      <div className="a-toolbar" style={{ marginTop: 22 }}><h2 style={{ margin: 0 }}>Bookings</h2></div>
      {sorted.length === 0 ? (
        <Empty icon="📅" title="No bookings on this day">{closed ? 'The restaurant is closed on Mondays.' : 'Reservations made on the website show up here and on the timeline.'}</Empty>
      ) : (
        <div className="rs-list">
          {sorted.map((r) => {
            const off = ['cancelled', 'no-show'].includes(r.status);
            return (
              <article key={r._id} className={`bk${off ? ' off' : ''}`} style={{ '--bar': COLOR[r.status] }}>
                <div className="bk-time"><b>{clock(r.startsAt)}</b><small>{r.partySize} guests</small></div>
                <Avatar name={r.name} size={36} />
                <div className="bk-main">
                  <strong>{r.name}</strong>
                  <a href={`tel:${r.phone}`}>{r.phone}</a>
                  {r.occasion && <span>🎉 {r.occasion}</span>}
                  {(r.specialRequests || r.accessibilityNeeds) && <span>📝 {r.specialRequests}{r.accessibilityNeeds && ` · Access: ${r.accessibilityNeeds}`}</span>}
                  <div className="chips-i">{r.tables?.length ? r.tables.map((t) => <span key={t._id ?? t.label}>{t.label}</span>) : <span className="need">Needs a table</span>}</div>
                </div>
                <select aria-label={`Status for ${r.reference}`} value={r.status} onChange={(e) => update(r._id, { status: e.target.value })}>
                  {[...new Set([r.status, ...STATUSES])].map((s) => <option key={s} value={s}>{s.replace('-', ' ')}</option>)}
                </select>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Bar({ r }) {
  const left = pct(hours(r.startsAt));
  const width = Math.max(4, pct(hours(r.endsAt)) - left);
  return (
    <div className="tl-bar" style={{ left: `${left}%`, width: `${width}%`, background: COLOR[r.status] }} title={`${r.name} · ${r.partySize} guests · ${clock(r.startsAt)}–${clock(r.endsAt)} · ${r.status}`}>
      <b>{r.name.split(' ')[0]}</b> <span>{r.partySize}</span>
    </div>
  );
}
