# RRA Platform — Architecture

Technical architecture of the RRA platform as implemented at commit `80ef6bd` plus the Pre-Phase-J Gap Fix (2026-09-26).
Status and business rules: [RRA-PROJECT-STATUS.md](RRA-PROJECT-STATUS.md). Endpoint contracts: [RRA-API.md](RRA-API.md).

---

## 1. System Architecture

One Next.js 16 application (App Router) that serves pages and JSON APIs, backed by one PostgreSQL database.

```text
 Browser
   │
   ▼
 src/middleware.ts ── security headers, rate limit (/api, /login), session gate (/admin, /account)
   │
   ├── Pages (Server Components)  ── public (group "(public)") · /account/* · /admin/* · /login
   │       │  read data directly via Prisma (+ requireAdminScope / getCurrentUser)
   │       ▼
   │   Client Components (forms) ──fetch + CSRF──┐
   │                                             ▼
   └── API routes  src/app/api/**/route.ts  wrapped by withApiHandler()
           │   (rate limit → CSRF → handler → uniform JSON / error mapping → Pino log / Sentry)
           ▼
       Auth & RBAC (src/security/*)  requireAuth / requirePermission / assertDistrictAccess
           ▼
       Services  src/modules/*/*.service.ts · src/services/{audit,certificates,email}
           ▼
       Prisma Client (lazy proxy, @prisma/adapter-pg over pg Pool)
           ▼
       PostgreSQL

 Side systems: Resend (OTP email) · Netlify Blobs or ./uploads (certificate PDFs)
               Upstash Redis (optional rate limit) · Sentry (optional)
```

Pages generally query Prisma directly for reads; writes go through API routes → services.

---

## 2. Repository Structure

```text
rajweb/
├── prisma/
│   ├── schema.prisma        # single source of DB truth (no migrations dir — `db push`)
│   └── seed.ts              # roles, permissions, 33 districts, admins, sample data, settings
├── prisma.config.ts         # Prisma 7 config (schema path, DATABASE_URL)
├── public/images/           # static site imagery (see §15)
├── docs/                    # the five RRA docs (+ source photos used for public/images/rra)
├── src/
│   ├── middleware.ts        # headers, rate limiting, route gating
│   ├── instrumentation*.ts, sentry.*.config.ts   # Sentry wiring
│   ├── app/
│   │   ├── (public)/        # public website pages + public forms
│   │   ├── account/         # member portal: login/ and (panel)/ route group
│   │   ├── admin/           # admin portal pages
│   │   ├── login/           # admin credentials login
│   │   ├── api/             # all JSON endpoints
│   │   ├── layout.tsx, error.tsx, not-found.tsx, robots.ts, sitemap.ts
│   ├── core/
│   │   ├── api/             # withApiHandler, apiSuccess/apiError, request id/IP
│   │   ├── errors/          # AppError + ErrorCodes
│   │   ├── logger/          # Pino
│   │   └── monitoring/      # Sentry capture helper
│   ├── security/
│   │   ├── auth/session.ts  # getCurrentUser, requireAuth, requirePermission
│   │   ├── rbac/            # permissions, district scope, admin scope, DB role→permissions
│   │   ├── csrf.ts, rate-limit.ts, sanitize.ts
│   ├── modules/             # domain logic
│   │   ├── auth/            # NextAuth config, public-account linking
│   │   ├── players/, coaches/, memberships/, requests/, applications/
│   │   ├── tournaments/     # tournament CRUD, registration txn, date rules, public cache
│   │   ├── account/         # profile completion, membership pricing
│   │   ├── verify/          # certificate verification (+ client-safe types/constants)
│   │   ├── contact/, equipment/, home/, media/
│   ├── services/            # cross-cutting: audit, certificates (PDF/QR), email (Resend, OTP)
│   ├── infrastructure/
│   │   ├── database/prisma.ts
│   │   └── storage/         # StorageAdapter: local FS or Netlify Blobs
│   ├── shared/
│   │   ├── components/      # ui/, layout/ (header, footer, admin shell/sidebar), admin/, requests/, certificates/
│   │   ├── config/site.ts   # static content: nav, districts, committee, events, images
│   │   └── lib/static-release.ts   # NEXT_PUBLIC_ENABLE_LIVE_FORMS gate
│   ├── lib/                 # cn(), generateId(), slugify(), api-client (CSRF-aware fetch)
│   ├── config/              # constants; routes.ts (legacy, partly stale — not used for routing)
│   └── types/next-auth.d.ts # session/JWT type augmentation
├── next.config.ts, netlify.toml, Dockerfile, docker-compose.yml
```

Naming convention: `*.server.ts` marks modules that import Prisma and must never be imported from Client Components (e.g. `role-permissions.server.ts`, `membership-pricing.server.ts`). Client-safe siblings hold types/pure helpers.

---

## 3. Frontend Architecture

- **App Router.** Route groups: `(public)` (shared public layout with header/footer), `account/(panel)` (sidebar layout for signed-in members), `admin` (AdminShell with sidebar + header).
- **Server Components by default.** Pages fetch with Prisma and authorization helpers; most account/admin pages set `dynamic = "force-dynamic"`. Public tournament pages use ISR (`revalidate = 60`).
- **Client Components** only for interactivity: forms (`*-form.tsx`, `*-flow.tsx`), review action buttons, tables with filtering, modals, navbar, notifications bell, session provider.
- **Forms:** React Hook Form + Zod resolver on the client; the same (or stricter) Zod schema is re-validated on the server. Submissions use `apiFetch()` from `src/lib/api-client.ts`, which fetches and caches a CSRF token from `/api/csrf` and sends it as `x-csrf-token`. Results surface via Sonner toasts.
- **Static release gate:** public forms call `blockSubmitForStaticRelease()`; see Project Status §5.1.
- **Protected routes:** middleware redirects unauthenticated users; server pages additionally call `requireAdminScope(permission)` (admin) or `getCurrentUser()` + `redirect("/account/login")` (account).
- **Loading states:** `loading.tsx` in `(public)`, `account/(panel)`, `account/(panel)/dashboard`, `account/(panel)/profile`, `admin`.
- **Error states:** root `error.tsx`, `not-found.tsx`; shared `EmptyState`, `ErrorState`, `LoadingState` components.
- **Admin sidebar** hides items the user lacks permission for (`hasPermission` on the client-side session) — cosmetic only; enforcement is server-side.

---

## 4. Backend Architecture

### 4.1 API handler pipeline (`withApiHandler`)

```text
request → requestId (uuid) → [rateLimit per module+IP] → [CSRF if requireCsrf && mutating]
        → await params → handler → log {module, method, path, ip, durationMs, status}
errors  → ZodError → 400 VALIDATION_ERROR (issues in details)
        → AppError (operational) → its status/code, logged as warn
        → anything else → 500 INTERNAL_ERROR (message hidden in production), logged + Sentry
```

Uniform envelopes (`src/core/api/api-response.ts`):

```json
{ "success": true,  "data": {}, "message": "optional", "meta": { "requestId": "…", "timestamp": "…" } }
{ "success": false, "error": { "code": "CONFLICT", "message": "…", "details": [] }, "meta": { … } }
```

`AppError` helpers: `badRequest` 400 `BAD_REQUEST`, `validation` 400 `VALIDATION_ERROR`, `unauthorized` 401, `forbidden` 403, `notFound` 404, `conflict` 409, `rateLimited` 429, `internal` 500.

### 4.2 Services

| Service | File | Responsibility |
|---|---|---|
| Player | `modules/players/player.service.ts` | register, approve, reject, resubmit (status-guarded) |
| Coach | `modules/coaches/coach.service.ts` | approve, reject, resubmit (registration is inline in the route) |
| Membership review | `modules/memberships/membership-review.server.ts` | find/approve/reject/resubmit for 3 types |
| Requests | `modules/requests/request.service.ts` | create (dup guard), approve (txn + auto-apply), reject |
| Application history | `modules/applications/application-history.server.ts` | timeline from AuditLog |
| Tournament | `modules/tournaments/tournament.service.ts` | create/update (date validation, unique slug), category CRUD |
| Registration | `modules/tournaments/registration.service.ts` | locked registration transaction |
| Public tournaments | `modules/tournaments/public-tournaments.ts` | cached reads + revalidation |
| Verify | `modules/verify/verify.service.ts` | certificate lookup |
| Certificates | `services/certificates/certificate-service.ts` | PDF + QR + storage + record |
| Audit | `services/audit/audit-service.ts` | `createAuditLog()` |
| OTP / Email | `services/email/otp-service.ts`, `email-service.ts` | OTP generate/verify, Resend send |

District names from forms are resolved case-insensitively to `District.id` (`resolveDistrictId`, duplicated in several services); unknown → 400 "Invalid district selected".

Business IDs come from `generateId(prefix)` = `PREFIX-<Date.now() base36>-<4 random base36>` (e.g. `PLR-MFX2K1AB-7QZC`). Uniqueness is enforced by DB unique constraints, not by the generator.

---

## 5. Authentication Architecture

- Config: `src/modules/auth/config/auth.ts` (NextAuth v5). Handler route: `src/app/api/auth/[...nextauth]/route.ts`. Secret: `AUTH_SECRET` or `NEXTAUTH_SECRET`. `trustHost: true`.
- **Providers:**
  - `credentials` — email (lower-cased) + bcrypt compare against `User.passwordHash`; user must be active.
  - `google` — `GOOGLE_CLIENT_ID/SECRET` (or `AUTH_GOOGLE_ID/SECRET`). `signIn` callback runs `findOrCreatePublicUser`.
  - `email-otp` — verifies code via `verifyOtp`, then `findOrCreatePublicUser`.
- **Account linking rule:** an email owned by a `CREDENTIALS` user can never be taken over by Google/OTP (conflict → refused).
- **JWT callback:** on sign-in, and whenever `authCheckedAt` is older than 60 s, reloads `id, name, isActive, districtId, isFederationWide, role.slug` and the role's permission slugs from `RolePermission`. Inactive/missing user → `token.isActive = false` → `getCurrentUser()` returns null. On first sign-in: updates `lastLoginAt` and writes `LOGIN` audit (failures swallowed).
- **Session callback** copies those fields to `session.user` (typed in `src/types/next-auth.d.ts`).
- **Pages:** `signIn` and `error` pages are `/account/login`. Admins use `/login` (credentials form with demo "Quick login" buttons for the seeded accounts).
- **Middleware session detection** tries `__Secure-authjs.session-token`, `authjs.session-token`, and legacy `next-auth.*` cookie names (fix for a redirect loop, commit `d4c7ee8`).
- **Ownership:** account APIs never accept a user id; they use `requireAuth().id`. Resubmit routes compare `record.userId === session.id` and return 404 otherwise (avoids confirming existence).

---

## 6. RBAC Architecture

### 6.1 Model

`User → Role (1) → RolePermission (n) → Permission`. Permission slugs are `module:action`. Runtime checks read the **database** (via the JWT refresh), not the static map — the static `ROLE_PERMISSIONS` map in `permissions.ts` is only used by the seed.

Hard-coded safety nets:
- `super-admin` passes **every** `hasPermission` check and is always federation-wide.
- `public-user` is blocked from `/admin` by middleware.

### 6.2 Permissions

`users:read|create|update|delete`, `roles:read|manage`, `equipment:read` (Pre-J), `players:read|create|update|approve`, `coaches:read|create|update|approve`, `memberships:read|approve`, `requests:view|approve`, `tournaments:read|manage`, `media:read|manage`, `certificates:read|issue`, `districts:read|manage`, `content:read|manage`, `audit:read`, `settings:manage`.

Several are defined but not enforced anywhere yet (`users:create|delete`, `players:create|update`, `coaches:create|update`, `media:manage`, `districts:manage`, `content:*`) because the corresponding features don't exist.

### 6.3 Seeded system roles (`isSystem = true`)

| Permission | super-admin | federation-admin | district-admin | tournament-manager | content-manager | public-user |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| users:read | ✔ | ✔ | | | | |
| users:update / roles:* / settings:manage | ✔ | | | | | |
| players:read, players:approve | ✔ | ✔ | ✔ | read only | | |
| players:create/update | ✔ | | ✔ | | | |
| coaches:read, coaches:approve | ✔ | ✔ | ✔ | | | |
| memberships:read/approve | ✔ | ✔ | ✔ | | | |
| requests:view/approve | ✔ | ✔ | ✔ | | | |
| tournaments:read/manage | ✔ | ✔ | ✔ | ✔ | | |
| certificates:read/issue | ✔ | ✔ | ✔ | | | |
| districts:read | ✔ | ✔ | ✔ | | | |
| media:read/manage, content:read/manage | ✔ | ✔ | | | ✔ | |
| audit:read | ✔ | ✔ | | | | |
| equipment:read | ✔ | ✔ | | | | |

System roles cannot be edited via the API (`PATCH /api/admin/roles/{id}` → 403). Super Admin can create **custom roles** with any permission set and edit them later; changes apply within ≤ 60 s.

### 6.4 District scope

- `isFederationWide(user)` = role is `super-admin` **or** `User.isFederationWide = true` (a per-person flag toggled at `/admin/users`, not per role).
- `getDistrictWhereClause(user)` → `{}` for federation-wide; otherwise `{ districtId: user.districtId ?? "__no-district-assigned__" }` (sentinel matches nothing).
- `assertDistrictAccess(user, districtId)` → 403 if not federation-wide and districts differ (or user has none).
- `assertTournamentDistrictAccess` → also 403 for state-wide (null-district) tournaments unless federation-wide.
- Requests are scoped by the linked Player/Coach district.

Enforcement points: every admin API (`requirePermission` + district assert) and admin page (`requireAdminScope` + `districtWhere` in queries). `/admin/equipment-orders` uses `equipment:read`; because `EquipmentOrder.district` is free text, district-scoped users are filtered by case-insensitive district **name**.

New permissions reach existing databases only through `npm run db:seed` (idempotent upserts). Runtime checks read `RolePermission`, so a missing permission row means only Super Admin passes.

---

## 7. Database Architecture

PostgreSQL via Prisma 7 (`prisma-client-js` generator, `@prisma/adapter-pg`). All IDs are `cuid()` strings. Table names are snake_case via `@@map`. There is **no `prisma/migrations` directory** — the schema is applied with `npm run db:push`.

### 7.1 Identity & access

| Model (table) | Purpose | Key fields / constraints |
|---|---|---|
| `User` (`users`) | Every login (admin and public) | `email` unique; `passwordHash?`; `authProvider` (`CREDENTIALS`/`GOOGLE`/`OTP_EMAIL`); `googleId?` unique; `isActive`; `isFederationWide`; `roleId`; `districtId?`; `lastLoginAt`. Indexes: roleId, districtId. 1-1 optional: profile, player, coach, club/school/academy membership |
| `UserProfile` (`user_profiles`) | Personal details for portal | `userId` unique (cascade); dateOfBirth, gender, address, city, state, country (default India), pincode |
| `EmailOtp` (`email_otps`) | OTP codes | email (indexed), `otpHash`, `expiresAt`, `attempts`, `consumedAt` |
| `Role` (`roles`) | Role | `name`, `slug` unique; `isSystem` |
| `Permission` (`permissions`) | Permission | `slug` unique; `module`, `action` |
| `RolePermission` (`role_permissions`) | M:N | PK (roleId, permissionId), cascade both ways |
| `RefreshToken` (`refresh_tokens`) | **Unused** | token unique |

### 7.2 Organisation

| `District` (`districts`) | 33 Rajasthan districts (seeded from `site.ts`) | `name`, `slug` unique; officers/contact; `isActive` |
|---|---|---|

### 7.3 Members

| Model | Purpose | Key fields / constraints | Lifecycle |
|---|---|---|---|
| `Player` (`players`) | Player registration | `playerId` unique (business ID); name, dateOfBirth, gender, email, mobile, photo?, `districtId`, `userId?` **unique** (SetNull on user delete), state (default Rajasthan), category?, `status: ApprovalStatus`, approvedAt/By, rejectionReason, expiresAt. Indexes: districtId, status | PENDING → APPROVED / REJECTED → (resubmit) PENDING. `EXPIRED` unused |
| `PlayerCertificate` (`player_certificates`) | Issued certificate | `certificateNumber` unique, `qrCode` unique, playerId (cascade), issuedAt, expiresAt?, pdfPath?, isRevoked/revokedAt/revokedReason | Created by admin; revocation fields never set by code |
| `Coach` (`coaches`) | Coach registration | `coachId` unique; qualification, `certificationLevel`; otherwise as Player | Same as Player |
| `CoachCertificate` (`coach_certificates`) | As PlayerCertificate | | Only seed creates rows |
| `ClubMembership` / `SchoolMembership` / `AcademyMembership` | Institutional memberships | `membershipId` unique; `userId?` unique; `districtId`; `status: MembershipStatus`; approval fields; expiresAt; certificatePath. Indexes: districtId, status | PENDING → APPROVED / REJECTED → (resubmit) PENDING. `ACTIVE/EXPIRED/SUSPENDED` unused |
| `Request` (`requests`) | Change request against own Player/Coach | `requestNumber` unique; userId (cascade); playerId? / coachId? (cascade); `type: RequestType`; `status: RequestStatus`; reason; currentValue/requestedValue; requestedMobile/Email/Address/DistrictId; adminRemarks, rejectionReason, resolvedAt/By. Indexes: userId, playerId, coachId, status | PENDING → APPROVED / REJECTED (terminal) |

Enums: `Gender {MALE, FEMALE, OTHER}`, `ApprovalStatus {PENDING, APPROVED, REJECTED, EXPIRED}`, `CertificationLevel {LEVEL_1, LEVEL_2, LEVEL_3, INTERNATIONAL}`, `MembershipType {CLUB, SCHOOL, ACADEMY}` (unused), `MembershipStatus {PENDING, APPROVED, REJECTED, ACTIVE, EXPIRED, SUSPENDED}`, `RequestType` (8 values), `RequestStatus {PENDING, APPROVED, REJECTED}`.

### 7.4 Tournaments

| Model | Purpose | Key fields / constraints |
|---|---|---|
| `Tournament` (`tournaments`) | Event | `slug` unique; `category: TournamentCategory {JUNIOR, SENIOR, OPEN, PROFESSIONAL}`; `status: TournamentStatus {DRAFT, REGISTRATION_OPEN, REGISTRATION_CLOSED, IN_PROGRESS, COMPLETED, CANCELLED}`; districtId? (null = state-wide); venue, city; startDate, endDate, registrationStart?, registrationDeadline?; maxParticipants?; `banner` (poster URL); contact*; `requiresApprovedPlayer` (default true). Indexes: status, districtId |
| `TournamentRegistrationCategory` (`tournament_registration_categories`) | Purchasable entry option | tournamentId (cascade), name, `type: TournamentEventType {SINGLES, DOUBLES}`, **`fee Int` (whole rupees, current price)**, isActive. Index: tournamentId |
| `TournamentRegistration` (`tournament_registrations`) | A player's entry | tournamentId (cascade), playerId (no cascade), categoryId?, **`amount Int?` (price snapshot; null only on legacy rows — refused by `getPayableRegistrationAmount()`)**, seed? (unused), `status: ApprovalStatus` (always PENDING today), registeredAt. **Unique (tournamentId, playerId)** |
| `Fixture` (`fixtures`) | **Schema only — unused** | round, roundName, matchNumber, player1Id/player2Id/winnerId (plain strings, no FK), scheduledAt |
| `Match` (`matches`) | **Schema only — unused** | fixtureId unique, scores, winnerId, status string |

Note: `TournamentRegistration` has no index on `playerId` or `categoryId` other than the composite unique (which leads with tournamentId).

### 7.5 Content, commerce, audit

| Model | Purpose | Written by |
|---|---|---|
| `News`, `Video`, `Gallery`, `GalleryImage` | Media CMS | Seed only (no admin write API); read by public/admin pages |
| `Donation` | Donation pledges (no payment) | `POST /api/donations` |
| `ContactMessage` | Contact form | `POST /api/contact` |
| `EquipmentOrder` | Equipment enquiries (index createdAt) | `POST /api/equipment/orders` |
| `WebsiteContent`, `ExecutiveMember`, `Partner` | CMS tables | **Unused** (content lives in `site.ts`) |
| `AuditLog` (`audit_logs`) | Audit trail | See §11. Indexes: userId, module, createdAt |
| `Setting` (`settings`) | Key/value config | Seed; read by membership pricing and `/admin/settings` |

---

## 8. Database Relationships

```text
Role ──< RolePermission >── Permission
  │
  └──< User >── District (optional)
         ├── UserProfile        (0..1)
         ├── Player             (0..1) ──< PlayerCertificate
         │        ├──< TournamentRegistration
         │        └──< Request
         ├── Coach              (0..1) ──< CoachCertificate
         │        └──< Request
         ├── ClubMembership     (0..1)
         ├── SchoolMembership   (0..1)
         ├── AcademyMembership  (0..1)
         ├──< Request
         └──< AuditLog (SetNull on user delete)

District ──< Player, Coach, Club/School/AcademyMembership, Tournament, User
District ──< Request (as requestedDistrict)

Tournament (district optional)
 ├──< TournamentRegistrationCategory
 │        └── fee            ← current price
 ├──< TournamentRegistration ── Player
 │        ├── category (optional FK)
 │        └── amount         ← immutable snapshot of fee
 ├──< Fixture ── Match (1:1)   (unused)
 └──< Match                    (unused)
```

Delete behaviour worth knowing: deleting a Tournament cascades to categories/registrations; deleting a User nulls `Player.userId`/`Coach.userId`/membership `userId` but cascades `Request` and `UserProfile`; a Player with registrations cannot be deleted (no cascade on `TournamentRegistration.player`). No delete endpoints exist for these models today.

---

## 9. Transaction & Concurrency Architecture

| Operation | Mechanism |
|---|---|
| Approve/reject Player, Coach, Membership | Single `updateMany where {id, status: PENDING}`; `count === 0` → 409. Prevents double-processing without explicit locks |
| Resubmit | `updateMany where {id, status: REJECTED}` → 409 otherwise; races with an admin decision lose cleanly |
| Request approve | Interactive `$transaction`: status guard `updateMany` + type-specific auto-apply to Player/Coach/UserProfile — atomic |
| Request reject | Guarded `updateMany` |
| Role permission edit | Batch `$transaction([deleteMany, createMany])` |
| **Tournament registration** | Interactive `$transaction`: `SELECT id FROM tournaments WHERE id = $1 FOR UPDATE` serialises all registrations for the same tournament; then status/window/player/category/duplicate/capacity checks; insert with `amount = category.fee`; audit row in the same txn. Unique `(tournamentId, playerId)` is the final guard; Prisma `P2002` → 409 |

Concurrent registration behaviour: two players racing for the last slot are serialised by the row lock — the second sees the updated count and gets "capacity has been reached". The same player double-submitting gets 409. Because fee is read inside the locked transaction, a concurrent admin fee change either lands before (new price) or after (old price) — never a mixed value.

Capacity counts `PENDING` and `APPROVED` registrations; there is no status that frees a slot today.

---

## 10. Security Architecture

| Layer | Mechanism | Where |
|---|---|---|
| Transport/headers | CSP (dev allows `unsafe-eval`), HSTS 2y preload, X-Frame-Options DENY, nosniff, X-XSS-Protection, Referrer-Policy, Permissions-Policy, `X-Request-Id` | `middleware.ts`; `next.config.ts` also sets headers; `poweredByHeader: false` |
| Rate limiting | Global 120/min/IP on `/api/*`; 20/min/IP on `/login*`; per-route module limits | `middleware.ts`, `withApiHandler`, `rate-limit.ts` (Upstash sliding window or in-memory fixed window) |
| CSRF | Double-submit: `GET /api/csrf` sets httpOnly `csrf_token` (SameSite=Strict, 8 h) and returns it; client echoes `x-csrf-token`; compared on POST/PUT/PATCH/DELETE when `requireCsrf` | `security/csrf.ts` |
| AuthN | JWT session; periodic DB refresh; inactive users dropped | §5 |
| AuthZ | Permission + district checks server-side | §6 |
| Input | Zod schemas; `sanitizeText` HTML-escapes and caps at 10 000 chars; email lower-cased; phone stripped to digits/`+-()` | `security/sanitize.ts` |
| Mass assignment | Explicit field mapping in services; profile PATCH schema excludes id/userId/email | routes |
| Secrets | bcrypt (12 rounds seed passwords, 10 rounds OTP) | seed, otp-service |
| Errors | Production hides internal messages; request id in every response | `app-error.ts` |
| File serving | `/api/files/*`: session required; rejects `..`, backslash and NUL; local paths resolved and confined to the storage root; file served only if a certificate/membership record references that exact path and the caller owns it or has the module read permission in district (else 404); `Cache-Control: private, no-store` | `api/files/[...path]` |

Known gaps: see Project Status §9 (items 12–16).

---

## 11. Audit Architecture

`AuditLog { userId?, action: AuditAction, module, entityId?, entityType?, details Json?, ipAddress?, userAgent?, createdAt }`. Written via `createAuditLog()` or directly inside a transaction (tournament registration). `ipAddress`/`userAgent` are **never populated** by current code.

| Module | Action | `details.event` / content | Trigger |
|---|---|---|---|
| auth | LOGIN | `{email, provider}` | Any successful sign-in |
| users | CREATE | `{provider, email}` | Public user auto-created |
| users | UPDATE | `{field: isActive/role/district/isFederationWide, previousValue, newValue}` | Admin user actions |
| roles | CREATE / UPDATE | name/slug/permissionIds · `{field: permissions, previousValue, newValue}` | Role editor |
| players / coaches | APPROVE / REJECT | `{reason}` on reject | Admin review |
| players / coaches | UPDATE | `APPLICATION_RESUBMITTED` | Owner resubmits |
| memberships | APPROVE / REJECT / UPDATE | `{type}`, `{type, reason}`, `APPLICATION_RESUBMITTED` | Review / resubmit |
| certificates | CREATE | `{certificateNumber}` | Player certificate issued |
| requests | CREATE / APPROVE / REJECT | `REQUEST_CREATED` / `REQUEST_APPROVED` / `REQUEST_REJECTED` with type, reason | Requests |
| tournaments | CREATE / UPDATE / DELETE | `TOURNAMENT_CREATED`, `TOURNAMENT_UPDATED`, `TOURNAMENT_STATUS_CHANGED {from,to}`, `TOURNAMENT_CATEGORY_CREATED`, `TOURNAMENT_CATEGORY_UPDATED`, `TOURNAMENT_FEE_CHANGED {from,to}`, `TOURNAMENT_CATEGORY_DISABLED`, `TOURNAMENT_CATEGORY_DELETED`, `TOURNAMENT_REGISTRATION_CREATED {tournament, category, player, registrationId, amount}` | Tournament admin & registration |

**Not audited:** Player/Coach/Membership initial registration, profile edits, contact/donation/equipment submissions, OTP requests, logout. Audit reads: `/admin/audit-logs` (latest 200), admin dashboard recent activity, account dashboard activity, application history timelines.

---

## 12. Performance Architecture

- **Caching:** `getPublishedTournaments()` / `getPublicTournamentBySlug()` use `unstable_cache` (60 s, tag `public-tournaments`); slug lookup also wrapped in React `cache()` for per-request dedupe. `revalidatePublicTournaments()` = `revalidateTag("public-tournaments", {expire: 0})` + `revalidatePath` for list and `[slug]`.
- **Auth:** JWT refresh throttled to 60 s; `getSession`/`getCurrentUser` React-`cache`d.
- **Middleware:** early return for public paths.
- **Queries:** `select` projection on public/list queries, `_count` for counts, `Promise.all` for parallel reads, `take` caps on lists.
- **Prisma client:** singleton on `globalThis`, lazy proxy (build doesn't need `DATABASE_URL`).
- **Static assets:** `next/image` AVIF/WebP; Netlify immutable caching for `/_next/static/*` and `/images/*`; HTML `s-maxage=86400, stale-while-revalidate=604800` at the CDN (dynamic routes set their own headers).
- **Bundle:** `optimizePackageImports` for lucide; `.server.ts` split.

No benchmark data is stored in the repository.

---

## 13. Storage / Files

| Capability | Status |
|---|---|
| `StorageAdapter` interface (`upload`, `delete`, `getUrl`) | IMPLEMENTED |
| Local adapter — writes to `STORAGE_LOCAL_PATH` (default `./uploads`); URLs are `/api/files/<path>` (Pre-J; `STORAGE_PUBLIC_URL` no longer used) | IMPLEMENTED |
| Netlify Blobs adapter — store `NETLIFY_BLOBS_STORE` (default `rra-uploads`), served through `/api/files/<path>` | IMPLEMENTED |
| Selection: `STORAGE_TYPE`, else `netlify` when `NETLIFY=true`, else `local` | IMPLEMENTED |
| What is stored: certificate PDFs (`certificates/<CERT>.pdf`) only | IMPLEMENTED |
| User uploads (photos, ID proofs, documents) | NOT IMPLEMENTED |
| Tournament posters | Not stored — external URL in `Tournament.banner` |
| S3/Azure/MinIO adapters (previously claimed in the README; corrected 2026-09-26) | NOT IMPLEMENTED |

Both adapters return `/api/files/<path>` URLs, so every stored file goes through the authorisation check. Public verification (`/api/verify`) returns data only and never links to files.

**Access rules (`canAccessFile`):**

| File referenced by | Allowed |
|---|---|
| `PlayerCertificate.pdfPath` / `CoachCertificate.pdfPath` | The linked user (owner), or `certificates:read` + district access |
| `Club/School/AcademyMembership.certificatePath` | The linked user, or `memberships:read` + district access |
| Anything else | Nobody (404) |

---

## 14. External Services

| Service | Used for | Config | Status |
|---|---|---|---|
| PostgreSQL (Neon suggested for Netlify) | Primary DB | `DATABASE_URL` | Required |
| Google OAuth | Member login | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; redirect `/api/auth/callback/google` | IMPLEMENTED |
| Resend | OTP emails only | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (default `onboarding@resend.dev`) | IMPLEMENTED |
| Netlify Blobs | Certificate PDFs on Netlify | automatic on Netlify / `STORAGE_TYPE=netlify` | IMPLEMENTED |
| Upstash Redis | Distributed rate limiting | `UPSTASH_REDIS_REST_URL/TOKEN` | Optional |
| Sentry | Error monitoring | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Optional |
| YouTube (embeds/links) | Media videos | static | IMPLEMENTED (display) |
| Payment gateway (e.g. Razorpay) | — | — | **NOT IMPLEMENTED** |

---

## 15. Static Assets

All static imagery lives in `public/images/`; paths are configured in `src/shared/config/site.ts` (`siteImages`, `executiveCommittee`, `heroSlides`, `tournamentEvents`, `districtLogos`, `physioPartners`). Official photos supplied by RRA are kept in `docs/*.jpg|jpeg` and copied to `public/images/rra/`.

| Group | Examples | Used on |
|---|---|---|
| Branding | `/images/cropped-rra-logo.webp` (header/footer/login), `/images/cropped-rra-logo-32x32.webp` (favicon), `/images/rra-logo-2-1024x995.webp` | All pages |
| Leadership | `/images/rra/portrait-aamir-khan.jpg`, `portrait-ravindra-bhati.jpg`, `portrait-ajay-meena.jpg`, `/images/asishpooniawalaimage.jpeg`, `/images/manoj-kumar-edited-1.webp`, `leadership-team-banner.jpg`, `rra-affiliation-poster.jpg` | `/about/executive-committee`, home |
| Home | hero `IMG_20260119_152906-edited-scaled.jpg`, `IMG_20260119_153432-edited-scaled.jpg`, `racquetball-court-1024x674.webp`; president `mangi-ram.webp`; sponsors `brightmoon.jpeg`, `emasa1.jpeg`; federation logos; Road-to-Chengdu banner | `/` |
| Tournament poster | `/images/rra-state-championship-2026-poster.png` (static event "Racquetball Training Camp & State Championship", 30 June 2026, Jaipur) | `/tournaments` |
| Resources | `racquetball-spec-1024x1024.webp`, `racquetballracquet.jpeg`, `racquetball-balls.webp`, `equipemntimage1.jpeg`, `image123modern.jpeg` | `/resources/*` |
| Gallery | 5 images (`8040892_orig.jpg`, `1001067424-1024x768.jpg`, `rajbalajs-edited-2.jpeg`, …) | `/media/gallery` |
| Icons | social (`fb-1-1024x1024.webp`, `Instagram_icon.png-1024x1024.webp`, `yt-image-1.png`), contact (`icon-email.png`, `icon-phone-call.png`, `icon-push-pin-simple.png`) | footer, `/contact` |

To replace an image: add it under `public/images/`, update the path in `site.ts`, hard-refresh. `public/` deploys with the build.
