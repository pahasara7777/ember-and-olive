import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { useCart } from '../lib/cart.jsx';

const nav = [
  ['/about', 'About Us'],
  ['/menu', 'Menu'],
  ['/gallery', 'Gallery'],
  ['/events-catering', 'Events & Catering'],
  ['/contact', 'Contact']
];

const Leaf = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#263B2D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z" /><path d="M5 19c3-4 6-7 10-9" />
  </svg>
);

export default function Layout() {
  const { user } = useAuth();
  const { count } = useCart();
  const { pathname } = useLocation();

  // Move focus and scroll to the top on navigation so keyboard and screen-reader users start at the page.
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="logo" aria-label="The Ember and Olive, home"><Leaf /><span>The Ember &amp; Olive</span></Link>
          <nav className="site-nav" aria-label="Main">
            {nav.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
          </nav>
          <div className="header-actions">
            <Link to="/menu" className="btn btn-outline small">Order Online</Link>
            <Link to="/reservations" className="btn btn-primary small">Book a Table</Link>
            <Link to={user ? '/account' : '/login'} className="icon-btn" aria-label={user ? 'Your account' : 'Sign in'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>
            </Link>
            <Link to="/checkout" className="icon-btn" aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8a3 3 0 016 0" /></svg>
              {count > 0 && <span className="badge" aria-hidden="true">{count}</span>}
            </Link>
          </div>
        </div>
      </header>
      <main id="main"><Outlet /></main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-cols">
            <div>
              <p className="footer-brand">The Ember &amp; Olive</p>
              <p>42 Gregory's Road, Colombo 07<br />Phone and email to be confirmed by the owner</p>
            </div>
            <div>
              <h3>Opening hours</h3>
              <p>Mon: Closed<br />Tue–Thu: 11:30 AM – 10:00 PM<br />Fri: 11:30 AM – 10:30 PM<br />Sat: 10:00 AM – 10:30 PM<br />Sun: 10:00 AM – 9:00 PM</p>
            </div>
            <div>
              <h3>Explore</h3>
              <p className="links"><Link to="/menu">Menu</Link><br /><Link to="/reservations">Reservations</Link><br /><Link to="/menu">Order Online</Link><br /><Link to="/blog">Blog</Link><br /><Link to="/reviews">Reviews</Link></p>
            </div>
            <div>
              <h3>Follow</h3>
              <p className="links"><Link to="/contact">Instagram</Link><br /><Link to="/contact">Facebook</Link><br /><Link to="/contact">TikTok</Link></p>
            </div>
          </div>
          <div className="footer-base">
            <span>© {new Date().getFullYear()} The Ember &amp; Olive. Fictional project data.</span>
            <nav aria-label="Legal"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/terms">Cancellation policy</Link></nav>
          </div>
        </div>
      </footer>
    </>
  );
}
