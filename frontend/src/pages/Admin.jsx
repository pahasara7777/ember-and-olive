import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import OrdersAdmin from './admin/OrdersAdmin.jsx';
import BookingsAdmin from './admin/BookingsAdmin.jsx';
import MenuAdmin from './admin/MenuAdmin.jsx';
import ReviewsAdmin from './admin/ReviewsAdmin.jsx';
import UsersAdmin from './admin/UsersAdmin.jsx';

// Which tabs each role sees. The server applies the same rules, so a hidden tab is also a forbidden API.
const TABS = [
  { id: 'orders', label: 'Orders', roles: ['host', 'kitchen', 'manager', 'owner'], View: OrdersAdmin },
  { id: 'bookings', label: 'Reservations', roles: ['host', 'manager', 'owner'], View: BookingsAdmin },
  { id: 'menu', label: 'Menu', roles: ['kitchen', 'manager', 'owner'], View: MenuAdmin },
  { id: 'reviews', label: 'Reviews', roles: ['marketing', 'manager', 'owner'], View: ReviewsAdmin },
  { id: 'users', label: 'People', roles: ['owner'], View: UsersAdmin }
];

export default function Admin() {
  const { user } = useAuth();
  const tabs = TABS.filter((t) => t.roles.includes(user.role));
  const [active, setActive] = useState(tabs[0]?.id);
  const View = tabs.find((t) => t.id === active)?.View;
  return (
    <section className="page container">
      <h1>Staff dashboard</h1>
      <p className="muted">Signed in as {user.name} ({user.role})</p>
      <div className="chips" role="tablist" aria-label="Dashboard sections">
        {tabs.map((t) => <button key={t.id} role="tab" aria-selected={t.id === active} className={t.id === active ? 'chip on' : 'chip'} onClick={() => setActive(t.id)}>{t.label}</button>)}
      </div>
      {View && <View />}
    </section>
  );
}
