import { useCallback, useEffect, useState } from 'react';
import { api, formatDateTime } from '../../lib/api.js';

const STATUSES = ['confirmed', 'seated', 'completed', 'no-show', 'cancelled'];
const today = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);

export default function BookingsAdmin() {
  const [date, setDate] = useState(today());
  const [list, setList] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(() => api(`/admin/reservations?date=${encodeURIComponent(date)}`).then((d) => setList(d.reservations)).catch((e) => setError(e.message)), [date]);
  useEffect(() => { load(); }, [load]);

  async function update(id, body) {
    setError('');
    try {
      await api(`/admin/reservations/${id}`, { method: 'PATCH', body });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2>Reservations</h2>
      <label>Day <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      {error && <p role="alert" className="alert">{error}</p>}
      <table className="table">
        <thead><tr><th>Time</th><th>Guest</th><th>Party</th><th>Tables</th><th>Requests</th><th>Status</th></tr></thead>
        <tbody>
          {list.map((r) => (
            <tr key={r._id}>
              <td>{formatDateTime(r.startsAt)}</td>
              <td>{r.name}<br /><small>{r.phone}</small></td>
              <td>{r.partySize}</td>
              <td>{r.tables?.map((t) => t.label).join(', ')}</td>
              <td>{r.specialRequests}{r.accessibilityNeeds && <><br /><small>Access: {r.accessibilityNeeds}</small></>}</td>
              <td>
                <select aria-label={`Status for ${r.reference}`} value={r.status} onChange={(e) => update(r._id, { status: e.target.value })}>
                  {[...new Set([r.status, ...STATUSES])].map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && <p>No bookings on this day.</p>}
    </div>
  );
}
