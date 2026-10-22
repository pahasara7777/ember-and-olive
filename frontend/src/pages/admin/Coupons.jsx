import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, formatLkr } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { Empty, Seg, Stat, Stats, Switch, Toolbar } from '../../components/AdminUI.jsx';

// Drafts start switched off; only the owner turns an offer on.
const TYPES = [['percent', '％', 'Percent off'], ['fixed', 'LKR', 'Money off'], ['free-delivery', '🛵', 'Free delivery']];
const TEMPLATES = [
  { icon: '👋', title: 'Welcome offer', text: '10% off a first order', form: { code: 'WELCOME10', type: 'percent', value: '10', minSpend: '', usageLimit: '' } },
  { icon: '🛵', title: 'Free delivery', text: 'On orders over LKR 3,000', form: { code: 'FREEDELIVERY', type: 'free-delivery', value: '', minSpend: '3000', usageLimit: '' } },
  { icon: '🎁', title: 'LKR 500 off', text: 'When they spend LKR 4,000', form: { code: 'SAVE500', type: 'fixed', value: '500', minSpend: '4000', usageLimit: '' } }
];
const blank = { code: '', type: 'percent', value: '', minSpend: '', expiresAt: '', usageLimit: '' };
const WORDS = ['EMBER', 'OLIVE', 'FEAST', 'GRILL', 'SUPPER', 'MEZZE', 'SAVOUR'];
const suggest = () => `${WORDS[Math.floor(Math.random() * WORDS.length)]}${[5, 10, 15, 20][Math.floor(Math.random() * 4)]}`;

const headline = (c) => (c.type === 'percent' ? `${c.value}%` : c.type === 'fixed' ? formatLkr(c.value) : 'FREE');
const sub = (c) => (c.type === 'percent' ? 'OFF' : c.type === 'fixed' ? 'OFF' : 'DELIVERY');
const expired = (c) => c.expiresAt && new Date(c.expiresAt) < new Date();

// One ticket, used for the live preview in the form and for every saved coupon.
function Ticket({ c, children }) {
  return (
    <article className={`cp-ticket${c.active && !expired(c) ? '' : ' off'}`}>
      <div className="cp-stub"><b>{c.type ? headline(c) : '–'}</b><span>{c.type ? sub(c) : ''}</span></div>
      <div className="cp-body">
        <code>{c.code || 'YOURCODE'}</code>
        <p>{[c.minSpendCents ? `Min spend ${formatLkr(c.minSpendCents)}` : 'No minimum', c.expiresAt ? `${expired(c) ? 'Ended' : 'Ends'} ${new Date(c.expiresAt).toLocaleDateString('en-GB')}` : 'No end date'].join(' · ')}</p>
        {children}
      </div>
    </article>
  );
}

function CreateDialog({ initial, onClose, onSaved }) {
  const [f, setF] = useState({ ...blank, ...initial });
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
  const value = f.type === 'fixed' ? Math.round(Number(f.value) * 100) : Number(f.value) || 0;
  const preview = { code: f.code, type: f.type, value, minSpendCents: Math.round(Number(f.minSpend) * 100) || 0, expiresAt: f.expiresAt || null, active: true };

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/admin/coupons', { method: 'POST', body: {
        code: f.code, type: f.type, value: f.type === 'free-delivery' ? 0 : value, minSpendCents: preview.minSpendCents,
        ...(f.expiresAt && { expiresAt: f.expiresAt }), ...(f.usageLimit && { usageLimit: Number(f.usageLimit) })
      } });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return createPortal(
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="New coupon" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dish-form" style={{ width: 'min(780px, 100%)' }} onSubmit={submit}>
        <header><h2>New coupon</h2><button type="button" className="icon-btn-s" onClick={onClose} aria-label="Close">✕</button></header>
        <div className="df-body cp-dialog">
          <div className="cp-fields">
            {error && <p role="alert" className="alert">{error}</p>}
            <fieldset><legend>What does it give?</legend>
              <div className="cp-types">{TYPES.map(([id, icon, label]) => <button key={id} type="button" aria-pressed={f.type === id} onClick={() => setF({ ...f, type: id, value: '' })}><span>{icon}</span>{label}</button>)}</div>
            </fieldset>
            {f.type !== 'free-delivery' && <label>{f.type === 'percent' ? 'Percent off (1-100)' : 'Amount off (LKR)'}<input required type="number" min="1" max={f.type === 'percent' ? 100 : undefined} step="any" placeholder={f.type === 'percent' ? '10' : '500'} value={f.value} onChange={set('value')} /></label>}
            <label>Code
              <span className="cp-code"><input required maxLength={20} placeholder="WELCOME10" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} /><button type="button" className="btn btn-outline small" onClick={() => setF({ ...f, code: suggest() })}>Suggest</button></span>
            </label>
            <div className="df-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label>Minimum spend (LKR)<input type="number" min="0" step="any" placeholder="None" value={f.minSpend} onChange={set('minSpend')} /></label>
              <label>Max uses<input type="number" min="1" placeholder="Unlimited" value={f.usageLimit} onChange={set('usageLimit')} /></label>
            </div>
            <label>Ends on (optional)<input type="date" value={f.expiresAt} onChange={set('expiresAt')} /></label>
          </div>
          <aside className="cp-preview" aria-label="Preview">
            <small>What guests will see</small>
            <Ticket c={preview} />
            <p>It is saved as a <b>draft</b>. The owner switches it on when it is ready.</p>
          </aside>
        </div>
        <footer>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || !f.code || (f.type !== 'free-delivery' && !f.value)}>{busy ? 'Saving…' : 'Save as draft'}</button>
        </footer>
      </form>
    </div>,
    document.querySelector('.admin') ?? document.body
  );
}

export default function Coupons() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('all');
  const [dialog, setDialog] = useState(null); // prefilled form values, or {} for a blank one
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => api('/admin/coupons').then((d) => setList(d.coupons)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const toggle = async (c, active) => {
    setError('');
    try { await api(`/admin/coupons/${c._id}`, { method: 'PATCH', body: { active } }); load(); } catch (e) { setError(e.message); }
  };
  const copy = async (code) => {
    try { await navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(''), 1500); } catch { /* clipboard blocked: the code is on screen anyway */ }
  };

  const soon = list.filter((c) => c.active && c.expiresAt && !expired(c) && new Date(c.expiresAt) - Date.now() < 7 * 86400000);
  const tabs = [['all', 'All', () => true], ['live', 'Live', (c) => c.active && !expired(c)], ['draft', 'Drafts', (c) => !c.active && !expired(c)], ['ended', 'Ended', expired]];
  const shown = list.filter(tabs.find((t) => t[0] === filter)[2]);

  return (
    <div>
      <Stats>
        <Stat label="Live offers" value={list.filter((c) => c.active && !expired(c)).length} tone="good" />
        <Stat label="Drafts" value={list.filter((c) => !c.active && !expired(c)).length} tone="mute" sub={user.role === 'owner' ? 'switch on to publish' : 'waiting for the owner'} />
        <Stat label="Times used" value={list.reduce((n, c) => n + (c.used ?? 0), 0)} />
        <Stat label="Ending this week" value={soon.length} tone={soon.length ? 'bad' : 'mute'} sub={soon.map((c) => c.code).slice(0, 2).join(', ')} />
      </Stats>
      <Toolbar>
        <Seg label="Show" value={filter} onChange={setFilter} options={tabs.map(([id, label, test]) => ({ id, label, count: list.filter(test).length }))} />
        <button className="btn btn-primary small" onClick={() => setDialog({})}>＋ New coupon</button>
      </Toolbar>
      {error && <p role="alert" className="alert">{error}</p>}

      <div className="cp-grid">
        {shown.map((c) => (
          <Ticket key={c._id} c={c}>
            {c.usageLimit ? (
              <div className="cp-use"><div className="meter"><i style={{ width: `${Math.min(100, ((c.used ?? 0) / c.usageLimit) * 100)}%` }} /></div><small>{c.used ?? 0} of {c.usageLimit} used</small></div>
            ) : <small className="cp-used">{c.used ?? 0} times used</small>}
            <div className="cp-foot">
              <button type="button" className="cp-copy" onClick={() => copy(c.code)}>{copied === c.code ? '✓ Copied' : '⧉ Copy code'}</button>
              <span className={`pill ${expired(c) ? 'off' : c.active ? 'ok' : 'placed'}`}>{expired(c) ? 'Ended' : c.active ? 'Live' : 'Draft'}</span>
              {(user.role === 'owner' || c.active) && !expired(c) && <Switch checked={c.active} label={`${c.code} is live`} onChange={(v) => toggle(c, v)} />}
            </div>
          </Ticket>
        ))}
      </div>

      {list.length === 0 && !error && (
        <section className="cp-start">
          <Empty icon="🎟" title="Give your guests a reason to come back">Start from an idea below, or build your own. New coupons stay drafts until the owner switches them on.</Empty>
          <div className="cp-templates">
            {TEMPLATES.map((t) => <button key={t.title} type="button" onClick={() => setDialog(t.form)}><span>{t.icon}</span><strong>{t.title}</strong><small>{t.text}</small></button>)}
          </div>
        </section>
      )}
      {list.length > 0 && shown.length === 0 && <Empty icon="🎟" title="Nothing here">No coupons match this filter.</Empty>}
      {dialog && <CreateDialog initial={dialog} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); load(); }} />}
    </div>
  );
}
