import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import AdminLogin from '../pages/AdminLogin.jsx';

// These guards only decide what the page shows. The server enforces the real permissions on every request.
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="container page">Loading…</p>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

export const STAFF_ROLES = ['host', 'kitchen', 'marketing', 'manager', 'owner'];

export function RequireStaff({ children }) {
  const { user, loading, logout } = useAuth();
  if (loading) return <p className="container page">Loading…</p>;
  if (!user) return <AdminLogin />;
  if (!STAFF_ROLES.includes(user.role)) return <section className="container page"><h1>Staff only</h1><p>Your account does not have access to this area.</p><button type="button" className="btn btn-outline" onClick={logout}>Sign out</button></section>;
  return children;
}
