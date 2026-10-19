import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'eo_session';
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const ISSUER = 'ember-and-olive';

export function signSession(userId, env) {
  return jwt.sign({}, env.JWT_SECRET, { algorithm: 'HS256', subject: String(userId), issuer: ISSUER, expiresIn: MAX_AGE_SECONDS });
}

// Returns { sub, iat } or null. The algorithm is pinned so "alg: none" tokens are refused.
export function verifySession(token, env) {
  try {
    return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'], issuer: ISSUER });
  } catch {
    return null;
  }
}

export const cookieOptions = (env) => ({
  httpOnly: true, // not readable by page scripts, so XSS cannot steal it
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: MAX_AGE_SECONDS * 1000
});
