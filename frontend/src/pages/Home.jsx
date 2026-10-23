import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatLkr } from '../lib/api.js';
import { useCart } from '../lib/cart.jsx';
import { dishPhoto, photo } from '../lib/images.js';
import Slider from '../components/Slider.jsx';
import '../styles/home.css';

const CAT_NOTES = {
  'small-plates-and-mezze': 'Hummus, halloumi, prawns',
  'from-the-grill': 'Sea bass, chicken, sirloin',
  'pasta-and-grains': 'Risotto, spaghetti, penne',
  desserts: 'Fondant, panna cotta',
  'weekend-brunch': 'Sat & Sun, 10 AM – 2 PM',
  'seasonal-specials': 'Changes with the market'
};

const Arrow = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

// [opens, closes] in minutes after midnight, Sunday first. Mirrors the footer hours.
const HOURS = [[600, 1260], [], [690, 1320], [690, 1320], [690, 1320], [690, 1350], [600, 1350]];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmt = (m) => `${(m / 60 | 0) % 12 || 12}:${String(m % 60).padStart(2, '0')} ${m >= 720 ? 'PM' : 'AM'}`;

function openStatus() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  const day = DAYS.indexOf(p.weekday), now = +p.hour * 60 + +p.minute, [open, close] = HOURS[day];
  if (open !== undefined && now >= open && now < close) return { open: true, text: `Open now · until ${fmt(close)}` };
  if (open !== undefined && now < open) return { open: false, text: `Closed · opens today at ${fmt(open)}` };
  for (let i = 1; i <= 7; i++) { const h = HOURS[(day + i) % 7]; if (h.length) return { open: false, text: `Closed · opens ${i === 1 ? 'tomorrow' : DAYS[(day + i) % 7]} at ${fmt(h[0])}` }; }
}

export default function Home() {
  const [shot, setShot] = useState(null);
  const dialog = useRef(null);
  const status = openStatus();
  const [heroVideo] = useState(() => matchMedia('(min-width: 761px) and (prefers-reduced-motion: no-preference)').matches);
  useEffect(() => { if (shot) dialog.current.showModal(); }, [shot]);
  const [menu, setMenu] = useState({ categories: [], items: [] });
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const cart = useCart();

  useEffect(() => {
    api('/menu').then(setMenu).catch(() => setError('The menu could not be loaded right now.'));
    api('/reviews').then((d) => setReviews(d.reviews.filter((r) => r.rating >= 4).slice(0, 8))).catch(() => {});
  }, []);

  const featured = menu.items.filter((i) => i.featured).slice(0, 4);
  const more = menu.items.filter((i) => !i.featured && dishPhoto(i)).slice(0, 8);
  const tagLine = (d) => [...d.dietaryTags.map((t) => t[0].toUpperCase() + t.slice(1)), ...(d.allergens.length ? [`Contains ${d.allergens.join(', ')}`] : [])].join(' · ');

  return (
    <>
      <section className="hero on-dark">
        {heroVideo && <video className="hero-video" src="/hero.mp4" poster={photo('prawns-grill')} autoPlay muted loop playsInline aria-hidden="true" tabIndex={-1} />}
        <div className="container">
          <div className="hero-copy">
            <p className="eyebrow">Mediterranean kitchen · Colombo 07</p>
            <h1>Cooked over<br />open <em>fire</em>.</h1>
            <p>Charcoal, olive oil and sea salt. A neighbourhood table for honest food, good wine and long evenings on Gregory's Road.</p>
            <div className="btn-row">
              <Link to="/menu" className="btn btn-primary">Explore the menu</Link>
              <Link to="/about" className="btn btn-light">Our story</Link>
            </div>
          </div>
          <div className="hero-art">
            <figure className="hero-photo"><img src={photo('prawns-grill')} alt="Garlic prawns sizzling in a dark cast-iron pan" /><figcaption>Garlic prawns, from the grill</figcaption></figure>
            <ul className="hero-info" aria-label="At a glance">
              <li><h2 className={status.open ? 'is-open' : ''}>{status.open ? 'Open now' : 'Closed now'}</h2><p>{status.text}</p></li>
              <li><h2>Location</h2><p>42 Gregory's Road, Colombo 07</p></li>
              <li><h2>Pickup &amp; delivery</h2><p>Colombo 07 and nearby zones</p></li>
            </ul>
          </div>
        </div>
      </section>

      <div className="band"><p>Open every evening · Charcoal grill, handmade pasta, sea salt &amp; citrus</p><Link to="/reservations">Reserve a table →</Link></div>

      <section className="container info-card" aria-label="Why guests choose us">
        <div className="inner">
          {[['Fresh Ingredients', 'Only the freshest, highest quality produce, bought each morning.'],
            ['Expertly Crafted', 'Every dish is cooked by hand, over fire, with precision.'],
            ['Cozy Ambience', 'A warm, candlelit room for any occasion.'],
            ['Great Service', 'We look after you from the first drink to the last.']].map(([h, p], i) => (
            <div key={h} className="item">
              <span className="no">{String(i + 1).padStart(2, '0')}</span>
              <h2>{h}</h2><p>{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <div><p className="eyebrow">Our menu</p><h2 className="h2">Menu Highlights</h2></div>
          <Link to="/menu" className="btn btn-outline">View full menu</Link>
        </div>
        {error && <p role="alert" className="alert">{error}</p>}
        <ul className="dish-row">
          {featured.map((d) => (
            <li key={d._id} className="dish">
              {dishPhoto(d) ? <img src={dishPhoto(d)} alt={d.name} loading="lazy" /> : <div className="plate" role="img" aria-label={d.name} />}
              <div className="body">
                <h3>{d.name}</h3>
                <p className="tags">{tagLine(d)}</p>
                <div className="foot">
                  <p className="price">{formatLkr(d.priceCents)}</p>
                  <button type="button" className="add" onClick={() => cart.add(d)} aria-label={`Add ${d.name} to order`}>+</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {more.length > 0 && (
        <section className="container section">
          <div className="section-head"><div><p className="eyebrow">More from the kitchen</p><h2 className="h2">Dishes worth a second look</h2></div></div>
          <Slider label="More dishes" auto={5000}>
            {more.map((d) => (
              <div key={d._id} className="slide dish">
                <img src={dishPhoto(d)} alt={d.name} loading="lazy" />
                <div className="body">
                  <h3>{d.name}</h3>
                  <div className="foot">
                    <p className="price">{formatLkr(d.priceCents)}</p>
                    <button type="button" className="add" onClick={() => cart.add(d)} aria-label={`Add ${d.name} to order`}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </Slider>
        </section>
      )}

      <section className="story on-dark">
        <div className="container">
          <div className="story-copy">
            <p className="eyebrow">Our story</p>
            <h2 className="h2">More Than Just A Restaurant</h2>
            <p>The Ember &amp; Olive began as a small, family-run dining room built around open-flame cooking, fresh ingredients and the relaxed culture of sharing food. We cook charcoal-grilled seafood, slow-braised lamb, handmade pasta and seasonal Sri Lankan ingredients with Mediterranean technique.</p>
            <Link to="/about" className="btn btn-light">Discover Our Story →</Link>
          </div>
          <div className="story-pics">
            <div className="pic"><img src={photo('dining')} alt="A long candlelit dining table" loading="lazy" /><span className="years"><b>8+</b>years of experience</span></div>
            <div className="pic"><img src={photo('chef')} alt="A chef cooking over an open charcoal grill" loading="lazy" /></div>
          </div>
        </div>
        <div className="container">
          <div className="stats">
            <div><p className="n" style={{ '--to': 8 }}><span>8</span></p><p className="l">Years of experience</p></div>
            <div><p className="n" style={{ '--to': 72 }}><span>72</span></p><p className="l">Seats in the dining room</p></div>
            <div><p className="n" style={{ '--to': 30 }}><span>30</span></p><p className="l">Guests in private dining</p></div>
            <div><p className="n static"><span>4.8</span></p><p className="l">Average rating</p></div>
          </div>
        </div>
        <div className="container">
          <div className="reserve">
            <div>
              <p className="eyebrow">Reservation</p>
              <h2>Book Your Table For A Great Experience</h2>
              <p>Whether it's a cozy dinner, celebration or business meeting, we've got the perfect table for you.</p>
              <Link to="/reservations" className="btn btn-primary">Reserve a Table →</Link>
            </div>
            <img src={photo('dining')} alt="" loading="lazy" />
          </div>
        </div>
      </section>

      <section className="container section">
        <h2 className="h2" style={{ marginBottom: 36 }}>Browse the menu</h2>
        <div className="cat-grid">
          {menu.categories.slice(0, 6).map((c) => (
            <Link key={c._id} to={`/menu?category=${c.slug}`} className="cat-link">
              <span><span className="name">{c.name}</span><span className="note">{CAT_NOTES[c.slug] || 'See the menu'}</span></span>
              <Arrow />
            </Link>
          ))}
        </div>
      </section>

      <section className="container">
        <div className="cta-pair">
          <div className="cta-order">
            <h2>Our table, at yours.</h2>
            <p>Order pickup or delivery straight from the kitchen. Guest checkout is always available.</p>
            <Link to="/menu" className="btn btn-primary">Order Online</Link>
          </div>
          <div className="coupon">
            <p className="k">Coupon code</p>
            <p className="code">WELCOME10</p>
            <p>10% off eligible first online orders.</p>
            <p className="fine">Proposed offer, not live until the owner activates it.</p>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-head" style={{ marginBottom: 36 }}>
          <h2 className="h2">What guests say</h2>
          <Link to="/reviews" className="btn btn-outline">Read all reviews</Link>
        </div>
        <Slider label="Guest reviews" auto={6000}>
          {(reviews.length ? reviews : [null, null, null]).map((r, i) => (
            <figure key={r?._id || i} className="quote slide">
              <div className="stars" role="img" aria-label={`${r?.rating || 5} out of 5 stars`}>{'★'.repeat(r?.rating || 5)}</div>
              <blockquote>{r ? r.text : '[Approved guest review appears here]'}</blockquote>
              <figcaption>{r ? `${r.displayName}${r.verified ? ', verified' : ''}` : 'Guest name, verified visit'}</figcaption>
            </figure>
          ))}
        </Slider>
        <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>Only moderated reviews from real guests will be published here.</p>
      </section>

      <section className="container">
        <div className="event-band">
          <div className="copy">
            <p className="eyebrow">Events &amp; catering</p>
            <h2>Private dining, buyouts and office catering.</h2>
            <p>Host up to 30 guests in our private area, or bring the grill to your next office lunch. Tell us what you have in mind and we will follow up.</p>
            <Link to="/events-catering" className="btn btn-primary">Send an enquiry</Link>
          </div>
          <div className="pic"><img src={photo('dining')} alt="A long candlelit private dining table set for guests" loading="lazy" /></div>
        </div>
      </section>

      <section className="container section" style={{ paddingBottom: 60 }}>
        <div className="section-head" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 36 }}>Follow the fire</h2>
          <Link to="/gallery" className="link">See the gallery</Link>
        </div>
        <div className="social">
          {[['prawns-grill', 'Grilled prawns in a hot pan'], ['fondant', 'Chocolate fondant with ice cream'], ['salad', 'Fresh salad with feta'], ['pasta', 'Spaghetti with garlic and herbs'], ['steak-risotto', 'Grilled steak with risotto'], ['tea', 'Iced drink with orange and strawberry']].map(([f, alt]) => (
            <button key={f} type="button" className="shot" onClick={() => setShot({ src: photo(f), alt })} aria-label={`Enlarge: ${alt}`}><img src={photo(f)} alt="" loading="lazy" /></button>
          ))}
        </div>
        <dialog ref={dialog} className="lightbox" onClose={() => setShot(null)} onClick={(e) => e.target === dialog.current && dialog.current.close()}>
          {shot && <><img src={shot.src} alt={shot.alt} /><button type="button" className="btn btn-light small" onClick={() => dialog.current.close()}>Close</button></>}
        </dialog>
      </section>

      <section className="newsletter" aria-labelledby="nl-h">
        <div className="container">
          <div style={{ flex: '1 1 380px' }}>
            <h2 id="nl-h">Seasonal menus, first.</h2>
            <p>Newsletter sign-up opens soon. Until then, follow us on Instagram.</p>
          </div>
          <form onSubmit={(e) => e.preventDefault()} aria-label="Newsletter (not yet open)">
            <div className="row">
              <label htmlFor="nl-email" className="sr-only">Email address</label>
              <input id="nl-email" type="email" placeholder="Email address" disabled />
              <button type="submit" className="btn btn-dark" disabled>Subscribe</button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
