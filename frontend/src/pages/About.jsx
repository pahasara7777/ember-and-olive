import { Link } from 'react-router-dom';
import { photo } from '../lib/images.js';
import '../styles/content.css';

const VALUES = [
  ['01', 'Cooked over fire', 'Charcoal and open flame give our seafood, meats and vegetables their signature smoky depth.'],
  ['02', 'Local first', 'Seasonal Sri Lankan produce, prepared with Mediterranean technique. Supplier details to be verified before publishing.'],
  ['03', 'Made to share', 'Mezze, grills and big plates for the middle of the table, with warm, unhurried service.']
];
const TEAM = [['[Founder name]', 'Founder & Owner'], ['[Head Chef name]', 'Head Chef'], ['[Manager name]', 'Restaurant Manager'], ['[Pastry Chef name]', 'Pastry Chef']];
const TIMELINE = [
  ['2018', 'Doors open', 'A small family dining room in Colombo 07.'],
  ['[Year]', 'The charcoal grill', 'Open-flame cooking becomes the heart of the kitchen.'],
  ['[Year]', 'Growing to 72 seats', 'A larger dining room and private dining area.'],
  ['2026', 'Takeaway & catering', 'Online ordering and catering for offices and events.']
];

export default function About() {
  return (
    <>
      <section className="about-hero on-dark">
        <img src={photo('chef')} alt="A chef cooking over the open charcoal grill" />
        <div className="container">
          <p className="eyebrow peach">Our story · Since 2018</p>
          <h1>A small dining room that grew around a fire.</h1>
        </div>
      </section>

      <section className="container split">
        <div><p className="eyebrow">How it began</p><h2 className="h2">Open-flame cooking, fresh ingredients, generous hospitality.</h2></div>
        <div>
          <p>The Ember &amp; Olive began in 2018 as a small, family-run dining room founded by a chef who spent years working in Mediterranean kitchens. The idea was simple: bring together open-flame cooking, fresh ingredients, generous hospitality and the relaxed culture of sharing food.</p>
          <p>Eight years on, we are a 72-seat neighbourhood restaurant in Cinnamon Gardens. We cook charcoal-grilled seafood, slow-cooked lamb, handmade pasta and seasonal Sri Lankan ingredients with Mediterranean technique, and we are growing our takeaway and catering kitchen.</p>
        </div>
      </section>

      <section className="container values">
        {VALUES.map(([n, t, x]) => <div key={n} className="value"><p className="n">{n}</p><h3>{t}</h3><p>{x}</p></div>)}
      </section>

      <section className="band-sand">
        <div className="container">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <div><p className="eyebrow">The people</p><h2 className="h2">Meet the team</h2></div>
            <p className="muted" style={{ maxWidth: 420, fontSize: 15 }}>Names, photos and biographies will be supplied and approved by the owner before launch.</p>
          </div>
          <ul className="team">
            {TEAM.map(([name, role]) => <li key={role}><div className="photo">[Staff photo]</div><h3>{name}</h3><p>{role}</p></li>)}
          </ul>
        </div>
      </section>

      <section className="container" style={{ paddingBlock: 100 }}>
        <p className="eyebrow">Milestones</p>
        <h2 className="h2">From 2018 to today</h2>
        <ol className="timeline">
          {TIMELINE.map(([y, t, x]) => <li key={t}><p className="y">{y}</p><h3>{t}</h3><p>{x}</p></li>)}
        </ol>
      </section>

      <section className="container strip">
        <img src={photo('dining')} alt="Candlelit dining room" loading="lazy" />
        <img src={photo('sea-bass')} alt="Grilled sea bass" loading="lazy" />
        <img src={photo('hummus')} alt="Hummus with flatbread" loading="lazy" />
      </section>

      <section className="cta-band">
        <div className="container">
          <h2>Come and share a table with us.</h2>
          <div className="btn-row" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link to="/reservations" className="btn btn-primary">Reserve a Table</Link>
            <Link to="/events-catering" className="btn btn-light">Plan an event</Link>
          </div>
        </div>
      </section>
    </>
  );
}
