import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import Dashboard from './admin/Dashboard.jsx';
import OrdersAdmin from './admin/OrdersAdmin.jsx';
import BookingsAdmin from './admin/BookingsAdmin.jsx';
import MenuAdmin from './admin/MenuAdmin.jsx';
import EnquiriesAdmin from './admin/EnquiriesAdmin.jsx';
import ReviewsAdmin from './admin/ReviewsAdmin.jsx';
import UsersAdmin from './admin/UsersAdmin.jsx';
import '../styles/admin.css';

// Which sections each role sees. The server applies the same rules, so a hidden section is also a forbidden API.
const TABS = [
  { id: 'dashboard', label: 'Dashboard', roles: ['manager', 'owner'], View: Dashboard },
  { id: 'orders', label: 'Orders', roles: ['host', 'kitchen', 'manager', 'owner'], View: OrdersAdmin },
  { id: 'bookings', label: 'Reservations', roles: ['host', 'manager', 'owner'], View: BookingsAdmin },
  { id: 'menu', label: 'Menu & prices', roles: ['kitchen', 'manager', 'owner'], View: MenuAdmin },
  { id: 'enquiries', label: 'Enquiries & messages', roles: ['marketing', 'manager', 'owner'], View: EnquiriesAdmin },
  { id: 'reviews', label: 'Reviews', roles: ['marketing', 'manager', 'owner'], View: ReviewsAdmin },
  { id: 'users', label: 'Staff & roles', roles: ['owner'], View: UsersAdmin }
];

const Leaf = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F5F0E6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z" /><path d="M5 19c3-4 6-7 10-9" /></svg>
);

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tabs = TABS.filter((t) => t.roles.includes(user.role));
  const current = tabs.find((t) => t.id === params.get('tab')) || tabs[0];
  const [counts, setCounts] = useState({});

  // Badges on the menu come from the same summary the dashboard uses, so only managers and owners see them.
  useEffect(() => {
    if (!['manager', 'owner'].includes(user.role)) return;
    api('/admin/summary').then((s) => setCounts({ orders: s.attention.placedOrders, enquiries: s.attention.newEnquiries + s.attention.newMessages, reviews: s.attention.pendingReviews })).catch(() => {});
  }, [user.role, current?.id]);

  const go = (id) => setParams({ tab: id });
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Colombo' });
  const View = current?.View;

  return (
    <div className="admin">
      <aside className="admin-side">
        <div className="admin-brand"><Leaf /><span>Ember &amp; Olive</span></div>
        <nav className="admin-nav" aria-label="Admin">
          {tabs.map((t) => (
            <button key={t.id} type="button" className="nav-item" aria-current={t.id === current.id ? 'page' : undefined} onClick={() => go(t.id)}>
              {t.label}{counts[t.id] > 0 && <span className="badge" aria-label={`${counts[t.id]} waiting`}>{counts[t.id]}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-who">
          <p className="nm">{user.name}</p>
          <p>Signed in as {user.role}</p>
          <Link to="/">View website</Link><br />
          <button type="button" onClick={async () => { await logout(); navigate('/'); }}>Sign out</button>
        </div>
      </aside>
      <main className="admin-main" id="main">
        <div className="admin-top">
          <div><h1>{current?.label}</h1><p>{today} · Asia/Colombo</p></div>
        </div>
        {View ? <View go={go} /> : <p>Your role has no dashboard sections.</p>}
      </main>
    </div>
  );
}
