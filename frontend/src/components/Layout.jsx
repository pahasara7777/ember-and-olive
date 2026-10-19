import { Link, NavLink, Outlet } from 'react-router-dom';

const nav = [
  ['/about', 'About Us'],
  ['/menu', 'Menu'],
  ['/gallery', 'Gallery'],
  ['/events-catering', 'Events & Catering'],
  ['/contact', 'Contact']
];

export default function Layout() {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="logo">The Ember &amp; Olive</Link>
          <nav className="site-nav" aria-label="Main">
            {nav.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
          </nav>
          <div className="header-actions">
            <Link to="/order" className="btn btn-outline">Order Online</Link>
            <Link to="/reservations" className="btn btn-primary">Book a Table</Link>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">
          <p>42 Gregory's Road, Colombo 07 · Closed Mondays</p>
          <p>© {new Date().getFullYear()} The Ember &amp; Olive</p>
        </div>
      </footer>
    </>
  );
}
