// Calls the Express API through the Vite proxy (/api -> localhost:5000).
export async function api(path, options = {}) {
  const res = await fetch(`/api/v1${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
    body: options.body && JSON.stringify(options.body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Request failed (${res.status})`);
  return data;
}

// Money is stored in cents; format for display only.
export const formatLkr = (cents) =>
  `LKR ${(cents / 100).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
