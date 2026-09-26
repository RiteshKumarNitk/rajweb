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
| I.5 | Performance | IMPLEMENTED | Public tournament caching + tag revalidation, JWT auth refresh throttled to 60 s, loading skeletons, `select`-narrowed queries, list caps. No measured benchmarks recorded. |
| — | UI refresh (post-I) | IMPLEMENTED | Account and admin UI redesign, in-portal verify, official certificate renderer, sample championship certificates (commits 2026-09-25/26). |
| J | Tournament payment | NOT STARTED | No payment provider, model, or API. |
| K | Receipt / confirmation | NOT STARTED | |
| L | Tournament pass / QR | NOT STARTED | |
| M | Tournament operations | NOT STARTED | No registration approval, check-in, withdrawals, refunds. |
| N | Draws / fixtures | NOT STARTED (schema only) | `Fixture` model exists; unused by any code. |
| O | Match results | NOT STARTED (schema only) | `Match` model exists; unused by any code. |
| P | Rankings | NOT STARTED | NEEDS DECISION on formula. |
| Q | Certificates (expansion) | PARTIALLY IMPLEMENTED | Player registration certificate issuance + verification exist. Coach certificate service function exists but **no API/UI calls it**. No revocation UI/API. No tournament/achievement certificates in DB (only hard-coded sample championship certificates). |
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
- **Approval / rejection:** `POST /api/admin/players/{id}/approve|reject` — permission `players:approve`, district-scoped. Only a `PENDING` row can change (`updateMany … where status = PENDING`), so double-clicks/concurrent admins get **409**. Reject **requires** a non-empty `reason` (≤ 1000 chars) — enforced by the API (400) since Pre-J; the review page and the players table both collect one.
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
- Review: `POST /api/admin/memberships/{club|school|academy}/{id}/approve|reject` (`memberships:approve`, district-scoped, PENDING-only guard, reason required on reject).
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
| `/admin/equipment-orders` | `equipment:read` (added Pre-J) | Read-only list of equipment enquiries; district-scoped users see only enquiries naming their district |
| `/admin/media` | `media:read` | **Read-only** lists of news/videos/galleries (summary overview) |
| `/admin/media/gallery` | `media:read` | **Gallery management** — add/edit/delete items, set each item's optional Google Drive URL, activate/deactivate, change sort order (writes need `media:manage`) |
| `/admin/contact` (+`/[id]`) | `contact:read` | **Contact inbox** — full message, status transitions (NEW/READ/REPLIED/CLOSED), delete (writes need `contact:manage`); form submissions email the configured Super Admin address |
| `/admin/equipment` | `equipment:read` | **Equipment catalog management** — CRUD, price/stock/image/category, activate/deactivate, archive-on-delete when purchased (writes need `equipment:manage`) |
| `/admin/equipment/orders` | `equipment:read` | **Equipment orders** — customer, items, amounts, payment status; fulfilment-status updates (`equipment:manage`) cannot mark unpaid orders paid |
| `/admin/media/videos` | `media:read` | **YouTube video management** — CRUD with server-side URL/ID validation, ordering, activate/deactivate (writes need `videos:manage`) |
| `/admin/users` | `users:read` | List (≤ 200); activate/deactivate, assign role, assign/remove district, toggle federation-wide (`users:update`) |
| `/admin/roles` | `roles:read` | Create custom roles and edit permissions of non-system roles (`roles:manage`) |
| `/admin/audit-logs` | `audit:read` | Latest 200 entries |
| `/admin/settings` | `settings:manage` | **Read-only** view of `Setting` rows |
| `/admin/contact` (+`/[id]`) | `contact:read` | **Contact inbox** — list, full message, status transitions (NEW/READ/REPLIED/CLOSED), delete (writes need `contact:manage`) |
| `/admin/equipment` | `equipment:read` | **Equipment catalog management** — CRUD, price/stock/image/category, activate/deactivate, archive-on-delete when purchased (writes need `equipment:manage`) |
| `/admin/equipment/orders` | `equipment:read` | **Equipment orders** — customer, items, amounts, payment status; fulfilment-status updates (`equipment:manage`) cannot mark unpaid orders paid |
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
| District restriction | `assertDistrictAccess` / `getDistrictWhereClause`; district-scoped user with no district sees nothing; state-wide tournaments are federation-only |
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
5. Coach certificate issuance not wired to any API/UI; no certificate revocation flow.
6. Draws, fixtures, match results, rankings: none (schema for Fixture/Match only).
7. Notifications: UI shell only; no emails other than OTP.
8. Media CMS, districts, settings are read-only in admin; donations have no admin view. ~~Media CMS read-only~~ — **gallery, videos (YouTube), equipment catalog/orders and the contact inbox are now database-driven and admin-managed**; the news/videos summary lists in /admin/media remain read-only, and other site content (committee, history, stats, partners, about pages) intentionally stays in code.
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
