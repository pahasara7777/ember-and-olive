import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDateTime } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { Field, FormError, fieldError } from '../components/Form.jsx';
import '../styles/reservations.css';

// Dates are Colombo calendar days (UTC+05:30) written as YYYY-MM-DD.
const colomboToday = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const dow = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();
const dayName = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
const dayShort = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayLong = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const clock = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
const OCCASIONS = ['None', 'Birthday', 'Anniversary', 'Business meeting', 'Other'];

export default function Reservations() {
  const { user } = useAuth();
  const today = useMemo(colomboToday, []);
  const [form, setForm] = useState({ date: today, partySize: 2, time: '', name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', occasion: 'None', specialRequests: '', accessibilityNeeds: '' });
  const [marketing, setMarketing] = useState(false);
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(today, i)), [today]);

  useEffect(() => {
    let live = true;
    setSlots([]);
    api(`/reservations/availability?date=${encodeURIComponent(form.date)}&partySize=${Number(form.partySize)}`)
      .then((d) => live && setSlots(d.slots))
      .catch(() => live && setSlots([]));
    return () => { live = false; };
  }, [form.date, form.partySize]);

  // A chosen time stops being valid if the date or party size change and it is no longer free.
  useEffect(() => {
    if (form.time && !slots.some((s) => s.time === form.time && s.available)) setForm((f) => ({ ...f, time: '' }));
  }, [slots]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { reservation } = await api('/reservations', {
        method: 'POST',
        body: {
          ...form,
          partySize: Number(form.partySize),
          occasion: form.occasion === 'None' ? undefined : form.occasion,
          specialRequests: form.specialRequests || undefined,
          accessibilityNeeds: form.accessibilityNeeds || undefined,
          marketingConsent: marketing
        }
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
      <section className="container done">
        <p className="eyebrow">Reservation</p>
        <h1 className="h1">You're booked.</h1>
        <p style={{ fontSize: 18 }}>{done.partySize} {done.partySize === 1 ? 'guest' : 'guests'} on <strong>{formatDateTime(done.startsAt)}</strong>.</p>
        <p className="ref" aria-label={`Reference ${done.reference}`}>{done.reference}</p>
        <p>Keep this reference with the email you used. You will need both to look up or cancel your booking.</p>
        <div className="btn-row" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Link to="/menu" className="btn btn-primary">Preview the menu</Link>
          <Link to="/" className="btn btn-outline">Back home</Link>
        </div>
      </section>
    );
  }

  const party = Number(form.partySize);
  const lunch = slots.filter((s) => Number(s.time.slice(0, 2)) < 16);
  const dinner = slots.filter((s) => Number(s.time.slice(0, 2)) >= 16);
  const slotBtn = (s) => (
    <button key={s.time} type="button" className={s.available ? 'chip' : 'chip full'} aria-pressed={form.time === s.time} disabled={!s.available} onClick={() => setForm((f) => ({ ...f, time: s.time }))}>
      {clock(s.time)}{!s.available && ' · Full'}
    </button>
  );
  const closed = dow(form.date) === 1;

  return (
    <section className="container">
      <div className="res-head">
        <p className="eyebrow">Reservations</p>
        <h1>Reserve a table</h1>
        <p className="lead">Pick a date, time and party size. Closed on Mondays. Keep your reference to look up or cancel the booking later.</p>
      </div>
      <div className="res-layout">
        <form className="res-form" onSubmit={submit} noValidate id="res-form">
          <FormError error={error} />
          <fieldset>
            <legend>1. Party size</legend>
            <div className="chips">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <button key={n} type="button" className="chip" aria-pressed={party === n} onClick={() => setForm((f) => ({ ...f, partySize: n }))}>{n}</button>)}
              <button type="button" className="chip" aria-pressed={party >= 9} onClick={() => setForm((f) => ({ ...f, partySize: Math.max(9, party) }))}>9–12</button>
            </div>
            {party >= 9 && (
              <div className="field" style={{ marginTop: 14, maxWidth: 200 }}>
                <label htmlFor="r-party">Exact number of guests</label>
                <select id="r-party" value={party} onChange={set('partySize')}>{[9, 10, 11, 12].map((n) => <option key={n}>{n}</option>)}</select>
              </div>
            )}
            <p className="fine">9–12 guests need staff approval. For more than 12, please <Link to="/events-catering" className="link">send an event enquiry</Link>.</p>
          </fieldset>

          <div>
            <h2>2. Date</h2>
            <div className="day-row" role="group" aria-label="Date">
              {days.map((d) => (
                <button key={d} type="button" className="day" aria-pressed={form.date === d} disabled={dow(d) === 1} onClick={() => setForm((f) => ({ ...f, date: d }))}>
                  <small>{dayName(d)}{form.date === d ? ' · selected' : ''}</small><b>{dow(d) === 1 ? 'Closed' : dayShort(d)}</b>
                </button>
              ))}
            </div>
            <div className="field" style={{ marginTop: 14, maxWidth: 240 }}>
              <label htmlFor="r-date">Pick another date</label>
              <input id="r-date" type="date" min={today} max={addDays(today, 60)} value={form.date} onChange={set('date')} />
            </div>
            <p className="fine">Bookings open up to 60 days ahead. Same-day bookings close shortly before the time.</p>
          </div>

          <fieldset>
            <legend>3. Time</legend>
            {closed ? <p className="muted">We are closed on Mondays. Please choose another day.</p> : slots.length === 0 ? <p className="muted">No times on this day. Try another date.</p> : (
              <>
                {lunch.length > 0 && <><p className="slot-label">Lunch</p><div className="chips" style={{ marginBottom: 18 }}>{lunch.map(slotBtn)}</div></>}
                {dinner.length > 0 && <><p className="slot-label">Dinner</p><div className="chips">{dinner.map(slotBtn)}</div></>}
              </>
            )}
            <p className="fine">Times marked "Full" are booked. Try the nearest open time.</p>
          </fieldset>

          <div>
            <h2>4. Your details</h2>
            <div className="form-grid">
              <Field label="Full name" value={form.name} onChange={set('name')} autoComplete="name" required maxLength={80} error={fieldError(error, 'name')} />
              <Field label="Mobile number (with country code)" type="tel" placeholder="+94" value={form.phone} onChange={set('phone')} autoComplete="tel" required error={fieldError(error, 'phone')} />
              <div className="full"><Field label="Email address" type="email" value={form.email} onChange={set('email')} autoComplete="email" required error={fieldError(error, 'email')} /></div>
              <Field label="Occasion (optional)" as="select" value={form.occasion} onChange={set('occasion')}>{OCCASIONS.map((o) => <option key={o}>{o}</option>)}</Field>
              <Field label="Accessibility or seating request (optional)" value={form.accessibilityNeeds} onChange={set('accessibilityNeeds')} maxLength={300} />
              <div className="full"><Field label="Special requests (optional)" as="textarea" rows={3} value={form.specialRequests} onChange={set('specialRequests')} maxLength={500} /></div>
            </div>
            <label className="check" style={{ marginTop: 20 }}><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /><span>Send me news and offers by email (optional, separate from your booking).</span></label>
          </div>
        </form>

        <aside className="res-summary" aria-label="Booking summary" aria-live="polite">
          <h2>Booking summary</h2>
          <dl>
            <dt>Date</dt><dd>{dayLong(form.date)}</dd>
            <dt>Time</dt><dd>{form.time ? clock(form.time) : 'Choose a time'}</dd>
            <dt>Guests</dt><dd>{party >= 9 ? `${party} guests (needs approval)` : `${party} ${party === 1 ? 'guest' : 'guests'}`}</dd>
            <dt>Table time</dt><dd>{party <= 4 ? '90 minutes' : party <= 8 ? '120 minutes' : 'Set by staff'}</dd>
            <dt>Deposit</dt><dd>None</dd>
          </dl>
          <p className="policy">Free cancellation up to 2 hours before. Please arrive within 15 minutes of your time.</p>
          <button type="submit" form="res-form" className="btn btn-primary block" disabled={busy || !form.time}>{busy ? 'Booking…' : 'Confirm reservation'}</button>
          <p className="fine">Prefer to talk? Call the restaurant (number to be confirmed).</p>
        </aside>
      </div>
    </section>
  );
}
