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
  const charge = Math.round((example * (Number(f.servicePct) || 0)) / 100);

  return (
    <form onSubmit={save}>
      {error && <p role="alert" className="alert">{error}</p>}
      <div className="s-list">
        <section className="s-row">
          <div className="s-info"><h3>Dining</h3><p>Added to dine-in bills at the POS when the cashier ticks “Service charge”.</p></div>
          <div className="s-body">
            <label>Service charge<span className="unit"><input type="number" min="0" max="30" step="any" required value={f.servicePct} onChange={set('servicePct')} /><em>%</em></span></label>
            <dl className="s-preview" aria-label="Example bill">
              <dt>Bill</dt><dd>{formatLkr(example)}</dd>
              <dt>Service charge ({Number(f.servicePct) || 0}%)</dt><dd>{formatLkr(charge)}</dd>
              <dt className="tot">Guest pays</dt><dd className="tot">{formatLkr(example + charge)}</dd>
            </dl>
          </div>
        </section>
        <section className="s-row">
          <div className="s-info"><h3>Delivery</h3><p>Applied to online orders at checkout.</p></div>
          <div className="s-body">
            <div className="s-two">
              <label>Delivery fee<span className="unit"><em>LKR</em><input type="number" min="0" step="any" required value={f.fee} onChange={set('fee')} /></span></label>
              <label>Minimum order<span className="unit"><em>LKR</em><input type="number" min="0" step="any" required value={f.min} onChange={set('min')} /></span></label>
            </div>
            <p className="s-preview s-say">Guests see <b>{formatLkr(Math.round(Number(f.fee) * 100) || 0)}</b> delivery · minimum order <b>{formatLkr(Math.round(Number(f.min) * 100) || 0)}</b></p>
          </div>
        </section>
      </div>
      <div className="s-save">
        <button className="btn btn-primary" disabled={!dirty}>Save changes</button>
        <span role="status" className="muted-line">{dirty ? 'You have unsaved changes.' : msg || 'All changes saved.'}</span>
      </div>
    </form>
  );
}
