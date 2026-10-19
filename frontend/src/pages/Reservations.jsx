import { useEffect, useState } from 'react';
import { api, formatDateTime } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { Field, FormError, fieldError } from '../components/Form.jsx';

const today = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);

export default function Reservations() {
  const { user } = useAuth();
  const [form, setForm] = useState({ date: today(), partySize: 2, time: '', name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', occasion: '', specialRequests: '', accessibilityNeeds: '' });
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    let live = true;
    setSlots([]);
    api(`/reservations/availability?date=${encodeURIComponent(form.date)}&partySize=${Number(form.partySize)}`)
      .then((d) => live && setSlots(d.slots))
      .catch(() => live && setSlots([]));
    return () => { live = false; };
  }, [form.date, form.partySize]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { reservation } = await api('/reservations', {
        method: 'POST',
        body: { ...form, partySize: Number(form.partySize), occasion: form.occasion || undefined, specialRequests: form.specialRequests || undefined, accessibilityNeeds: form.accessibilityNeeds || undefined }
      });
      setDone(reservation);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="page container narrow">
        <h1>You're booked</h1>
        <p>{done.partySize} guest(s) on <strong>{formatDateTime(done.startsAt)}</strong>.</p>
        <p>Your reference is <strong>{done.reference}</strong>. Keep it with the email you used, to look up or cancel your booking.</p>
      </section>
    );
  }

  return (
    <section className="page container narrow">
      <h1>Book a table</h1>
      <p className="muted">We are closed on Mondays. Bookings need at least an hour's notice.</p>
      <form onSubmit={submit} noValidate>
        <FormError error={error} />
        <Field label="Date" type="date" min={today()} value={form.date} onChange={set('date')} required />
        <Field label="Guests" type="number" min={1} max={12} value={form.partySize} onChange={set('partySize')} required error={fieldError(error, 'partySize')} />
        <fieldset>
          <legend>Time</legend>
          {slots.length === 0 && <p className="muted">No times on this day. Try another date.</p>}
          <div className="chips">
            {slots.map((s) => (
              <button key={s.time} type="button" className={form.time === s.time ? 'chip on' : 'chip'} aria-pressed={form.time === s.time} disabled={!s.available} onClick={() => setForm((f) => ({ ...f, time: s.time }))}>
                {s.time}{!s.available && ' (full)'}
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="Your name" value={form.name} onChange={set('name')} autoComplete="name" required maxLength={80} error={fieldError(error, 'name')} />
        <Field label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required error={fieldError(error, 'email')} />
        <Field label="Phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" required error={fieldError(error, 'phone')} />
        <Field label="Occasion (optional)" value={form.occasion} onChange={set('occasion')} maxLength={60} />
        <Field label="Special requests (optional)" as="textarea" rows={3} value={form.specialRequests} onChange={set('specialRequests')} maxLength={500} />
        <Field label="Accessibility needs (optional)" value={form.accessibilityNeeds} onChange={set('accessibilityNeeds')} maxLength={300} />
        <button className="btn btn-primary" disabled={busy || !form.time}>{busy ? 'Booking…' : 'Confirm booking'}</button>
      </form>
    </section>
  );
}
