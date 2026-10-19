import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatLkr } from '../lib/api.js';

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/menu')
      .then(({ items }) => setFeatured(items.filter((i) => i.featured)))
      .catch(() => setError('Could not load the menu. Is the API running and seeded?'));
  }, []);

  return (
    <section className="page container">
      <h1 style={{ fontSize: 'clamp(48px, 7vw, 88px)', lineHeight: 1 }}>Fire-Kissed Flavours. Mediterranean Soul.</h1>
      <p style={{ maxWidth: 520, fontSize: 19 }}>A neighbourhood table for honest food, good wine, and memorable evenings in Colombo.</p>
      <div className="header-actions">
        <Link to="/reservations" className="btn btn-primary">Reserve a Table</Link>
        <Link to="/menu" className="btn btn-outline">Explore Our Menu</Link>
      </div>

      <h2 style={{ fontSize: 48, marginTop: 72 }}>Our Signature Dishes</h2>
      {error && <p role="alert" className="placeholder">{error}</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
        {featured.map((d) => (
          <li key={d._id}>
            <h3 style={{ fontSize: 26 }}>{d.name}</h3>
            <p style={{ margin: 0, fontWeight: 600 }}>{formatLkr(d.priceCents)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
