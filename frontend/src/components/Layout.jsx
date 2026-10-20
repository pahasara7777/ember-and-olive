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

// Elements that fade up as they scroll into view (styled in global.css).
const REVEAL = '.page-head, .section-head, .dish, .cat-link, .quote, .cta-pair > *, .story .container > *, .event-band, .social img, .panel, .info-card .item';

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

  // Reveal on scroll. A MutationObserver picks up content that renders after an API call.
  useEffect(() => {
    document.documentElement.classList.add('motion');
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.setAttribute('data-in', ''); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    const scan = () => document.querySelectorAll(`${REVEAL}:not([data-rv])`).forEach((el) => { el.setAttribute('data-rv', ''); io.observe(el); });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.getElementById('main'), { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);

  return (
    <>
      <div className="scroll-progress" aria-hidden="true" />
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
              {count > 0 && <span key={count} className="badge" aria-hidden="true">{count}</span>}
            </Link>
          </div>
        </div>
      </header>
      <main id="main"><div key={pathname} className="page-enter"><Outlet /></div></main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-cta">
            <h2>Save a seat by the fire.</h2>
            <div className="btn-row">
              <Link to="/reservations" className="btn btn-primary">Book a Table</Link>
              <Link to="/menu" className="btn btn-light">Order Online</Link>
            </div>
          </div>
          <div className="footer-cols">
            <div>
              <p className="footer-brand">The Ember &amp; Olive</p>
                            <p className="footer-addr">42 Gregory's Road, Colombo 07<br />Phone and email to be confirmed by the owner</p>
              <div className="socials">
                {[['Instagram', <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></>],
                  ['Facebook', <path d="M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />],
                  ['TikTok', <path d="M14 3v11a3.5 3.5 0 11-3.5-3.5M14 3c0 2.5 2 4.5 5 4.5" />]].map(([n, d]) => (
                  <Link key={n} to="/contact" aria-label={n}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3>Explore</h3>
              <ul className="links">
                <li><Link to="/menu">Menu</Link></li><li><Link to="/reservations">Reservations</Link></li><li><Link to="/events-catering">Events &amp; Catering</Link></li>
                <li><Link to="/gallery">Gallery</Link></li><li><Link to="/blog">Blog</Link></li><li><Link to="/reviews">Reviews</Link></li>
                <li><Link to="/about">About us</Link></li><li><Link to="/contact">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-base">
            <span>© {new Date().getFullYear()} The Ember &amp; Olive. Fictional project data.</span>
            <nav aria-label="Legal"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/terms">Cancellation policy</Link></nav>
            <button type="button" className="to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top ↑</button>
          </div>
        </div>
      </footer>
    </>
  );
}
