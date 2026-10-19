import { useEffect, useState } from 'react';
import { api, formatLkr } from '../lib/api.js';
import { useCart } from '../lib/cart.jsx';

export default function Menu() {
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState('all');
  const [added, setAdded] = useState('');
  const cart = useCart();

  useEffect(() => {
    api('/menu').then(setMenu).catch(() => setError('Could not load the menu. Please try again.'));
  }, []);

  if (error) return <section className="page container"><p role="alert" className="alert">{error}</p></section>;
  if (!menu) return <section className="page container"><p>Loading the menu…</p></section>;

  const shown = menu.items.filter((i) => active === 'all' || i.category === active);

  return (
    <section className="page container">
      <h1>Our Menu</h1>
      <div className="chips" role="group" aria-label="Menu categories">
        <button type="button" className={active === 'all' ? 'chip on' : 'chip'} aria-pressed={active === 'all'} onClick={() => setActive('all')}>All</button>
        {menu.categories.map((c) => (
          <button key={c._id} type="button" className={active === c._id ? 'chip on' : 'chip'} aria-pressed={active === c._id} onClick={() => setActive(c._id)}>{c.name}</button>
        ))}
      </div>
      <ul className="grid">
        {shown.map((d) => {
          const available = d.availability === 'available';
          return (
            <li key={d._id} className="card">
              <h2>{d.name}</h2>
              <p>{d.description}</p>
              <p className="tags">{[...d.dietaryTags, ...(d.allergens.length ? [`contains ${d.allergens.join(', ')}`] : [])].join(' · ')}</p>
              <p className="price">{formatLkr(d.priceCents)}</p>
              <button type="button" className="btn btn-primary" disabled={!available} onClick={() => { cart.add(d); setAdded(`${d.name} added to your order`); }}>
                {available ? 'Add to order' : 'Unavailable today'}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="sr-only" role="status">{added}</p>
    </section>
  );
}
