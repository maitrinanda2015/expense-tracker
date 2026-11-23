# Expense Tracker (MERN)

A full-stack personal finance app. You can record income and expenses across several accounts, set monthly budgets with warnings, automate recurring transactions, track savings goals, and analyse your spending with charts. Every figure is computed from transactions stored in MongoDB.

- **Live app:** _add the frontend URL after deploying_
- **API:** _add the backend URL after deploying_ (health check: `GET /api/health`)
- **Demo login (after running the seed):** `demo@example.com` / `demo12345`

---

## Features

| Area | What's included |
|---|---|
| **Auth** | Register, log in and log out with a JWT. Passwords are hashed with bcrypt. Protected routes are enforced on the API (middleware) and in the UI (route guards). Users are logged out automatically when the token expires or the API returns a 401. |
| **Dashboard** | Shows total balance (income − expenses), total income, total expenses, the monthly budget, remaining budget and % used with a progress bar. Also shows budget warnings, the 8 most recent transactions, a 6-month income vs expense chart, and a quick "Add transaction" button. |
| **Transactions** | Add, edit and delete. Each has an amount, type, category, account, note and date (defaults to today), plus an optional attachment (image or PDF, ≤ 2 MB, stored in MongoDB) and a recurring toggle. |
| **Categories** | 10 built-in expense categories and 6 built-in income categories, plus user-created custom categories with icons. |
| **History** | Server-side pagination. Filters for type, category, account, date range and amount range can be combined. Search matches the note, category or exact amount. Filters are kept in the URL. |
| **Analytics** | Income, expenses, net savings and savings rate for Week / Month / 3 Months / Year. Also a category donut (expense or income), a trend chart (daily / weekly / monthly buckets) and a 12-month summary table. All figures come from MongoDB aggregations. |
| **Accounts** | Cash, Bank, Credit Card, Wallet and Savings accounts. Shows each account's balance, the combined total, and links to each account's transactions. |
| **Budgets** | A standing monthly overall budget plus per-category budgets. Warnings appear at 50 / 75 / 90 / 100%+, e.g. "You have used 90% of your July budget." or "Budget exceeded by $125.00." You can view any past month. |
| **Recurring** | Daily, weekly, monthly or yearly. The next occurrence is created automatically: by a cron job (every 15 min), on login, and when the dashboard or list loads. Backdated templates catch up, and no occurrence is ever created twice. |
| **Savings goals** | Name, target, saved amount, target date and progress %. You can add to or withdraw from a goal. |
| **CSV export** | Exports `Date,Type,Category,Account,Amount,Note` with the active filters applied. |
| **UI/UX** | Mobile-first layout: bottom nav and floating "+" on phones, sidebar on desktop. Loading skeletons, empty states and error states with retry. Toasts, keyboard-accessible modals, and automatic dark mode. |

## Architecture

```
expense-tracker/
├── server/                     Node + Express REST API (MVC)
│   ├── src/
│   │   ├── app.js              Express app: helmet, CORS, JSON, rate limit, routes, errors
│   │   ├── server.js           DB connection, HTTP server, recurring cron job
│   │   ├── config/             env loading/validation, Mongo connection
│   │   ├── models/             Mongoose schemas: User, Account, Category, Transaction, Budget, Goal
│   │   ├── validators/         Zod schemas for every body / query / param
│   │   ├── middleware/         auth (JWT), validate, sanitize, rateLimit, upload, errorHandler
│   │   ├── controllers/        one per resource
│   │   ├── services/           recurring engine, budget status, stats aggregations, categories
│   │   ├── routes/             route table
│   │   └── utils/              AppError, UTC date helpers, CSV, formatting
│   ├── scripts/seed.js         demo user with ~6 months of data
│   └── tests/                  Jest + Supertest
└── client/                     React 19 + Vite
    └── src/
        ├── api/client.js       fetch wrapper (auth header, errors, 401 handling, downloads)
        ├── context/            AuthContext, AppDataContext (accounts/categories), ToastContext
        ├── components/         TransactionForm/List/Filters, Charts, Modal, States, Budget…
        ├── pages/              Dashboard, Transactions, Analytics, Accounts, Budgets, Goals, Categories, Auth
        └── components/__tests__/  React Testing Library tests
```

**Request flow:** route → `requireAuth` → `validate` (Zod) → controller → service/model → JSON. Errors are thrown as `AppError` (or come from Mongoose/Multer). A central `errorHandler` turns them all into `{ error: { message, code, details? } }`.

**Data isolation:** every query includes `user: req.user._id`. A request for another user's document returns **404**, never 403, so it doesn't reveal that the ID exists. Account ownership is checked before a transaction is created or moved.

**State management:** Context API. `AuthContext` holds the session. `AppDataContext` holds accounts and categories, plus a `dataVersion` counter that pages depend on, so every page refetches after any transaction changes.

**Money and dates:** amounts are rounded to 2 decimals on input. Dates are stored at UTC midnight and all bucketing is done in UTC, so a transaction dated 2026-07-01 is always in July.

## API

Base URL: `/api`. Authenticated routes need `Authorization: Bearer <token>`. Errors look like `{ "error": { "message", "code", "details": [{ "field", "message" }] } }`.

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/health` | Health check | – |
| POST | `/auth/register` | Create account (creates a default Cash account) → `{ token, expiresAt, user }` | – (rate limited) |
| POST | `/auth/login` | Log in → `{ token, expiresAt, user }` | – (rate limited) |
| POST | `/auth/logout` | End session (client discards the token) | ✅ |
| GET | `/auth/me` | Current user | ✅ |
| PATCH | `/auth/me` | Update name / currency | ✅ |
| GET | `/dashboard` | Balance, totals, month budget status, recent transactions, 6-month chart | ✅ |
| GET | `/transactions` | Paginated list. Query: `page, limit (≤100), type, category, account, from, to (YYYY-MM-DD), minAmount, maxAmount, search, sort` | ✅ |
| GET | `/transactions/export` | CSV with the same filters (no pagination, max 10,000 rows) | ✅ |
| POST | `/transactions` | Create. Body: `amount, type, category, account, note?, date?, isRecurring?, frequency?` | ✅ |
| GET | `/transactions/:id` | Get one | ✅ |
| PATCH | `/transactions/:id` | Update any field, including recurring settings | ✅ |
| DELETE | `/transactions/:id` | Delete | ✅ |
| POST | `/transactions/:id/attachment` | Upload (multipart field `file`; PNG/JPEG/WEBP/PDF, ≤ 2 MB) | ✅ |
| GET | `/transactions/:id/attachment` | Download attachment | ✅ |
| DELETE | `/transactions/:id/attachment` | Remove attachment | ✅ |
| GET | `/accounts` | Accounts with balances, plus combined `total` | ✅ |
| POST | `/accounts` | Create `{ name, type }` | ✅ |
| PATCH | `/accounts/:id` | Rename / change type | ✅ |
| DELETE | `/accounts/:id` | Delete (409 if it still has transactions or is the last account) | ✅ |
| GET | `/categories` | Built-in + custom categories, grouped by type | ✅ |
| POST | `/categories` | Create custom `{ name, type, icon? }` | ✅ |
| DELETE | `/categories/:id` | Delete custom category (409 if in use) | ✅ |
| GET | `/budgets?month=YYYY-MM` | Overall + category budgets with spent / remaining / % / warning | ✅ |
| PUT | `/budgets` | Create or update `{ category: null \| "Food", amount }` | ✅ |
| DELETE | `/budgets/:id` | Remove a budget | ✅ |
| GET | `/goals` | Savings goals with `progress` | ✅ |
| POST | `/goals` | Create `{ name, targetAmount, currentAmount?, targetDate? }` | ✅ |
| PATCH | `/goals/:id` | Update | ✅ |
| POST | `/goals/:id/contribute` | Add (or withdraw, if negative) `{ amount }` | ✅ |
| DELETE | `/goals/:id` | Delete | ✅ |
| GET | `/analytics/summary?period=week\|month\|3months\|year` | Totals, savings rate, category breakdown, trend buckets | ✅ |
| GET | `/analytics/monthly?months=6` | Monthly income / expense / net (1–24 months) | ✅ |

## Security

- **Passwords:** bcrypt with 12 rounds; the password is never returned (`select: false` plus a `toJSON` transform). Login takes the same time and returns the same error whether or not the email exists.
- **JWT:** HS256 only, with expiry from `JWT_EXPIRES_IN`. The API returns `TOKEN_EXPIRED` vs `INVALID_TOKEN`. The client logs out at the expiry time and on any 401. The token is checked again against the user record on each request.
- **Validation:** Zod schemas on every body, query and route param. Unknown keys are stripped and only primitive values are accepted, so payloads like `{ "$gt": "" }` are rejected with 400. Controllers only read the validated `req.valid`, never raw `req.body` / `req.query`. Free text is trimmed, and control characters and HTML tags are removed.
- **NoSQL injection:** besides Zod, a global middleware rejects any body or query key that starts with `$` or contains `.`. Search input is regex-escaped.
- **CORS:** only the origins listed in `CLIENT_ORIGIN`. Credentials are not enabled because auth uses a Bearer header, not cookies.
- **Rate limiting:** 20 requests per 15 min per IP on `/auth/login` and `/auth/register`, and 600 per 15 min on the whole API.
- **Other:** Helmet headers, a 100 KB JSON body limit, a file type and size allowlist for uploads, and neutralised CSV formula injection (cells starting with `=`, `+`, `-` or `@` are prefixed).

## Local setup

Requirements: Node 20+, and MongoDB 6+ (local, or a MongoDB Atlas cluster).

```bash
# 1. API
cd server
cp .env.example .env          # then set MONGODB_URI and JWT_SECRET
npm install
npm run seed                  # optional: demo@example.com / demo12345
npm run dev                   # http://localhost:5000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                   # http://localhost:5173  (proxies /api to :5000)
```

## Environment variables

**server/.env** (see `server/.env.example`)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string (Atlas in production) |
| `JWT_SECRET` | ✅ | Long random string, at least 32 characters in production |
| `JWT_EXPIRES_IN` | | Token lifetime, default `1d` |
| `CLIENT_ORIGIN` | ✅ in prod | Allowed frontend origin(s), comma-separated, e.g. `https://my-app.vercel.app` |
| `PORT` | | Default `5000` (Render sets this) |
| `NODE_ENV` | | `production` hides internal error messages |
| `BCRYPT_ROUNDS` | | Default `12` |
| `AUTH_RATE_LIMIT_MAX` / `API_RATE_LIMIT_MAX` | | Requests per 15 minutes; defaults `20` / `600` |
| `RECURRING_CRON` | | Recurring job schedule, default `*/15 * * * *` |
| `MONGODB_URI_TEST` | | Test database; its name must contain `test` |

**client/.env** (see `client/.env.example`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ in prod | API base including `/api`, e.g. `https://expense-tracker-api.onrender.com/api` |

## Testing

```bash
cd server && npm test     # Jest + Supertest (needs MongoDB; uses a separate *_test database)
cd client && npm test     # Vitest + React Testing Library (jsdom)
```

- **Backend (41 tests):**
  - Auth: register and login, duplicate email, validation, injection attempts, and missing, forged and expired tokens; every resource route rejects anonymous requests.
  - Transactions: CRUD, the date defaulting to today, custom categories, HTML stripping, pagination, combined filters, search, and CSV output.
  - Data isolation: User B can't list, export, read, update or delete User A's transactions, or use A's accounts; dashboard totals don't leak between users.
  - Other features: attachments, recurring generation (catch-up, no duplicates, no monthly drift), budget thresholds and messages, analytics, account balances, and goals.
- **Frontend (15 tests):** `LoginForm` (validation, submit, server error); `TransactionForm` (date defaults to today, categories per type, validation, recurring payload, API field errors, edit pre-fill); `TransactionList` and `TransactionFilters` (rendering, empty state, actions, combined filtering, category reset, clear).

## Deployment

1. **MongoDB Atlas:**
   1. Create a free cluster and a database user.
   2. Under Network Access, allow `0.0.0.0/0`, since Render has no fixed IPs on the free plan.
   3. Copy the connection string, with a database name such as `/expense_tracker`.
2. **API on Render:**
   1. Choose New → Blueprint and pick this repo; it uses `render.yaml`, or create a Web Service with root `server`, build `npm ci --omit=dev`, start `npm start`.
   2. Set `MONGODB_URI` and `CLIENT_ORIGIN`. `JWT_SECRET` is generated automatically.
   3. Optionally run `npm run seed` once from the Render shell.
3. **Frontend on Vercel:**
   1. Import the repo with root directory `client` and the Vite framework preset.
   2. Set `VITE_API_URL=https://<your-api>.onrender.com/api`.
   3. `vercel.json` rewrites all routes to `index.html`. On Netlify, `public/_redirects` does the same.
4. Put the Vercel URL into the API's `CLIENT_ORIGIN` and redeploy the API.

## Known limitations

- **Logout is client-side.** JWTs are stateless, so a stolen token works until it expires (1 day by default). A token denylist or refresh-token rotation would fix this.
- **The token is stored in `localStorage`.** This is simple and works across origins, but an httpOnly cookie would be more resistant to XSS. React escapes all output and notes are sanitised, which reduces the risk.
- **Dates and periods use UTC.** A transaction entered late in the evening in a timezone well behind UTC still keeps the calendar date the user picked, but the period boundaries ("this month", "last 7 days") are UTC.
- **Recurring jobs on a sleeping host:** on Render's free plan the service sleeps when idle, so the cron job doesn't run. Due occurrences are created on the next login, dashboard load or list load instead, with their correct dates.
- **Single currency per user.** There is no currency conversion between accounts.
- **Transfers between accounts** aren't modelled as a separate type; record them as an expense in one account and income in the other.
- **Account opening balances:** a starting balance is recorded as an income transaction, which keeps *Total Balance = Income − Expenses* exact.
- **Attachments** are stored in MongoDB (≤ 2 MB each), which suits receipts but not large files. Object storage such as S3 would be better at scale.
