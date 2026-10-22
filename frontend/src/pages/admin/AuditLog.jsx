import { useEffect, useState } from 'react';
import { api, formatDateTime, formatLkr } from '../../lib/api.js';
import { Empty, Search, Seg, Toolbar, ago } from '../../components/AdminUI.jsx';

// Who changed what, newest first. Owner only.
const GROUPS = [['all', 'Everything', ''], ['order', 'Orders & refunds', 'order.'], ['menu', 'Menu & stock', ['menu.', 'stock.']], ['people', 'People & points', ['user.', 'loyalty.']], ['shop', 'Settings & coupons', ['settings.', 'coupon.', 'table.', 'day.']]];
const inGroup = (action, g) => g === 'all' || [].concat(GROUPS.find(([id]) => id === g)[2]).some((p) => action.startsWith(p));
const MONEY = /(cents|total|discount|amount|refund)$/i;
const label = (k) => k.replace(/Cents$/, '').replace(/([A-Z])/g, ' $1').toLowerCase();
const val = (k, v) => (v == null || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : MONEY.test(k) && typeof v === 'number' ? formatLkr(v) : String(v));
const VERBS = { update: 'updated', create: 'created', delete: 'deleted', status: 'status changed', pos: 'till sale', refund: 'refunded', adjust: 'adjusted' };
const title = (action) => { const [a, ...v] = action.split('.'); return `${a[0].toUpperCase()}${a.slice(1)} ${v.map((x) => VERBS[x] ?? x).join(' ')}`.trim(); };
const ICON = { order: '🧾', menu: '🍽️', stock: '📦', user: '👤', loyalty: '⭐', settings: '⚙️', coupon: '🏷️', table: '🪑', day: '📅' };
// Only fields that actually changed; a create/POS entry (no "before") lists every field.
const changes = (e) => {
  const before = e.before && typeof e.before === 'object' ? e.before : {}, after = e.after && typeof e.after === 'object' ? e.after : { value: e.after };
  return Object.keys({ ...before, ...after }).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])).map((k) => ({ k, from: e.before ? val(k, before[k]) : null, to: val(k, after[k]) }));
};
const dayKey = (iso) => new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', weekday: 'long', day: 'numeric', month: 'long' });

export default function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [group, setGroup] = useState('all');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { api('/admin/audit').then((d) => setEntries(d.entries)).catch((e) => setError(e.message)); }, []);
  const shown = entries.filter((e) => inGroup(e.action, group) && `${e.action} ${e.entity ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div>
      <Toolbar>
        <Seg label="Show" value={group} onChange={setGroup} options={GROUPS.map(([id, label]) => ({ id, label }))} />
        <Search value={q} onChange={setQ} placeholder="Filter, e.g. refund" label="Filter the log" />
      </Toolbar>
      {error && <p role="alert" className="alert">{error}</p>}
      <ol className="a-timeline">
        {shown.map((e, i) => (
          <li key={e._id} data-day={i === 0 || dayKey(shown[i - 1].createdAt) !== dayKey(e.createdAt) ? dayKey(e.createdAt) : undefined}>
            <span className="ic" aria-hidden="true">{ICON[e.action.split('.')[0]] ?? '📝'}</span>
            <div className="body">
              <div className="t"><b>{title(e.action)}{e.entity && <span className="ent"> · {e.entity}</span>}</b><small title={formatDateTime(e.createdAt)}>{ago(e.createdAt)}</small></div>
              <div className="chg">
                {changes(e).map(({ k, from, to }) => (
                  <span key={k} className="c"><em>{label(k)}</em>{from !== null && <><s>{from}</s><i aria-hidden="true">→</i></>}<strong>{to}</strong></span>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
      {shown.length === 0 && !error && <Empty icon="📜" title="Nothing recorded">Changes to prices, roles, orders, refunds and settings are listed here.</Empty>}
    </div>
  );
}
