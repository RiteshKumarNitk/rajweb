# Rajasthan Racquetball Association (RRA) Platform

Digital platform for the Rajasthan Racquetball Association: public federation website, member portal, and admin portal, built with Next.js, PostgreSQL, and Prisma.

> **This README describes only what is implemented in the repository.** Features that exist only in the Prisma schema or in the roadmap are explicitly marked as such. Full detail lives in the five documents under [`docs/`](docs/) — where this README and the code disagree, the code is the source of truth.

---

## Current Status

### Implemented

- Public website (~30 pages: about, districts, governance, resources, media, contact, donations, equipment enquiries, verify)
- Authentication — admin credentials login (`/login`) and member login (Google OAuth + email OTP at `/account/login`)
- Member portal (`/account/*`)
- Admin portal (`/admin/*`)
- RBAC — 6 seeded system roles, data-driven permissions, district scoping, custom role editor
- Player registration and Coach registration (public and in-portal, linked to the signed-in user)
- Club / School / Academy membership applications
- Admin application review — approve/reject with mandatory rejection reason
- Resubmission of rejected applications by the owner
- Service requests (8 types; 3 auto-apply on approval)
- Tournament management — creation, editing, manual status management, registration window, categories (Singles/Doubles), per-category fees, capacity, poster URL
- Tournament registration — eligibility checks, capacity validation, one registration per player per tournament
- Registration amount snapshotting (see [Tournament pricing rule](#tournament-pricing--business-rule))
- Player certificates — issuance, PDF generation, QR code
- Certificate verification — public (`/verify`) and in-portal (`/account/verify`)
- Audit logging of admin decisions, sign-ins, and key user actions
- Security protections (JWT sessions, CSRF, rate limiting, security headers, ownership/district checks — see [Security](#security))
- Performance optimisations (public tournament caching + tag revalidation, throttled JWT refresh, query shaping, loading skeletons)

### Partial / Limited

- Coach certificate service exists (`issueCoachCertificate()`) but **no API route or UI calls it** — coach certificate issuance is not available end-to-end
- Some admin areas are read-only: media, districts, settings; equipment orders is a read-only enquiry list; contact messages and donations have no admin page
- Notifications UI is a shell only — the bell always shows "No notifications yet." (no model, no backend, no `/account/notifications` route)
- Some certificate data is sample/static — sample championship certificates and signatories are hard-coded constants, not database records
- Membership lifecycle is incomplete — applications end at APPROVED; no renewal, activation, expiry, or suspension is ever set by code
- No real pagination on admin lists (hard `take` caps instead)

### Planned (not started)

- Payments (Phase J) — **no payment integration of any kind exists today**
- Receipts (K)
- Tournament passes / QR entry (L)
- Tournament operations — registration approve/reject, withdrawal, check-in (M)
- Draws / fixtures (N) — `Fixture` model exists in the schema only; unused by any code
- Match results (O) — `Match` model exists in the schema only; unused by any code
- Rankings (P)
- Certificate expansion — coach issuance, revocation, membership and tournament certificates (Q)
- Documents — uploads (R)
- Notifications (S)
- Reporting (T)
- Production hardening — automated tests, migrations, pagination (U)

---

## Features (detail)

### Tournament feature scope

The tournament feature set currently implemented is exactly:

- Tournament creation and editing (slug, description, whole-tournament classification, venue, dates in IST, poster URL, contacts, eligibility flag)
- Manual status management (`DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED → IN_PROGRESS → COMPLETED` / `CANCELLED`) — no automatic transitions
- Registration window (`registrationStart` / `registrationDeadline`) enforcement
- Registration categories with **Singles/Doubles** type, per-category fee, and active/inactive flag
- Maximum participant capacity (counts PENDING + APPROVED registrations)
- Player self-registration into one category from the member portal
- Capacity validation, race-safe via a row lock on the tournament
- **Registration amount snapshot** captured at registration time (see below)
- Admin tournament management pages with category manager and registrations table

**Not implemented (planned, not present):** tournament payments, payment gateway integration, receipts, tournament passes, QR passes, check-in, draw generation, fixtures, match results, rankings, waitlist, registration approval/rejection workflow. The `Fixture` and `Match` Prisma models exist as **schema-only foundation for future phases (N/O)** — no code reads or writes them, and no UI exists.

### Membership scope

Implemented: Club, School and Academy membership **applications** (public and in-portal), admin review/approve/reject with reason, owner resubmission, and the membership status model (`PENDING → APPROVED / REJECTED`).

Not implemented: online membership payment, renewal workflow, automatic expiry, renewal reminders, payment receipts, and any lifecycle beyond approval (`ACTIVE`, `EXPIRED`, `SUSPENDED` exist in the enum but are never set by code). Membership certificates are not generated (`certificatePath` is never written).

The New/Renewal prices shown on membership pages come from `Setting` rows and are **display/business values only** — no transaction, charge, or payment is associated with them.

### Payment status

**Payment integration is NOT implemented.** There are no payment routes, no payment models, no provider SDKs, and no charge of any kind (tournament fees, memberships, donations — donations are recorded as pledges only).

**Phase J (Tournament payment) is the next major roadmap phase.** No payment provider has been chosen or integrated anywhere in the code; any provider name would be a future business decision, not an existing integration.

### Certificates

Implemented:

- Player certificate issuance by admins (requires the player to be APPROVED)
- Certificate PDF generation (PDFKit) and QR code generation
- Public certificate verification at `/verify`
- Logged-in certificate viewing and verification at `/account/certificates` and `/account/verify`

Not fully implemented:

- Coach certificate issuance end-to-end (service function exists; no route/UI calls it)
- Membership certificates
- Tournament participation/merit certificates
- Certificate revocation workflow (revocation fields exist on the models; nothing sets them)

### Storage

Certificate PDFs are stored through a `StorageAdapter` abstraction with two implementations:

- **Local filesystem** — `STORAGE_LOCAL_PATH` (default `./uploads`)
- **Netlify Blobs** — selected via `STORAGE_TYPE=netlify` or automatically when `NETLIFY=true`

Selection: `STORAGE_TYPE`, else `netlify` when `NETLIFY=true`, else `local`. All stored files are served through the authorisation-checked `/api/files/*` route. **No S3, Azure, or MinIO support exists.**

---

## Tech Stack

All versions from `package.json`.

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, Radix UI primitives, Framer Motion, Lucide icons |
| State | Zustand |
| Forms | React Hook Form + Zod 4 (client and server) |
| Auth | NextAuth / Auth.js v5 (JWT sessions; Credentials, Google, email-OTP providers) |
| ORM / DB | Prisma 7 + PostgreSQL (`@prisma/adapter-pg`) |
| Password / OTP hashing | bcryptjs |
| Email | Resend (OTP emails only) |
| PDF / QR | PDFKit, qrcode |
| Storage | Local filesystem or Netlify Blobs (`@netlify/blobs`) |
| Rate limiting | Upstash Ratelimit + Redis when configured; in-memory fallback |
| Logging | Pino |
| Monitoring | Sentry (active only when DSN env vars are set) |
| Deployment | Netlify (Node 22) and/or Docker (`node:22-alpine`) |
| Tests | **None** — no automated test framework is installed (see [Testing](#testing)) |

---

## Quick Start

### Prerequisites

- Node.js 22 (Netlify and Docker both use Node 22; Node 20+ generally works for local dev)
- npm
- PostgreSQL 16+ (local via Docker, or hosted e.g. Neon)

### 1. Install dependencies

```bash
npm install
```

`postinstall` runs `prisma generate` automatically.

### 2. Configure environment

There is **no `.env.example` in the repository** — create `.env` in the project root with the variables listed in [Environment Variables](#environment-variables).

### 3. Start PostgreSQL (Docker)

```bash
docker compose up postgres -d
```

This starts `postgres:16-alpine` on port **5434** with database `rra_db`, user `rra`, password `rra_password` (see `docker-compose.yml`), i.e.:

```env
DATABASE_URL=postgresql://rra:rra_password@localhost:5434/rra_db?schema=public
```

### 4. Apply the schema and seed

```bash
npm run db:push    # apply the Prisma schema to the database
npm run db:seed    # roles, permissions, 33 districts, admin accounts, sample data, settings
```

> **There is no Prisma migrations directory in this repository.** The schema is applied with `prisma db push`. `npm run db:migrate` exists as a script but there are **no migration files** to apply — do **not** use `prisma migrate deploy` against this project (there is nothing to deploy).

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Seeded admin login:** `admin@rajasthanracquetball.com` / `Admin@123` — change seeded demo passwords before any real deployment. A Jaipur district admin is also seeded (see [docs/RRA-TESTING.md §2](docs/RRA-TESTING.md)). There is no seeded public/member account; member login needs Google OAuth or a working Resend OTP setup.

> **Public forms gate:** unless `NEXT_PUBLIC_ENABLE_LIVE_FORMS=true`, the public Player/Coach/Membership/Donation forms show a "Website Under Development" toast and do **not** submit (static release mode). Contact, equipment-order and `/verify` are not gated.

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` or `NEXTAUTH_SECRET` | Yes | NextAuth JWT secret |
| `APP_URL` | Recommended | Public base URL (verification links, metadata) |
| `NEXTAUTH_URL` | Recommended | Base URL for NextAuth |
| `NEXT_PUBLIC_ENABLE_LIVE_FORMS` | For forms | `"true"` enables public form submissions |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | For Google login | OAuth client (aliases `AUTH_GOOGLE_ID`/`SECRET` also accepted) |
| `RESEND_API_KEY` | For OTP login | Email delivery for OTP codes |
| `RESEND_FROM_EMAIL` | Optional | Verified sender (default `onboarding@resend.dev`) |
| `STORAGE_TYPE` | Optional | `local` or `netlify` (auto: `netlify` when `NETLIFY=true`) |
| `STORAGE_LOCAL_PATH` | Optional | Local storage dir (default `./uploads`) |
| `NETLIFY_BLOBS_STORE` | Optional | Blobs store name (default `rra-uploads`) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Optional | Distributed rate limiting |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Optional | Error monitoring |
| `LOG_LEVEL` | Optional | Pino level (default `debug` dev / `info` prod) |
| `DEPLOY_TARGET=docker` | Docker only | Enables standalone output |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | **Not used by code** | Present in some local `.env` files; safe to omit |

Never commit real secrets. Generate secrets with `openssl rand -base64 32` and set them only in your hosting platform's environment settings.

---

## Testing

The project currently has **no automated test framework and no test suite** (no Jest, Vitest, Playwright, or Cypress; no test files). All QA is manual:

- **Manual browser testing** — page-by-page checklists ([docs/RRA-TESTING.md](docs/RRA-TESTING.md))
- **Manual API / cURL testing** — endpoint contracts with expected errors ([docs/RRA-API.md](docs/RRA-API.md))
- **Regression checklist** — run after every phase ([docs/RRA-TESTING.md §14](docs/RRA-TESTING.md#14-regression-checklist))
- **Production smoke checklist** — run after each deploy ([docs/RRA-TESTING.md §15](docs/RRA-TESTING.md#15-production-smoke-tests))

What you can always run as checks: `npm run lint`, `npm run build`, and `npx prisma validate`.

---

## Database

- PostgreSQL + Prisma 7; table names snake_case; `cuid()` IDs
- **No migrations directory** — schema applied with `npm run db:push` (see [Quick Start](#quick-start))
- Seeding is idempotent (upserts); re-run `npm run db:seed` after schema/permission changes

### Key tables

- `users`, `roles`, `permissions`, `role_permissions`, `districts` — auth & RBAC
- `players`, `coaches`, `player_certificates`, `coach_certificates` — members
- `club_memberships`, `school_memberships`, `academy_memberships`
- `tournaments`, `tournament_registration_categories`, `tournament_registrations`
- `fixtures`, `matches` — **schema only; unused by any code** (planned Phases N/O)
- `requests`, `news`, `videos`, `galleries`, `donations`, `contact_messages`, `equipment_orders`, `audit_logs`, `settings`

---

## Tournament Pricing — Business Rule

Two different fields, two different meanings:

| Field | Meaning | Mutable? |
|---|---|---|
| `TournamentRegistrationCategory.fee` | The **current** price of a category for *future* registrations | Yes — admins can change it any time |
| `TournamentRegistration.amount` | The **price snapshot** captured for the player at the moment they registered | **No** — written once, never recomputed |

Example:

```text
Category "Senior Singles" fee = ₹500
Player A registers        → Registration A.amount = ₹500
Admin changes fee to ₹700 → audit TOURNAMENT_FEE_CHANGED {from: 500, to: 700}
Player A still owes       → ₹500   (A.amount unchanged)
Player B registers        → Registration B.amount = ₹700
```

**The future payment implementation (Phase J) MUST charge `TournamentRegistration.amount` — never the category's current `fee`.** The amount must be obtained via `getPayableRegistrationAmount()` in `src/modules/tournaments/registration.service.ts`, which refuses legacy rows with a null/invalid snapshot instead of re-pricing them.

Additional server-side guarantees already in place: the registration API accepts only `categoryId` (client-sent `amount`/`fee` are ignored), the snapshot is copied from `category.fee` inside the locked registration transaction, and a category with registrations cannot be deleted (only disabled), so historical registrations always resolve.

---

## Roles & Permissions

| Role | Access |
|------|--------|
| Super Admin | Full system access (passes every permission check) |
| Federation Admin | Federation-wide management (no user/role/settings admin) |
| District Admin | District-scoped access |
| Tournament Manager | Tournament read/manage + player read |
| Content Manager | Media/content permissions (admin pages for these are read-only) |
| Public User | Member portal only; blocked from `/admin` |

Permission slugs are `module:action`, stored in the database and checked server-side on every admin page and API. District-scoped users only see and manage their own district's data; state-wide (null-district) tournaments are federation-admin only. Roles can be edited by Super Admin at `/admin/roles` (custom roles only).

---

## API Endpoints

Full contracts: [docs/RRA-API.md](docs/RRA-API.md). Summary:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET, POST | `/api/auth/[...nextauth]` | NextAuth (credentials, Google, email-OTP) |
| POST | `/api/auth/otp/request` | Email OTP request |
| GET | `/api/csrf` | CSRF token |
| GET | `/api/health` | DB health check |
| GET | `/api/account/me` | Current user |
| GET, PATCH | `/api/account/profile` | Read / update profile |
| POST | `/api/players/register` | Player registration |
| POST | `/api/players/{id}/resubmit` | Owner resubmission |
| POST | `/api/coaches/register` | Coach registration |
| POST | `/api/coaches/{id}/resubmit` | Owner resubmission |
| POST | `/api/memberships/club` · `/school` · `/academy` | Membership applications |
| POST | `/api/memberships/{type}/{id}/resubmit` | Owner resubmission |
| POST | `/api/requests` | Service request |
| POST | `/api/tournaments/{tournamentId}/registrations` | Tournament registration (amount snapshot) |
| GET, POST | `/api/verify` | Certificate verification |
| GET | `/api/files/{...path}` | Authorised file serving |
| POST | `/api/contact` | Contact message |
| POST | `/api/donations` | Record donation pledge (no payment) |
| POST | `/api/equipment/orders` | Equipment enquiry |
| POST | `/api/admin/players/{id}/{approve\|reject\|certificate}` | Player admin actions |
| POST | `/api/admin/coaches/{id}/{approve\|reject}` | Coach admin actions |
| POST | `/api/admin/memberships/{type}/{id}/{approve\|reject}` | Membership admin actions |
| POST | `/api/admin/requests/{id}/{approve\|reject}` | Request admin actions |
| POST, PATCH | `/api/admin/tournaments…` | Tournament + category management |
| POST | `/api/admin/users/{id}/{action}` | User admin actions |
| POST, PATCH | `/api/admin/roles` | Role management |

There are no admin list/GET APIs (admin pages read via Server Components), and **no payment, receipt, notification, fixture, match, ranking, settings-write, or certificate-revocation APIs**.

---

## Security

Currently implemented and verified in code:

- **Authentication** — NextAuth JWT sessions (30 min); Google/OTP can never take over a credentials (admin) account
- **JWT session handling** — role/permissions re-read from the database at most every 60 s; inactive users are dropped
- **RBAC** — permission checks on every admin API and admin page
- **Ownership checks** — user mutations derive the owner from the session; non-owners get 404 on resubmit routes
- **District restrictions** — district-scoped admins limited to their district; state-wide tournaments federation-only
- **Server-side validation** — Zod on every JSON body; HTML-escaping and length caps via `sanitize.ts`
- **CSRF protection** — double-submit token on all mutating routes
- **Rate limiting** — 120 req/min/IP on `/api/*`, 20/min on `/login*`, per-route limits (Upstash if configured, else in-memory)
- **IDOR protection** — client-supplied ids/statuses/amounts ignored; category must belong to the path tournament
- **Secure file access** — `/api/files/*` requires a session plus ownership or module read permission in district; otherwise 404
- **Security headers** — CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy
- **Audit logging** — admin decisions, sign-ins, registrations-for-tournament, requests, resubmissions

Known security gaps are tracked in [docs/RRA-PROJECT-STATUS.md §9](docs/RRA-PROJECT-STATUS.md#9-known-limitations).

---

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Public website pages
│   ├── account/           # Member portal (login/ + (panel)/ route group)
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   └── login/             # Admin credentials login
├── modules/               # Domain logic (auth, players, tournaments, verify, …)
├── core/                  # API handler, errors, logger, monitoring
├── security/              # Auth/session, RBAC, CSRF, rate limit, sanitize
├── services/              # Audit, certificates (PDF/QR), email (OTP)
├── infrastructure/        # Prisma client, storage adapters
├── shared/                # Components, static site config, helpers
├── lib/                   # cn(), generateId(), slugify(), CSRF-aware fetch
└── types/                 # TypeScript types
prisma/
├── schema.prisma          # Database schema (no migrations dir)
└── seed.ts                # Seed data
```

---

## Scripts

Only these commands exist in `package.json`:

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies (runs `prisma generate` via postinstall) |
| `npm run dev` | Development server (`next dev --webpack`) |
| `npm run build` | Production build |
| `npm run start` | Start the production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push the schema to the database (the supported DB workflow) |
| `npm run db:seed` | Seed the database (via `tsx prisma/seed.ts`) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:migrate` | Runs `prisma migrate dev` — **note: no migration files exist in this repo** |

---

## Deployment

### Docker

```bash
docker compose up -d          # postgres + app
docker compose up --build -d  # rebuild
```

The Dockerfile targets `node:22-alpine`; `DEPLOY_TARGET=docker` enables standalone output.

### Netlify

The repo includes `netlify.toml` with `@netlify/plugin-nextjs`. Netlify runs serverless functions, so use an external PostgreSQL (local Docker will not work).

1. Build command (from `netlify.toml`): `npx prisma generate && npm run build`; Node 22
2. Set environment variables (see [Environment Variables](#environment-variables)) — including `NEXT_PUBLIC_ENABLE_LIVE_FORMS` if forms should submit
3. **Apply the schema to your production database before/with the first deploy:** there are no migrations, so use `npm run db:push` (or `npx prisma db push`) against the production `DATABASE_URL`, then `npm run db:seed` — **not** `prisma migrate deploy`
4. Certificate PDFs: `STORAGE_TYPE=netlify` (or leave unset; auto-detected on Netlify) → served via `/api/files/...`
5. Verify `/api/health` after deploy; set `SENTRY_DSN` for error monitoring

Without Upstash configured, rate limiting is in-memory per serverless instance — configure Upstash for real multi-instance production.

---

## Documentation

Full documentation lives in five files under [`docs/`](docs/):

- [docs/RRA-PROJECT-STATUS.md](docs/RRA-PROJECT-STATUS.md) — what is implemented/partial/planned, business rules, limitations, roadmap
- [docs/RRA-ARCHITECTURE.md](docs/RRA-ARCHITECTURE.md) — code structure, auth, RBAC, database, transactions, security, storage
- [docs/RRA-API.md](docs/RRA-API.md) — every HTTP endpoint with contracts
- [docs/RRA-TESTING.md](docs/RRA-TESTING.md) — setup, test accounts/data, QA, regression and smoke checklists
- [docs/RRA-CHANGELOG.md](docs/RRA-CHANGELOG.md) — history by phase

---

## Roadmap

Phases J–U are **planned and not started**. Recommended dependency order:

```text
J → K → L → M → N → O → P → Q → R → S → T → U
```

| Phase | Purpose |
|---|---|
| J — Payments | Tournament payment (charge the registration amount snapshot) |
| K — Receipts | Payment receipts / confirmations |
| L — Tournament Pass / QR | Per-registration entry pass with QR |
| M — Tournament Operations | Registration approval, withdrawal, check-in |
| N — Draws / Fixtures | Bracket generation per category |
| O — Results | Match scores and advancement |
| P — Rankings | State rankings from results |
| Q — Certificate Expansion | Coach issuance, revocation, participation/merit/membership certificates |
| R — Documents | Member document uploads |
| S — Notifications | In-app + email notifications |
| T — Reporting | Exports and reports |
| U — Production Hardening | Automated tests, migrations, pagination, monitoring, backups |

No future phase is completed. Business decisions still required (payment provider, refund policy, ranking formula, etc.) are listed in [docs/RRA-PROJECT-STATUS.md §11](docs/RRA-PROJECT-STATUS.md#11-business-decisions-required).

---

## License

Proprietary — Rajasthan Racquetball Association
