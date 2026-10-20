import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { STAFF_ROLES } from '../components/Guards.jsx';
import { Field, FormError } from '../components/Form.jsx';
import '../styles/account.css';

// Only same-site paths are allowed as a post-login destination, so a crafted link cannot send people elsewhere.
const safePath = (p) => (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') ? p : '/account');

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(form);
      // The account icon sends people here with from=/account, so staff are sent to the dashboard unless they were heading elsewhere.
      const from = location.state?.from;
      const dest = STAFF_ROLES.includes(u.role) && (!from || from === '/account') ? '/admin' : from;
      navigate(safePath(dest), { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">Welcome back</p>
      <h1>Sign in</h1>
      <div className="panel">
      <form onSubmit={submit} noValidate>
        <FormError error={error} />
        <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" required />
        <Field label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" required />
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      </div>
      <p className="alt">New here? <Link to="/register" className="link">Create an account</Link></p>
    </section>
  );
}
