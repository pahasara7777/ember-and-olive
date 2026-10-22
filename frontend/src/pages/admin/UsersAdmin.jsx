import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { Avatar, Search, Seg, Stat, Stats, Switch, Toolbar } from '../../components/AdminUI.jsx';

const ROLES = ['customer', 'host', 'kitchen', 'marketing', 'manager', 'owner'];

export default function UsersAdmin() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('staff');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => api('/admin/users').then((d) => setUsers(d.users)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function patch(id, body) {
    setError('');
    try {
      await api(`/admin/users/${id}`, { method: 'PATCH', body });
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  const staff = (u) => u.role !== 'customer';
  const shown = users.filter((u) => (filter === 'all' || (filter === 'staff' ? staff(u) : !staff(u))) && `${u.name} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div>
      <Stats>
        <Stat label="Staff" value={users.filter(staff).length} sub={`${users.filter((u) => staff(u) && !u.active).length} deactivated`} />
        <Stat label="Owners & managers" value={users.filter((u) => ['owner', 'manager'].includes(u.role)).length} />
        <Stat label="Guest accounts" value={users.filter((u) => !staff(u)).length} tone="mute" />
      </Stats>
      <Toolbar>
        <Seg label="Show" value={filter} onChange={setFilter} options={[{ id: 'staff', label: 'Staff' }, { id: 'guests', label: 'Guests' }, { id: 'all', label: 'Everyone' }]} />
        <Search value={q} onChange={setQ} placeholder="Search name or email" label="Search people" />
      </Toolbar>
      {error && <p role="alert" className="alert">{error}</p>}
      <div className="a-list">
        {shown.map((u) => (
          <article key={u._id} className={`a-row${u.active ? '' : ' off'}`}>
            <Avatar name={u.name} size={44} />
            <div className="grow">
              <h3>{u.name} {u._id === me.id && <span className="a-tag">You</span>}</h3>
              <span className="sub">{u.email}</span>
            </div>
            <select aria-label={`Role for ${u.email}`} disabled={u._id === me.id} value={u.role} onChange={(e) => patch(u._id, { role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
            <label className="acts" style={{ gap: 10, fontSize: 13, color: 'var(--muted)' }}>
              {u.active ? 'Active' : 'Deactivated'}
              <Switch checked={u.active} disabled={u._id === me.id} label={`Access for ${u.email}`} onChange={(v) => patch(u._id, { active: v })} />
            </label>
          </article>
        ))}
      </div>
    </div>
  );
}
