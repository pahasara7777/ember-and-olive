import { useCallback, useEffect, useState } from 'react';
import { api, formatLkr } from '../../lib/api.js';
import { Stat, Stats, Toolbar, Seg } from '../../components/AdminUI.jsx';

const today = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
const lkr = (v) => Math.round(Number(v) * 100) || 0;
const clock = (h) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;

// Sales, takings and the end-of-day cash count. Managers and owners only; the server enforces it.
export default function Report() {
  const [date, setDate] = useState(today());
  const [days, setDays] = useState(1);
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState({ opening: '', counted: '', note: '' });

  const load = useCallback(() => api(`/admin/report?date=${date}&days=${days}`).then(setR).catch((e) => setError(e.message)), [date, days]);
  useEffect(() => { load(); }, [load]);

  async function close(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/admin/report/close', { method: 'POST', body: { date, openingFloatCents: lkr(drawer.opening), countedCashCents: lkr(drawer.counted), note: drawer.note || undefined } });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!r) return error ? <p role="alert" className="alert">{error}</p> : <p>Loading…</p>;
  const net = r.grossCents - r.refundedCents;
  const split = [['cash', 'Cash', r.cashCents], ['card', 'Card', r.cardCents], ['unpaid', 'Not paid yet', r.unpaidCents]];
  const total = split.reduce((n, s) => n + s[2], 0) || 1;
  const hours = r.hours.filter((h) => h.hour >= 8);
  const maxH = Math.max(1, ...hours.map((h) => h.orders));
  const maxD = Math.max(1, ...r.byDay.map((d) => d.revenueCents));
  const topMax = Math.max(1, ...r.topDishes.map((d) => d.sold));
  const c = r.close;

  return (
    <div>
      <Toolbar>
        <Seg label="Range" value={days} onChange={setDays} options={[{ id: 1, label: 'One day' }, { id: 7, label: '7 days' }, { id: 30, label: '30 days' }]} />
        <input type="date" aria-label="Last day" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <span className="muted-line grow">{r.from === r.to ? r.to : `${r.from} → ${r.to}`}</span>
        <button className="btn btn-outline small" onClick={() => window.print()}>Print</button>
      </Toolbar>
      {error && <p role="alert" className="alert">{error}</p>}

      <section className="report-hero">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-end' }}>
          <div><p>Net sales</p><div className="big-n">{formatLkr(net)}</div></div>
          <div><p>Orders</p><div className="big-n" style={{ fontSize: 28 }}>{r.orders}</div></div>
          <div><p>POS / online</p><div className="big-n" style={{ fontSize: 28 }}>{r.posOrders} / {r.webOrders}</div></div>
        </div>
        <div className="pay-split" role="img" aria-label="Payment split">{split.map(([id, , v]) => <i key={id} className={id} style={{ width: `${(v / total) * 100}%` }} />)}</div>
        <div className="legend">{split.map(([id, label, v]) => <span key={id} style={{ '--c': id === 'cash' ? '#f47b20' : id === 'card' ? '#fbbf24' : '#94a3b8' }}>{label} {formatLkr(v)}</span>)}</div>
      </section>

      <Stats>
        <Stat label="Gross sales" value={formatLkr(r.grossCents)} />
        <Stat label="Refunded" value={formatLkr(r.refundedCents)} tone={r.refundedCents ? 'bad' : 'mute'} />
        <Stat label="Discounts given" value={formatLkr(r.discountCents)} tone="mute" />
        <Stat label="Service charge" value={formatLkr(r.serviceCents)} tone="good" />
      </Stats>

      <div className="row-flex">
        <div className="a-panel wide">
          <div className="head"><h2>{days > 1 ? 'Sales per day' : 'Busy hours'}</h2><p>{days > 1 ? 'Revenue' : 'Orders per hour'}</p></div>
          {days > 1 ? (
            <div className="hbars">{r.byDay.map((d) => <div key={d.date} className="col"><div className={d.revenueCents ? '' : 'zero'} style={{ height: `${(d.revenueCents / maxD) * 100}%` }} title={formatLkr(d.revenueCents)} /><span>{d.date.slice(8)}</span></div>)}</div>
          ) : (
            <div className="hbars">{hours.map((h) => <div key={h.hour} className="col"><div className={h.orders ? '' : 'zero'} style={{ height: `${(h.orders / maxH) * 100}%` }}>{h.orders > 0 && <b>{h.orders}</b>}</div><span>{clock(h.hour)}</span></div>)}</div>
          )}
        </div>
        <div className="a-panel narrow">
          <div className="head"><h2>Top dishes</h2><p>Sold</p></div>
          <ol className="rank">
            {r.topDishes.map((d, i) => <li key={d.name}><b>{i + 1}</b><div>{d.name}<div className="bar"><i style={{ width: `${(d.sold / topMax) * 100}%` }} /></div></div><span>{d.sold}</span></li>)}
          </ol>
          {r.topDishes.length === 0 && <p className="muted">No sales in this period.</p>}
        </div>
      </div>

      {days === 1 && (
        <section className="a-panel" style={{ maxWidth: 640 }}>
          <div className="head"><h2>End-of-day cash count</h2><p>{c ? 'Counted' : 'Not counted yet'}</p></div>
          {c && (
            <p style={{ margin: '0 0 14px' }}>
              Expected <b>{formatLkr(c.expectedCashCents)}</b> · counted <b>{formatLkr(c.countedCashCents)}</b> ·{' '}
              <span className={`pill ${c.varianceCents === 0 ? 'ok' : 'cancelled'}`}>{c.varianceCents === 0 ? 'Balanced' : c.varianceCents > 0 ? `Over ${formatLkr(c.varianceCents)}` : `Short ${formatLkr(-c.varianceCents)}`}</span>
            </p>
          )}
          <form className="a-form" onSubmit={close}>
            <label>Opening float (LKR)<input type="number" min="0" step="any" required value={drawer.opening} onChange={(e) => setDrawer({ ...drawer, opening: e.target.value })} /></label>
            <label>Cash counted (LKR)<input type="number" min="0" step="any" required value={drawer.counted} onChange={(e) => setDrawer({ ...drawer, counted: e.target.value })} /></label>
            <label>Note<input maxLength={300} placeholder="Optional" value={drawer.note} onChange={(e) => setDrawer({ ...drawer, note: e.target.value })} /></label>
            <button className="btn btn-primary">{c ? 'Update count' : 'Close the day'}</button>
          </form>
        </section>
      )}
    </div>
  );
}
