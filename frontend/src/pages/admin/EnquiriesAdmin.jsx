import { useCallback, useEffect, useState } from 'react';
import { api, formatDateTime } from '../../lib/api.js';

const STATUSES = ['new', 'contacted', 'quoted', 'confirmed', 'lost'];

export default function EnquiriesAdmin() {
  const [enquiries, setEnquiries] = useState([]);
  const [messages, setMessages] = useState([]);
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

  return (
    <div>
      {error && <p role="alert" className="alert">{error}</p>}
      <div className="a-panel scroll-x" style={{ marginBottom: 22 }}>
        <h2>Events &amp; catering enquiries</h2>
        {enquiries.length === 0 ? <p className="muted">No enquiries yet.</p> : (
          <table className="table" style={{ minWidth: 720 }}>
            <thead><tr><th>Received</th><th>Who</th><th>Event</th><th>Details</th><th>Status</th></tr></thead>
            <tbody>
              {enquiries.map((q) => (
                <tr key={q._id}>
                  <td>{formatDateTime(q.createdAt)}</td>
                  <td><strong>{q.name}</strong>{q.company ? ` · ${q.company}` : ''}<br />{q.email}<br />{q.phone}</td>
                  <td>{q.eventType.replaceAll('-', ' ')}<br />{q.guests ? `${q.guests} guests` : ''}{q.eventDate ? ` · ${new Date(q.eventDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo' })}` : ''}</td>
                  <td style={{ maxWidth: 280 }}>{[q.location, q.budget, q.requirements].filter(Boolean).join(' · ')}</td>
                  <td>
                    <label className="sr-only" htmlFor={`st-${q._id}`}>Status for {q.name}</label>
                    <select id={`st-${q._id}`} value={q.status} onChange={(e) => patch(`/admin/enquiries/${q._id}`, { status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="a-panel scroll-x">
        <h2>Contact messages</h2>
        {messages.length === 0 ? <p className="muted">No messages yet.</p> : (
          <table className="table" style={{ minWidth: 640 }}>
            <thead><tr><th>Received</th><th>From</th><th>Subject</th><th>Message</th><th>Status</th></tr></thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m._id}>
                  <td>{formatDateTime(m.createdAt)}</td>
                  <td><strong>{m.name}</strong><br />{m.email}</td>
                  <td>{m.subject}</td>
                  <td style={{ maxWidth: 360 }}>{m.message}</td>
                  <td>{m.status === 'new' ? <button type="button" className="btn btn-outline small" onClick={() => patch(`/admin/messages/${m._id}`, { status: 'handled' })}>Mark handled</button> : <span className="status ok">handled</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
