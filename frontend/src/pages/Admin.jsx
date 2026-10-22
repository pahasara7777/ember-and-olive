import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import Dashboard from './admin/Dashboard.jsx';
import Pos from './admin/Pos.jsx';
import OrdersAdmin from './admin/OrdersAdmin.jsx';
import BookingsAdmin from './admin/BookingsAdmin.jsx';
import MenuAdmin from './admin/MenuAdmin.jsx';
import EnquiriesAdmin from './admin/EnquiriesAdmin.jsx';
import ReviewsAdmin from './admin/ReviewsAdmin.jsx';
import UsersAdmin from './admin/UsersAdmin.jsx';
import Kitchen from './admin/Kitchen.jsx';
import Floor from './admin/Floor.jsx';
import Report from './admin/Report.jsx';
import Stock from './admin/Stock.jsx';
import Customers from './admin/Customers.jsx';
import Coupons from './admin/Coupons.jsx';
import AuditLog from './admin/AuditLog.jsx';
import Settings from './admin/Settings.jsx';
import '../styles/admin.css';
import '../styles/admin-ui.css';

// Which sections each role sees. The server applies the same rules, so a hidden section is also a forbidden API.
const TABS = [
  { group: 'Overview', id: 'dashboard', label: 'Dashboard', roles: ['manager', 'owner'], View: Dashboard },
  { group: 'Overview', id: 'report', label: 'Reports & end of day', roles: ['manager', 'owner'], View: Report },
  { group: 'Service', id: 'pos', label: 'POS', roles: ['host', 'manager', 'owner'], View: Pos },
  { group: 'Service', id: 'floor', label: 'Tables', roles: ['host', 'manager', 'owner'], View: Floor },
  { group: 'Service', id: 'kitchen', label: 'Kitchen display', roles: ['host', 'kitchen', 'manager', 'owner'], View: Kitchen },
  { group: 'Service', id: 'orders', label: 'Orders', roles: ['host', 'kitchen', 'manager', 'owner'], View: OrdersAdmin },
  { group: 'Service', id: 'bookings', label: 'Reservations', roles: ['host', 'manager', 'owner'], View: BookingsAdmin },
  { group: 'Kitchen & menu', id: 'menu', label: 'Menu & prices', roles: ['kitchen', 'manager', 'owner'], View: MenuAdmin },
  { group: 'Kitchen & menu', id: 'stock', label: 'Stock', roles: ['kitchen', 'manager', 'owner'], View: Stock },
  { group: 'Guests', id: 'customers', label: 'Customers', roles: ['manager', 'owner'], View: Customers },
  { group: 'Guests', id: 'reviews', label: 'Reviews', roles: ['marketing', 'manager', 'owner'], View: ReviewsAdmin },
  { group: 'Guests', id: 'enquiries', label: 'Enquiries & messages', roles: ['marketing', 'manager', 'owner'], View: EnquiriesAdmin },
  { group: 'Guests', id: 'coupons', label: 'Coupons', roles: ['marketing', 'manager', 'owner'], View: Coupons },
  { group: 'System', id: 'users', label: 'Staff & roles', roles: ['owner'], View: UsersAdmin },
  { group: 'System', id: 'audit', label: 'Audit log', roles: ['owner'], View: AuditLog },
  { group: 'System', id: 'settings', label: 'Settings', roles: ['owner'], View: Settings }
];

const ICONS = {
  dashboard: 'M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z',
  pos: 'M4 6h16v12H4zM4 10h16M8 15h3',
  orders: 'M5 4h14v16H5zM9 9h6M9 13h6',
  floor: 'M4 9h16M6 9v10M18 9v10M3 9l2-4h14l2 4',
  kitchen: 'M6 3h12v6H6zM4 9h16v3H4zM7 12v9M17 12v9',
  report: 'M5 20V10M12 20V4M19 20v-7',
  stock: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8',
  customers: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.500-6 8-6s8 2 8 6',
  coupons: 'M3 9V6h18v3a2 2 0 0 0 0 6v3H3v-3a2 2 0 0 0 0-6zM9 6v12',
  audit: 'M6 3h9l4 4v14H6zM9 12h7M9 16h7',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.400-2.300 1a7 7 0 0 0-2-1.200L14.300 3h-4l-.3 2.700a7 7 0 0 0-2 1.200l-2.300-1-2 3.400 2 1.500A7 7 0 0 0 5 12c0 .4 0 .8.1 1.200l-2 1.500 2 3.400 2.300-1a7 7 0 0 0 2 1.200l.3 2.700h4l.3-2.700a7 7 0 0 0 2-1.200l2.300 1 2-3.400-2-1.500c.1-.4.1-.8.1-1.200z',
  bookings: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  menu: 'M6 3v8a2 2 0 0 0 2 2v8M10 3v8M18 3c-2 2-3 5-3 8h3v10',
  enquiries: 'M4 5h16v11H9l-5 4z',
  reviews: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-6 7-6s7 2.500 7 6M17 5a3 3 0 0 1 0 6M19 14c2 .8 3 2.500 3 5'
};
const Icon = ({ id }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[id]} /></svg>
);

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tabs = TABS.filter((t) => t.roles.includes(user.role));
  const current = tabs.find((t) => t.id === params.get('tab')) || tabs[0];
  const [counts, setCounts] = useState({});
  const [q, setQ] = useState('');
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('admin-dark') === '1'; } catch { return false; } });
  const toggleDark = () => setDark((d) => { try { localStorage.setItem('admin-dark', d ? '0' : '1'); } catch { /* private mode: theme just won't persist */ } return !d; });
  const matches = q.trim() ? tabs.filter((t) => t.label.toLowerCase().includes(q.trim().toLowerCase())) : [];
  const waiting = Object.values(counts).reduce((n, c) => n + c, 0);

  // Badges on the menu come from the same summary the dashboard uses, so only managers and owners see them.
  useEffect(() => {
    if (!['manager', 'owner'].includes(user.role)) return;
    api('/admin/summary').then((s) => setCounts({ orders: s.attention.placedOrders, enquiries: s.attention.newEnquiries + s.attention.newMessages, reviews: s.attention.pendingReviews })).catch(() => {});
  }, [user.role, current?.id]);

  const go = (id, extra = {}) => { setParams({ tab: id, ...extra }); setQ(''); };
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Colombo' });
  const View = current?.View;

  return (
    <div className={dark ? 'admin dark' : 'admin'}>
      <aside className="admin-side">
        <div className="admin-brand"><span className="logo">E</span><span>Ember &amp; Olive</span></div>
        <nav className="admin-nav" aria-label="Admin">
          {tabs.map((t, i) => (
            <div key={t.id} className="nav-group">
              {t.group !== tabs[i - 1]?.group && <p className="nav-title">{t.group}</p>}
              <button type="button" className="nav-item" aria-current={t.id === current.id ? 'page' : undefined} onClick={() => go(t.id)}>
                <Icon id={t.id} />{t.label}{counts[t.id] > 0 && <span className="badge" aria-label={`${counts[t.id]} waiting`}>{counts[t.id]}</span>}
              </button>
            </div>
          ))}
        </nav>
        <div className="admin-who">
          <div className="who-chip"><span className="av" aria-hidden="true">{user.name?.[0]?.toUpperCase()}</span><span><b>{user.name}</b><small>{user.role}</small></span></div>
          <Link to="/" className="ghost">View website</Link>
          <button type="button" className="ghost" onClick={async () => { await logout(); navigate('/'); }}>Sign out</button>
        </div>
      </aside>
      <main className="admin-main" id="main">
        <div className="admin-top">
          <div><h1>{current?.label}</h1><p>{today} · Asia/Colombo</p></div>
          <div className="tools">
            <div className="search">
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && matches[0] && go(matches[0].id)} placeholder="Jump to a section…" aria-label="Jump to a section" />
              {matches.length > 0 && <ul>{matches.map((t) => <li key={t.id}><button type="button" onClick={() => go(t.id)}>{t.label}</button></li>)}</ul>}
            </div>
            <button type="button" className="tool-btn" onClick={toggleDark} aria-pressed={dark} aria-label="Dark mode" title="Dark mode">{dark ? '☀️' : '🌙'}</button>
            <button type="button" className="tool-btn" onClick={() => go(tabs.find((t) => counts[t.id] > 0)?.id ?? current.id)} aria-label={`${waiting} items waiting`} title={`${waiting} waiting`}>🔔{waiting > 0 && <span className="dot" />}</button>
          </div>
          <div className="who-chip"><span className="av" aria-hidden="true">{user.name?.[0]?.toUpperCase()}</span>{user.name}</div>
        </div>
        {View ? <View go={go} /> : <p>Your role has no dashboard sections.</p>}
      </main>
    </div>
  );
}
