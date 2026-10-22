import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../lib/api.js';
import { dishPhoto } from '../../lib/images.js';

const TAGS = [['vegetarian', '🥕 Vegetarian'], ['vegan', '🌱 Vegan'], ['gluten-free', '🌾 Gluten-free'], ['spicy', '🌶 Spicy']];
const CHANNELS = [['dine-in', 'Dine-in'], ['pickup', 'Pickup'], ['delivery', 'Delivery']];
const LIMIT = 44000; // the server accepts photos up to 45,000 characters as a data URL

// Shrinks the chosen photo in the browser until it is small enough to store with the dish.
async function shrink(file) {
  const bitmap = await createImageBitmap(file);
  for (const width of [640, 520, 420, 340]) {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, width / bitmap.width);
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const q of [0.72, 0.6, 0.48]) {
      const url = canvas.toDataURL('image/jpeg', q);
      if (url.length <= LIMIT) return url;
    }
  }
  throw new Error('That photo is too detailed to store. Try a simpler or smaller one.');
}

// Create a dish (no `dish`) or edit one. Only managers and owners reach this; the server checks it again.
export default function DishForm({ dish, categories, onClose, onSaved }) {
  const [f, setF] = useState(() => ({
    name: dish?.name ?? '', description: dish?.description ?? '', category: dish?.category ?? categories[0]?._id ?? '',
    price: dish ? String(dish.priceCents / 100) : '', prep: dish?.prepMinutes ? String(dish.prepMinutes) : '',
    tags: dish?.dietaryTags ?? [], channels: dish?.channels ?? ['dine-in', 'pickup', 'delivery']
  }));
  const [image, setImage] = useState(dish ? dishPhoto(dish) : null); // what the preview shows
  const [newImage, setNewImage] = useState(undefined); // undefined = untouched, null = removed, string = new photo
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // the page behind must not scroll while the form is open
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [onClose]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (k, v) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });

  async function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const url = await shrink(file);
      setImage(url);
      setNewImage(url);
    } catch (err) {
      setError(err.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (f.channels.length === 0) return setError('Pick at least one way to order it.');
    setBusy(true);
    const body = {
      name: f.name, description: f.description, category: f.category, priceCents: Math.round(Number(f.price) * 100),
      dietaryTags: f.tags, channels: f.channels, ...(f.prep ? { prepMinutes: Number(f.prep) } : dish ? { prepMinutes: null } : {})
    };
    try {
      if (dish) {
        await api(`/admin/menu/${dish._id}/details`, { method: 'PATCH', body: { ...body, ...(newImage !== undefined && { image: newImage }) } });
      } else {
        await api('/admin/menu', { method: 'POST', body: { ...body, ...(newImage && { image: newImage }) } });
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  // Rendered next to the admin root, not inside the animated page, so "fixed" means the whole window and the theme variables still apply.
  return createPortal(
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={dish ? `Edit ${dish.name}` : 'Add a dish'} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dish-form" onSubmit={submit}>
        <header><h2>{dish ? 'Edit dish' : 'Add a dish'}</h2><button type="button" className="icon-btn-s" onClick={onClose} aria-label="Close">✕</button></header>
        <div className="df-body">
        {error && <p role="alert" className="alert">{error}</p>}

        <div className="df-photo">
          <div className="df-preview" style={image ? { backgroundImage: `url(${image})` } : undefined}>{!image && '🍽'}</div>
          <div>
            <label className="btn btn-outline small">{image ? 'Change photo' : 'Add a photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} hidden /></label>
            {image && <button type="button" className="btn btn-outline small" onClick={() => { setImage(null); setNewImage(null); }}>Remove</button>}
            <p className="muted-line">Optional. It is shrunk to fit automatically.</p>
          </div>
        </div>

        <label>Dish name<input required maxLength={80} placeholder="e.g. Lamb Kofta" value={f.name} onChange={set('name')} autoFocus /></label>
        <div className="df-row">
          <label>Category<select required value={f.category} onChange={set('category')}>{categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
          <label>Price (LKR)<input required type="number" min="0" step="50" placeholder="2850" value={f.price} onChange={set('price')} /></label>
          <label>Prep time (min)<input type="number" min="1" max="240" placeholder="Optional" value={f.prep} onChange={set('prep')} /></label>
        </div>
        <label>Description<textarea rows={3} maxLength={500} placeholder="What makes it good, in a sentence or two." value={f.description} onChange={set('description')} /></label>

        <fieldset><legend>Dietary</legend>
          <div className="df-chips">{TAGS.map(([v, l]) => <button key={v} type="button" aria-pressed={f.tags.includes(v)} onClick={() => toggle('tags', v)}>{l}</button>)}</div>
        </fieldset>
        <fieldset><legend>Available for</legend>
          <div className="df-chips">{CHANNELS.map(([v, l]) => <button key={v} type="button" aria-pressed={f.channels.includes(v)} onClick={() => toggle('channels', v)}>{l}</button>)}</div>
        </fieldset>

        </div>

        <footer>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || !f.category}>{busy ? 'Saving…' : dish ? 'Save changes' : 'Add to menu'}</button>
        </footer>
      </form>
    </div>,
    document.querySelector('.admin') ?? document.body
  );
}
