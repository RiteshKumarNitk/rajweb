# RRA Platform — Project Status

> Master document for the Rajasthan Racquetball Association (RRA) platform.
> Last full audit against the repository: **2026-09-26** (commit `80ef6bd` + Pre-Phase-J Gap Fix & Readiness changes).

Companion documents (the only five RRA docs in this repo):

| Document | Covers |
|---|---|
| **RRA-PROJECT-STATUS.md** (this file) | What exists, what is missing, business rules, roadmap |
| [RRA-ARCHITECTURE.md](RRA-ARCHITECTURE.md) | Code structure, auth, RBAC, database, transactions, security, storage |
| [RRA-API.md](RRA-API.md) | Every HTTP endpoint with contracts |
| [RRA-TESTING.md](RRA-TESTING.md) | Setup, test accounts, test data, QA checklists, regression, smoke tests |
| [RRA-CHANGELOG.md](RRA-CHANGELOG.md) | Chronological history by phase |

---

## 1. Document Purpose

- **Purpose:** give a developer, administrator, or AI coding agent a complete picture of the platform without reverse-engineering the code.
- **Source of truth:** the repository — `prisma/schema.prisma`, `src/`, `prisma/seed.ts`, config files. Where this document and the code disagree, the code wins and this document must be fixed.
- **How status was determined:** each module was checked for (a) a database model, (b) a service/API that writes it, (c) a UI that exercises it, and (d) authorization. A module is **IMPLEMENTED** only when all relevant layers exist.
- **Status vocabulary used throughout:**

| Status | Meaning |
|---|---|
| IMPLEMENTED | Model + API/service + UI + authorization exist and work together |
| PARTIALLY IMPLEMENTED | Some layers exist (e.g. schema only, read-only UI, backend without UI) |
| PLANNED | Agreed future work; no working code |
| NOT IMPLEMENTED | Not present and not yet scheduled |
| BLOCKED | Cannot start until a dependency or decision lands |
| NEEDS DECISION | Requires a business decision before it can be built |

Phase letters (A–U) are the project's own delivery labels. Phases A–I were delivered before the current git history began (the first commit, `0f0a4f2` on 2026-09-24, already contains them), so exact per-phase dates are **not confirmed** — see [RRA-CHANGELOG.md](RRA-CHANGELOG.md).

---

## 2. Project Overview

The RRA platform is a single Next.js application serving three audiences:

| Surface | Path prefix | Audience | Status |
|---|---|---|---|
| Public website | `/` (route group `(public)`) | Anyone | IMPLEMENTED |
| User (member) portal | `/account/*` | Signed-in public users (Google or email OTP) | IMPLEMENTED (some sections read-only/placeholder, see §5.3) |
| Admin portal | `/admin/*` | Staff with a non-`public-user` role | IMPLEMENTED (some pages read-only, see §5.12) |

Functional scope actually present in code:

- **Federation content:** about, executive committee, districts, rules, governance (RTI, anti-doping, privacy), resources, media (news/videos/gallery), contact, donations, equipment enquiries.
- **Member registration:** Player and Coach registration; Club, School and Academy memberships — each with admin approval/rejection and user resubmission.
- **Service requests:** registered Players/Coaches can raise change requests (contact, address, district, etc.) that admins approve or reject.
- **Tournaments:** admin creation/editing with fee-bearing registration categories; public listing; player self-registration with price snapshot and capacity control.
- **Certificates:** admin issuance of Player registration certificates (PDF + QR); public and in-portal verification.
- **RBAC:** data-driven roles and permissions, district scoping, per-user federation-wide flag, Super Admin role editor.
- **Audit logging** of admin decisions, logins, and key user actions.

**Not present:** online payments (equipment or tournament — equipment orders stay `PENDING_PAYMENT` with fail-closed verification), receipts, tournament passes/QR entry, draws/fixtures/results (schema only), rankings, notifications backend, reporting, membership renewal workflow. See §9–§10.

**New database-driven modules (2026-09-26, scoped to repeating business/content collections only):** the equipment shop (public catalog `/equipment`, authenticated purchase with atomic stock reservation and price snapshots, `/account/orders` + `/account/equipment`, admin catalog/orders), the contact inbox (`/admin/contact`; form submissions email the configured Super Admin address via Resend with visitor confirmation), and admin-managed YouTube videos (`/admin/media/videos` → public `/media/videos`). Committee, history, stats, news, partners and other one-off prose remain static in code by design.

---

## 3. Technology Stack

All values confirmed from `package.json`, config files, and imports.

| Layer | Technology (version from `package.json`) |
|---|---|
| Framework | Next.js **16.2.9** (App Router), `next dev --webpack` for dev |
| UI runtime | React **19.2.4**, TypeScript 5 |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`), Radix UI primitives, `class-variance-authority`, `tailwind-merge`, Lucide icons, Framer Motion |
| Forms / validation | React Hook Form + `@hookform/resolvers`, **Zod 4** (client and server) |
| Client state | Zustand (dependency present) |
| Toasts | Sonner |
| Auth | NextAuth (Auth.js) **v5 beta** — JWT sessions; Credentials, Google, and email-OTP providers |
| ORM / DB | Prisma **7.8** with `@prisma/adapter-pg` over `pg` Pool → **PostgreSQL** (docker-compose uses `postgres:16-alpine`) |
| Password / OTP hashing | `bcryptjs` |
| Email | **Resend** (OTP emails) |
| PDF / QR | PDFKit, `qrcode` |
| File storage | Local filesystem (`./uploads`) or **Netlify Blobs** (`@netlify/blobs`) |
| Rate limiting | `@upstash/ratelimit` + `@upstash/redis` when configured; in-memory fallback |
| Logging | Pino (`pino-pretty` in dev) |
| Monitoring | Sentry (`@sentry/nextjs`) — active only when DSN env vars are set |
| Deployment | **Netlify** (`netlify.toml`, `@netlify/plugin-nextjs`, Node 22). **Docker** (`Dockerfile` on `node:22-alpine`, `docker-compose.yml`) also supported via `DEPLOY_TARGET=docker` → `output: "standalone"` |
| Tests | **No automated test framework** is installed (no Jest/Vitest/Playwright). QA is manual — see [RRA-TESTING.md](RRA-TESTING.md) |

`jsonwebtoken`, `uuid`, `date-fns` are dependencies; `RefreshToken` exists in the schema but no code issues refresh tokens (NextAuth JWT is used instead).

---

## 4. Current Completion Status

| Phase | Module | Status | Details |
|---|---|---|---|
| Foundation | Public website | IMPLEMENTED | ~30 public pages. Public forms are **gated by `NEXT_PUBLIC_ENABLE_LIVE_FORMS`**: unless it equals `"true"`, public registration/membership/donation forms show a "Coming Soon" toast instead of submitting ("static release mode"). |
| Foundation | Admin auth, RBAC, audit, districts | IMPLEMENTED | Credentials login at `/login`; 6 seeded system roles; 33 districts seeded. |
| A | User portal & public-user auth | IMPLEMENTED | Google OAuth + email OTP at `/account/login`; dashboard, profile (with completion %), settings. |
| B | Player registration | IMPLEMENTED | Public and in-portal registration, linked to the user when signed in. |
| C | Coach registration | IMPLEMENTED | Same pattern as Player. |
| D | Memberships (Club/School/Academy) | IMPLEMENTED (new applications only) | Apply, review, resubmit. New vs renewal **prices are displayed** from `Setting`; **no renewal workflow and no payment.** |
| E | Application approval (admin) | IMPLEMENTED | Unified `/admin/applications` queue + per-type detail pages; approve/reject with reason; concurrency-safe. |
| F | Resubmission | IMPLEMENTED | Owner can correct and resubmit a REJECTED Player/Coach/Membership in place. History timeline from audit log. |
| G | Requests | IMPLEMENTED | 8 request types; 3 auto-apply on approval, 5 informational. |
| H | Tournament management | IMPLEMENTED | Create/edit, statuses, dates in IST, registration window, capacity, poster URL, eligibility flag, fee-bearing categories. |
| I | Tournament registration | IMPLEMENTED | Locked transaction, duplicate/capacity checks, immutable `amount` price snapshot, audit. Registrations stay `PENDING` — no admin approve/reject API for registrations. |
| Pre-J | Gap fix & readiness | IMPLEMENTED | Equipment-orders RBAC, authorised file access, server-enforced rejection reasons, public-form field clean-up, coach level mapping fix, request value validation, legacy-amount guard. See §13. |
| — | Operational ownership | IMPLEMENTED | Requests, tournaments, registrations, certificates, signatories, equipment items and orders all scoped Super Admin → State → District; per-tournament signatories and certificates; district equipment stores. See §15. |
| — | Multi-state hierarchy | IMPLEMENTED | Super Admin → State → District → members. `State` model, State Admin role, server-side State/District scope on every admin list, detail and action, Super Admin state filter, `/admin/states`, district add/edit/reorder, State + District selection on registration forms. See §14. |
| I.5 | Performance | IMPLEMENTED | Public tournament caching + tag revalidation, JWT auth refresh throttled to 60 s, loading skeletons, `select`-narrowed queries, list caps. No measured benchmarks recorded. |
| — | UI refresh (post-I) | IMPLEMENTED | Account and admin UI redesign, in-portal verify, official certificate renderer, sample championship certificates (commits 2026-09-25/26). |
| J | Tournament payment | NOT STARTED | No payment provider, model, or API. |
| K | Receipt / confirmation | NOT STARTED | |
| L | Tournament pass / QR | NOT STARTED | |
| M | Tournament operations | NOT STARTED | No registration approval, check-in, withdrawals, refunds. |
| N | Draws / fixtures | NOT STARTED (schema only) | `Fixture` model exists; unused by any code. |
| O | Match results | NOT STARTED (schema only) | `Match` model exists; unused by any code. |
| P | Rankings | NOT STARTED | NEEDS DECISION on formula. |
| Q | Certificates (expansion) | PARTIALLY IMPLEMENTED | Registration certificates **and tournament certificates** (per-tournament title/logo/signatories, COMPLETED-only, scope-checked) are implemented with public verification — see §15. Still missing: coach certificate route, revocation, membership certificates, merit rules. Sample championship certificates remain static demo data. |
| R | Documents | PARTIALLY IMPLEMENTED | `/account/documents` lists issued certificate PDFs only. No document upload. |
| S | Notifications | NOT STARTED | Bell icon is a UI shell; no model/backend. |
| T | Reporting | NOT STARTED | Only dashboard counters. |
| U | Production hardening | NOT STARTED | No automated tests, no Prisma migrations folder (`db push` is used), see §9. |

---

## 5. Completed Modules — Detailed

### 5.1 Public Website — IMPLEMENTED

Routes (all under `src/app/(public)/`):

| Area | Routes |
|---|---|
| Home | `/` (hero slider, about, president message, stats, news, partners) |
| About | `/about/history`, `/about/executive-committee`, `/about/racquetball`, `/about/rules-policies`, `/districts` |
| Membership | `/membership/club`, `/membership/school`, `/membership/academy` |
| Registration | `/register/player`, `/register/coach` |
| Tournaments | `/tournaments`, `/tournaments/[slug]` |
| Media | `/media/news`, `/media/videos`, `/media/gallery` |
| Resources | `/resources/equipment` (includes equipment order form), `/resources/court-specifications`, `/resources/physio-partners` |
| Governance | `/governance/rti`, `/governance/anti-doping`, `/governance/privacy-policy`, `/privacy` |
| Other | `/contact`, `/donations`, `/verify` |
| SEO | `robots.ts`, `sitemap.ts`, JSON-LD component |

Behaviour:

- Much of the content (executive committee, hero slides, tournament event posters, partners, images) is **static configuration** in `src/shared/config/site.ts`, not database-driven. Image paths live under `public/images/` (see [RRA-ARCHITECTURE.md → Static Assets](RRA-ARCHITECTURE.md#15-static-assets)).
- `/tournaments` shows the static `tournamentEvents` from `site.ts` **plus** database tournaments in public statuses (`REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, `IN_PROGRESS`, `COMPLETED`). `DRAFT` and `CANCELLED` are hidden. Pages use ISR (`revalidate = 60`) plus tag invalidation on admin edits.
- `/tournaments/[slug]` shows details, active categories with fees, and a link into the account portal to register.
- **Form fields match the data model (fixed Pre-J):** public forms no longer collect fields the API cannot store (Aadhaar, club/affiliated club, experience years, established year, board affiliation, sports incharge, player capacity, academy certification level, additional info, PAN). Coach experience belongs in the "Qualifications & Experience" text. Donation `purpose` is kept by prefixing it to `message`. No form uploads a photo.
- **Static release mode:** Player, Coach, Club, School, Academy and Donation forms call `blockSubmitForStaticRelease()`; unless `NEXT_PUBLIC_ENABLE_LIVE_FORMS === "true"` they show a "Website Under Development" toast and do **not** submit. News also skips the database in this mode. The Contact form, equipment order form and `/verify` are not gated.
- Public submissions (when live) are anonymous unless the visitor is signed in, in which case the record is linked to their user.
- Public vs authenticated: no public page requires login. The header shows a user icon linking to the portal.

### 5.2 Authentication — IMPLEMENTED

Two separate login surfaces:

| Surface | Route | Providers | Intended users |
|---|---|---|---|
| Admin login | `/login` | NextAuth Credentials (email + bcrypt password) | Staff accounts (`authProvider = CREDENTIALS`) |
| Member login | `/account/login` | Google OAuth (`google`), email OTP (`email-otp`) | Public users |

- **Session:** NextAuth JWT, `maxAge` 30 minutes. The JWT carries `id, role (slug), permissions[], districtId, isFederationWide, isActive`. These are re-read from the database on sign-in and then **at most every 60 s** (`authCheckedAt`).
- **Google:** on sign-in, `findOrCreatePublicUser` creates a `public-user` account or updates name/avatar/googleId. If the email already belongs to a `CREDENTIALS` (admin) account, sign-in is refused (`error=account_exists_with_password`). Inactive users are refused.
- **Email OTP:** `POST /api/auth/otp/request` sends a 6-digit code (bcrypt-hashed in `EmailOtp`, 10-minute TTL, max 5 attempts per code, 3 requests per email per 10 min, 10 per IP per 10 min). Response is always generic. Sign-in uses `signIn("email-otp", {email, otp})`.
- **Logout:** NextAuth `signOut` (header menu, `/account/settings` sign-out button). No explicit LOGOUT audit event is written.
- **Protected routes (middleware):** `/admin/*` without a session → `/login?callbackUrl=…`; session with role `public-user` → redirected to `/`. `/account/*` (except `/account/login`) without session → `/account/login?callbackUrl=…`. `/account` redirects to `/account/dashboard`.
- **Audit:** `LOGIN` on every fresh sign-in (module `auth`), `CREATE` (module `users`) when a public user is first created.

### 5.3 User Portal — IMPLEMENTED (mixed depth)

Layout `src/app/account/(panel)/layout.tsx` with a sidebar nav.

| Route | Status | What it does |
|---|---|---|
| `/account` | IMPLEMENTED | Redirects to `/account/dashboard` |
| `/account/dashboard` | IMPLEMENTED | Welcome, profile completion, Player/Coach/Membership status cards, recent activity from audit log, upcoming tournaments |
| `/account/profile` | IMPLEMENTED | Edit name, phone, DOB, gender, address, city, state, country, pincode via `PATCH /api/account/profile`; completion % |
| `/account/settings` | IMPLEMENTED | Account info and sign-out |
| `/account/applications` | IMPLEMENTED (read-only) | Lists the user's Player, Coach and membership applications and their statuses |
| `/account/player` | IMPLEMENTED | Register (if none), view status, rejection reason, resubmit when REJECTED, history timeline, requests panel, latest certificate |
| `/account/coach` | IMPLEMENTED | Same as Player |
| `/account/memberships` | IMPLEMENTED | Overview of Club/School/Academy with New and Renewal prices from settings |
| `/account/memberships/club` · `/school` · `/academy` | IMPLEMENTED | Apply / view status / resubmit when REJECTED |
| `/account/tournaments` | IMPLEMENTED | Upcoming tournaments (`REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, `IN_PROGRESS`) with category fees, plus "My registrations" showing snapshot `amount` and status |
| `/account/tournaments/[tournamentId]` | IMPLEMENTED | Tournament detail and category registration form; 404 for DRAFT/CANCELLED |
| `/account/certificates` | IMPLEMENTED (read-only) | Non-revoked Player/Coach certificates with PDF links |
| `/account/documents` | PARTIALLY IMPLEMENTED | Lists certificate PDFs only; no uploads, receipts, or other documents |
| `/account/verify` | IMPLEMENTED | In-portal certificate verification (same service as `/verify`) |
| Notifications (bell in navbar) | NOT IMPLEMENTED | UI shell only: always "No notifications yet." There is **no** `/account/notifications` route. |

### 5.4 Player — IMPLEMENTED

**Model:** `Player` (see [RRA-ARCHITECTURE.md → Database](RRA-ARCHITECTURE.md#7-database-architecture)). Business ID `playerId` = `PLR-<base36 timestamp>-<4 random>`.

**Lifecycle**

```text
           register (public or /account/player)
                      │
                      ▼
                  PENDING ───── admin approve ─────► APPROVED ──► certificate can be issued
                      │                                     (approvedAt, approvedBy set)
                admin reject (reason)
                      ▼
                  REJECTED ── owner resubmits (corrected data) ──► PENDING (same row, same playerId)
```

`EXPIRED` exists in the `ApprovalStatus` enum but **no code sets it**; `expiresAt` is never written for players.

- **Registration:** `POST /api/players/register`. Fields: name, dateOfBirth, gender, email, mobile, district (name, case-insensitive match), optional category. Status `PENDING`. If signed in, `userId` is linked and a second registration for the same user is refused (409). Anonymous registrations are unlinked and cannot be resubmitted or used for tournaments.
- **Approval / rejection:** `POST /api/admin/players/{id}/approve|reject` — permission `players:approve`, State/District-scoped (out-of-scope → 404). Only a `PENDING` row can change (`updateMany … where status = PENDING`), so double-clicks/concurrent admins get **409**. Reject **requires** a non-empty `reason` (≤ 1000 chars) — enforced by the API (400) since Pre-J; the review page and the players table both collect one.
- **Resubmission:** `POST /api/players/{id}/resubmit` — owner only (else 404), only from `REJECTED` (else 409). Updates in place, clears reason/approval fields, back to `PENDING`.
- **Requests:** an owner with a linked Player can raise requests (§5.8).
- **Tournaments:** Player is required to register for any tournament; `APPROVED` required when `requiresApprovedPlayer` (default true).
- **Certificates:** `POST /api/admin/players/{id}/certificate` (needs `players:approve` **and** `certificates:issue`); player must be `APPROVED`; one non-revoked certificate per player.
- **Audit:** `APPROVE`/`REJECT` (module `players`), `UPDATE` with `event: APPLICATION_RESUBMITTED`, certificate `CREATE` (module `certificates`). Registration itself is **not** audited.
- **Known limitations:** `photo` column unused (no upload — belongs to Phase R); no expiry (`EXPIRED` enum value left in place, validity period NEEDS BUSINESS DECISION); no admin edit of player data; no duplicate detection for anonymous registrations.

### 5.5 Coach — IMPLEMENTED

Identical lifecycle to Player. Differences:

- Fields: name, email, mobile, qualification, `certificationLevel` (`LEVEL_1`, `LEVEL_2`, `LEVEL_3`, `INTERNATIONAL`), district. Business ID prefix `CCH`.
- APIs: `POST /api/coaches/register`, `POST /api/admin/coaches/{id}/approve|reject` (`coaches:approve`, reason required on reject), `POST /api/coaches/{id}/resubmit`.
- **Fixed Pre-J:** the public coach form sent option values (`"Level 3"`, `"International"`) that did not match its mapping table, so every public coach was stored as `LEVEL_1`; an "Applying for Certification" option also silently became `LEVEL_1`. The form now sends the enum values directly and the misleading option is removed. Coaches registered through the public form before this fix may have a wrong `certificationLevel` — NEEDS ADMIN REVIEW (no data was changed automatically). The portal coach form was never affected.
- **Certificates:** `issueCoachCertificate()` exists in `certificate-service.ts` but **no route or UI calls it** → coach certificate issuance is NOT IMPLEMENTED end-to-end. Seeded coach `CCH-TEST-001` has a certificate for verification tests.

### 5.6 Membership (Club / School / Academy) — IMPLEMENTED for new applications

| Type | Model | ID prefix | Type-specific fields |
|---|---|---|---|
| Club | `ClubMembership` | `CLB` | clubName, contactPerson, numberOfCourts, facilities (unused by forms) |
| School | `SchoolMembership` | `SCH` | schoolName, principalName, studentCount |
| Academy | `AcademyMembership` | `ACD` | academyName, directorName, coachCount |

- Common: email, mobile, address, district, status (`MembershipStatus`: `PENDING, APPROVED, REJECTED, ACTIVE, EXPIRED, SUSPENDED`), approval fields, `rejectionReason`, `expiresAt`, `certificatePath`.
- One application per user per type (`userId @unique` + 409 check).
- Review: `POST /api/admin/memberships/{club|school|academy}/{id}/approve|reject` (`memberships:approve`, State/District-scoped, PENDING-only guard, reason required on reject).
- Resubmit: `POST /api/memberships/{type}/{id}/resubmit` (owner, REJECTED only).
- **Pricing (display only):** read from `Setting` rows (group `membership`) by `getMembershipPricing()`:

| Type | New (₹) | Renewal (₹) | Setting keys |
|---|---|---|---|
| Club | 51,000 | 21,000 | `membership_fee_club_new` / `_renewal` |
| School | 31,000 | 11,000 | `membership_fee_school_new` / `_renewal` |
| Academy | 21,000 | 5,100 | `membership_fee_academy_new` / `_renewal` |

(Values from `prisma/seed.ts`; missing rows default to 0.) `/admin/settings` is **read-only**, so prices change only via database/seed.

- **Not implemented:** renewal application flow, payment, `ACTIVE`/`EXPIRED`/`SUSPENDED` transitions (never set by code), membership certificate generation (`certificatePath` never written), expiry.

### 5.7 Applications (Admin Review) & Resubmission — IMPLEMENTED

- `/admin/applications` — unified queue of Player, Coach, Club, School, Academy applications (up to 100 each), filtered by the viewer's read permissions and district.
- `/admin/applications/[type]/[id]` — detail with approve/reject actions (reject requires a reason, enforced server-side) and the history timeline. Records outside the admin's district return 404.
- **Concurrency:** every approve/reject/resubmit uses a conditional `updateMany` on the expected current status; losers get 409 "already been processed" / "not in a rejected state".
- **History:** `getApplicationHistory()` builds "Application submitted → Rejected (reason) → Corrected and resubmitted → Approved" from `AuditLog` rows (no separate history table).
- **Audit events:** `APPROVE`, `REJECT` (with `reason`), `UPDATE` + `event: APPLICATION_RESUBMITTED`.

### 5.8 Requests — IMPLEMENTED

A `Request` is raised by an owner of an existing Player or Coach record (not for memberships).

| Type | Structured field | On approval |
|---|---|---|
| `CONTACT_UPDATE` | `requestedMobile`, `requestedEmail` | **Auto-applied** to Player/Coach `mobile`/`email` |
| `DISTRICT_CHANGE` | `requestedDistrict` (name → `requestedDistrictId`, required) | **Auto-applied** to Player/Coach `districtId` |
| `ADDRESS_UPDATE` | `requestedAddress` | **Auto-applied** to the user's `UserProfile.address` (upsert) |
| `PROFILE_CORRECTION` | `currentValue` / `requestedValue` | Informational — status only |
| `CERTIFICATE_REQUEST` | — | Informational |
| `CERTIFICATE_CORRECTION` | `currentValue` / `requestedValue` | Informational |
| `DOCUMENT_UPDATE` | `currentValue` / `requestedValue` | Informational |
| `OTHER` | `currentValue` / `requestedValue` | Informational |

- Create: `POST /api/requests` with `profileType: "player" | "coach"`; the profile is resolved from the session (never from client IDs). `reason` 10–1000 chars. Number `REQ-…`.
- One `PENDING` request per type per profile (409 otherwise).
- `CONTACT_UPDATE` must include a new mobile or email and `ADDRESS_UPDATE` a new address (400 otherwise) — added Pre-J so an approval can never be a silent no-op.
- Admin: `/admin/requests`, `/admin/requests/[id]`; `POST /api/admin/requests/{id}/approve` (optional `remarks`) or `/reject` (reason **required**, 400 otherwise). Permission `requests:approve`; district scope from the linked Player/Coach. Approval + auto-apply run in one transaction.
- Audit: `CREATE` `REQUEST_CREATED`, `APPROVE` `REQUEST_APPROVED`, `REJECT` `REQUEST_REJECTED` (module `requests`).
- Limitations: no document attachments; informational approvals require manual follow-up; no user notification.

### 5.9 Tournament Management — IMPLEMENTED

Admin routes: `/admin/tournaments` (list + "Add Tournament" modal), `/admin/tournaments/[id]` (edit form, categories manager, registrations table).

| Field | Notes |
|---|---|
| `name`, `slug` | Slug auto-generated and made unique (`-1`, `-2`…) |
| `description` | ≤ 2000 chars, HTML-escaped |
| `category` | `JUNIOR`, `SENIOR`, `OPEN`, `PROFESSIONAL` — whole-tournament classification, **not** the purchasable categories |
| `status` | `DRAFT` (default), `REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` — set manually by admins; no automatic transitions |
| `districtId` | Null = state-wide (federation-managed). District admins can only create/manage in their own district and cannot change it |
| `venue`, `city` | Optional |
| `startDate`, `endDate`, `registrationStart`, `registrationDeadline` | Admin `datetime-local` values are interpreted as **IST**; `YYYY-MM-DD` as UTC midnight (legacy). Rule: regStart < regEnd < start ≤ end (bounds optional) |
| `maxParticipants` | Optional capacity (1–10000); counts PENDING+APPROVED registrations |
| `banner` | **Poster URL** (Google Drive link per client requirement), must be http(s); not an upload |
| `contactName/Phone/Email` | Optional |
| `requiresApprovedPlayer` | Default `true` — eligibility gate |

**Registration categories** (`TournamentRegistrationCategory`): name, `type` (`SINGLES`/`DOUBLES`), integer `fee` (₹, 0–1,000,000), `isActive`.
- Type cannot change once registrations exist.
- DELETE removes an unused category, or **disables** it (`isActive=false`) if any registration references it.

Visibility: public site hides `DRAFT`/`CANCELLED`; account portal lists `REGISTRATION_OPEN`/`REGISTRATION_CLOSED`/`IN_PROGRESS`. Every admin write calls `revalidatePublicTournaments()`.

Audit events (module `tournaments`): `TOURNAMENT_CREATED`, `TOURNAMENT_UPDATED`, `TOURNAMENT_STATUS_CHANGED` (from/to), `TOURNAMENT_CATEGORY_CREATED`, `TOURNAMENT_CATEGORY_UPDATED`, `TOURNAMENT_FEE_CHANGED` (from/to), `TOURNAMENT_CATEGORY_DISABLED`, `TOURNAMENT_CATEGORY_DELETED`.

### 5.10 Tournament Registration (Phase I) — IMPLEMENTED

Endpoint: `POST /api/tournaments/{tournamentId}/registrations` with body `{ "categoryId": "…" }`. UI: `/account/tournaments/[tournamentId]`.

Checks, in order, inside one transaction holding `SELECT … FOR UPDATE` on the tournament row:

1. Tournament exists (404).
2. `status === REGISTRATION_OPEN` (400).
3. Now ≥ `registrationStart` (400 "has not started yet") and ≤ `registrationDeadline` (400 "closed").
4. Caller has a linked Player (400 "must register as a player").
5. If `requiresApprovedPlayer`, Player is `APPROVED` (400).
6. Category belongs to this tournament and `isActive` (400).
7. No existing registration for (tournament, player) (409 — "already registered for this category/tournament").
8. Capacity: PENDING+APPROVED count < `maxParticipants` (400 "capacity has been reached").
9. Insert with `amount = category.fee`, `status = PENDING`; write audit `TOURNAMENT_REGISTRATION_CREATED` in the same transaction.

Rules: **one registration per player per tournament** (DB unique `(tournamentId, playerId)`), i.e. a player cannot enter two categories of the same tournament. A P2002 unique violation from a race is mapped to 409.

Not implemented: registration approval/rejection by admins, withdrawal/cancellation, doubles partner selection, payment. `seed` column unused.

**Legacy null amounts:** `amount` is nullable. Every registration created through the current API has an amount, but rows created before the snapshot existed may not. `getPayableRegistrationAmount()` in `registration.service.ts` refuses such rows (400, "cannot be paid online") and never re-prices them. The admin registrations table labels them **"Legacy · no amount"**, and the member sees "Not on record — contact RRA". Phase J must call this guard.

### 5.11 Certificates & Verification — PARTIALLY IMPLEMENTED

- **Issue (Player):** admin `/admin/certificates` → "Issue Certificate" modal (or player action) → `POST /api/admin/players/{id}/certificate`. Optional custom `certificateNumber`, `issuedAt`, `expiresAt`; otherwise `CERT-…`. Generates QR (`QR-…`), renders an A4-landscape PDF with PDFKit, uploads to storage (`certificates/<number>.pdf`), creates `PlayerCertificate`.
- **Verify:** `/verify` (public) and `/account/verify` use `GET|POST /api/verify`. Lookup order: hard-coded sample championship certificates (`verify.types.ts`) → certificate number → Player/Coach business ID → QR code → candidate name (+ district, father's name). Revoked certificates are excluded.
- **Sample championship certificates** and the official signatories list are **static constants** used for demonstration; they are not database records. Status: NEEDS CONFIRMATION whether these should remain in production.
- Not implemented: coach issuance route, revocation UI/API, membership certificates, tournament participation/merit certificates from real results.

### 5.12 Admin Portal — IMPLEMENTED (mixed depth)

| Route | Permission | Capability |
|---|---|---|
| `/admin` | any admin | Command-center dashboard with counts and recent audit activity |
| `/admin/applications`, `/[type]/[id]` | any of players/coaches/memberships `:read` | Review queue (write needs `:approve`) |
| `/admin/requests`, `/[id]` | `requests:view` | Review requests (write needs `requests:approve`) |
| `/admin/players` | `players:read` | List (≤ 200), approve/reject/issue certificate |
| `/admin/coaches` | `coaches:read` | List (≤ 200), approve/reject |
| `/admin/memberships` | `memberships:read` | Club/School/Academy tabs (≤ 200 each), approve/reject |
| `/admin/districts` | `districts:read` | **Read-only** list |
| `/admin/tournaments`, `/[id]` | `tournaments:read` | Full management with `tournaments:manage` |
| `/admin/certificates` | `certificates:read` | List (≤ 50 each) + issue player certificate |
| `/admin/equipment-orders` | `equipment:read` (added Pre-J) | Read-only list of equipment enquiries; state/district-scoped users see only enquiries naming a district in their scope |
| `/admin/media` | `media:read` | **Read-only** lists of news/videos/galleries (summary overview) |
| `/admin/media/gallery` | `media:read` | **Gallery management** — add/edit/delete items, set each item's optional Google Drive URL, activate/deactivate, change sort order (writes need `media:manage`) |
| `/admin/contact` (+`/[id]`) | `contact:read` | **Contact inbox** — full message, status transitions (NEW/READ/REPLIED/CLOSED), delete (writes need `contact:manage`); form submissions email the configured Super Admin address |
| `/admin/equipment` | `equipment:read` | **Equipment catalog management** — CRUD, price/stock/image/category, activate/deactivate, archive-on-delete when purchased (writes need `equipment:manage`) |
| `/admin/equipment/orders` | `equipment:read` | **Equipment orders** — customer, items, amounts, payment status; fulfilment-status updates (`equipment:manage`): pending → cancelled, paid ⇄ completed; unpaid orders can be neither paid nor completed here |
| `/admin/media/videos` | `media:read` | **YouTube video management** — CRUD with server-side URL/ID validation, ordering, activate/deactivate (writes need `videos:manage`) |
| `/admin/users` | `users:read` | List (≤ 200); activate/deactivate, assign role, assign/remove district, toggle federation-wide (`users:update`) |
| `/admin/roles` | `roles:read` | Create custom roles and edit permissions of non-system roles (`roles:manage`) |
| `/admin/audit-logs` | `audit:read` | Latest 200 entries |
| `/admin/settings` | `settings:manage` | **Read-only** view of `Setting` rows |
| `/admin/contact` (+`/[id]`) | `contact:read` | **Contact inbox** — list, full message, status transitions (NEW/READ/REPLIED/CLOSED), delete (writes need `contact:manage`) |
| `/admin/equipment` | `equipment:read` | **Equipment catalog management** — CRUD, price/stock/image/category, activate/deactivate, archive-on-delete when purchased (writes need `equipment:manage`) |
| `/admin/equipment/orders` | `equipment:read` | **Equipment orders** — customer, items, amounts, payment status; fulfilment-status updates (`equipment:manage`): pending → cancelled, paid ⇄ completed; unpaid orders can be neither paid nor completed here |
| `/admin/media/videos` | `media:read` | **YouTube video management** — CRUD with server-side URL/ID validation, ordering, activate/deactivate (writes need `videos:manage`) |

Contact messages and donations are stored but have **no admin page**.

---

## 6. Tournament Pricing — Business Rule

**Two different numbers, two different meanings:**

| Field | Meaning | Mutable? |
|---|---|---|
| `TournamentRegistrationCategory.fee` | The **current** price of a category for *future* registrations | Yes — admins can change it any time |
| `TournamentRegistration.amount` | The price the player was charged **at the moment they registered** (snapshot) | **No** — written once, never recomputed |

**Example**

```text
Category "Senior Singles" fee = ₹500
Player A registers        → Registration A.amount = ₹500
Admin changes fee to ₹700 → audit TOURNAMENT_FEE_CHANGED {from: 500, to: 700}
Player A still owes       → ₹500   (A.amount unchanged)
Player B registers        → Registration B.amount = ₹700
```

**Why it exists:** a player agrees to a price when they register. A later price change (correction, early-bird ending, etc.) must not silently change what an existing registrant owes or has paid, and financial history must stay reproducible.

**How the API enforces it:**

- The request body accepts **only** `categoryId`. Any `amount`/`fee` sent by a client is ignored by the Zod schema.
- `amount` is copied from `category.fee` inside the same locked transaction that validates the category, so the value cannot be stale or spoofed.
- `updateRegistrationCategory()` updates only the category row; it never touches registrations.
- A category with registrations cannot be deleted (only disabled), so `categoryId` on historical registrations always resolves.

**How the UI shows it:**

- Tournament listings and detail pages show the **current** `fee` of each active category.
- "My registrations" (`/account/tournaments`) and the admin registrations table (`/admin/tournaments/[id]`) show the **snapshot** `amount` (or "N/A"/"—" if null).

**Rule for Phase J (payment):** the amount to charge/collect for a registration **must** be `TournamentRegistration.amount`, never the category's current `fee`, and must be obtained through `getPayableRegistrationAmount()`, which refuses null/invalid amounts with a clear server error (see §5.10).

---

## 7. Security Summary

Confirmed in code (details in [RRA-ARCHITECTURE.md → Security](RRA-ARCHITECTURE.md#10-security-architecture)):

| Control | Implementation |
|---|---|
| Authentication | NextAuth JWT (30 min); inactive users rejected; role/permissions refreshed from DB ≤ 60 s |
| Session ownership | User-facing mutations derive the owner from the session (`requireAuth`), never from client-supplied user IDs; resubmit routes return 404 for non-owners |
| RBAC | Permission slugs checked server-side in every admin API (`requirePermission`) and page (`requireAdminScope`), including `/admin/equipment-orders` (`equipment:read`) |
| State / District restriction | `org-scope.ts`: GLOBAL (Super Admin, federation-wide flag) / STATE (`User.stateId`) / DISTRICT (`User.districtId`) / NONE. All admin queries use scope where-builders; every record action uses `assertInScope`, which answers **404** for another state's or district's record (no IDOR oracle). A Super Admin state filter is display-only |
| Validation | Zod on every JSON body; text HTML-escaped and length-capped via `sanitize.ts` |
| CSRF | Double-submit token (`csrf_token` httpOnly SameSite=Strict cookie + `x-csrf-token` header) on every mutating route that sets `requireCsrf` — all mutating custom routes do. NextAuth's own routes use NextAuth's CSRF |
| Rate limiting | Middleware: 120 req/min/IP on `/api/*`, 20/min on `/login*`; per-route limits (e.g. registrations 20/min, OTP 10/10 min/IP + 3/10 min/email). Upstash if configured, else in-memory (per instance) |
| IDOR | Ownership checks on resubmit; district checks on admin actions; tournament category must belong to the path tournament |
| Client-controlled values | Registration `amount`, `status`, `approvedBy`, `userId`, `playerId` are never accepted from clients |
| Headers | CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy (middleware + `next.config.ts`) |
| Stored files | `/api/files/*` requires a session and serves a file only if it belongs to a certificate/membership record the caller owns, or the caller has the module's read permission for that district; otherwise 404. `Cache-Control: private, no-store` |
| Sensitive data | Passwords and OTPs bcrypt-hashed; OTP never logged; OTP request response does not reveal account existence; Aadhaar/PAN no longer collected by any form |
| Audit | See [RRA-ARCHITECTURE.md → Audit](RRA-ARCHITECTURE.md#11-audit-architecture) |

Gaps are listed in §9.

---

## 8. Performance

Work actually present (Phase I.5, commit `4082c58` and follow-ups):

| Area | What was done |
|---|---|
| Caching | Public tournament list/detail cached with `unstable_cache` (60 s, tag `public-tournaments`) + page ISR `revalidate = 60`; admin writes call `revalidateTag` / `revalidatePath` |
| Session DB load | JWT callback refreshes role/permissions at most every 60 s instead of on every request; `getSession`/`getCurrentUser` wrapped in React `cache()` per request |
| Middleware | Public pages skip all async work (only headers); token lookup only for `/admin`, `/account`, `/api`, `/login` |
| Query shaping | `select` narrowing on public tournament queries and `/api/account/me`; `Promise.all` for parallel page queries |
| N+1 avoidance | Relations loaded via `include`/`select` and `_count` rather than per-row queries |
| Indexes | `@@index` on status/district/user/module/createdAt columns (see Architecture §7) |
| List caps | Admin lists use `take` limits (100–200; audit 200; certificates 50). **No real pagination** (no page/offset UI) |
| Loading states | `loading.tsx` skeletons for public, account panel, account dashboard/profile, admin |
| Images | `next/image` with AVIF/WebP, restricted device sizes; long-cache headers for `/images/*` and `/_next/static/*` on Netlify |
| Bundle | `optimizePackageImports: ["lucide-react"]`; server-only modules split (`*.server.ts`) to keep Prisma out of client bundles |

**No measured performance numbers exist in the repository.** Nothing here should be quoted as a benchmark.

---

## 9. Known Limitations

Functional:

1. No payment of any kind (tournament fees, memberships, donations — donations are recorded but not charged).
2. Tournament registrations stay `PENDING`; no admin approve/reject/cancel, no player withdrawal, no doubles partner capture.
3. One registration per player per tournament (cannot enter multiple categories).
4. Membership renewal, activation, expiry, suspension not implemented; membership prices are display-only and editable only in the DB.
5. Coach certificate issuance not wired to any API/UI; no certificate revocation flow. (Tournament certificates are now implemented — §15.)
6. Draws, fixtures, match results, rankings: none (schema for Fixture/Match only).
7. Notifications: UI shell only; no emails other than OTP.
8. Media CMS and settings are read-only in admin (districts are now fully managed: add / edit / delete-when-unused / activate / reorder); donations have no admin view. ~~Media CMS read-only~~ — **gallery, videos (YouTube), equipment catalog/orders and the contact inbox are now database-driven and admin-managed**; the news/videos summary lists in /admin/media remain read-only, and other site content (committee, history, stats, partners, about pages) intentionally stays in code.
9. ~~Public forms silently discarded fields~~ — **fixed Pre-J** (fields removed). Player/Coach `photo` is still never written (no upload; Phase R).
10. Public forms are disabled unless `NEXT_PUBLIC_ENABLE_LIVE_FORMS=true`.
11. Sample championship certificates are hard-coded demo data.

Technical / security:

12. ~~`/admin/equipment-orders` had no permission check~~ — **fixed Pre-J** (`equipment:read`). Existing databases must re-run `npm run db:seed` to create the permission row and grant it to federation-admin (Super Admin passes regardless).
13. ~~Rejection reason optional at API level~~ — **fixed Pre-J**.
14. Anonymous (not signed-in) registrations cannot be linked to an account later.
15. ~~`/api/files/*` unauthenticated~~ — **fixed Pre-J**. Public verification never needed it and still works.
16. In-memory rate limiting is per serverless instance unless Upstash is configured.
17. No automated tests; no Prisma migrations directory (schema applied with `db push`). (The README's earlier `prisma migrate deploy` reference was corrected 2026-09-26 — it now documents the `db push` workflow.)
18. No real pagination on admin lists.
19. `RefreshToken` model and `JWT_SECRET`/`JWT_REFRESH_SECRET` env vars are unused.
20. `LOGOUT`, `READ`, `DOWNLOAD` audit actions exist in the enum but are never written.
21. **Multi-state:** there is no user-creation screen — State Admins are existing accounts (e.g. created by Google/OTP sign-in or the seed) that a Super Admin assigns a role + state at `/admin/users`.
22. **Multi-state:** a scoped admin's dashboard "recent activity" shows only their own actions (audit rows carry no state).
23. **Multi-state:** `EquipmentOrder.district` (public equipment enquiry form) is free text, so enquiry scoping matches district *names*; the enquiry form still offers the founding state's static district list.
24. A district created before the hierarchy and not in the founding seed list stays **unassigned** (visible to Super Admin only, flagged on `/admin/states`) until a Super Admin sets its state.
25. The admin application detail page for an out-of-scope record renders the not-found view with HTTP 200 (streamed response); no record data is included. APIs return a real 404.
26. Findings of the 2026-09-29 verification audit and how each was resolved are in §16–§17; the remaining gaps are listed in §17.
27. District membership, the district equipment shop, test payments and orders — and their remaining gaps — are in §19.

---

## 10. Remaining Roadmap

All items below are **PLANNED** — none are implemented.

| Phase | Purpose | Planned functionality | Depends on | Decisions needed |
|---|---|---|---|---|
| J — Tournament payment | Collect registration fees | Payment provider integration (provider not chosen in code), payment record per registration, charge `Registration.amount`, webhook verification, idempotency | I | Provider, refund policy, whether unpaid registrations hold capacity, payment deadline |
| K — Receipt / confirmation | Proof of registration/payment | Receipt number, PDF receipt, confirmation email, show in `/account/documents` | J | Receipt format/GST requirements |
| L — Tournament pass / QR | Entry credential | Per-registration pass with QR, verification at venue | J, K | What makes a pass valid (paid? approved?) |
| M — Tournament operations | Run the event | Registration approve/reject, withdrawal, check-in, capacity waitlist, status automation | I (J for paid events) | Cancellation & withdrawal rules |
| N — Draws / fixtures | Brackets | Generate `Fixture` rows per category, seeding | M | Draw algorithm, seeding rules, byes |
| O — Match results | Scores | Enter `Match` scores, advance winners | N | Scoring format (games/points) |
| P — Rankings | State rankings | Points per result, ranking tables | O | Ranking formula, decay, categories |
| Q — Certificates | Complete certificates | Coach issuance route, revocation, participation/merit certificates from results, membership certificates | O (merit), D | Eligibility per certificate type |
| R — Documents | Member documents | Uploads (photo, ID proof), receipts, admin review | Storage | Required documents per member type; retention |
| S — Notifications | Keep members informed | Notification model, in-app bell, email on approval/rejection/registration | — | Which events notify, channels |
| T — Reporting | Oversight | Exports and reports (registrations, revenue, members by district) | J for revenue | Required reports |
| U — Production hardening | Launch readiness | Automated tests, migrations, pagination, fix §9 security gaps, monitoring, backups | All | — |

---

## 11. Business Decisions Required

| Topic | Status |
|---|---|
| Payment provider and flow (Phase J) | NEEDS BUSINESS DECISION |
| Refund policy | NEEDS BUSINESS DECISION |
| Tournament cancellation / player withdrawal rules | NEEDS BUSINESS DECISION |
| Whether unpaid/PENDING registrations should hold capacity (current code: yes) | NEEDS CONFIRMATION |
| Whether players may enter more than one category per tournament (current code: no) | NEEDS CONFIRMATION |
| Doubles partner registration | NEEDS BUSINESS DECISION |
| Draw algorithm and seeding | NEEDS BUSINESS DECISION |
| Scoring rules | NEEDS BUSINESS DECISION |
| Ranking formula | NEEDS BUSINESS DECISION |
| Certificate eligibility (participation / merit / membership) | NEEDS BUSINESS DECISION |
| Membership renewal cycle, expiry period, fees editing UI | NEEDS BUSINESS DECISION |
| Player/Coach registration validity period (`expiresAt`, `EXPIRED`) | NEEDS BUSINESS DECISION |
| Notification events and channels | NEEDS BUSINESS DECISION |
| Keeping hard-coded sample championship certificates in production | NEEDS CONFIRMATION |
| Whether players may register for another state's tournaments (currently allowed; no rule exists) | NEEDS BUSINESS DECISION |
| Cross-state player/coach transfer process (members can only request moves within their state; a Super Admin must re-home otherwise) | NEEDS BUSINESS DECISION |
| Whether federation-admin should be GLOBAL by default or assigned per state (today: per-user `isFederationWide` flag) | NEEDS CONFIRMATION |
| When to turn off static release mode (`NEXT_PUBLIC_ENABLE_LIVE_FORMS`) | NEEDS CONFIRMATION |

---

## 12. How To Continue Development

Recommended order:

```text
J → K → L → M → N → O → P → Q → R → S → T → U
```

- **J before K/L:** receipts and passes certify payment.
- **M before N:** draws need a final, approved entry list.
- **N → O → P:** rankings need results; results need fixtures.
- **Q (merit certificates)** needs results from O; coach issuance/revocation can be done earlier independently.
- **S** can be started at any point but is most useful once J/M generate events.
- **U** should be continuous.

Before starting any phase: read this file, check §11 for required decisions, then update all five documents (status table here, architecture, API, tests, changelog) when the phase lands.

---

## 13. Pre-Phase-J Gap Fix & Readiness (2026-09-26)

### Fixed (code changed and checked)

| # | Issue | Fix |
|---|---|---|
| 1 | `/admin/equipment-orders` had no permission check | New permission `equipment:read` (Super Admin, federation-admin); page uses `requireAdminScope`; district-scoped users filtered by district name; sidebar item gated |
| 2 | `/api/files/*` served certificate PDFs to anyone who knew the path | Session required; the file must be referenced by a Player/Coach certificate or membership record; owner, or admin with `certificates:read` / `memberships:read` in district; else 404. Local-storage URLs now also go through `/api/files` (they previously pointed at `/uploads/…`, which was not served) |
| 3 | Rejection reason optional at API level (Player, Coach, Membership) | API returns 400 "A rejection reason is required" (max 1000). The players-table Reject button now asks for a reason (it previously sent none) |
| 4 | Public forms collected fields that were discarded | Removed from the UI (outcome B); donation purpose kept via `message` (outcome C) |
| 5 | Public coach form stored every coach as `LEVEL_1` | Form sends enum values; misleading option removed |
| 6 | Tournament edit form had no client-side date-order check | Same `tournamentDateOrderError` as the create modal; server check unchanged |
| 7 | CONTACT_UPDATE / ADDRESS_UPDATE requests could be empty | 400 when the value to apply is missing |
| 8 | Null legacy registration amounts could reach a payment step | `getPayableRegistrationAmount()` guard + admin/member labels |

### Verified (code review; runtime where noted)

- Player and Coach lifecycle: PENDING → APPROVED/REJECTED → PENDING (resubmit). Ownership (404), district (403), permission (403), PENDING-only / REJECTED-only guards (409), duplicate prevention (409 for signed-in users), audit events all confirmed in code.
- Membership lifecycle (3 types): same guards; no bugs found beyond the rejection-reason gap.
- Tournament registration: all eligibility checks, unique `(tournamentId, playerId)` + P2002 handling, PENDING+APPROVED capacity rule, row lock, server-side `amount = category.fee` snapshot, client `amount` ignored (the schema accepts only `categoryId`). No change made.
- Tournament management: create/edit/status, category CRUD and disable-instead-of-delete, capacity bounds, date order (server), poster URL, district/federation scope, audit events. No change beyond #6.
- Requests: ownership from session, duplicate-pending rule, `requests:approve`, district scope, transactional auto-apply, audit.
- Auth/RBAC: middleware gates for `/admin/*` and `/account/*`; every `/api/admin/*` route calls `requirePermission`; account APIs use `requireAuth`; Google/OTP cannot take over credentials accounts.
- Audit: all mutations listed in Architecture §11 write entries. Audit details contain ids, names, emails (login), reasons and amounts — never passwords or OTPs.
- Runtime (production build, logged out, no data written): `/api/files/*` → 401; `/admin/equipment-orders` → redirect to `/login`; admin/request/registration APIs → 403 without CSRF, 401 without session; `/api/verify` still returns the seeded certificate as valid.

**Not run:** signed-in flows (admin approve/reject, member registration, price snapshot, concurrency), because the configured `DATABASE_URL` is a remote database and those tests write data. Run [RRA-TESTING.md §16](RRA-TESTING.md#16-pre-phase-j-regression-cases) against a local or staging database before starting Phase J.

### Phase-J readiness

**Technically ready.** Registration produces an immutable, server-derived `amount`; a guard exists for legacy nulls; registration, admin and file endpoints are authorised. Phase J is blocked only by the **business decisions in §11** (payment provider, refund policy, whether PENDING/unpaid registrations hold capacity, payment deadline, multiple categories, doubles partner rules). Before deploying, run `npm run db:seed` on each existing database so the `equipment:read` permission row exists.

---

## 14. Multi-State Hierarchy & Regression Fixes (2026-09-27)

### Hierarchy

```text
Super Admin (GLOBAL — every state; optional display-only state filter)
    ↓
State        (State Admin: User.stateId — only that state)
    ↓
District     (District Admin: User.districtId — only that district, inside its state)
    ↓
Players / Coaches / Club · School · Academy memberships
```

- **Ownership is relational, not duplicated:** `District.stateId` is direct; Players, Coaches and memberships belong to a district and therefore to that district's state; certificates, requests and tournament registrations inherit through their player/coach. `Tournament.stateId` is direct (state-wide events have no district).
- **Nothing is hard-coded to one state.** States live in the `State` table and are managed at `/admin/states`; district names are unique per state, not globally. The only state name in code is the seed's founding-state *data* row.
- **Existing data preserved.** `db push` is additive (new table, nullable columns, per-state unique indexes replacing global ones). The seed backfills idempotently: the founding state's 33 seed-list districts → that state; district tournaments → their district's state; state-wide tournaments → the only state (only while exactly one exists). Anything else stays unassigned for the Super Admin to correct — nothing is guessed or moved between states.

### Registration ownership
- Player, Coach and membership registrations (public, portal and resubmit) resolve their district **within the submitted state** on the server (`resolveRegistrationDistrict`). An ambiguous district name without a state is refused, as is a district outside the given state.
- Forms show a **State** picker only when more than one active state exists; with one state the UX is unchanged and the state is sent automatically. Options come from the database (active states → active districts, admin order).
- A member can request a **district change only within their current state**; cross-state moves are not self-service.

### Bugs fixed

| Bug | Root cause | Fix |
|---|---|---|
| District **Edit** showed wrong/blank data | Modal state was seeded once from list props (stale after edits; no fresh server data) | Modal now fetches `GET /api/admin/districts/{id}` on open and renders through a portal; Add / name / state / display order added |
| **Videos**: Super Admin told "view-only… requires videos:manage" | Page used `user.permissions.includes("videos:manage")`, bypassing `hasPermission`'s Super Admin rule; the permission row was also missing in the database | Uses `hasPermission(user, PERMISSIONS.VIDEOS_MANAGE)` (API already did) |
| **Equipment API 500** | The configured database was never given the current schema: `equipment_items`, `equipment_purchase_orders`, `media_videos` tables, contact status and gallery `imageUrl` columns, and the new permission rows are missing (verified read-only). Prisma P2021 surfaced as an opaque 500 | Schema drift now returns **503 DATABASE_ERROR naming the missing table** and is logged; the admin equipment page shows the error instead of an empty list. **Operational fix required:** `npm run db:push` + `npm run db:seed` on that database |
| **Certificates: Verify & Preview** did nothing | Account verify panel pre-filled `?certificateNumber` but never ran the lookup | Auto-verifies deep links on load |
| Scanned certificate QR codes read "invalid" | QR value was sent as `certificateNumber` but only looked up as `qrCode` | Serial lookup falls back to QR code |
| Certificate **PDFs never generated** in production builds | PDFKit bundled into `.next/server/chunks` could not find its font metrics (ENOENT), then `doc.font(<.afm path>)` failed in fontkit; errors swallowed | `serverExternalPackages: ["pdfkit"]`, standard `Helvetica` by name, failures logged |
| `/news` 404 + Server Components error | Fixed in the previous commit (redirect `/news → /media/news`; static pages no longer query missing tables) | Re-verified: `/news` → 308 |
| Scope leaks found while adding states | Dashboard certificate counts and activity feed were global; users list/actions unscoped; admin equipment page offered edit controls to read-only users | All scoped / permission-checked |

### Dynamic content scope (unchanged rule)
Only **Districts, Gallery, Videos, Equipment and Contact submissions** are database-managed. All other site content stays static in code.

### Verification (2026-09-27)
- `tsc --noEmit` ✔, `prisma validate` ✔, `next build --webpack` ✔, lint: 0 errors in changed files (5 pre-existing errors elsewhere).
- Upgrade rehearsal on a disposable Postgres: previous schema + legacy data → `db push --accept-data-loss` (only warnings: the new per-state unique indexes, which existing globally-unique names cannot violate) → seed backfill → data intact; seed re-run is a no-op.
- **92/92 HTTP checks passed** on that database with two states, a State A admin, a State B admin and a State B district admin — see [RRA-TESTING.md §17](RRA-TESTING.md#17-multi-state-isolation-matrix).
- Not browser-tested: client-side behaviour of the district Edit modal, the State picker and verify auto-run (covered by the API checks they call).

---

## 15. Operational Ownership — Certificates, Signatories, Tournaments, Equipment (2026-09-27)

Every operational record now has one ownership path to a state and (where it applies) a district. Ownership is derived through relations where that is stable, and snapshotted only where history must not move.

### Ownership audit (verified in code and by live tests)

| Entity | How it is owned | State scope | District scope | Super Admin | State Admin | District Admin |
|---|---|---|---|---|---|---|
| Player | `districtId` → District.stateId | Yes (via district) | Yes | All | Own state | Own district |
| Coach | `districtId` → District.stateId | Yes (via district) | Yes | All | Own state | Own district |
| Club / School / Academy membership | `districtId` → District.stateId | Yes (via district) | Yes | All | Own state | Own district |
| Player / coach request | via the linked Player or Coach (never from client ids) | Yes | Yes | All | Own state | Own district |
| Tournament | direct `stateId` + optional `districtId` (null = state-wide) | Yes | Yes | All | Own state (all its districts) | Own district |
| Tournament registration | via its tournament | Yes | Yes | All | Own state | Own district |
| Tournament certificate | via its tournament (`tournamentId`, stable even if the player moves) | Yes | Yes | All | Own state | Own district's tournaments |
| Registration certificate | via the player's district | Yes | Yes | All | Own state | Own district |
| Certificate signatory | direct `stateId` / `districtId` (both null = federation level) | Yes | Yes | All | Own state + its districts | Own district |
| Equipment item | direct `stateId` / `districtId` (both null = RRA Central Store) | Yes | Yes | All (incl. central) | Own state stores | Own district store |
| Equipment order | **snapshot** `stateId` / `districtId` copied from the items at order time | Yes | Yes | All (incl. central) | Own state | Own district |
| Equipment enquiry (old free-text form) | district **name** match | By name | By name | All | Own state | Own district |

All list pages query with the scope where-builders; every record action (approve, reject, edit, delete, issue, cancel, file download) uses `assertInScope`, which answers **404** for another district's or state's record.

### Certificates & signatories
- **Who can issue:** `certificates:issue` **and** the record in scope — District Admin for their district's players/tournaments, State Admin anywhere in their state, Super Admin anywhere (enforced server-side).
- **Signatories are data, not constants.** `CertificateSignatory` rows (name, designation, organization, optional signature image) owned by a district, a state, or the federation. Managed at `/admin/certificates/signatories`. The seed registers the founding state's two officials (previously hard-coded) as state-level signatories.
- **Per-tournament signers:** each tournament picks up to 4 signatories in signing order (`TournamentSignatory`). Only federation-level, its own state's, or its own district's signatories are accepted — never another district's.
- **Tournament certificates** (`/admin/tournaments/[id]` → Certificates): tournament-specific title and logo; generated only when the tournament is **COMPLETED**, only for players holding a (non-rejected) registration for that tournament, one per player per tournament (DB unique). Optional per-player "achievement" text (e.g. "Winner — Senior Singles") is entered by the admin.
- **History is frozen:** each certificate stores its title, event name/dates, venue, district/state names, achievement, logo and the signers' name/designation/organization at issue time. Re-designating a signatory later does not change issued certificates (verified).
- **Numbering:** globally unique `CERT-…` numbers and `QR-…` codes (DB unique) — no collision between tournaments; verification unchanged.
- **Registration certificates** (one per player) are unaffected by tournament certificates and now snapshot the player's state officials.

### Equipment
- Items belong to a district store, a state store, or the RRA Central Store. District Admins manage their district's stock; State Admins every store in their state; Super Admin everything including the central store. (`equipment:read/manage` granted to the state-admin and district-admin roles.)
- Public `/equipment` shows which store sells each item ("Sold by …") with a store filter; items of inactive states/districts are hidden.
- **One order = one store.** An order's state/district is copied from its items server-side; a cart mixing stores is refused (400, stock untouched). Name and unit-price snapshots are unchanged; later price edits never alter orders (verified).
- Payment reuses the existing server-side chokepoint (`verifyAndMarkPaid`); no provider yet (Phase J). Amounts come only from order snapshots.
- "My Equipment" / "My Orders" remain strictly the signed-in user's own rows and now show the selling store.

### Defects found and fixed during this audit
| Defect | Impact | Fix |
|---|---|---|
| Public verification returned **invented event details** for real player/coach certificates (fixed championship name, "Jaipur Racquetball Association" organiser, a stadium venue, "Official Registered Guardian") | Anyone verifying a real certificate saw a championship it was not issued for | Results now come from the certificate's own snapshot; missing fields are hidden; storage paths no longer exposed |
| Certificate renderer printed two **hard-coded signer names** regardless of data | Every certificate showed the same signers | Renders the certificate's own signer list |
| Zod 4 `.partial()` kept `.default()` values in **update** schemas (equipment, gallery, videos) | Changing an item's price reset its stock to 0 and category to OTHER; editing a gallery item unpublished it; editing a video re-activated it | Update schemas built from default-free fields (verified live) |
| `/admin/equipment/orders` listed **every** order to anyone with `equipment:read` | Cross-district order visibility once district admins manage equipment | Scoped + filters; order status changes scope-checked |
| Registration-certificate "one per player" checks counted any certificate | A tournament certificate would have blocked the registration certificate | Checks narrowed to `tournamentId: null` |

### Business decisions still required
| Topic | Current behaviour |
|---|---|
| Tournament certificate eligibility (participation vs merit; who counts as a participant) | Any player with a PENDING/APPROVED registration for a COMPLETED tournament; achievement text is free-form — NEEDS BUSINESS DECISION |
| Registration approval before certificates | Registrations are never approved/rejected yet (Phase M), so PENDING counts — NEEDS CONFIRMATION |
| Buying from another district's store | Allowed; the order belongs to the selling store — NEEDS BUSINESS DECISION |
| Registering for another state's tournament | Allowed; certificate belongs to the tournament's scope — NEEDS BUSINESS DECISION |
| Certificate number format (e.g. per-tournament sequence `#001`) | Global `CERT-…` numbers — NEEDS CONFIRMATION |
| Certificate revocation, coach certificates, membership certificates | Not implemented (unchanged) |
| Signature images | Optional; must be PNG/JPEG under `/images/…` or an https URL that does not redirect (Google Drive links usually redirect and are skipped) |

### Verification (2026-09-27)
- `prisma validate` ✔, `tsc --noEmit` ✔, `next build --webpack` ✔, lint: 0 errors in changed/new files (5 pre-existing errors in untouched files).
- Upgrade rehearsal on a disposable database: schema as committed before this change + legacy-shaped rows (central item, order with price snapshot, pre-snapshot registration certificate) → `db push --accept-data-loss` (only warning: the new `(tournamentId, playerId)` unique index on a brand-new column) → seed → all legacy rows unchanged; legacy certificate still verifies.
- **136/136** ownership-isolation checks and **22/22** regression smoke checks passed — see [RRA-TESTING.md §18](RRA-TESTING.md#18-operational-ownership-matrix).
- Not browser-tested: the certificate panel and signatory UI (the APIs they call are covered).

### Deploy
Code reads the new columns, so apply the schema **with** this release: `npx prisma db push --accept-data-loss` (review that the only warning is the `player_certificates (tournamentId, playerId)` unique index), then `npm run db:seed` (creates the founding state's signatories and grants equipment permissions to state/district admins). Until then tournament registration, the tournament/equipment admin pages and certificate issuance return 503 `DATABASE_ERROR`; login is unaffected.

## 16. Full Hierarchy Verification Audit (2026-09-29)

The whole chain — Super Admin → State → District → players/coaches/members → requests → tournaments → certificates → equipment/orders — was re-verified from the code and by live tests, without relying on earlier reports.

### Method
- Disposable local database (PostgreSQL 16, Docker): `prisma db push` + `npm run db:seed` + a temporary fixture mirroring the remote database's second-state accounts (Gujarat / Ahmedabad, same e-mail addresses) plus member accounts. The fixture and database were removed afterwards.
- Production build (`next build --webpack`) served with `next start`.
- **326** HTTP/database checks, **12** real-browser checks (headless Chrome) and **15** performance/session checks — all passed on the final run. Details: [RRA-TESTING.md §19](RRA-TESTING.md#19-full-hierarchy-verification-2026-09-29).
- The production (remote) database was only **read** (account/role/scope listing, latency probe). Nothing was written, no password was changed, no migration was run.

### Accounts (verified in the database before use)
| Account | Role | Scope |
|---|---|---|
| admin@rajasthanracquetball.com | super-admin | Global (federation-wide) |
| state.rajasthan@rajasthanracquetball.com | state-admin | Rajasthan |
| state.gujarat@rajasthanracquetball.com | state-admin | Gujarat |
| district.jaipur@rajasthanracquetball.com | district-admin | Rajasthan / Jaipur (District Admin A) |
| district.kota@rajasthanracquetball.com | district-admin | Rajasthan / Kota (District Admin B) |
| district.ahmedabad@rajasthanracquetball.com | district-admin | Gujarat / Ahmedabad |
| tournaments@…, content@… | tournament-manager, content-manager | Global (federation-wide, as seeded) |

### Results
| Area | Result | What was proven |
|---|---|---|
| Player scope | PASS | Registration lands in the chosen district of the chosen state (client `stateId`/`districtId` ignored; a district outside the state → 400); approve/reject/resubmit isolated by district and state (404 out of scope, 403 member, 401 anonymous); resubmission owner-only and REJECTED-only; approved players cannot be renamed through resubmission; list pages scoped; `?district=` cannot widen a scope |
| Coach scope | PASS | Same rules for coach registration, approval, rejection and resubmission |
| Requests | PASS | All 8 types via API and the portal form; validation (missing value, cross-state district change, duplicate pending, short reason, unknown type); auto-apply for contact/address/district change, record-only for the rest; cross-scope approve/reject → 404; an approved district change hands the member to the new district's admin |
| Certificates | PASS | Generation rights: district own district, state own state, Super everywhere; members and tournament managers 403; tournament certificates only for COMPLETED tournaments and registered players; state officials snapshotted on registration certificates |
| Signatories | PASS | Create forced to own scope; cross-scope edit/delete 404; deactivated signatories cannot be assigned; delete removes unused signatories and deactivates assigned ones; different signatories per tournament |
| Historical snapshot | PASS | After renaming/re-designating signatories, changing the member's account name, deleting the signatory and moving the player to another district: verification, Verify & Preview and the stored PDF (byte-identical) still show the original data |
| Verification | PASS | By certificate number, QR value and member ID; demo RRA-2025-PLR001 / RRA-2025-CCH001; public `/verify` and `/account/verify` (Verify & Preview) render in a browser; no storage path exposed; PDF served only to owner / in-scope admins (404 others, 401 anonymous) |
| Tournaments | PASS | Ownership forced to the creator's district; state-level tournaments; cross-scope edit/category/settings/generation → 404; registration only while REGISTRATION_OPEN inside the registration window (DRAFT, REGISTRATION_CLOSED, IN_PROGRESS, COMPLETED, CANCELLED, before start, after deadline → 400); DRAFT and CANCELLED hidden publicly; Super filters (state, district, statewide, status, name, date) do not affect authorization; a State Admin cannot widen scope with `?state=` |
| Equipment | PASS | GET/PUT on `/api/admin/equipment` → 405; invalid input → 400 (no 500); stock, price, activate/deactivate; inactive or out-of-stock items cannot be bought; delete archives items that have orders |
| Orders | PASS | Order carries buyer, state, district, item, quantity, unit price and total; ₹500 → ₹700 price change leaves existing orders at ₹500; mixed-district carts refused; admin order lists and status changes scoped; My Equipment / My Orders show only the member's own |
| IDOR | PASS | Every cross-scope GET / PATCH / DELETE / approve / reject / certificate generation / file download tested → 404 |
| Super Admin | PASS | Manages signatories, videos, gallery, districts, equipment and requests in every state |
| Security | PASS after fixes | CSRF (missing/forged → 403), rate limits, headers, audit entries, path traversal; defects below |
| Performance | PASS | Pool and permission cache behave as designed (see below) |

### Defects found and fixed
| Defect | Root cause | Fix | Retest |
|---|---|---|---|
| A request body that is not valid JSON returned **HTTP 500** on every JSON API (found on `POST /api/admin/equipment`) | `request.json()` throws `SyntaxError`, which was not mapped | `withApiHandler` turns body-parse failures into 400 `BAD_REQUEST` "Request body must be valid JSON" | 400 on equipment, signatories, purchase, empty body |
| Real 500s were logged only as warnings, **without the exception**, and **never sent to Sentry** | The handler checked `isOperational` after `fromUnknownError()` had wrapped the exception in an operational `AppError.internal()` | Decide on the thrown error; any 5xx is logged at error level with the original exception and reported | Verified in the server log |
| No per-account limit on password guessing; rate-limit IP taken from the client-controllable left-most `X-Forwarded-For` | Only the global 120/min/IP limit applied to sign-in | Credentials sign-in limited to 10 attempts / 15 min per account + client IP; client IP prefers Netlify's `x-nf-client-connection-ip` | 11th attempt refused even with the right password; other IP unaffected |
| Role permission edits also waited out the 60 s permission cache | Cache not cleared on edit | `invalidatePermissionsCache(roleId)` after a role edit | Revocation effective at the next session refresh (60 s) |
| `npm run lint` failed (5 errors) | Old unescaped apostrophe, empty interfaces, a variable named `module` | Fixed | 0 errors (118 warnings remain) |

### Findings not fixed — need owner action or a decision

> **Status update 2026-09-30:** items 1, 3, 4, 5 and 7 were resolved and item 2 was decided — see §17. The table below is the audit as recorded on 2026-09-29 (item 1 counted 17 accounts; it is 16 privileged accounts plus one demo member).
| # | Finding | Severity | Recommended action |
|---|---|---|---|
| 1 | Remote database: the **17 privileged accounts** use the default passwords documented in the seed and README (checked read-only 2026-09-29) | **Critical** | Change every privileged password now (the audit made no production writes) |
| 2 | Tournament Manager and Content Manager are seeded **federation-wide** (all states) | Medium | Confirm, or scope them |
| 3 | Self-hosted (Docker) deployment: rate limits trust `X-Forwarded-For` unless the proxy overwrites it | Medium | Configure the proxy to overwrite the header |
| 4 | The seed is idempotent (run twice, no duplicates), but it **re-creates** demo rows an admin deleted (placeholder equipment item, gallery items, demo players/coaches/certificates) | Low | Do not re-run the seed against production after cleanup, or remove demo rows from the seed |
| 5 | Admins cannot mark an order PAID (server-side payment verification required) but can mark an unpaid order COMPLETED; My Equipment lists PAID and COMPLETED orders | NEEDS BUSINESS DECISION (Phase J) | Decide whether COMPLETED requires payment |
| 6 | Coach certificates: no issuing route; coach verification shows the fixed legacy signer pair (not a snapshot) | Known (§9 item 5) | — |
| 7 | The on-screen certificate preview shows a decorative QR; the real QR is only in the PDF (encodes `APP_URL/verify?qrCode=…`, verified to resolve) | Low | — |
| 8 | The portal request form finds the member's state by district **name**; if two states share a district name, the first state's list is offered (the server still enforces same-state) | Low | — |
| 9 | Gallery and videos have no state/district owner; only global roles can manage them | By design | — |
| 10 | Login throttle, rate limits and the permission cache are per server instance unless Upstash is configured; with several instances a role's old permissions can survive up to ~2 minutes | Low | Configure Upstash for multi-instance deployments |

### Performance & database
- **Pool:** one `pg.Pool` per server process (singleton on `globalThis`; max 20, idle 30 s, connect timeout 10 s, keep-alive). 1 200 requests at 400-way concurrency: peak exactly 20 connections, no growth across rounds, no 5xx; idle connections released after ~30 s.
- **Permission cache:** keyed by role id only (permissions are role data, not user data); 60 s TTL per instance. User-specific data (active flag, role assignment, state, district) is never cached — it is re-read on every session refresh. Measured: removing a permission took effect after 60 s; deactivating a user after 61 s.
- **Remote database (read-only probe):** Neon, AWS **us-east-2**, pooled endpoint, `sslmode=require`, PostgreSQL 18.6. From the audit machine: first connection ≈ 3.8 s, `select 1` median 283 ms (max 960 ms). In production the latency that matters is between the app's server functions and the database; the functions' region (Netlify site settings) was not checked by this audit. If they do not run in or near us-east-2, every sequential query pays a cross-region round trip. **No migration was performed; moving the database needs explicit approval.**
- `pg` warns that `sslmode=require` will get weaker libpq semantics in its next major version; set `sslmode=verify-full` explicitly before upgrading `pg`.

### Not tested
Google and e-mail-OTP sign-in (no provider keys locally), e-mail delivery (no `RESEND_API_KEY` locally — contact messages are stored with `emailSent=false`), the Upstash limiter, multi-instance behaviour (reasoned from code), the production database beyond read-only queries, mobile layouts.

## 17. Release Hardening (2026-09-30)

### Production credentials
- The production database had **16 privileged accounts** (1 Super Admin, 5 State Admins, 8 District Admins, 1 Tournament Manager, 1 Content Manager), all on seed-default passwords. Each now has a unique random password (22 characters, bcrypt cost 12). Only those 16 password hashes were changed — verified before the write (e-mail, role, active, still on a default) and after it (new password accepted, every seed default rejected, role unchanged, the 2 other users byte-identical). No schema change, no seed run, no other data touched.
- The new credentials are in a private file in the owner's Windows profile, outside the repository and outside OneDrive, readable only by that Windows account. They are not in git, docs, `.env` or logs.
- The demo member `player.test@example.com` still has its seed password — left unchanged by owner decision.
- A password change does not end sessions already open: JWT sessions stay valid until they expire (≤ 30 minutes).

### Decisions and fixes
| Topic | Result |
|---|---|
| Tournament Manager / Content Manager scope | Scope is per user (see Architecture §6). The seeded accounts are federation-wide by design; a Super Admin can scope any manager to a state or district and this is enforced server-side (verified: district/state-scoped managers get 404 outside their scope, cannot place tournaments in another state, cannot approve players; only a Super Admin can change scope) |
| Forged `X-Forwarded-For` vs the login limiter | Added a 30-per-15-minutes ceiling per account that no forwarded-IP header can raise (verified: 29 failures from 29 different forwarded IPs, the 30th attempt still signs in, the 31st from a new IP is refused). `docker-compose.yml` now publishes both ports on `127.0.0.1` only and documents that a reverse proxy must overwrite `X-Forwarded-For`. On Netlify the platform's `x-nf-client-connection-ip` is used first |
| `docker-compose.yml` secrets | Removed the committed placeholder secrets (`change-this-in-production`); `AUTH_SECRET` and `APP_URL` come from the environment, and sign-in fails closed without a secret |
| Seed | Still idempotent. It never changes an existing password and no longer **creates** demo-password accounts unless the database is local or `SEED_DEMO_ACCOUNTS=true` (verified on a throw-away database: 7 skipped, rotated password untouched, role/scope still updated, deleted demo account not re-created). Re-running it **does** restore deleted demo data rows (sample players/coaches/certificates, gallery items, placeholder equipment) |
| Equipment order states | `status` is the fulfilment lifecycle; `paymentStatus` is the payment record, set only by server-side verification. COMPLETED ("fulfilled") now requires a verified payment, cancelled orders are final, nothing returns to pending payment, and paid orders cannot be cancelled until refunds exist. No payment provider exists yet, so no order can currently become PAID or COMPLETED and My Equipment stays empty until Phase J |
| Certificate QR | The on-screen certificate now shows a real QR with exactly the PDF's payload (`{APP_URL}/verify?qrCode=…`, one helper for both); verified pixel-for-pixel against a QR generated for that payload. Sample records without a QR value show none |
| Coach certificates | Not a current requirement — remains a roadmap gap (Phase Q): `issueCoachCertificate()` exists but no route or UI calls it |
| `/login` | Quick-login buttons appear only in `next dev` and list every active admin account with a known credential (see Architecture §5); passwords stay on the server. A redundant nested `SessionProvider` was removed and the buttons wait for the page's session check, which fixes switching accounts while signed in. `callbackUrl` is restricted to same-site paths (it previously accepted absolute URLs — an open redirect after sign-in) |

### Production configuration (values live in the hosting settings — not readable from the repository)

> Correction 2026-10-01: production runs on **Vercel** (`https://rajweb-sage.vercel.app`), not Netlify — read "Netlify" below as the Vercel project settings. See §18.
Verified in the repository: no secrets in tracked files or in any of the 26 commits of history (only placeholders), `.env*` git-ignored, no authentication bypass, Netlify header rules do not apply to server-rendered/API responses. To confirm in Netlify: `AUTH_SECRET` set and strong; `APP_URL`/`NEXTAUTH_URL` = the public https domain (the certificate QR encodes `APP_URL`); `SENTRY_DSN` set (without it nothing is reported); `UPSTASH_REDIS_REST_URL`/`TOKEN` set (otherwise every limiter is per instance); `RESEND_*` and `GOOGLE_*` set; `STORAGE_TYPE` unset or `netlify`; `RRA_QUICK_LOGIN_FILE` and `SEED_DEMO_ACCOUNTS` **not** set.

### Verification (2026-09-30)
- `prisma validate`, `tsc --noEmit`, `npm run lint` (0 errors) and `next build --webpack` pass.
- Throw-away database, production build: **360/360** HTTP/database checks (all earlier groups plus manager scoping, order transitions, QR payload, per-account login ceiling, production `/login` without quick login or seed passwords), **15/15** browser checks, **15/15** pool/session checks, **6/6** error-reporting checks (a real 500 is logged at error level and delivered to a local Sentry endpoint; 4xx are not), **10/10** seed checks.
- Quick login in `next dev` (real browser): 18/18 (10 from a clean browser including the wrong-password and account-list checks, 8 switching accounts while signed in).

### Remaining gaps
| Gap | Current behaviour | Phase / decision |
|---|---|---|
| Online payment | No provider; orders stay PENDING_PAYMENT, so nothing can be marked paid or completed | Phase J |
| Refunds / cancelling paid orders | Refused (409) | Phase J |
| Coach certificate issuance, revocation, membership certificates | Not implemented | Phase Q |
| Demo member `player.test@example.com` | Still on its seed password | Owner decision (kept) |
| Per-instance limiters and permission cache | Without Upstash every instance counts separately; a role's old permissions can survive up to ~2 minutes across instances | Configure Upstash |
| Per-account login ceiling | 30 bad attempts lock an account's password sign-in for 15 minutes | Accepted trade-off |
| Request form district lists | State inferred from the district name (first match if two states share one); server still enforces same-state | Low |

## 18. Production Login Diagnosis & Credential Management (2026-10-01)

Reported: `https://rajweb-sage.vercel.app/login` answered "Invalid email or password".

### Diagnosis
| Step | Result |
|---|---|
| Deployment | **Vercel** (`Server: Vercel`, Mumbai edge), latest code deployed |
| Database used by the live site | **The Neon database in `.env`** (AWS us-east-2, database `neondb`) — proven: logging in on the live site updated `lastLoginAt` in that database |
| Accounts `admin@`, `state.rajasthan@`, `district.jaipur@`, `district.kota@` | Exist once each (no case-insensitive duplicates; all e-mails normalised), active, correct role / state / district, e-mail + password accounts (no Google link), bcrypt hash present |
| Cause | The passwords were rotated on 2026-09-29 (§17). The seed passwords (`Admin@123`, `State@123`, `District@123`) are rejected by design. Repeated failed attempts also count toward the 10-per-account-per-IP throttle, so for 15 minutes even the right password can be refused from that IP |
| Fix needed in the database | **None** — no password was reset; the current credentials are in the owner's private credentials file |

### Live verification (real HTTP sign-in, fresh cookie jar per account)
35/35: each seed password rejected; all four accounts sign in, get a session with the right role and scope (Super Admin federation-wide; State Admin state only; District Admins district + state), see their dashboard ("All States", "State: Rajasthan", "District: Jaipur", "District: Kota"), see only their own players (Jaipur admin sees the Jaipur player but not the Jodhpur one; Kota admin sees neither), are redirected away from `/admin/roles` (the Super Admin gets the roles editor), log out, and sign in again. Anonymous `/admin` redirects to `/login`.

### Environment (checked from outside, no secret values read)
`DATABASE_URL` → the intended Neon database (above). Auth secret → sessions are issued and read. Auth URL → Google's `redirect_uri` is `https://rajweb-sage.vercel.app/api/auth/callback/google`. Google OAuth → client ID configured. `APP_URL` → `https://rajweb-sage.vercel.app` (certificate QR payload). Providers: credentials, google, email-otp. Security headers present. **Not verifiable without Vercel access:** `SENTRY_DSN`, `UPSTASH_*`, `RESEND_*`.

### Changes
- **Super Admin password reset** in `/admin/users` (`reset-password` action, API §13.1): Super Admin only, e-mail + password accounts only, strong password required (a "Generate strong password" button creates one in the browser), bcrypt hash, audit entry without the password, never returned or displayed afterwards. Verified 27/27 API checks and 9/9 in a browser on a throw-away database.
- **Client IP on Vercel:** the rate-limit IP no longer trusts `x-nf-client-connection-ip` outside Netlify. On Vercel any visitor could send that header to dodge the per-IP sign-in throttle (the per-account ceiling still held). Verified: a forged header no longer escapes the throttle.

### Production gaps found
| Gap | Detail |
|---|---|
| Certificate PDFs on Vercel | Storage falls back to the local filesystem, which Vercel does not keep — certificates issued on the live site get no PDF (they still verify). Needs a storage service (e.g. Vercel Blob) |
| Equipment shop | Production has one item (the central demo placeholder) and no district inventory yet; District Admins add theirs at `/admin/equipment`. "My Equipment" lists only paid/completed orders, and nothing can be paid until a payment provider exists (Phase J) |

### Regression after these changes
Production build, `tsc` and lint (0 errors) pass; 360/360 HTTP/database checks and 15/15 browser checks on a throw-away database.

## 19. District Membership, District Equipment & Orders (2026-10-01)

Supersedes earlier statements that no payment exists, that "My Equipment" stays empty until Phase J, and that members may buy from another district's store (§15 business-decision table).

### What is implemented
| Area | Status | Notes |
|---|---|---|
| Google sign-in → onboarding | IMPLEMENTED | New members (no home district, no player/coach registration) are sent to `/account/onboarding`: name, mobile, member type (Player / Coach / Supporter-Parent), State → District (district list loaded per state from the server), optional address. Existing members are never asked again. Player/Coach members are then pointed to the existing registration forms |
| District identity | IMPLEMENTED | Dashboard and profile show State, District, Member Type, Member ID and profile status; the district changes only through a District Change request |
| District catalog | IMPLEMENTED | `/account/equipment` is the member's Equipment Shop: central + own state + own district stock only; item details (image, SKU, specifications, stock), one-store cart, checkout with delivery details and price breakdown; "My Equipment" tab lists paid purchases. Public `/equipment` shows the central store only |
| District equipment management | IMPLEMENTED | `/admin/equipment`: image upload (stored in the database), SKU, specifications, sort order, active, stock, price; ownership forced to the admin's scope |
| District requirements | IMPLEMENTED | `/admin/equipment/requirements`: districts raise needs (quantity, estimate, priority, required-by date, attachment); State Admin / Super Admin review (under review → approved/rejected → fulfilled) |
| Test payments | IMPLEMENTED (TEST ONLY) | Dummy Razorpay-style gateway behind a `PaymentService` interface; success / failure / cancel; server-side signature verification; every screen labels it "TEST PAYMENT — NO REAL MONEY WILL BE CHARGED" |
| Orders | IMPLEMENTED | Payment status separate from order status; member dashboard (summary cards, table, mobile cards), order details with timeline and tracking; admin list with search, status/payment/store/date filters and pagination; admin details with step-by-step transitions |

### Production database
The schema change is **additive** (new enum values, nullable columns, three new tables — reviewed with `prisma migrate diff`: no drops, no type changes). Applying it to the production database (`npx prisma db push`) was **not done by the assistant** — the action was blocked by the tool's permission policy — so it must be run before this code is deployed; otherwise the shop, order and account pages fail on the missing columns. Row counts were recorded beforehand for comparison.

### Verification
Prisma validation, `tsc --noEmit`, `npm run lint` (0 errors) and `next build --webpack` pass. Throw-away database, production build: 367/367 regression checks, 133/133 new-feature API/page checks, 15/15 + 22/22 real-browser checks, 15/15 pool/session checks, 6/6 error-reporting checks. Found and fixed during testing: an attachment id from another district answered differently from a missing one (probing) and a duplicate name (e.g. a role) returned 500 instead of 409 — unique-constraint violations are now 409 CONFLICT and logged as warnings.

### Remaining gaps
| Gap | Current behaviour | Next step |
|---|---|---|
| Real payments | Only the dummy test gateway exists and it is **on by default**; test-paid orders are labelled "Test payment" for admins and members | Phase J: add the real Razorpay provider (same interface), or set `PAYMENT_PROVIDER=disabled` before taking real orders |
| Refunds / cancelling paid orders | Refused (409) | Phase J |
| Delivery charges | Always free | Business decision |
| District change for Supporter-only members | No request type exists for members without a player/coach registration | Extend the request workflow if needed |
| Cart | Kept in the page only (lost on reload) | Optional |
| Notifications | No e-mail for order or requirement updates | Optional |
| Not-found pages | An out-of-scope order id shows the not-found page with HTTP 200 (streamed), no data — same as other admin detail pages | Known (§9 item 25) |
