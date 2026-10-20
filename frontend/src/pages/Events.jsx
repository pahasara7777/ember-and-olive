import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { photo } from '../lib/images.js';
import { Field, FormError, fieldError } from '../components/Form.jsx';
import '../styles/content.css';

const TYPES = [['private-dining', 'Private dining'], ['buyout', 'Restaurant buyout'], ['corporate', 'Corporate event'], ['office-catering', 'Office catering'], ['private-catering', 'Private function catering']];
const OFFERS = [
  ['Private dining', 'A designated area for birthdays, anniversaries and business dinners.', 'Up to 30 guests · subject to availability', 'dining', 'Candlelit private dining table'],
  ['Buyouts & corporate', 'Take over the whole restaurant for launches, team dinners and celebrations.', 'Up to 72 seated · by enquiry', 'steak-risotto', 'Steak and risotto plated for service'],
  ['Office & private catering', 'Mezze, grills and sharing platters delivered and set up at your venue.', 'Colombo and nearby · by enquiry', 'chicken', 'Roasted chicken platter for catering']
];
const PACKS = [
  ['Lunch', 'Mezze Table', ['Selection of mezze and dips', 'Garden Greek salad', 'Choice of pasta or grain bowl', 'Soft drinks'], false],
  ['Most popular', 'Ember Feast', ['Mezze to share', 'Charcoal-grilled sea bass or chicken', 'Slow-braised lamb shank', 'Seasonal sides', 'Dessert platter'], true],
  ['Catering', 'Office Platters', ['Hummus and flatbread', 'Grilled chicken and vegetables', 'Salads and grains', 'Delivery and set-up'], false]
];

export default function Events() {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', eventType: 'private-dining', eventDate: '', guests: '', budget: '', location: '', requirements: '' });
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const opt = (v) => v || undefined;

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api('/catering-enquiries', {
        method: 'POST',
        body: { ...form, company: opt(form.company), eventDate: opt(form.eventDate), guests: form.guests ? Number(form.guests) : undefined, budget: opt(form.budget), location: opt(form.location), requirements: opt(form.requirements) }
      });
      setSent(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="container ev-hero">
        <div className="box on-dark">
          <img src={photo('dining')} alt="A long candlelit table set for a private dinner" />
          <div className="copy">
            <p className="eyebrow peach">Events &amp; catering</p>
            <h1>Gather around our table.</h1>
            <p>Private dining for up to 30 guests, full restaurant buyouts, and catering for offices and private functions.</p>
            <a href="#enquiry" className="btn btn-primary">Send an enquiry</a>
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingBlock: '90px 40px' }}>
        <ul className="offers">
          {OFFERS.map(([t, x, m, img, alt]) => (
            <li key={t}><article className="offer"><img src={photo(img)} alt={alt} loading="lazy" /><div><h2 className="h3" style={{ fontSize: 32 }}>{t}</h2><p>{x}</p><p className="meta">{m}</p></div></article></li>
          ))}
        </ul>
      </section>

      <section className="container" style={{ paddingBlock: 60 }}>
        <p className="eyebrow">Sample packages</p>
        <h2 className="h2" style={{ marginBottom: 12 }}>Set menus to start the conversation</h2>
        <p className="muted" style={{ margin: '0 0 36px' }}>Indicative per-person pricing, confirmed in your event agreement. Prices to be set by the owner.</p>
        <ul className="packages">
          {PACKS.map(([tier, name, items, dark]) => (
            <li key={name}>
              <div className={dark ? 'pack dark' : 'pack'}>
                <p className="tier">{tier}</p><h3>{name}</h3><p className="price">[LKR __ ] per person</p>
                <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>
                <a href="#enquiry" className={dark ? 'btn btn-primary' : 'btn btn-outline'}>Ask about this package</a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="enquiry" className="enquiry">
        <div className="container">
          <div className="enquiry-side">
            <p className="eyebrow">Enquiry</p>
            <h2 className="h2">Tell us about your event</h2>
            <p>Our events team will reply with availability and a proposal.</p>
            <div className="know">
              <p>Good to know</p>
              <p>Sending this form is an enquiry, not a confirmed booking.</p>
              <p>Confirmed events may need a deposit. The amount, deadlines and cancellation terms are set out in your event agreement.</p>
              <p>For groups of 9–12, you can also <Link to="/reservations" className="link">book a table</Link> directly.</p>
            </div>
          </div>
          {sent ? <div className="panel" style={{ flex: '1 1 560px' }} role="status"><h2>Thank you.</h2><p>We have your enquiry and will be in touch soon.</p></div> : (
            <form onSubmit={submit} noValidate>
              <FormError error={error} />
              <div className="form-grid">
                <Field label="Full name" value={form.name} onChange={set('name')} autoComplete="name" required maxLength={80} error={fieldError(error, 'name')} />
                <Field label="Company (optional)" value={form.company} onChange={set('company')} autoComplete="organization" maxLength={100} />
                <Field label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required error={fieldError(error, 'email')} />
                <Field label="Mobile number" type="tel" placeholder="+94" value={form.phone} onChange={set('phone')} autoComplete="tel" required error={fieldError(error, 'phone')} />
                <Field label="Event type" as="select" value={form.eventType} onChange={set('eventType')}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Field>
                <Field label="Event date" type="date" value={form.eventDate} onChange={set('eventDate')} />
                <Field label="Number of guests" type="number" min={1} max={1000} value={form.guests} onChange={set('guests')} error={fieldError(error, 'guests')} />
                <Field label="Budget (optional)" placeholder="LKR" value={form.budget} onChange={set('budget')} maxLength={60} />
                <div className="full"><Field label="Location (for catering)" value={form.location} onChange={set('location')} maxLength={150} /></div>
                <div className="full"><Field label="Requirements" as="textarea" rows={4} placeholder="Dietary needs, timings, set-up, anything else" value={form.requirements} onChange={set('requirements')} maxLength={1500} /></div>
              </div>
              <button className="btn btn-primary block" disabled={busy}>{busy ? 'Sending…' : 'Send enquiry'}</button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
