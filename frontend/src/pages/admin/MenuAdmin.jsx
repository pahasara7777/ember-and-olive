import { useCallback, useEffect, useState } from 'react';
import { api, formatLkr } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { dishPhoto } from '../../lib/images.js';
import { Empty, Search, Seg, Stat, Stats, Switch, Toolbar } from '../../components/AdminUI.jsx';
import DishForm from './DishForm.jsx';

const AVAIL = ['available', 'sold-out', 'unavailable', 'scheduled'];
const read = () => { try { return localStorage.getItem('menu-view') || 'grid'; } catch { return 'grid'; } };

export default function MenuAdmin() {
  const { user } = useAuth();
  const manager = ['manager', 'owner'].includes(user.role);
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null); // { id, value }
  const [form, setForm] = useState(null); // 'new', or the dish being edited
  const [flash, setFlash] = useState('');
  const [filter, setFilter] = useState('all');
  const [cat, setCat] = useState('');
  const [view, setView] = useState(read);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => api('/admin/menu').then((d) => setItems(d.items)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); api('/menu').then((d) => setCats(d.categories)).catch(() => {}); }, [load]);
  const pick = (v) => { setView(v); try { localStorage.setItem('menu-view', v); } catch { /* the choice just will not be remembered */ } };

  async function patch(id, body) {
    setError('');
    try {
      await api(`/admin/menu/${id}`, { method: 'PATCH', body });
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  const tabs = [
    { id: 'all', label: 'All', test: (i) => !i.archived },
    { id: 'available', label: 'Available', test: (i) => !i.archived && i.availability === 'available' },
    { id: 'out', label: 'Sold out', test: (i) => !i.archived && i.availability !== 'available' },
    { id: 'featured', label: '★ Featured', test: (i) => !i.archived && i.featured },
    { id: 'hidden', label: 'Hidden', test: (i) => i.archived }
  ];
  const catName = (id) => cats.find((c) => c._id === id)?.name ?? '';
  const shown = items.filter((i) => tabs.find((t) => t.id === filter).test(i) && (!cat || i.category === cat) && i.name.toLowerCase().includes(q.trim().toLowerCase()));
  const visible = items.filter((i) => !i.archived);

  const Price = ({ i }) => (editing?.id === i._id ? (
    <form className="price-edit" onSubmit={(e) => { e.preventDefault(); patch(i._id, { priceCents: Math.round(Number(editing.value) * 100) }); }}>
      <input autoFocus type="number" min="0" step="50" aria-label={`New price in LKR for ${i.name}`} value={editing.value} onChange={(e) => setEditing({ id: i._id, value: e.target.value })} onKeyDown={(e) => e.key === 'Escape' && setEditing(null)} />
      <button className="btn btn-primary small" disabled={!editing.value}>Save</button>
      <button type="button" className="btn btn-outline small" onClick={() => setEditing(null)} aria-label="Cancel">✕</button>
    </form>
  ) : (
    <span className="price">
      {formatLkr(i.priceCents)}
      {manager && <button type="button" className="icon-edit" onClick={() => setEditing({ id: i._id, value: String(i.priceCents / 100) })} aria-label={`Change price of ${i.name}`} title="Change price">✎</button>}
    </span>
  ));

  const Controls = ({ i }) => (
    <div className="m-controls">
      <label className="m-switch">
        <Switch checked={i.availability === 'available'} label={`${i.name} available`} onChange={(on) => patch(i._id, { availability: on ? 'available' : 'sold-out' })} />
        <span>{i.availability === 'available' ? 'Available' : i.availability.replace('-', ' ')}</span>
      </label>
      <select aria-label={`Availability of ${i.name}`} value={i.availability} onChange={(e) => patch(i._id, { availability: e.target.value })}>
        {AVAIL.map((s) => <option key={s} value={s}>{s.replace('-', ' ')}</option>)}
      </select>
      {manager && (
        <>
          <button type="button" className="icon-btn-s" onClick={() => setForm(i)} title="Edit dish details" aria-label={`Edit ${i.name}`}>✎</button>
          <button type="button" className={`icon-btn-s${i.featured ? ' on' : ''}`} aria-pressed={i.featured} onClick={() => patch(i._id, { featured: !i.featured })} title="Feature on the home page">★</button>
          <button type="button" className="icon-btn-s" onClick={() => patch(i._id, { archived: !i.archived })} title={i.archived ? 'Show on the website' : 'Hide from the website'}>{i.archived ? '👁' : '🚫'}</button>
        </>
      )}
    </div>
  );

  return (
    <div>
      <Stats>
        <Stat label="Dishes on the menu" value={visible.length} sub={`${visible.filter((i) => i.featured).length} featured`} />
        <Stat label="Available now" value={visible.filter((i) => i.availability === 'available').length} tone="good" />
        <Stat label="Sold out / off" value={visible.filter((i) => i.availability !== 'available').length} tone={visible.some((i) => i.availability !== 'available') ? 'bad' : 'mute'} sub={items.some((i) => i.archived) ? `${items.filter((i) => i.archived).length} hidden` : ''} />
      </Stats>
      <Toolbar>
        <Seg label="Show" value={filter} onChange={setFilter} options={tabs.map((t) => ({ id: t.id, label: t.label, count: items.filter(t.test).length }))} />
        <Search value={q} onChange={setQ} placeholder="Search dishes" label="Search dishes" />
        {manager && <button className="btn btn-primary small" onClick={() => setForm('new')}>＋ Add dish</button>}
        <Seg label="Layout" value={view} onChange={pick} options={[{ id: 'grid', label: '▦ Cards' }, { id: 'list', label: '☰ List' }]} />
      </Toolbar>
      {cats.length > 0 && (
        <div className="cat-strip" role="group" aria-label="Category">
          <button type="button" aria-pressed={!cat} onClick={() => setCat('')}>All categories</button>
          {cats.map((c) => <button key={c._id} type="button" aria-pressed={cat === c._id} onClick={() => setCat(c._id)}>{c.name}</button>)}
        </div>
      )}
      {error && <p role="alert" className="alert">{error}</p>}
      {flash && <p role="status" className="flash">{flash}</p>}

      {view === 'grid' ? (
        <div className="a-grid">
          {shown.map((i) => {
            const photo = dishPhoto(i);
            const off = i.availability !== 'available';
            return (
              <article key={i._id} className={`m-card${off || i.archived ? ' off' : ''}`}>
                <div className="pic" style={photo ? { backgroundImage: `url(${photo})` } : undefined}>
                  {!photo && '🍽'}
                  <div className="badges">
                    {i.featured && <span className="a-tag warn">★ Featured</span>}
                    {i.archived ? <span className="a-tag">Hidden</span> : off && <span className="a-tag bad">{i.availability.replace('-', ' ')}</span>}
                  </div>
                </div>
                <div className="body">
                  <div><h3>{i.name}</h3><small className="muted-line">{catName(i.category)}</small></div>
                  <Price i={i} />
                  <Controls i={i} />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="a-list">
          {shown.map((i) => {
            const photo = dishPhoto(i);
            return (
              <article key={i._id} className={`a-row${i.availability !== 'available' || i.archived ? ' off' : ''}`}>
                <span className="thumb" style={photo ? { backgroundImage: `url(${photo})` } : undefined} aria-hidden="true">{!photo && '🍽'}</span>
                <div className="grow"><h3>{i.name} {i.featured && <span className="a-tag warn">★</span>} {i.archived && <span className="a-tag">Hidden</span>}</h3><span className="sub">{catName(i.category)}</span></div>
                <Price i={i} />
                <Controls i={i} />
              </article>
            );
          })}
        </div>
      )}
      {shown.length === 0 && !error && <Empty icon="🍽" title="No dishes found">{manager ? 'Try another search or filter, or add a new dish with “＋ Add dish”.' : 'Try another search, category or filter.'}</Empty>}
      {form && <DishForm dish={form === 'new' ? null : form} categories={cats} onClose={() => setForm(null)} onSaved={() => { setFlash(form === 'new' ? 'Dish added to the menu.' : 'Dish updated.'); setForm(null); load(); setTimeout(() => setFlash(''), 4000); }} />}
    </div>
  );
}
