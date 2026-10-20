import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import '../styles/content.css';

const CATS = ["Chef's Notes", 'Seasonal Ingredients', 'Events'];
const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Colombo' });

export function Blog() {
  const [posts, setPosts] = useState(null);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    api('/blog').then((d) => setPosts(d.posts)).catch(() => setPosts([]));
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (posts || []).filter((p) => (cat === 'all' || p.category === cat) && (!needle || `${p.title} ${p.excerpt}`.toLowerCase().includes(needle)));
  }, [posts, cat, q]);
  const [lead, ...rest] = shown;

  return (
    <div className="container">
      <div className="blog-head">
        <div><p className="eyebrow">Journal</p><h1 className="h1">Notes from the kitchen</h1></div>
        <div style={{ flex: '0 1 360px' }}>
          <label htmlFor="blog-search" className="sr-only">Search articles</label>
          <input id="blog-search" type="search" className="search" placeholder="Search articles" value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} style={{ borderRadius: 999, padding: '0 22px' }} />
        </div>
      </div>
      <div className="chips" role="group" aria-label="Categories">
        <button type="button" className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>All</button>
        {CATS.map((c) => <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
      </div>

      {posts === null && <p style={{ marginTop: 32 }}>Loading…</p>}
      {posts && shown.length === 0 && <p className="muted" style={{ margin: '40px 0 90px' }}>No articles found.</p>}
      {lead && (
        <Link to={`/blog/${lead.slug}`} className="featured">
          {lead.coverImage?.url && <img src={lead.coverImage.url} alt={lead.coverImage.alt || ''} />}
          <div className="copy">
            <span className="cat">{lead.category} · Featured</span>
            <h2>{lead.title}</h2>
            <p>{lead.excerpt}</p>
            <p className="by">{fmt(lead.publishAt)}</p>
          </div>
        </Link>
      )}
      {rest.length > 0 && (
        <ul className="post-grid">
          {rest.map((p) => (
            <li key={p._id}>
              <Link to={`/blog/${p.slug}`}>
                {p.coverImage?.url && <img src={p.coverImage.url} alt={p.coverImage.alt || ''} loading="lazy" />}
                <span className="cat">{p.category}</span>
                <h3>{p.title}</h3>
                <p>{p.excerpt}</p>
                <span className="by">{fmt(p.publishAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(undefined);

  useEffect(() => {
    setPost(undefined);
    api(`/blog/${encodeURIComponent(slug)}`).then((d) => setPost(d.post)).catch(() => setPost(null));
  }, [slug]);

  if (post === undefined) return <section className="container page"><p>Loading…</p></section>;
  if (post === null) return <section className="container page"><h1>Article not found</h1><p><Link to="/blog" className="link">Back to the journal</Link></p></section>;

  return (
    <article className="container article">
      <Link to="/blog" className="link">← All articles</Link>
      <p className="cat" style={{ display: 'block', marginTop: 28 }}>{post.category}</p>
      <h1>{post.title}</h1>
      <p className="muted">{fmt(post.publishAt)}</p>
      {post.coverImage?.url && <img className="cover" src={post.coverImage.url} alt={post.coverImage.alt || ''} />}
      {/* The body is plain text split into paragraphs; it is never rendered as HTML. */}
      <div className="body">{(post.body || '').split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}</div>
    </article>
  );
}
