import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function ReviewsAdmin() {
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(() => api('/admin/reviews?status=pending').then((d) => setReviews(d.reviews)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function decide(id, status) {
    setError('');
    try {
      await api(`/admin/reviews/${id}`, { method: 'PATCH', body: { status } });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2>Reviews waiting for approval</h2>
      {error && <p role="alert" className="alert">{error}</p>}
      {reviews.length === 0 && <p>Nothing to review.</p>}
      <ul className="grid">
        {reviews.map((r) => (
          <li key={r._id} className="card">
            <p>{'★'.repeat(r.rating)} · {r.displayName}{r.verified ? ' · verified' : ''}</p>
            {r.title && <h3>{r.title}</h3>}
            <p>{r.text}</p>
            <button className="btn btn-primary small" onClick={() => decide(r._id, 'published')}>Publish</button>{' '}
            <button className="btn btn-outline small" onClick={() => decide(r._id, 'rejected')}>Reject</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
