import { useState } from 'react';
import { api } from '../lib/api.js';
import { Field, FormError, fieldError } from '../components/Form.jsx';

const TYPES = [['private-dining', 'Private dining'], ['buyout', 'Restaurant buyout'], ['corporate', 'Corporate event'], ['office-catering', 'Office catering'], ['private-catering', 'Private catering']];

export default function Events() {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', eventType: 'private-dining', eventDate: '', guests: '', requirements: '' });
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api('/catering-enquiries', {
        method: 'POST',
        body: { ...form, company: form.company || undefined, eventDate: form.eventDate || undefined, guests: form.guests ? Number(form.guests) : undefined, requirements: form.requirements || undefined }
      });
      setSent(true);
    } catch (err) {
      setError(err);
    }
  }

  return (
    <section className="page container narrow">
      <h1>Events &amp; Catering</h1>
      <p>Private dining, restaurant buyouts and catering for work or family. Tell us what you have in mind and we will reply with options.</p>
      {sent ? <p role="status">Thank you. We have your enquiry and will be in touch soon.</p> : (
        <form onSubmit={submit} noValidate>
          <FormError error={error} />
          <Field label="Your name" value={form.name} onChange={set('name')} autoComplete="name" required maxLength={80} error={fieldError(error, 'name')} />
          <Field label="Company (optional)" value={form.company} onChange={set('company')} autoComplete="organization" maxLength={100} />
          <Field label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required error={fieldError(error, 'email')} />
          <Field label="Phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" required error={fieldError(error, 'phone')} />
          <Field label="Type of event" as="select" value={form.eventType} onChange={set('eventType')}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Field>
          <Field label="Date (optional)" type="date" value={form.eventDate} onChange={set('eventDate')} />
          <Field label="Guests (optional)" type="number" min={1} max={1000} value={form.guests} onChange={set('guests')} error={fieldError(error, 'guests')} />
          <Field label="Anything else we should know?" as="textarea" rows={4} value={form.requirements} onChange={set('requirements')} maxLength={1500} />
          <button className="btn btn-primary">Send enquiry</button>
        </form>
      )}
    </section>
  );
}
