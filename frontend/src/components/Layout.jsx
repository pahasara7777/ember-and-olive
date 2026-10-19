import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useCart } from '../lib/cart.jsx';
import { STAFF_ROLES } from './Guards.jsx';

const nav = [
  ['/about', 'About Us'],
  ['/menu', 'Menu'],
  ['/gallery', 'Gallery'],
  ['/events-catering', 'Events & Catering'],
  ['/reviews', 'Reviews'],
  ['/contact', 'Contact']
];

export default function Layout() {
  const { user } = useAuth();
  const { count } = useCart();
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="logo">The Ember &amp; Olive</Link>
          <nav className="site-nav" aria-label="Main">
            {nav.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
          </nav>
          <div className="header-actions">
            <Link to="/cart" className="btn btn-outline">Order{count > 0 ? ` (${count})` : ''}</Link>
            <Link to="/reservations" className="btn btn-primary">Book a Table</Link>
            {user ? (
              <>
                {STAFF_ROLES.includes(user.role) && <Link to="/admin" className="link">Staff</Link>}
                <Link to="/account" className="link">Account</Link>
              </>
            ) : (
              <Link to="/login" className="link">Sign in</Link>
            )}
          </div>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">
          <p>42 Gregory's Road, Colombo 07 · Closed Mondays</p>
          <p><Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link></p>
          <p>© {new Date().getFullYear()} The Ember &amp; Olive</p>
        </div>
      </footer>
    </>
  );
}
