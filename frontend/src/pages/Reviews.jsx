import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { Field, FormError } from '../components/Form.jsx';

const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function Reviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ rating: 5, title: '', text: '' });
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api('/reviews').then((d) => setReviews(d.reviews)).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api('/reviews', { method: 'POST', body: { rating: Number(form.rating), title: form.title || undefined, text: form.text } });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Something went wrong', 0));
    }
  }

  return (
    <section className="page container">
      <h1>Guest reviews</h1>
      {reviews.length === 0 && <p>No reviews yet. Be the first to share your evening.</p>}
      <ul className="grid">
        {reviews.map((r) => (
          <li key={r._id} className="card">
            {/* Review text is rendered as plain text; React escapes it. */}
            <p aria-label={`${r.rating} out of 5 stars`} className="stars">{stars(r.rating)}</p>
            {r.title && <h2>{r.title}</h2>}
            <p>{r.text}</p>
            <p className="muted">{r.displayName}{r.verified ? ' · verified guest' : ''}</p>
            {r.ownerResponse && <p className="reply"><strong>From us:</strong> {r.ownerResponse}</p>}
          </li>
        ))}
      </ul>

      <h2>Share your experience</h2>
      {!user ? <p><Link to="/login">Sign in</Link> to leave a review.</p> : sent ? <p role="status">Thank you! Your review will appear once our team has read it.</p> : (
        <form onSubmit={submit} className="narrow" noValidate>
          <FormError error={error} />
          <Field label="Rating" as="select" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 && 's'}</option>)}
          </Field>
          <Field label="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} />
          <Field label="Your review" as="textarea" rows={4} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} minLength={10} maxLength={1000} required />
          <button className="btn btn-primary">Submit review</button>
        </form>
      )}
    </section>
  );
}
