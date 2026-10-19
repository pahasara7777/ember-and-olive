// Calls the Express API (same origin; Vite proxies /api to localhost:5000 in development).
// The session lives in an HttpOnly cookie the browser sends by itself, so no token is ever handled in JavaScript.
export class ApiError extends Error {
  constructor(message, status, issues = []) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error?.message || `Request failed (${res.status})`, res.status, data.error?.issues);
  return data;
}

// Money is stored in cents; format for display only.
export const formatLkr = (cents) => `LKR ${(cents / 100).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' });
