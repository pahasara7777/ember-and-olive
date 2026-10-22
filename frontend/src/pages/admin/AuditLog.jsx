import { useEffect, useState } from 'react';
import { api, formatDateTime } from '../../lib/api.js';
import { Empty, Search, Seg, Toolbar, ago } from '../../components/AdminUI.jsx';

// Who changed what, newest first. Owner only.
const GROUPS = [['all', 'Everything', ''], ['order', 'Orders & refunds', 'order.'], ['menu', 'Menu & stock', ['menu.', 'stock.']], ['people', 'People & points', ['user.', 'loyalty.']], ['shop', 'Settings & coupons', ['settings.', 'coupon.', 'table.', 'day.']]];
const inGroup = (action, g) => g === 'all' || [].concat(GROUPS.find(([id]) => id === g)[2]).some((p) => action.startsWith(p));
const show = (v) => (v == null ? '' : typeof v === 'object' ? Object.entries(v).map(([k, x]) => `${k}: ${typeof x === 'object' ? JSON.stringify(x) : x}`).join(', ') : String(v));

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
        {shown.map((e) => (
          <li key={e._id}>
            <div className="t"><code>{e.action}</code><small title={formatDateTime(e.createdAt)}>{ago(e.createdAt)} · {formatDateTime(e.createdAt)}</small></div>
            <p className="diff">
              {e.entity && <b>{e.entity} </b>}
              {e.before && <>{show(e.before)} <span aria-hidden="true">→</span> </>}
              {show(e.after)}
            </p>
          </li>
        ))}
      </ol>
      {shown.length === 0 && !error && <Empty icon="📜" title="Nothing recorded">Changes to prices, roles, orders, refunds and settings are listed here.</Empty>}
    </div>
  );
}
