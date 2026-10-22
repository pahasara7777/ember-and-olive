// Small building blocks shared by the admin screens, so every section looks like it belongs to one product.

const HUES = [18, 32, 150, 200, 265, 340];
const hue = (s = '') => HUES[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % HUES.length];

export const Avatar = ({ name = '?', size = 40 }) => (
  <span className="a-avatar" style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${hue(name)} 70% 92%)`, color: `hsl(${hue(name)} 55% 32%)` }} aria-hidden="true">
    {name.trim()[0]?.toUpperCase()}
  </span>
);

export const Empty = ({ icon = '✦', title, children }) => (
  <div className="a-empty">
    <span aria-hidden="true">{icon}</span>
    <strong>{title}</strong>
    {children && <p>{children}</p>}
  </div>
);

export const Stat = ({ label, value, sub, tone = '' }) => (
  <div className={`a-stat ${tone}`}>
    <p>{label}</p>
    <strong>{value}</strong>
    {sub && <small>{sub}</small>}
  </div>
);

export const Stats = ({ children }) => <div className="a-stats">{children}</div>;
export const Toolbar = ({ children }) => <div className="a-toolbar">{children}</div>;

export const Search = ({ value, onChange, placeholder = 'Search…', label = 'Search' }) => (
  <label className="a-search">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.500-3.500" /></svg>
    <input type="search" aria-label={label} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  </label>
);

// options: [{ id, label, count? }]
export const Seg = ({ options, value, onChange, label }) => (
  <div className="a-seg" role="group" aria-label={label}>
    {options.map((o) => (
      <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
        {o.label}{o.count !== undefined && <b>{o.count}</b>}
      </button>
    ))}
  </div>
);

export const Switch = ({ checked, onChange, label, disabled }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="switch" onClick={() => onChange(!checked)}><span /></button>
);

export function ago(iso) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
}

// Line icons (stroke follows the text colour), so cards do not depend on emoji that look different on every device.
const PATHS = {
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  phone: 'M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z',
  note: 'M5 4h14v16H5zM9 9h6M9 13h6M9 17h3',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  users: 'M9 11a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7zM2 20c0-3.500 3-6 7-6s7 2.500 7 6M17 5a3 3 0 0 1 0 6M19 14c2 .8 3 2.500 3 5',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12v3M16 13.500h2',
  pin: 'M12 21s7-6.500 7-12a7 7 0 0 0-14 0c0 5.500 7 12 7 12zM12 11.500a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z',
  more: 'M5 12h.01M12 12h.01M19 12h.01'
};
export const Icon = ({ name, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ico"><path d={PATHS[name]} /></svg>
);
