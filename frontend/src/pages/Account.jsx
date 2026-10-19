import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatDateTime, formatLkr } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { Field, FormError } from '../components/Form.jsx';

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwState, setPwState] = useState({ error: null, ok: false });

  useEffect(() => {
    api('/account/orders').then((d) => setOrders(d.orders)).catch(() => {});
    api('/account/reservations').then((d) => setBookings(d.reservations)).catch(() => {});
  }, []);

  async function changePassword(e) {
    e.preventDefault();
    setPwState({ error: null, ok: false });
    try {
      await api('/auth/password', { method: 'POST', body: pw });
      setPw({ currentPassword: '', newPassword: '' });
      setPwState({ error: null, ok: true });
    } catch (error) {
      setPwState({ error, ok: false });
    }
  }

  return (
    <section className="page container">
      <h1>Hello, {user.name.split(' ')[0]}</h1>
      <p className="muted">{user.email}</p>
      <button type="button" className="btn btn-outline" onClick={async () => { await logout(); navigate('/'); }}>Sign out</button>

      <h2>Your orders</h2>
      {orders.length === 0 ? <p>No orders yet. <Link to="/menu">Browse the menu</Link></p> : (
        <ul className="lines">
          {orders.map((o) => <li key={o.reference}><Link to={`/order-tracking/${o.reference}`}>{o.reference}</Link><span>{o.status.replaceAll('-', ' ')}</span><span>{formatLkr(o.totals.totalCents)}</span></li>)}
        </ul>
      )}

      <h2>Your reservations</h2>
      {bookings.length === 0 ? <p>No bookings yet. <Link to="/reservations">Book a table</Link></p> : (
        <ul className="lines">
          {bookings.map((b) => <li key={b.reference}><span>{formatDateTime(b.startsAt)}</span><span>{b.partySize} guests</span><span>{b.status}</span></li>)}
        </ul>
      )}

      <h2>Change password</h2>
      <form onSubmit={changePassword} className="narrow">
        <FormError error={pwState.error} />
        {pwState.ok && <p role="status">Password changed. Other devices have been signed out.</p>}
        <Field label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
        <Field label="New password" type="password" autoComplete="new-password" minLength={10} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required />
        <button className="btn btn-primary">Change password</button>
      </form>
    </section>
  );
}
