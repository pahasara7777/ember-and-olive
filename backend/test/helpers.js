import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';

export const testEnv = (extra = {}) =>
  loadEnv({
    NODE_ENV: 'test',
    MONGODB_URI: process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/ember-and-olive-test',
    CLIENT_ORIGIN: 'http://localhost:5173',
    JWT_SECRET: 'test-secret-'.repeat(4),
    ...extra
  });

// Starts the app on a random port and returns a small fetch helper that keeps cookies.
export async function startApp(extraEnv) {
  const server = createApp({ env: testEnv(extraEnv) }).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  const call = async (method, path, { body, headers = {}, raw = false } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) cookie = c.startsWith('eo_session=;') ? '' : c.split(';')[0];
    if (raw) return res;
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = undefined; }
    return { status: res.status, json, headers: res.headers, set };
  };
  return { call, close: () => server.close(), clearCookie: () => (cookie = ''), get cookie() { return cookie; } };
}
