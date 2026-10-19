import { useCallback, useEffect, useState } from 'react';
import { api, formatDateTime, formatLkr } from '../../lib/api.js';

// The server decides which changes are allowed; this only decides which buttons to offer.
const NEXT = { placed: ['confirmed'], confirmed: ['preparing'], preparing: ['ready'], ready: ['completed', 'out-for-delivery'], 'out-for-delivery': ['completed'] };
const CANCELLABLE = ['placed', 'confirmed', 'preparing'];

export default function OrdersAdmin() {
  const [orders, setOrders] = useState([]);
  const [reasons, setReasons] = useState({});
  const [error, setError] = useState('');

  const load = useCallback(() => api('/admin/orders').then((d) => setOrders(d.orders)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function move(id, status) {
    setError('');
    try {
      await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status, reason: reasons[id] || undefined } });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2>Orders</h2>
      {error && <p role="alert" className="alert">{error}</p>}
      <table className="table">
        <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id}>
              <td>{o.reference}<br /><small>{formatDateTime(o.createdAt)}</small></td>
              <td>{o.customer.name}<br /><small>{o.customer.phone}</small></td>
              <td>{o.lines.map((l) => `${l.quantity}× ${l.name}`).join(', ')}{o.notes && <><br /><small>Note: {o.notes}</small></>}</td>
              <td>{formatLkr(o.totals.totalCents)}</td>
              <td>{o.status.replaceAll('-', ' ')}</td>
              <td className="actions">
                {(NEXT[o.status] ?? []).filter((s) => s !== 'out-for-delivery' || o.fulfillment === 'delivery').map((s) => <button key={s} className="btn btn-primary small" onClick={() => move(o._id, s)}>{s.replaceAll('-', ' ')}</button>)}
                {CANCELLABLE.includes(o.status) && (
                  <>
                    <input aria-label={`Reason for cancelling ${o.reference}`} placeholder="Reason" maxLength={200} value={reasons[o._id] ?? ''} onChange={(e) => setReasons({ ...reasons, [o._id]: e.target.value })} />
                    <button className="btn btn-outline small" disabled={!reasons[o._id]} onClick={() => move(o._id, 'cancelled')}>Cancel</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && !error && <p>No orders yet.</p>}
    </div>
  );
}
