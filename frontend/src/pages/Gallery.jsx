import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import '../styles/content.css';

const FILTERS = [['all', 'All'], ['food', 'Food'], ['interior', 'Interior'], ['team', 'Team'], ['events', 'Events'], ['catering', 'Catering']];

export default function Gallery() {
  const [images, setImages] = useState(null);
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null); // index into the filtered list
  const closeRef = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    api('/gallery').then((d) => setImages(d.images)).catch(() => setImages([]));
  }, []);

  const shown = (images || []).filter((i) => filter === 'all' || i.category === filter);
  const step = (n) => setOpen((i) => (i + n + shown.length) % shown.length);

  useEffect(() => {
    if (open === null) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { setOpen(null); opener.current?.focus(); };
  const cur = open !== null ? shown[open] : null;

  return (
    <>
      <section className="container">
        <div className="blog-head" style={{ paddingBottom: 28 }}>
          <div><p className="eyebrow">Gallery</p><h1 className="h1">A taste of the room</h1></div>
          <div className="chips" role="group" aria-label="Filter photos">
            {FILTERS.map(([v, l]) => <button key={v} type="button" className="chip" aria-pressed={filter === v} onClick={() => setFilter(v)}>{l}</button>)}
          </div>
        </div>
        {images === null && <p>Loading…</p>}
        {images?.length === 0 && <p className="empty" style={{ padding: 40, border: '1.5px dashed #bdb29a', borderRadius: 16 }}>Photos are coming soon.</p>}
        {images?.length > 0 && shown.length === 0 && <p className="muted">No photos in this group yet.</p>}
        <ul className="mosaic">
          {shown.map((img, i) => (
            <li key={img._id}>
              <button type="button" className="tile" aria-label={`Open photo: ${img.alt}`} onClick={(e) => { opener.current = e.currentTarget; setOpen(i); }}>
                <img src={img.url} alt="" loading="lazy" />
                {img.caption && <span className="cap">{img.caption}</span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="btn-row" style={{ display: 'flex', justifyContent: 'center', gap: 14, margin: '40px 0 90px', flexWrap: 'wrap' }}>
          <Link to="/contact" className="btn btn-primary">More on Instagram</Link>
        </div>
      </section>

      {cur && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
          <button ref={closeRef} type="button" className="round lb-close" aria-label="Close photo viewer" onClick={close}>✕</button>
          <button type="button" className="round" aria-label="Previous photo" onClick={() => step(-1)}>‹</button>
          <figure>
            <img src={cur.url} alt={cur.alt} />
            <figcaption><span>{cur.alt}{cur.caption ? ` · ${cur.caption}` : ''}</span><span>{open + 1} of {shown.length}</span></figcaption>
          </figure>
          <button type="button" className="round" aria-label="Next photo" onClick={() => step(1)}>›</button>
        </div>
      )}
    </>
  );
}
