# Security

## Reporting a problem

Email the owner privately instead of opening a public issue. Include what you found and how to reproduce it.

## What is protected, and how

| Risk | Protection | Where |
|---|---|---|
| Leaked keys and passwords | Secrets live only in `backend/.env` (git-ignored). The server refuses to start if `JWT_SECRET` is short or a placeholder. A pre-commit hook and CI scan every commit and the whole history. The website never receives a secret. | `config/env.js`, `scripts/` |
| Weak passwords at rest | Passwords are hashed with scrypt (64 MiB, per-user salt) and compared in constant time. Hashes are never returned by the API. | `lib/password.js` |
| Sign-in attacks | Rate limit on sign-in and sign-up, 5-failure account lockout (15 min), same error for unknown email and wrong password, equal timing. | `routes/auth.js`, `middleware/rateLimit.js` |
| Stolen sessions | Session token is an HS256 JWT with pinned algorithm, in an HttpOnly, SameSite=Lax cookie (Secure in production). Changing a password or deactivating a user ends open sessions. | `lib/tokens.js`, `middleware/auth.js` |
| Access to other people's data | Roles are checked on the server for every admin route. Account routes always filter by the signed-in user. Guest lookups need an unguessable reference (and the email, for bookings). | `routes/admin.js`, `routes/account.js` |
| Price tampering | Prices, totals, delivery fees and availability are recomputed on the server from the database. Unknown fields are rejected. | `lib/pricing.js` |
| NoSQL injection | Keys such as `$ne`, `a.b`, `a[$ne]` and `__proto__` are rejected; Zod validates every body; Mongoose `sanitizeFilter` is on; ids are validated before queries. | `middleware/sanitize.js` |
| XSS | React escapes all output and no `dangerouslySetInnerHTML` is used. Input is stripped of tags and control characters before storage. A strict Content-Security-Policy blocks inline and third-party scripts. | `lib/text.js`, `middleware/security.js` |
| CSRF | SameSite cookies, JSON-only bodies, CORS limited to the website origin, and a server check that rejects state-changing requests from other origins. | `middleware/security.js` |
| Abuse and spam | Global, form and lookup rate limits. Request bodies capped at 50 KB. | `middleware/rateLimit.js` |
| Information leaks | Generic error messages, no stack traces, no `X-Powered-By`, dotfiles and `.git` never served, no source maps in production builds. | `middleware/error.js`, `app.js` |
| Double booking and double orders | Bookings are inserted then re-checked for clashes; orders accept an idempotency key. | `routes/reservations.js`, `routes/orders.js` |
| Silent staff changes | Price, status, moderation and role changes are written to an audit log. | `lib/audit.js` |

## Before going live

- Create a MongoDB Atlas user with **readWrite on the ember-and-olive database only**, restrict Network Access to your server's IP instead of `0.0.0.0/0`, and keep TLS on (the default for `mongodb+srv`).
- Generate a **new** `JWT_SECRET` on the server. Never reuse the one from development.
- Set `NODE_ENV=production`, an `https://` `CLIENT_ORIGIN`, and `TRUST_PROXY=1` behind a single reverse proxy.
- Rotate any credential that was ever pasted into chat, email or a screenshot.
- Enable GitHub secret scanning, push protection and Dependabot alerts on the repository.
- Card payments are not implemented. When you add them, use the provider's hosted checkout, verify webhook signatures, and never store card numbers.

## Known limits

- Rate-limit counters are in memory (per server instance). Use a shared store if you run more than one instance.
- There is no email verification or password reset yet; both need an email provider.
- There is no multi-factor sign-in for staff.
