import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Field, FormError, fieldError } from '../components/Form.jsx';
import '../styles/content.css';

const SUBJECTS = ['General question', 'Reservation help', 'Online order', 'Feedback', 'Careers'];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' });
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api('/contact-messages', { method: 'POST', body: form });
      setSent(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="container" style={{ paddingBlock: '64px 40px' }}>
        <p className="eyebrow">Contact</p>
        <h1 className="h1">Find us in Cinnamon Gardens</h1>
      </section>

      <section className="container contact-row">
        <div className="map">
          <svg viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Map placeholder showing the restaurant location in Colombo 07">
            <rect width="800" height="420" fill="#E6E0CF" />
            <g stroke="#FBF8F1" strokeWidth="18" fill="none" strokeLinecap="round"><path d="M-20 300 L820 220" /><path d="M200 -20 L260 440" /><path d="M520 -20 L470 440" /><path d="M-20 90 L820 140" /></g>
            <g stroke="#FBF8F1" strokeWidth="8" fill="none"><path d="M60 -20 L120 440" /><path d="M660 -20 L700 440" /><path d="M-20 380 L820 330" /></g>
            <rect x="290" y="160" width="140" height="60" rx="8" fill="#C9DDBE" /><rect x="560" y="250" width="110" height="70" rx="8" fill="#C9DDBE" />
            <circle cx="365" cy="250" r="54" fill="#A65F37" opacity="0.18" />
            <path d="M365 210c-18 0-32 14-32 32 0 24 32 52 32 52s32-28 32-52c0-18-14-32-32-32z" fill="#A65F37" /><circle cx="365" cy="242" r="11" fill="#FBF8F1" />
          </svg>
          <div className="over">
            <span>Map placeholder · 42 Gregory's Road</span>
            <a className="btn btn-primary small" href="https://www.google.com/maps/search/?api=1&query=42+Gregory%27s+Road+Colombo+07" target="_blank" rel="noopener noreferrer">Get directions</a>
          </div>
        </div>

        <div className="info-dark on-dark">
          <div><h3>Address</h3><p className="addr">42 Gregory's Road<br />Colombo 07, Sri Lanka</p></div>
          <div><h3>Phone &amp; email</h3><p>[Phone, to be confirmed]<br />[Email, to be confirmed]</p></div>
          <div>
            <h3>Opening hours</h3>
            <dl>
              <dt>Monday</dt><dd>Closed</dd>
              <dt>Tue–Thu</dt><dd>11:30 AM – 10:00 PM</dd>
              <dt>Friday</dt><dd>11:30 AM – 10:30 PM</dd>
              <dt>Saturday</dt><dd>10:00 AM – 10:30 PM</dd>
              <dt>Sunday</dt><dd>10:00 AM – 9:00 PM</dd>
            </dl>
            <p style={{ marginTop: 8, fontSize: 13, color: '#c9c3b0' }}>Last kitchen orders 30 minutes before closing.</p>
          </div>
          <div><h3>Follow</h3><p className="follow"><span>Instagram</span><span>Facebook</span><span>TikTok</span></p></div>
        </div>
      </section>

      <section className="container contact-lower">
        {sent ? (
          <div className="panel" role="status" style={{ flex: '2 1 560px' }}><h2>Thank you.</h2><p>We have your message and will reply by email.</p></div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2 className="h3">Send us a message</h2>
            <FormError error={error} />
            <div className="form-grid">
              <Field label="Full name" value={form.name} onChange={set('name')} autoComplete="name" required maxLength={80} error={fieldError(error, 'name')} />
              <Field label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required error={fieldError(error, 'email')} />
              <div className="full"><Field label="Subject" as="select" value={form.subject} onChange={set('subject')}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</Field></div>
              <div className="full"><Field label="Message" as="textarea" rows={5} value={form.message} onChange={set('message')} required maxLength={2000} error={fieldError(error, 'message')} /></div>
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
          </form>
        )}
        <div>
          <div className="mini"><h2 className="h3">Parking &amp; access</h2><p>[Parking and step-free access details, to be confirmed by the owner.]</p></div>
          <div className="mini">
            <h2 className="h3">Quicker routes</h2>
            <div className="btn-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
              <Link to="/reservations" className="btn btn-primary small">Book a Table</Link>
              <Link to="/menu" className="btn btn-outline small">Order Online</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
