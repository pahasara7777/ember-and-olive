import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';

const ROLES = ['customer', 'host', 'kitchen', 'marketing', 'manager', 'owner'];

export default function UsersAdmin() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
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

  return (
    <div>
      <h2>People</h2>
      {error && <p role="alert" className="alert">{error}</p>}
      <table className="table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td><select aria-label={`Role for ${u.email}`} disabled={u._id === me.id} value={u.role} onChange={(e) => patch(u._id, { role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></td>
              <td><button className="btn btn-outline small" disabled={u._id === me.id} onClick={() => patch(u._id, { active: !u.active })}>{u.active ? 'Deactivate' : 'Reactivate'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
