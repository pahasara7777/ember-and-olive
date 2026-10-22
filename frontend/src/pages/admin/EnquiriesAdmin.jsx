import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { Avatar, Empty, Icon, Seg, Stat, Stats, Toolbar, ago } from '../../components/AdminUI.jsx';

// Event and catering enquiries move left to right like a sales pipeline; contact messages read like an inbox.
const STAGES = [
  { id: 'new', title: 'New', color: '#c9520a', next: ['contacted', 'Mark contacted'] },
  { id: 'contacted', title: 'Contacted', color: '#d97706', next: ['quoted', 'Quote sent'] },
  { id: 'quoted', title: 'Quoted', color: '#92400e', next: ['confirmed', 'Booked ✓'] },
  { id: 'confirmed', title: 'Confirmed', color: '#16a34a' },
  { id: 'lost', title: 'Lost', color: '#94a3b8' }
];
const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', day: 'numeric', month: 'short', ...(new Date(iso).getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }) });
const until = (iso) => { const d = Math.ceil((new Date(iso) - Date.now()) / 86400000); return d < 0 ? 'past' : d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`; };

function Lead({ q, patch }) {
  const [notes, setNotes] = useState(null); // null = closed
  const stage = STAGES.find((s) => s.id === q.status);
  const move = (status) => patch(`/admin/enquiries/${q._id}`, { status });
  return (
    <article className="eq-card" style={{ '--c': stage.color }}>
      <header>
        <Avatar name={q.name} size={38} />
        <div><strong>{q.name}</strong><small>{q.company || q.email}</small></div>
      </header>
      <span className="a-tag take">{q.eventType.replaceAll('-', ' ')}</span>
      <ul className="eq-facts">
        {q.eventDate && <li><Icon name="calendar" /><span>{day(q.eventDate)}</span><em>{until(q.eventDate)}</em></li>}
        {q.guests && <li><Icon name="users" /><span>{q.guests} guests</span></li>}
        {q.budget && <li><Icon name="wallet" /><span>{q.budget}</span></li>}
        {q.location && <li><Icon name="pin" /><span>{q.location}</span></li>}
      </ul>
      {q.requirements && <p className="eq-quote">“{q.requirements}”</p>}
      {q.staffNotes && notes === null && <p className="eq-note"><Icon name="note" size={14} />{q.staffNotes}</p>}
      {notes !== null && (
        <div className="eq-edit">
          <textarea rows={3} maxLength={1000} autoFocus placeholder="Private notes for the team" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div><button className="btn btn-primary small" onClick={() => { patch(`/admin/enquiries/${q._id}`, { staffNotes: notes }); setNotes(null); }}>Save</button><button className="btn btn-outline small" onClick={() => setNotes(null)}>Cancel</button></div>
        </div>
      )}
      <footer>
        <small>{ago(q.createdAt)}</small>
        <div className="eq-icons">
          <a href={`mailto:${q.email}?subject=${encodeURIComponent('Your event at Ember & Olive')}`} aria-label={`Email ${q.name}`} title="Email"><Icon name="mail" /></a>
          <a href={`tel:${q.phone}`} aria-label={`Call ${q.name}`} title="Call"><Icon name="phone" /></a>
          <button type="button" onClick={() => setNotes(q.staffNotes ?? '')} aria-label="Edit notes" title="Team notes"><Icon name="note" /></button>
        </div>
      </footer>
      {stage.next && <button className="eq-next" onClick={() => move(stage.next[0])}>{stage.next[1]} <span aria-hidden="true">→</span></button>}
      <details className="eq-more">
        <summary>Move to another stage</summary>
        <div>{STAGES.filter((s) => s.id !== q.status).map((s) => <button key={s.id} type="button" onClick={() => move(s.id)}><i style={{ background: s.color }} />{s.title}</button>)}</div>
      </details>
    </article>
  );
}

export default function EnquiriesAdmin() {
  const [enquiries, setEnquiries] = useState([]);
  const [messages, setMessages] = useState([]);
  const [tab, setTab] = useState('enquiries');
  const [box, setBox] = useState('new'); // inbox filter
  const [open, setOpen] = useState(null); // message being read
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/admin/enquiries').then((d) => setEnquiries(d.enquiries)).catch((e) => setError(e.message));
    api('/admin/messages').then((d) => setMessages(d.messages)).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function patch(path, body) {
    setError('');
    try {
      await api(path, { method: 'PATCH', body });
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  const unread = messages.filter((m) => m.status === 'new');
  const shownMsgs = messages.filter((m) => box === 'all' || (box === 'new' ? m.status === 'new' : m.status !== 'new'));
  const current = messages.find((m) => m._id === open) ?? shownMsgs[0];
  const active = enquiries.filter((q) => ['new', 'contacted', 'quoted'].includes(q.status));

  return (
    <div>
      <Toolbar>
        <Seg label="Show" value={tab} onChange={setTab} options={[
          { id: 'enquiries', label: 'Events & catering', count: enquiries.filter((q) => q.status === 'new').length },
          { id: 'messages', label: 'Contact messages', count: unread.length }
        ]} />
      </Toolbar>
      {error && <p role="alert" className="alert">{error}</p>}

      {tab === 'enquiries' ? (
        <>
          <Stats>
            <Stat label="Waiting for a first reply" value={enquiries.filter((q) => q.status === 'new').length} tone={enquiries.some((q) => q.status === 'new') ? 'bad' : 'good'} />
            <Stat label="In progress" value={active.filter((q) => q.status !== 'new').length} sub="contacted or quoted" />
            <Stat label="Confirmed events" value={enquiries.filter((q) => q.status === 'confirmed').length} tone="good" sub={`${enquiries.filter((q) => q.status === 'lost').length} lost`} />
          </Stats>
          {enquiries.length === 0 ? <Empty icon="🎉" title="No enquiries yet">Event and catering requests from the website land here and move across the board as you work on them.</Empty> : (
            <div className="eq-board">
              {STAGES.map((s) => {
                const col = enquiries.filter((q) => q.status === s.id);
                return (
                  <section key={s.id} className="eq-col" style={{ '--c': s.color }} aria-label={s.title}>
                    <h2><span>{s.title}</span><b>{col.length}</b></h2>
                    {col.map((q) => <Lead key={q._id} q={q} patch={patch} />)}
                    {col.length === 0 && <p className="eq-empty">Nothing here</p>}
                  </section>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="eq-boxes">
            <Seg label="Inbox" value={box} onChange={(v) => { setBox(v); setOpen(null); }} options={[{ id: 'new', label: 'Unread', count: unread.length }, { id: 'done', label: 'Handled', count: messages.length - unread.length }, { id: 'all', label: 'All', count: messages.length }]} />
          </div>
          {shownMsgs.length === 0 ? <Empty icon="✉" title={box === 'new' ? 'Inbox zero' : 'No messages'}>{box === 'new' ? 'Every message has been handled. 🎉' : 'Messages from the contact form appear here.'}</Empty> : (
            <div className="eq-inbox">
              <ul className="eq-list" aria-label="Messages">
                {shownMsgs.map((m) => (
                  <li key={m._id}>
                    <button type="button" aria-current={current?._id === m._id} className={m.status === 'new' ? 'unread' : ''} onClick={() => setOpen(m._id)}>
                      <Avatar name={m.name} size={36} />
                      <span><strong>{m.name}</strong><em>{m.subject}</em><small>{m.message}</small></span>
                      <time>{ago(m.createdAt)}</time>
                    </button>
                  </li>
                ))}
              </ul>
              {current && (
                <article className="eq-read">
                  <header><Avatar name={current.name} size={48} /><div><h3>{current.subject}</h3><span>{current.name} · {current.email} · {ago(current.createdAt)}</span></div></header>
                  <p>{current.message}</p>
                  <footer>
                    <a className="btn btn-primary" href={`mailto:${current.email}?subject=${encodeURIComponent(`Re: ${current.subject}`)}`}>✉ Reply by email</a>
                    {current.status === 'new' ? <button className="btn btn-outline" onClick={() => patch(`/admin/messages/${current._id}`, { status: 'handled' })}>✓ Mark handled</button> : <span className="pill ok">Handled</span>}
                  </footer>
                </article>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
