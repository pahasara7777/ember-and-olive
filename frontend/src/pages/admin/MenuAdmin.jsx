import { useCallback, useEffect, useState } from 'react';
import { api, formatLkr } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';

export default function MenuAdmin() {
  const { user } = useAuth();
  const canEditPrice = ['manager', 'owner'].includes(user.role);
  const [items, setItems] = useState([]);
  const [prices, setPrices] = useState({});
  const [error, setError] = useState('');

  const load = useCallback(() => api('/admin/menu').then((d) => setItems(d.items)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function patch(id, body) {
    setError('');
    try {
      await api(`/admin/menu/${id}`, { method: 'PATCH', body });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2>Menu</h2>
      {error && <p role="alert" className="alert">{error}</p>}
      <table className="table">
        <thead><tr><th>Dish</th><th>Price</th><th>Availability</th></tr></thead>
        <tbody>
          {items.map((i) => (
            <tr key={i._id}>
              <td>{i.name}{i.archived && ' (hidden)'}</td>
              <td>
                {formatLkr(i.priceCents)}
                {canEditPrice && (
                  <span className="inline">
                    <input type="number" min="0" step="50" aria-label={`New price in LKR for ${i.name}`} value={prices[i._id] ?? ''} onChange={(e) => setPrices({ ...prices, [i._id]: e.target.value })} />
                    <button className="btn btn-outline small" disabled={prices[i._id] === undefined || prices[i._id] === ''} onClick={() => patch(i._id, { priceCents: Math.round(Number(prices[i._id]) * 100) })}>Set price</button>
                  </span>
                )}
              </td>
              <td>
                <select aria-label={`Availability of ${i.name}`} value={i.availability} onChange={(e) => patch(i._id, { availability: e.target.value })}>
                  {['available', 'sold-out', 'unavailable', 'scheduled'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
