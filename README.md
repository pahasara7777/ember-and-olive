# The Ember & Olive

Restaurant website and ordering platform for The Ember & Olive, a Mediterranean restaurant in Colombo. Menu, table reservations, pickup and delivery ordering, loyalty points and an admin dashboard. Built with MongoDB, Express, React and Node.js.

> Status: project setup. Folder structure, data models, API skeleton and frontend routes are in place. Features are not built yet.

## Stack

| Part | Tech |
|---|---|
| Frontend | React 19, React Router 7, Vite |
| Backend | Node.js 20+, Express 5, Zod validation, Helmet |
| Database | MongoDB with Mongoose (replica set required for transactions) |

## Getting started

1. Install Node.js 20 or newer and have a MongoDB **replica set** available. The free tier of [MongoDB Atlas](https://www.mongodb.com/atlas) works. Locally, run `mongod --replSet rs0` once and then `rs.initiate()` in `mongosh`.
2. Install packages from the repo root:
   ```bash
   npm install
   ```
3. Create the API config:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Then set `MONGODB_URI` (and a real `JWT_SECRET`).
4. Load the sample menu (18 dishes) and a placeholder floor plan:
   ```bash
   npm run seed
   ```
5. Start the backend and frontend together:
   ```bash
   npm run dev
   ```
   The frontend runs at http://localhost:5173 and the API at http://localhost:5000. The home page reads the featured dishes from the API.

## Scripts (run from the repo root)

| Command | What it does |
|---|---|
| `npm run dev` | Backend (nodemon) and frontend (Vite) together |
| `npm run seed` | Resets the menu, categories and tables with sample data |
| `npm test` | Backend tests (no database needed) |
| `npm run build` | Production build of the frontend into `frontend/dist` |
| `npm start` | Runs the backend without reloading |

## Folder structure

```
frontend/              React app (Vite)
  src/App.jsx          All routes from the sitemap
  src/components/      Shared layout (header, footer)
  src/pages/           Page components (Home is wired to the API, the rest are placeholders)
  src/lib/api.js       fetch wrapper and LKR formatting
  src/styles/          Brand tokens and global styles
backend/               Express API
  .env.example         Copy to .env and fill in
  src/app.js           Express app (security headers, CORS, JSON, error handling)
  src/index.js         Connects to MongoDB and starts the server
  src/models/          Mongoose models
  src/routes/          /api/v1 routes (unbuilt ones return 501)
  src/middleware/      Error handler and Zod validation
  src/seed/            Sample data from the client brief
  test/                node:test tests
```

## Data models

| Model | Purpose |
|---|---|
| `User` | Customers and staff, roles: customer, host, kitchen, marketing, manager, owner |
| `MenuCategory`, `MenuItem` | Menu with prices, dietary tags, allergens, availability and modifiers |
| `DiningTable`, `Reservation` | Floor plan and bookings, with time ranges for overlap checks |
| `Order` | Orders with item and price snapshots, totals, payment record and status history |
| `Coupon` | Promotion rules and redemptions |
| `LoyaltyTransaction` | Ember Rewards ledger (earn, redeem, expire, reverse) |
| `Review`, `GalleryImage`, `BlogPost`, `CateringEnquiry` | Content and enquiries |
| `AuditLog` | Staff actions such as price changes and refunds |

## Rules to keep when building features

- **Money is stored in cents** (`priceCents`, `totalCents`): LKR 1,450 is `145000`. Never use floating-point sums for money.
- **Prices are calculated on the server.** The cart sent by the browser is never trusted for prices or availability.
- **Reservations and orders use MongoDB transactions** so two people can't get the same table slot and an order can't be charged twice (`idempotencyKey` on `Order`).
- **Orders keep snapshots** of item names and prices, so editing the menu never changes past orders.
- **Never store card numbers or CVVs.** Use the payment provider's hosted checkout and verify webhooks on the server.
- **Times are stored in UTC** and shown in Asia/Colombo.
- **Role checks happen on the server** for every admin route.

## API

Base URL: `/api/v1`

| Method | Endpoint | Status |
|---|---|---|
| GET | `/api/health` | Done |
| GET | `/menu`, `/menu/:slug` | Done |
| GET | `/reservations/availability` | To do |
| POST/PATCH | `/reservations`, `/reservations/:reference` | To do |
| POST/GET | `/orders`, `/orders/:reference` | To do |
| POST | `/payments/checkout`, `/payments/webhook` | To do |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | To do |
| GET | `/account/orders` | To do |
| GET/POST | `/reviews`, `/catering-enquiries`, `/blog`, `/gallery` | To do |
| * | `/admin/*` | To do |

## Notes

Restaurant details, prices and the floor plan are sample data from the project brief and must be confirmed by the owner before launch.
