import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatLkr } from '../lib/api.js';
import { useCart } from '../lib/cart.jsx';
import { dishPhoto } from '../lib/images.js';
import '../styles/menu.css';

const DIETS = [['all', 'All'], ['vegetarian', 'Vegetarian'], ['vegan', 'Vegan'], ['gluten-free', 'Gluten-free'], ['spicy', 'Spicy']];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export default function Menu() {
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [diet, setDiet] = useState('all');
  const [added, setAdded] = useState('');
  const cart = useCart();
  const category = params.get('category') || 'all';

  useEffect(() => {
    api('/menu').then(setMenu).catch(() => setError('Could not load the menu. Please try again.'));
  }, []);

  const shown = useMemo(() => {
    if (!menu) return [];
    const cat = menu.categories.find((c) => c.slug === category);
    const needle = q.trim().toLowerCase();
    return menu.items.filter((i) =>
      (!cat || i.category === cat._id) &&
      (diet === 'all' || i.dietaryTags.includes(diet)) &&
      (!needle || `${i.name} ${i.description}`.toLowerCase().includes(needle)));
  }, [menu, category, diet, q]);

  if (error) return <section className="container page"><p role="alert" className="alert">{error}</p></section>;
  if (!menu) return <section className="container page"><p>Loading the menu…</p></section>;

  const setCategory = (slug) => setParams(slug === 'all' ? {} : { category: slug });

  return (
    <>
      <section className="page-banner on-dark">
        <div className="container">
          <div>
            <p className="eyebrow peach">Lunch 11:30 AM – 3 PM · Dinner from 6 PM</p>
            <h1>Our Menu</h1>
          </div>
          <button type="button" className="btn btn-light" onClick={() => window.print()}>Print menu</button>
        </div>
      </section>

      <section className="container menu-filters">
        <div className="bar">
          <div style={{ flex: '1 1 320px', maxWidth: 420 }}>
            <label htmlFor="menu-search" className="sr-only">Search dishes or ingredients</label>
            <input id="menu-search" type="search" className="search" placeholder="Search dishes or ingredients" value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} />
          </div>
          <div className="chips" role="group" aria-label="Dietary filters">
            {DIETS.map(([v, label]) => <button key={v} type="button" className="chip" aria-pressed={diet === v} onClick={() => setDiet(v)}>{label}</button>)}
          </div>
        </div>
        <div className="chips cats" role="group" aria-label="Categories">
          <button type="button" className="chip" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>All</button>
          {menu.categories.map((c) => <button key={c._id} type="button" className="chip" aria-pressed={category === c.slug} onClick={() => setCategory(c.slug)}>{c.name}</button>)}
        </div>
        <p className="fine">Dietary tags describe intended preparation, not a guarantee against cross-contamination. Ask staff about allergens.</p>
      </section>

      <section className="container menu-layout">
        <div className="menu-main">
          {shown.length === 0 ? <p className="empty">No dishes match those filters.</p> : (
            <ul className="dish-grid">
              {shown.map((d) => {
                const ok = d.availability === 'available';
                const img = dishPhoto(d.slug);
                const tags = [...d.dietaryTags.map(cap), ...d.allergens.map((a) => `Contains ${a}`)];
                return (
                  <li key={d._id}>
                    <article className="dish-card">
                      <div className="pic">{img ? <img src={img} alt={d.name} loading="lazy" /> : <div className="plate" role="img" aria-label={d.name} />}</div>
                      <div className="body">
                        <div className="top"><h3>{d.name}</h3><span className="p">{formatLkr(d.priceCents)}</span></div>
                        <p className="desc">{d.description}</p>
                        <div className="tags">{tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
                        <button type="button" className="btn btn-primary small" disabled={!ok} onClick={() => { cart.add(d); setAdded(`${d.name} added to your order`); }}>
                          {ok ? 'Add to order' : 'Sold out today'}
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="cart-side" aria-label="Your order">
          <h2>Your order</h2>
          <div className="seg" role="group" aria-label="Fulfilment">
            <button type="button" className="chip" aria-pressed={cart.fulfilment === 'pickup'} onClick={() => cart.setFulfilment('pickup')}>Pickup</button>
            <button type="button" className="chip" aria-pressed={cart.fulfilment === 'delivery'} onClick={() => cart.setFulfilment('delivery')}>Delivery</button>
          </div>
          {cart.lines.length === 0 && <p className="muted" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>Your order is empty. Add a dish to begin.</p>}
          {cart.lines.map((l) => (
            <div key={l.id} className="cart-line">
              <span>{l.name}</span><span>{formatLkr(l.priceCents * l.quantity)}</span>
              <span className="qty">
                <button type="button" aria-label={`Remove one ${l.name}`} onClick={() => cart.setQuantity(l.id, l.quantity - 1)}>−</button>
                <output aria-label={`${l.name} quantity`}>{l.quantity}</output>
                <button type="button" aria-label={`Add one ${l.name}`} onClick={() => cart.setQuantity(l.id, l.quantity + 1)}>+</button>
              </span>
            </div>
          ))}
          <div className="cart-total"><span>Subtotal</span><span>{formatLkr(cart.subtotalCents)}</span></div>
          <p className="cart-note">Delivery fee and tax are shown at checkout.</p>
          {cart.lines.length > 0
            ? <Link to="/checkout" className="btn btn-primary block">Go to checkout</Link>
            : <button type="button" className="btn btn-primary block" disabled>Go to checkout</button>}
        </aside>
      </section>
      <p className="sr-only" role="status">{added}</p>
    </>
  );
}
