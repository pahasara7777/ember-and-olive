import { useEffect, useState } from 'react';
import { api, formatLkr } from '../../lib/api.js';

// Shop rules the owner can change without a deploy. The POS and the online checkout both read these.
export default function Settings() {
  const [f, setF] = useState(null);
  const [saved, setSaved] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const fromApi = (s) => ({ servicePct: s.servicePct, fee: s.deliveryFeeCents / 100, min: s.deliveryMinCents / 100 });
  useEffect(() => { api('/admin/settings').then(({ settings }) => { setF(fromApi(settings)); setSaved(fromApi(settings)); }).catch((e) => setError(e.message)); }, []);

  async function save(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api('/admin/settings', { method: 'PATCH', body: { servicePct: Number(f.servicePct), deliveryFeeCents: Math.round(Number(f.fee) * 100), deliveryMinCents: Math.round(Number(f.min) * 100) } });
      setSaved(f);
      setMsg('Saved. The POS and checkout use the new values now.');
    } catch (err) {
      setError(err.message);
    }
  }
  if (!f) return error ? <p role="alert" className="alert">{error}</p> : <p>Loading…</p>;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const dirty = JSON.stringify(f) !== JSON.stringify(saved);
  const example = 290000; // LKR 2,900 bill

  return (
    <form onSubmit={save}>
      {error && <p role="alert" className="alert">{error}</p>}
      <div className="s-grid">
        <section className="s-card">
          <h3>🍽 Dining</h3>
          <p>Added to dine-in bills at the POS when the cashier ticks “Service charge”.</p>
          <label>Service charge (%)<input type="number" min="0" max="30" step="any" required value={f.servicePct} onChange={set('servicePct')} /></label>
          <div className="hint">On a {formatLkr(example)} bill the guest pays {formatLkr(Math.round((example * (Number(f.servicePct) || 0)) / 100))} service charge.</div>
        </section>
        <section className="s-card">
          <h3>🛵 Delivery</h3>
          <p>Applied to online orders at checkout.</p>
          <label>Delivery fee (LKR)<input type="number" min="0" step="any" required value={f.fee} onChange={set('fee')} /></label>
          <label>Minimum order (LKR)<input type="number" min="0" step="any" required value={f.min} onChange={set('min')} /></label>
          <div className="hint">Guests see “{formatLkr(Math.round(Number(f.fee) * 100) || 0)} · minimum order {formatLkr(Math.round(Number(f.min) * 100) || 0)}”.</div>
        </section>
      </div>
      <div className="s-save">
        <button className="btn btn-primary" disabled={!dirty}>Save changes</button>
        <span role="status" className="muted-line">{dirty ? 'You have unsaved changes.' : msg || 'All changes saved.'}</span>
      </div>
    </form>
  );
}
