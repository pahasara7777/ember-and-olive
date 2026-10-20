import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { Field, FormError, fieldError } from '../components/Form.jsx';
import '../styles/content.css';

const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo' });

export default function Reviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState(null);
  const [filter, setFilter] = useState(0); // 0 = all
  const [form, setForm] = useState({ rating: 5, title: '', text: '' });
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api('/reviews').then((d) => setReviews(d.reviews)).catch(() => setReviews([]));
  }, []);

  const stats = useMemo(() => {
    const list = reviews || [];
    const n = list.length;
    const avg = n ? list.reduce((s, r) => s + r.rating, 0) / n : 0;
    const dist = [5, 4, 3, 2, 1].map((star) => ({ star, pct: n ? Math.round((list.filter((r) => r.rating === star).length / n) * 100) : 0 }));
    return { n, avg, dist };
  }, [reviews]);

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

  const shown = (reviews || []).filter((r) => !filter || r.rating === filter);

  return (
    <>
      <section className="container" style={{ paddingBlock: '64px 40px' }}>
        <p className="eyebrow">Reviews</p>
        <h1 className="h1">What our guests say</h1>
      </section>

      <section className="container rv-top">
        <div className="rv-score on-dark">
          <p>Average rating</p>
          <p className="big">{stats.n ? stats.avg.toFixed(1) : '–'}</p>
          <p className="stars" role="img" aria-label={`${stats.avg.toFixed(1)} out of 5 stars`}>{'★'.repeat(Math.round(stats.avg))}{'☆'.repeat(5 - Math.round(stats.avg))}</p>
          <p style={{ marginTop: 12 }}>from {stats.n} published {stats.n === 1 ? 'review' : 'reviews'}</p>
        </div>
        <div className="rv-dist">
          <h2>Rating breakdown</h2>
          {stats.dist.map((d) => (
            <div key={d.star} className="bar-row">
              <span className="l">{d.star} ★</span>
              <span className="track" aria-hidden="true"><span className="fill" style={{ width: `${d.pct}%` }} /></span>
              <span className="pct">{d.pct}%</span>
            </div>
          ))}
        </div>
      </section>

      <section className="container rv-layout">
        <div className="rv-list">
          <div className="chips" role="group" aria-label="Filter by rating">
            <button type="button" className="chip" aria-pressed={filter === 0} onClick={() => setFilter(0)}>All</button>
            {[5, 4, 3, 2, 1].map((n) => <button key={n} type="button" className="chip" aria-pressed={filter === n} onClick={() => setFilter(n)}>{n} {n === 1 ? 'star' : 'stars'}</button>)}
          </div>
          {reviews === null && <p>Loading…</p>}
          {reviews?.length === 0 && <p className="muted" style={{ marginTop: 24 }}>No reviews yet. Be the first to share your evening.</p>}
          <ul className="rv-cards">
            {shown.map((r) => (
              <li key={r._id}>
                <article className="rv-card">
                  <div className="row">
                    <p className="stars" role="img" aria-label={`${r.rating} out of 5 stars`} style={{ margin: 0 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                    {r.verified && <span className="tag">Verified order</span>}
                  </div>
                  {/* Review text is plain text; React escapes it. */}
                  {r.title && <h3>{r.title}</h3>}
                  <p className="txt">{r.text}</p>
                  <p className="by">{r.displayName} · {fmt(r.createdAt)}</p>
                  {r.ownerResponse && <div className="rv-reply"><strong>Reply from The Ember &amp; Olive</strong><br />{r.ownerResponse}</div>}
                </article>
              </li>
            ))}
          </ul>
        </div>

        <aside className="rv-form" aria-label="Write a review">
          <h2>Write a review</h2>
          <p style={{ margin: '6px 0 20px', fontSize: 14, color: 'var(--ink-2)' }}>Reviews are checked by our team before they appear.</p>
          {!user ? <p><Link to="/login" className="link">Sign in</Link> to leave a review.</p> : sent ? <p role="status">Thank you! Your review will appear once our team has read it.</p> : (
            <form onSubmit={submit} noValidate>
              <FormError error={error} />
              <fieldset>
                <legend className="lbl">Your rating</legend>
                <div className="star-row">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" className={n <= form.rating ? 'star on' : 'star'} aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`} aria-pressed={n === form.rating} onClick={() => setForm({ ...form, rating: n })}>★</button>
                  ))}
                </div>
              </fieldset>
              <Field label="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} />
              <Field label="Your review" as="textarea" rows={5} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} minLength={10} maxLength={1000} required error={fieldError(error, 'text')} />
              <button className="btn btn-primary block">Submit for review</button>
            </form>
          )}
        </aside>
      </section>
    </>
  );
}
