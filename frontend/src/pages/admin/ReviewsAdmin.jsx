import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { Avatar, Empty, Search, Seg, Toolbar, ago } from '../../components/AdminUI.jsx';

const STATUSES = ['pending', 'published', 'rejected'];
const LABEL = { pending: 'Waiting', published: 'Published', rejected: 'Rejected' };
const BAR = { pending: '#d97706', published: '#16a34a', rejected: '#94a3b8' };

const Stars = ({ n, size = 16 }) => (
  <span className="stars" style={{ fontSize: size }} role="img" aria-label={`${n} out of 5`}>{'★'.repeat(n)}<i>{'★'.repeat(5 - n)}</i></span>
);

export default function ReviewsAdmin() {
  const [all, setAll] = useState({ pending: [], published: [], rejected: [] });
  const [tab, setTab] = useState('pending');
  const [stars, setStars] = useState(0); // 0 = every rating
  const [q, setQ] = useState('');
  const [reply, setReply] = useState({}); // id -> text being written (undefined = closed)
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const lists = await Promise.all(STATUSES.map((s) => api(`/admin/reviews?status=${s}`).then((d) => d.reviews)));
      setAll(Object.fromEntries(STATUSES.map((s, i) => [s, lists[i]])));
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function patch(id, body) {
    setError('');
    try {
      await api(`/admin/reviews/${id}`, { method: 'PATCH', body });
      setReply((r) => ({ ...r, [id]: undefined }));
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const live = all.published;
  const avg = live.length ? live.reduce((n, r) => n + r.rating, 0) / live.length : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => [s, live.filter((r) => r.rating === s).length]);
  const list = all[tab].filter((r) => (!stars || r.rating === stars) && `${r.displayName ?? ''} ${r.title ?? ''} ${r.text ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div>
      <section className="ar-hero">
        <div className="ar-score">
          <strong>{live.length ? avg.toFixed(1) : '–'}</strong>
          <Stars n={Math.round(avg)} size={22} />
          <small>{live.length ? `Average of ${live.length} published review${live.length === 1 ? '' : 's'}` : 'No published reviews yet'}</small>
        </div>
        <ul className="ar-dist" aria-label="Rating breakdown">
          {dist.map(([s, n]) => (
            <li key={s}>
              <button type="button" aria-pressed={stars === s} onClick={() => setStars(stars === s ? 0 : s)}>{s} ★</button>
              <div className="meter"><i style={{ width: `${live.length ? (n / live.length) * 100 : 0}%` }} /></div>
              <span>{n}</span>
            </li>
          ))}
        </ul>
        <div className="ar-wait">
          <b>{all.pending.length}</b>
          <span>{all.pending.length === 1 ? 'review is' : 'reviews are'} waiting for you</span>
          {all.pending.length > 0 && tab !== 'pending' && <button className="btn btn-primary small" onClick={() => setTab('pending')}>Review now</button>}
        </div>
      </section>

      <Toolbar>
        <Seg label="Show" value={tab} onChange={setTab} options={STATUSES.map((s) => ({ id: s, label: LABEL[s], count: all[s].length }))} />
        <Search value={q} onChange={setQ} placeholder="Search reviews" label="Search reviews" />
        {stars > 0 && <button className="btn btn-outline small" onClick={() => setStars(0)}>{stars} ★ only ✕</button>}
      </Toolbar>
      {error && <p role="alert" className="alert">{error}</p>}

      <div className="ar-grid">
        {list.map((r) => (
          <article key={r._id} className="ar-card" style={{ '--bar': BAR[r.status] }}>
            <header>
              <Avatar name={r.displayName || '?'} size={42} />
              <div><strong>{r.displayName || 'Guest'}</strong><small>{ago(r.createdAt)}{r.verified ? ' · ✓ verified order' : ''}</small></div>
              <Stars n={r.rating} />
            </header>
            {r.title && <h3>{r.title}</h3>}
            <blockquote>{r.text}</blockquote>
            {r.ownerResponse && reply[r._id] === undefined && <div className="ar-reply"><small>Your reply</small><p>{r.ownerResponse}</p></div>}
            {reply[r._id] !== undefined && (
              <div className="ar-write">
                <textarea rows={3} maxLength={1000} autoFocus placeholder="Thank the guest, or say what you are doing about it. This shows under their review." value={reply[r._id]} onChange={(e) => setReply({ ...reply, [r._id]: e.target.value })} />
                <div><button className="btn btn-primary small" disabled={!reply[r._id].trim()} onClick={() => patch(r._id, { ownerResponse: reply[r._id] })}>Save reply</button><button className="btn btn-outline small" onClick={() => setReply({ ...reply, [r._id]: undefined })}>Cancel</button></div>
              </div>
            )}
            <footer>
              {r.status !== 'published' && <button className="btn btn-primary small" onClick={() => patch(r._id, { status: 'published' })}>✓ Publish</button>}
              {r.status !== 'rejected' && <button className="btn btn-outline small" onClick={() => patch(r._id, { status: 'rejected' })}>{r.status === 'published' ? 'Unpublish' : '✕ Reject'}</button>}
              {r.status === 'published' && reply[r._id] === undefined && <button className="btn btn-outline small" onClick={() => setReply({ ...reply, [r._id]: r.ownerResponse ?? '' })}>{r.ownerResponse ? 'Edit reply' : '💬 Reply'}</button>}
            </footer>
          </article>
        ))}
      </div>
      {list.length === 0 && !error && <Empty icon={tab === 'pending' ? '🎉' : '★'} title={tab === 'pending' ? 'All caught up' : 'No reviews here'}>{tab === 'pending' ? 'New guest reviews wait here for your approval before they appear on the website.' : stars || q ? 'Nothing matches this filter.' : 'Reviews you decide on are listed here.'}</Empty>}
    </div>
  );
}
