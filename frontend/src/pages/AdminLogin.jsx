import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Field, FormError } from '../components/Form.jsx';
import '../styles/admin.css';

// Shown at /admin to signed-out visitors. Signing in re-renders the guard, which then shows the dashboard.
export default function AdminLogin() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <div className="admin admin-login">
      <form className="a-panel" onSubmit={submit} noValidate>
        <div className="admin-brand"><span className="logo">E</span><span>Ember &amp; Olive</span></div>
        <h1>Staff sign in</h1>
        <p className="muted">Owners, managers, hosts, kitchen and marketing staff.</p>
        <FormError error={error} />
        <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" required />
        <Field label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" required />
        <button className="solid" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <Link to="/" className="back">← Back to website</Link>
      </form>
    </div>
  );
}
