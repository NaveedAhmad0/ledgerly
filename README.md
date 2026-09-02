# Ledgerly

**Invoicing for independent studios** — create invoices, track paid vs outstanding, and let Gemini draft extractions and payment reminders. Model output is treated as untrusted: parsed with Zod, discarded if invalid, and never written to PostgreSQL until you save.

React + TypeScript on the client. Node, Express, and PostgreSQL on the server. GraphQL for reads, REST for writes.

> Same product idea as the live demo, rebuilt with the stack I use at work.

---

## Demo login

| | |
| --- | --- |
| App | [http://localhost:5173](http://localhost:5173) |
| API health | [http://localhost:8000/health](http://localhost:8000/health) |
| GraphQL | [http://localhost:8000/graphql](http://localhost:8000/graphql) |
| Email | `demo@ledgerly.dev` |
| Password | `DemoPass12$` |

Set `GEMINI_API_KEY` in `backend/.env` for **Extract with AI** and **Draft reminder**. Without a key, those routes return 503 and the rest of the app still works.

---

## Try Extract with AI

On **Invoices**, click **Extract with AI** and paste these messy notes. Gemini proposes a draft; you review it on the new-invoice form before anything is saved.

```
Hi,

Can you invoice Helix Publishing for last month?

Bill to:
Helix Publishing
finance@helix.example
14 Canal Street, Amsterdam

Work done:
- 5 hours of API integration at €150/hour
- 1 brand workshop, flat fee €800
- 12 licensed photo assets at €25 each

Thanks,
Mara
```

Expected draft: client **Helix Publishing**, email `finance@helix.example`, Amsterdam address, and three line items (hours, workshop, photo assets).

**Draft reminder** (unpaid invoices only) opens a popup. You can copy the email or open it in Gmail / Outlook. Paid invoices hide Edit, Draft reminder, and Mark paid.

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| UI | React 19, TypeScript, Vite, TanStack Query | Typed views, explicit server state |
| API | Node.js, Express, Zod | Validated REST for auth, invoices, AI |
| Reads | GraphQL Yoga at `/graphql` | Dashboard and lists are queries, not ad-hoc REST |
| Data | PostgreSQL, Prisma | Normalised `users` / `invoices` / `invoice_items`, indexed by user + status + date |
| Money | Integer cents | No floating-point totals |
| AI | Gemini | Extract and reminder drafts. Invalid JSON is discarded. Nothing is persisted until the user saves. |
| Tests | Jest, Vitest, Playwright | Unit tests for money and AI parsing, API integration tests, UI smoke |
| Delivery | Docker Compose, GitHub Actions | Postgres service in CI, `prisma migrate deploy` on boot |

---

## Architecture

- **REST** — `/api/auth`, `/api/invoices`, `/api/ai` for mutations, auth, and model calls
- **GraphQL** — `me`, `invoices`, `invoice`, `dashboard` (dashboard totals are SQL `GROUP BY`, not a client-side reduce)
- **Auth** — JWT in `Authorization: Bearer`. Every invoice query is scoped by `userId`
- **AI path** — `POST /api/ai/parse-text` → Zod `extractedInvoiceSchema` → React form. The database write is a separate `POST /api/invoices`

---

## Run locally

Needs **Node 20+** and **Docker** (for Postgres).

```bash
docker compose up -d db
cp .env.example backend/.env
npm install
npm run db:migrate -w backend
npm run db:seed -w backend
npm run dev
```

Copy `.env.example` into `backend/.env` and add your `GEMINI_API_KEY` if you want the AI features.

---

## Deploy on Render

The repo includes `render.yaml`. Easiest path: Blueprint from GitHub.

1. Push this repo to GitHub (`https://github.com/NaveedAhmad0/ledgerly`).
2. Open [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints) → **New Blueprint Instance**.
3. Select the `ledgerly` repo. Render creates Postgres, the API, and the static frontend.
4. On **ledgerly-api** → Environment, set `GEMINI_API_KEY`.
5. `CORS_ORIGIN` and `VITE_API_URL` may come through as hostnames only. Change them to full URLs:
   - API `CORS_ORIGIN` = `https://ledgerly-web.onrender.com` (your web URL)
   - Web `VITE_API_URL` = `https://ledgerly-api.onrender.com` (your API URL)
6. Manual deploy both services after those URLs are set (`VITE_API_URL` is baked in at build time).
7. On **ledgerly-api** → Shell:

```bash
npx tsx prisma/seed.ts
```

8. Open the static site URL. Demo login: `demo@ledgerly.dev` / `DemoPass12$`.

Free web services sleep after idle time; the first request can take 30–60 seconds. If free Postgres is not offered, pick the cheapest paid database plan.

### Manual setup (no Blueprint)

1. **PostgreSQL** → New → copy the Internal Database URL.
2. **Web Service** (`ledgerly-api`)
   - Root directory: `backend`
   - Build: `npm install && npm run build`
   - Start: `npx prisma migrate deploy && node dist/server.js`
   - Env: `DATABASE_URL`, `JWT_SECRET` (16+ chars), `JWT_EXPIRES_IN=7d`, `NODE_ENV=production`, `CORS_ORIGIN=https://YOUR-WEB.onrender.com`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.6-flash`
3. **Static Site** (`ledgerly-web`)
   - Root directory: `frontend`
   - Build: `npm install && npm run build`
   - Publish: `dist`
   - Env: `VITE_API_URL=https://YOUR-API.onrender.com`
4. Seed the demo user from the API shell, then send Smartclip the live URL + repo + demo login.

---

## Tests

```bash
npm test
npm run test:e2e
```

`npm test` runs Jest on the API (auth, invoice create, GraphQL dashboard, tenant isolation) and Vitest on the UI. API integration tests need Postgres.

Playwright logs in as the demo user, creates an invoice, and checks it appears in the list. GitHub Actions runs the same suite against a Postgres service.

### Review first

1. `backend/prisma/schema.prisma` — relational model and indexes
2. `backend/src/lib/money.ts` — totals in cents
3. `backend/src/modules/ai/ai.parser.ts` — model output treated as untrusted
4. `backend/src/graphql/yoga.ts` — read API
5. `backend/tests/api.test.ts` — register → create invoice → GraphQL dashboard → tenant isolation

The Playwright flow lives in `frontend/e2e/invoice-flow.spec.ts`. It needs Postgres running and the demo seed applied.

---

## Author

**Naveed Ahmad** · [linkedin.com/in/naveed-ahmad-82272b19b](https://www.linkedin.com/in/naveed-ahmad-82272b19b)
