import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Field, FormError, fieldError } from '../components/Form.jsx';
import '../styles/account.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', marketingConsent: false });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(form);
      navigate('/account', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">Join us</p>
      <h1>Create account</h1>
      <div className="panel">
      <form onSubmit={submit} noValidate>
        <FormError error={error} />
        <Field label="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" required maxLength={80} error={fieldError(error, 'name')} />
        <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" required error={fieldError(error, 'email')} />
        <Field label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" required minLength={10} hint="At least 10 characters. A few random words make a strong password." error={fieldError(error, 'password')} />
        <label className="check"><input type="checkbox" checked={form.marketingConsent} onChange={(e) => setForm({ ...form, marketingConsent: e.target.checked })} /> Send me offers and news (optional)</label>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      </div>
      <p className="alt">Already have an account? <Link to="/login" className="link">Sign in</Link></p>
    </section>
  );
}
