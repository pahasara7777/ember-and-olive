# The Ember & Olive

Restaurant website and ordering platform for The Ember & Olive, a Mediterranean restaurant in Colombo. Menu, table reservations, pickup and delivery ordering, reviews, catering enquiries and a role-based staff dashboard. Built with MongoDB, Express, React and Node.js, with security built in (see [SECURITY.md](SECURITY.md)).

> Status: working MVP. Payments are cash only (on pickup or delivery); card payments, email notifications, loyalty points and coupons are not built yet. Restaurant details, prices, opening hours and the floor plan are sample data from the brief and must be confirmed by the owner.

## Stack

| Part | Tech |
|---|---|
| Frontend | React 19, React Router 7, Vite |
| Backend | Node.js 20+, Express 5, Zod, Helmet, express-rate-limit |
| Database | MongoDB with Mongoose |
| Auth | scrypt password hashes, signed session in an HttpOnly cookie, role checks on the server |

## Getting started

1. Install Node.js 20 or newer and have a MongoDB database. The free tier of [MongoDB Atlas](https://www.mongodb.com/atlas) works. Create a database user with **readWrite on `ember-and-olive` only**.
2. Install packages from the repo root (this also turns on the secret-scanning pre-commit hook):
   ```bash
   npm install
   ```
3. Create the API config and fill it in:
   ```bash
   cp backend/.env.example backend/.env
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # paste the output as JWT_SECRET
   ```
   The server refuses to start if a required setting is missing, or if `JWT_SECRET` is short or still a placeholder. **Never commit `backend/.env`.**
4. Load the sample menu (18 dishes) and floor plan, then create the first staff account:
   ```bash
   npm run seed
   OWNER_EMAIL=you@example.com npm run create-owner --workspace @ember-olive/backend
   ```
   The owner password is generated and shown once. Staff accounts cannot be created through the public site.
5. Start the backend and frontend together:
   ```bash
   npm run dev
   ```
   Site: http://localhost:5173. API: http://localhost:5000. Staff dashboard: http://localhost:5173/admin.

## Scripts (run from the repo root)

| Command | What it does |
|---|---|
| `npm run dev` | Backend (`node --watch`) and frontend (Vite) together |
| `npm run seed` | Resets the menu, categories and tables with sample data |
| `npm test` | Backend and script tests. Database tests run when `MONGODB_TEST_URI` is set (see below) |
| `npm run scan:secrets` / `scan:history` | Look for leaked secrets in files / in every commit |
| `npm run audit:deps` | `npm audit` for known vulnerable dependencies |
| `npm run build` | Production build of the frontend into `frontend/dist` |
| `npm start` | Runs the backend; with `NODE_ENV=production` it also serves the built site |

### Database tests

Tests that touch MongoDB are skipped unless you point them at a **throwaway** server, for example a local `mongod`:

```bash
MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npm test        # macOS/Linux
$env:MONGODB_TEST_URI="mongodb://127.0.0.1:27017"; npm test   # Windows PowerShell
```

Each test file creates and drops its own `eo-test-*` database, and never touches the database named in your URI.

## Folder structure

```
frontend/              React app (Vite)
  src/pages/           Customer pages; src/pages/admin/ holds the staff dashboard tabs
  src/lib/             API client, auth and cart state
  src/components/      Layout, forms, route guards
backend/               Express API
  src/app.js           Security middleware order, API mount, static site in production
  src/config/          Environment validation, database connection
  src/middleware/      Auth and roles, rate limits, headers/CORS, input guard, errors
  src/lib/             Password hashing, tokens, pricing, booking rules, text cleaning, audit
  src/models/          Mongoose models
  src/routes/          auth, menu, orders, reservations, account, content, admin
  src/seed/            Sample data from the client brief
  src/scripts/         create-owner
  test/                node:test unit and integration tests
scripts/               Secret scanner used by the pre-commit hook and CI
.github/               CI workflow and Dependabot
```

## Rules to keep when building features

- **Money is stored in cents** (`priceCents`, `totalCents`): LKR 1,450 is `145000`.
- **Prices are calculated on the server.** The browser says which dishes it wants, never what they cost.
- **Every route declares who may use it.** Admin routes use `requireRole`; account routes filter by `req.user`.
- **Validate every input with a strict Zod schema** and clean free text with `plain()`.
- **Orders keep snapshots** of item names and prices, so editing the menu never changes past orders.
- **Never store card numbers or CVVs.** Use the payment provider's hosted checkout and verify webhooks on the server.
- **Times are stored in UTC** and shown in Asia/Colombo.
- **When you pass an operator to a Mongoose filter** (`$in`, `$gt`...), wrap it in `mongoose.trusted()`; `sanitizeFilter` is on.

## API

Base URL: `/api/v1`

| Method | Endpoint | Who |
|---|---|---|
| GET | `/api/health` | Anyone |
| GET | `/menu`, `/menu/:slug`, `/gallery`, `/blog`, `/blog/:slug`, `/reviews` | Anyone |
| GET | `/reservations/availability?date=&partySize=` | Anyone |
| POST | `/reservations`, `/orders`, `/catering-enquiries` | Anyone (rate limited) |
| GET/PATCH | `/reservations/:reference` (+ email), `GET /orders/:reference` | Holder of the reference |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | Anyone (rate limited) |
| GET/POST | `/auth/me`, `/auth/password` | Signed-in user |
| GET/PATCH | `/account/orders`, `/account/reservations`, `/account/profile` | Signed-in user, own records only |
| POST | `/reviews` | Signed-in user (held for moderation) |
| * | `/admin/*` | Staff, narrowed by role (see below) |

| Role | Admin access |
|---|---|
| host | orders, reservations |
| kitchen | orders, dish availability |
| marketing | reviews, catering enquiries |
| manager | everything except people and audit log; may change prices |
| owner | everything, including people and the audit log |
