import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Gallery() {
  const [images, setImages] = useState(null);
  useEffect(() => {
    api('/gallery').then((d) => setImages(d.images)).catch(() => setImages([]));
  }, []);
  return (
    <section className="page container">
      <h1>Gallery</h1>
      {images === null && <p>Loading…</p>}
      {images?.length === 0 && <p>Photos are coming soon.</p>}
      <ul className="grid">
        {images?.map((img) => (
          <li key={img._id}>
            <img src={img.url} alt={img.alt} loading="lazy" />
            {img.caption && <p className="muted">{img.caption}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
