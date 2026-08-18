# Material Retail — Take-Home Project

A small full-stack inventory management system for independent retailers. Lets a merchant list products, view product details, set low-stock thresholds, and get alerted when stock falls below threshold.

Two demo merchants are seeded so you can run the project and see it working immediately:

- **Aquarius Cosmetics** — nail polish store; popular colors flagged for low stock; uses variants to capture multiple sizes per color.
- **Mountain House** — furniture &amp; home decor; **Brooklyn Tripod Lamp** is the can't-run-out-of product (threshold = 2).

---

## How to run locally

Requires **Node 20+** and `npm` (you almost certainly have these already).

```bash
# 1. Install everything (root + workspaces).
npm install

# 2. Run the API and web app together.
#    API:  http://localhost:4000/api
#    Web:  http://localhost:5173
npm run dev
```

Then open <http://localhost:5173/>.

The database is **auto-created and seeded on first boot** at `data/app.db`. To re-seed:

```bash
npm run seed           # drops and re-creates seed rows
npm run smoke          # boots the API and runs an end-to-end smoke test
```

### Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Run API (`localhost:4000`) + web (`localhost:5173`) in parallel |
| `npm run build` | Build the API (`apps/api/dist`) and the web app (`apps/web/dist`) |
| `npm run start:api` | Run the compiled API |
| `npm run preview:web` | Serve the built web bundle |
| `npm run seed` | Wipe and re-seed the SQLite database |
| `npm run smoke` | Boot the API in-process and run scripted end-to-end checks |

---

## How to deploy (optional)

The project is local-first and does not need public hosting. If you want to deploy:

- **API** → any Node host. Render, Railway, Fly.io, a tiny VPS, or `fly launch` from `apps/api`. Set `PORT=8080` (or whatever the host provides). The database file is at `data/app.db`; for durability replace the SQLite file with a managed Postgres (one DSN + `pg` driver would do it). Disable the cron sweep if you go multi-instance.
- **Web** → any static host. `apps/web/dist` is a static SPA. Set its `VITE_API_BASE` (or just keep the same-origin proxy in dev and have the host proxy `/api` to the API). Vercel, Netlify, or Cloudflare Pages all work.
- **Email** → swap the `jsonTransport` in `apps/api/src/alerts/email.service.ts` for a real SMTP transport (Sendgrid, SES, Mailgun). Point `ALERT_FROM` at a real address.

---

## Technology choices

| Layer | Choice | Why |
| --- | --- | --- |
| Runtime | Node 20 | Already on most developer machines. |
| Backend | **NestJS** (TypeScript, Express adapter) | Modules, DI, and DTO validation give a small project structure that's easy to walk through live. |
| Database | **SQLite via better-sqlite3** | Zero-config, single file, perfect for "local-only is fine" spec. Easy to wipe and re-seed for the demo. |
| Validation | class-validator + class-transformer | NestJS-native; DTO classes double as both runtime validation and (loose) types. |
| Email | **Nodemailer `jsonTransport`** | Captures alert emails as `.eml` files in `data/outbox/` so the demo works without an SMTP account. One-line swap to real SMTP. |
| Scheduling | `@nestjs/schedule` cron (60s sweep) | Belt-and-suspenders for any direct DB edits; immediate alerts are emitted on every inventory update. |
| Frontend | **React + Vite + TypeScript** | Fast HMR, small bundle, easy to walk through. |
| Data fetching | TanStack Query | Caching, retries, and automatic cache invalidation on mutations. |
| Styles | CSS Modules + CSS variables (light/dark via `prefers-color-scheme`) | Theme-able, no build complexity, matches the "small and well-chosen" spirit. |
| Monorepo | npm workspaces | One `npm install`, one `npm run dev`. |
| AI tooling | Claude Code (this session) | See *"AI tool usage"* section below. |

### Alerting mechanism — email + always-visible drawer

The alert pipeline works like this:

1. Every inventory mutation (`PATCH /api/inventory/:variantId`, `POST /api/inventory/:variantId/adjust`) calls `AlertsService.checkVariant(variantId)`.
2. If `stockQty <= threshold` and we haven't already alerted for this dip, an `alerts` row is inserted and an email is "sent" through Nodemailer's `jsonTransport` (rewritten in `EmailService` to also save the EML under `data/outbox/`).
3. Background: `@Cron(EVERY_MINUTE)` calls `AlertsService.sweep()` to catch any rows that drifted below threshold outside the API (e.g. via direct DB edit).
4. The same `below_threshold_since` + `last_alerted_at` columns provide **debouncing** — Aquarius has hundreds of polishes; we won't re-email for the same dip until the SKU is replenished above threshold then drops again.
5. The web app surfaces low-stock state in three places:
   - A persistent **low-stock pill** in the top bar with the current count.
   - A **drawer** that's reachable from any page (closes with Esc, focuses a clicked item on the product detail page).
   - The dashboard's "Low-stock now" and "Recent alerts" cards.

This combination is meant for both personas:
- **Ashley (Aquarius, tech-savvy)** gets an email she can forward to her supplier or text-from-email.
- **David (Mountain House, not tech-savvy)** gets a giant red pill he can't miss, with one click into the product page to update stock.

---

## Project structure

```
.
├── apps/
│   ├── api/                  # NestJS backend
│   │   ├── src/
│   │   │   ├── alerts/       # email + alert engine + debouncing + cron sweep
│   │   │   ├── audit/        # audit_log table + service + controller
│   │   │   ├── common/       # shared slug resolvers
│   │   │   ├── database/     # better-sqlite3 connection, schema, seed
│   │   │   ├── health/       # /api/health
│   │   │   ├── inventory/    # stock/threshold endpoints
│   │   │   ├── merchants/    # list + summary endpoints
│   │   │   ├── products/     # CRUD + list with search/filter
│   │   │   ├── scheduler/    # @nestjs/schedule cron tasks
│   │   │   ├── variants/     # nested under products
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── scripts/smoke.cjs
│   └── web/                  # Vite + React + TS frontend
│       ├── src/
│       │   ├── components/   # LowStockDrawer/Pill/Row, MerchantLayout
│       │   ├── lib/api.ts    # typed fetch wrapper
│       │   ├── routes/       # Dashboard, ProductList, ProductDetail, ProductNew, Alerts, Settings, MerchantPicker
│       │   └── styles/       # global.css (theme tokens)
│       ├── index.html
│       └── vite.config.ts
├── data/
│   ├── app.db                # auto-created on first boot
│   └── outbox/               # alert emails land here
├── package.json              # npm workspaces + root scripts
├── README.md
└── LICENSE (MIT)
```

---

## API summary

All endpoints are under `/api`.

- `GET /merchants` — list merchants.
- `GET /merchants/:slug` — one merchant + KPIs + 5 recent alerts.
- `GET /merchants/:slug/products?search=&category=&low_stock=&page=&pageSize=` — list products with filters.
- `GET /merchants/:slug/categories` — categories for the filter dropdown.
- `GET /products/:id` — one product with variants + inventory.
- `POST /products`, `PATCH /products/:id`, `DELETE /products/:id`.
- `POST /products/:id/variants`, `PATCH /variants/:id`, `DELETE /variants/:id`.
- `GET /inventory/:variantId`, `PATCH /inventory/:variantId`, `POST /inventory/:variantId/adjust` (relative +/- N).
- `GET /alerts?merchant_slug=&only_open=` — alert history.
- `GET /alerts/low-stock?merchant_slug=` — currently-low items (powers the drawer).
- `POST /alerts/:id/ack`.
- `GET /merchants/:slug/audit` — audit log.
- `GET /health`.

---

## AI tool usage

This project was scaffolded with **Claude Code** (this session). I used it to:
- Draft the schema, controller route map, and service boundaries.
- Write the seed (variant math, popular-vs-unpopular stock simulation, etc.).
- Generate the React UI; every component is small enough to read and modify live.
- Draft this README.

AI output was reviewed and trimmed where it overreached (e.g. I cut auth, multi-warehouse, real SMTP). I confirmed every endpoint behaviorally with `npm run smoke`. No code generated by the model is included without being read or skimmed first.

If I were using AI more aggressively I'd consider: an AI assistant that suggests "you might also want to reorder X based on past sales velocity" — but that's a product feature, not infra, and would need supplier integration first.

---

## Assumptions

These are the assumptions I'd flag in a real project. Each would change the implementation if the answer came back different:

1. **A merchant has one location.** No multi-store stock. If multiple locations become a requirement, `inventory` gains a `location_id` foreign key and the alert message lists "where" the stock is low.
2. **Variants are attribute-style** (color, size, finish). They aren't fully separate "products" with their own descriptions / photos.
3. **Threshold is per-variant**, but there's a merchant-level default to avoid blank thresholds on new SKUs.
4. **No auth / no multi-tenant user accounts.** Single-user demo per merchant. Adding it would mean a `users` table, bcrypt, session cookies, and one NestJS `AuthGuard` — not big, just out of scope for the 3-hour budget.
5. **Alerts debounce until stock cycles above → below threshold.** I did *not* debounce by time. Reviewing the brief, the concern is "don't spam when stock is consistently low" — which is what this does.
6. **Email is the alert channel.** I picked email because it's universal across both personas. If push or SMS became a requirement, the alert engine just needs new "channels" — the existing debouncing and audit logic don't change.
7. **No supplier integration.** The system tells you *when* to reorder, not *what* to send to a supplier or how. A future "Generate PO" feature could go on top of the existing thresholds.
8. **Seeded stock reflects "right now"** — popular polishes start low so the alert system is immediately demonstrable.

### Questions I'd ask first in a real project

- **What is a "product" for you?** Are *Forest Green 5ml* and *Forest Green 15ml* the same product or different? My answer: same product, different variants.
- **Do you have suppliers in the system or is ordering done elsewhere today?** Today: elsewhere (the brief). Tomorrow: probably via the same app.
- **How do you want to be notified when something runs low?** Email is fine for some teams; SMS / push matters for others. I picked email because it covers both demo personas without a third-party account.
- **Are there hours-of-ignoring rules?** (e.g. don't alert between 10pm and 7am for a small store). Not implemented; trivial to add at the alert-sending step.
- **Are there predefined "bundles" or "kits"** that should alert when any constituent variant is low? Not implemented.

---

## What I'd build next with more time

Ordered by highest ROI for a real merchant:

1. **Supplier / purchase order integration.** Thresholds generate a draft PO sent to a supplier email; receiving closes the loop. This is the single biggest jump in workflow value.
2. **Auth and per-user roles.** Owner vs. employee vs. accountant. Audit log already exists; just needs users.
3. **PostgreSQL + multi-instance deploy.** Single-file SQLite is fine for one local box. For hosted, swap to PG and run a separate worker for the cron sweep.
4. **Real SMTP.** Swap the `jsonTransport` for SES / SendGrid / Postmark. Template the email. Add unsubscribe.
5. **Sales-velocity-aware thresholds.** The current default of 5 is fine; a smarter version would say "Forest Green sells 12/wk, so threshold 5 = 4 days of stock." Hooks for that already exist (`audit_log` records every stock change, so it could compute velocity).
6. **Barcode / SKU scanning** in the mobile UI.
7. **CSV bulk import / export.** (Export is half-built in `data/outbox` already as EML — a CSV for products+inventory is a 30-minute add.)
8. **Email-to-SMS bridge.** Some small retailers don't have email on their phone — a Twilio bridge would solve that with 0 product changes.
9. **Time-of-day quiet hours** on alerts.
10. **Tests.** A few `*.spec.ts` per service. Right now we have only the smoke script.

### If I had unlimited time

- Real-time dashboard via WebSockets so when one device's customer changes stock, every other connected device reflects it instantly.
- Mobile-first PWA so Ashley can scan in the back room.
- Audit-able receipt photos (customer returns, damages).
- Multi-location stock transfers.
- Customer-facing "out of stock" notifications (let people subscribe to be alerted when Brooklyn Tripod Lamp is back).
- Built-in analytics dashboard (low-stock incidents per week, reorder cost, etc.).

---

## Walkthrough tip

If asked to extend something live:
- The alert debouncing lives in `apps/api/src/alerts/alerts.service.ts` in `checkVariant()`.
- The schema is in `apps/api/src/database/database.service.ts` (one big `SCHEMA` constant — easy to extend on the fly).
- The seed functions in `seed.ts` are a single `seedAll()` call; easy to add another merchant or product.
- Frontend routes are flat in `apps/web/src/routes/`. New page? Drop a file, add a `<Route>` in `App.tsx`.
- Alert emails: `data/outbox/*.eml` — open in any mail client.
