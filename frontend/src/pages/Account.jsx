import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, formatDateTime, formatLkr } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { STAFF_ROLES } from '../components/Guards.jsx';
import { Field, FormError, fieldError } from '../components/Form.jsx';
import '../styles/account.css';

const TABS = [['overview', 'Overview'], ['orders', 'Orders'], ['reservations', 'Reservations'], ['profile', 'Profile & security'], ['marketing', 'Marketing preferences']];
const tone = (s) => (['completed', 'confirmed', 'seated'].includes(s) ? 'ok' : ['cancelled', 'refunded', 'no-show', 'rejected'].includes(s) ? 'bad' : ['received', 'accepted', 'preparing', 'ready', 'out-for-delivery', 'pending'].includes(s) ? 'info' : '');
const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

function Orders({ orders, limit }) {
  const list = limit ? orders.slice(0, limit) : orders;
  if (list.length === 0) return <p>No orders yet. <Link to="/menu" className="link">Browse the menu</Link></p>;
  return (
    <div className="scroll-x">
      <table className="table" style={{ minWidth: 520 }}>
        <thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead>
        <tbody>
          {list.map((o) => (
            <tr key={o.reference}>
              <td><strong>{o.reference}</strong></td>
              <td>{formatDateTime(o.createdAt)}</td>
              <td>{formatLkr(o.totals.totalCents)}</td>
              <td><span className={`status ${tone(o.status)}`}>{o.status.replaceAll('-', ' ')}</span></td>
              <td><Link to={`/order-tracking/${o.reference}`} className="btn btn-outline small">Track</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Bookings({ bookings, onCancel }) {
  if (bookings.length === 0) return <p>No bookings yet. <Link to="/reservations" className="link">Book a table</Link></p>;
  return (
    <div className="scroll-x">
      <table className="table" style={{ minWidth: 520 }}>
        <thead><tr><th>When</th><th>Guests</th><th>Reference</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead>
        <tbody>
          {bookings.map((b) => {
            const live = ['pending', 'confirmed'].includes(b.status) && new Date(b.startsAt) > new Date();
            return (
              <tr key={b.reference}>
                <td>{formatDateTime(b.startsAt)}</td><td>{b.partySize}</td><td>{b.reference}</td>
                <td><span className={`status ${tone(b.status)}`}>{b.status}</span></td>
                <td>{live && <button type="button" className="btn btn-danger small" onClick={() => onCancel(b)}>Cancel</button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Account() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'overview';
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [note, setNote] = useState('');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwState, setPwState] = useState({ error: null, ok: false });
  const [prof, setProf] = useState({ name: user.name, phone: user.phone || '' });
  const [profState, setProfState] = useState({ error: null, ok: false });

  const loadBookings = () => api('/account/reservations').then((d) => setBookings(d.reservations)).catch(() => {});
  useEffect(() => {
    api('/account/orders').then((d) => setOrders(d.orders)).catch(() => {});
    loadBookings();
  }, []);

  async function cancel(b) {
    if (!window.confirm(`Cancel the booking on ${formatDateTime(b.startsAt)}?`)) return;
    try {
      await api(`/reservations/${encodeURIComponent(b.reference)}`, { method: 'PATCH', body: { email: user.email, action: 'cancel' } });
      setNote('Reservation cancelled.');
      loadBookings();
    } catch (err) {
      setNote(err.message);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setProfState({ error: null, ok: false });
    try {
      const { user: u } = await api('/account/profile', { method: 'PATCH', body: { name: prof.name, phone: prof.phone || undefined } });
      setUser(u);
      setProfState({ error: null, ok: true });
    } catch (error) {
      setProfState({ error, ok: false });
    }
  }

  async function setMarketing(on) {
    try {
      const { user: u } = await api('/account/profile', { method: 'PATCH', body: { marketingConsent: on } });
      setUser(u);
      setNote(on ? 'You will get news and offers by email.' : 'You are unsubscribed from marketing email.');
    } catch (err) {
      setNote(err.message);
    }
  }

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

  const next = bookings.filter((b) => ['pending', 'confirmed'].includes(b.status) && new Date(b.startsAt) > new Date()).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0];
  const first = user.name.split(' ')[0];

  return (
    <div className="container acct">
      <aside className="acct-side">
        <div className="who">
          <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
          <div><p className="nm">{user.name}</p><p className="em">{user.email}</p></div>
        </div>
        <nav className="side-nav" aria-label="Account">
          {TABS.map(([k, label]) => (
            <button key={k} type="button" className="side" aria-current={tab === k ? 'page' : undefined} onClick={() => { setNote(''); setParams(k === 'overview' ? {} : { tab: k }); }}>{label}</button>
          ))}
          {STAFF_ROLES.includes(user.role) && <Link className="side" to="/admin">Admin dashboard</Link>}
          <button type="button" className="side out" onClick={async () => { await logout(); navigate('/'); }}>Sign out</button>
        </nav>
      </aside>

      <main className="acct-main" id="account-main">
        <h1>{tab === 'overview' ? `Welcome back, ${first}` : TABS.find(([k]) => k === tab)[1]}</h1>
        <p role="status" className="ok-note" style={{ margin: 0 }}>{note}</p>

        {tab === 'overview' && (
          <>
            <div className="cards">
              <div className="a-card">
                <p className="k">Next reservation</p>
                {next ? (
                  <>
                    <p className="big">{formatDateTime(next.startsAt)}</p>
                    <p style={{ margin: '4px 0 18px' }}>{next.partySize} guests · Ref {next.reference} · {next.status}</p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button type="button" className="btn btn-danger small" onClick={() => cancel(next)}>Cancel</button></div>
                  </>
                ) : <p style={{ margin: '8px 0 18px' }}>Nothing booked yet.</p>}
                {!next && <Link to="/reservations" className="btn btn-primary small">Book a table</Link>}
              </div>
              <div className="a-card dark">
                <p className="k">Ember Rewards</p>
                <p className="big" style={{ color: 'var(--linen)' }}>Coming soon</p>
                <p style={{ margin: 0, color: '#e8e1d0' }}>Points and rewards are not switched on yet.</p>
              </div>
            </div>
            <div className="a-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <h2>Recent orders</h2>
                <button type="button" className="link" style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 14 }} onClick={() => setParams({ tab: 'orders' })}>All orders</button>
              </div>
              <Orders orders={orders} limit={3} />
            </div>
          </>
        )}

        {tab === 'orders' && <div className="a-card"><Orders orders={orders} /></div>}
        {tab === 'reservations' && <div className="a-card"><Bookings bookings={bookings} onCancel={cancel} /></div>}

        {tab === 'profile' && (
          <>
            <div className="a-card">
              <h2>Your details</h2>
              <form onSubmit={saveProfile} noValidate style={{ marginTop: 16, maxWidth: 480 }}>
                <FormError error={profState.error} />
                {profState.ok && <p role="status" className="ok-note">Saved.</p>}
                <Field label="Full name" value={prof.name} onChange={(e) => setProf({ ...prof, name: e.target.value })} autoComplete="name" required maxLength={80} error={fieldError(profState.error, 'name')} />
                <Field label="Email" value={user.email} readOnly hint="Contact the restaurant to change your email." />
                <Field label="Mobile number" type="tel" value={prof.phone} onChange={(e) => setProf({ ...prof, phone: e.target.value })} autoComplete="tel" error={fieldError(profState.error, 'phone')} />
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Save details</button>
              </form>
            </div>
            <div className="a-card">
              <h2>Change password</h2>
              <form onSubmit={changePassword} style={{ marginTop: 16, maxWidth: 480 }}>
                <FormError error={pwState.error} />
                {pwState.ok && <p role="status" className="ok-note">Password changed. Other devices have been signed out.</p>}
                <Field label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
                <Field label="New password" type="password" autoComplete="new-password" minLength={10} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required hint="At least 10 characters." />
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Change password</button>
              </form>
            </div>
          </>
        )}

        {tab === 'marketing' && (
          <div className="a-card">
            <h2>Email preferences</h2>
            <p>Booking and order emails are always sent. News and offers are optional, and you can change this at any time.</p>
            <label className="check" style={{ margin: '16px 0' }}>
              <input type="checkbox" checked={user.marketingConsent} onChange={(e) => setMarketing(e.target.checked)} />
              <span>Send me news and offers by email.</span>
            </label>
          </div>
        )}
      </main>
    </div>
  );
}
