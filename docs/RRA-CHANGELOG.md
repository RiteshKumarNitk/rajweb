# RRA Platform — Changelog

Chronological development history. Newest entries at the bottom of each section; add a new entry for every phase.

**About dates:** the git history starts on **2026-09-24** (commit `0f0a4f2`), and that first commit already contains Foundation and Phases A–I. Dates for those phases are therefore **not confirmed**; they are marked "Before 2026-09-24". Later entries carry actual commit dates.

Current status of every module: [RRA-PROJECT-STATUS.md](RRA-PROJECT-STATUS.md).

---

## Foundation — Platform, public website, admin core

### Date
Before 2026-09-24 (not confirmed).

### Summary
Next.js 16 / React 19 / Prisma / PostgreSQL platform with the public federation website, admin credentials login, RBAC, districts, audit logging, certificate PDFs and verification.

### Features Added
- Public site: home, about, districts, governance, resources, media, contact, donations, equipment enquiries, verify.
- Static release mode (`NEXT_PUBLIC_ENABLE_LIVE_FORMS`) to ship an informational site before forms go live.
- Admin portal shell with dashboard, players, coaches, memberships, certificates, media (read-only), districts (read-only), users, audit logs, settings (read-only), equipment orders.
- Player certificate issuance (PDFKit + QR) with local/Netlify Blobs storage.

### Database Changes
Core schema: User, Role, Permission, RolePermission, RefreshToken (unused), District, Player, PlayerCertificate, Coach, CoachCertificate, Club/School/AcademyMembership, Tournament, TournamentRegistration, Fixture, Match, News, Video, Gallery, GalleryImage, Donation, ContactMessage, EquipmentOrder, WebsiteContent, ExecutiveMember, Partner, AuditLog, Setting. Seed: 6 system roles, permissions, 33 districts, two admin accounts, sample records.

### API Changes
`/api/health`, `/api/csrf`, `/api/verify`, `/api/contact`, `/api/donations`, `/api/equipment/orders`, `/api/files/*`, `/api/players/register`, `/api/coaches/register`, `/api/memberships/{club,school,academy}`, `/api/admin/players/{id}/{action}`.

### Security Changes
Middleware security headers, global rate limiting, CSRF double-submit, Zod validation, sanitisation, district scoping.

### Testing
Manual checklists (previously `docs/TESTING.md`, `docs/TEST-DATA.md`, now merged into [RRA-TESTING.md](RRA-TESTING.md)).

### Known Limitations
No automated tests; no migrations directory; CMS read-only.

---

## Phase A — User portal & public-user authentication

### Date
Before 2026-09-24 (not confirmed).

### Summary
Member-facing `/account` portal with Google OAuth and email-OTP sign-in.

### Features Added
Account login page, dashboard, profile with completion %, settings/sign-out, notifications bell (UI shell only).

### Database Changes
`UserProfile`, `EmailOtp`; `User.authProvider`, `googleId`, `lastLoginAt`; `public-user` role.

### API Changes
`/api/auth/otp/request`, `/api/account/me`, `GET|PATCH /api/account/profile`; NextAuth `google` and `email-otp` providers.

### UI Changes
`/account/login`, `/account/dashboard`, `/account/profile`, `/account/settings`.

### Security Changes
Account-linking rule (no takeover of CREDENTIALS accounts); OTP hashing, TTL, attempt cap, per-email and per-IP rate limits; `/account/*` middleware gate.

### Testing
Authentication tests A1–A16.

### Known Limitations
No notifications backend; no seeded member account.

---

## Phase B — Player registration

### Date
Before 2026-09-24 (not confirmed).

### Summary / Features
Player registration from the public site and the portal; logged-in submissions linked to the user; one per user.

### Database Changes
`Player.userId` (unique, optional).

### API Changes
`/api/players/register` links to session user; 409 on duplicate.

### UI Changes
`/account/player` registration flow and status.

### Known Limitations
No photo/document upload; anonymous registrations unlinkable.

---

## Phase C — Coach registration

### Date
Before 2026-09-24 (not confirmed).

### Summary / Features
Same pattern as Phase B for coaches (`/account/coach`, `/api/coaches/register`, `Coach.userId`).

### Known Limitations
Coach certificate issuance not exposed via API/UI.

---

## Phase D — Memberships

### Date
Before 2026-09-24 (not confirmed).

### Summary / Features
Club, School, Academy applications from the portal; one per user per type; New/Renewal price display from settings.

### Database Changes
Membership `userId` (unique); settings `membership_fee_{club,school,academy}_{new,renewal}` (replacing single-value keys, which the seed deletes).

### UI Changes
`/account/memberships` overview and per-type pages.

### Known Limitations
No renewal workflow, payment, activation/expiry, or pricing editor.

---

## Phase E — Application approval

### Date
Before 2026-09-24 (not confirmed).

### Summary / Features
Unified admin review queue and detail pages for Players, Coaches and Memberships; approve/reject with reason.

### API Changes
`/api/admin/coaches/{id}/{approve|reject}`, `/api/admin/memberships/{type}/{id}/{approve|reject}`; reject reason in player route.

### UI Changes
`/admin/applications`, `/admin/applications/[type]/[id]`.

### Security Changes
Status-guarded `updateMany` (409 on double processing); district assertions.

### Testing
AP1–AP7.

---

## Phase F — Resubmission

### Date
Before 2026-09-24 (not confirmed).

### Summary / Features
Owners correct and resubmit REJECTED applications in place; history timeline built from audit logs.

### API Changes
`/api/players/{id}/resubmit`, `/api/coaches/{id}/resubmit`, `/api/memberships/{type}/{id}/resubmit`.

### Security Changes
Ownership check (404 for non-owners); REJECTED-only guard.

---

## Phase G — Requests

### Date
Before 2026-09-24 (not confirmed).

### Summary / Features
Player/Coach change requests (8 types); CONTACT_UPDATE, DISTRICT_CHANGE, ADDRESS_UPDATE auto-apply on approval.

### Database Changes
`Request` model, `RequestType`, `RequestStatus`; permissions `requests:view`, `requests:approve`.

### API Changes
`POST /api/requests`, `/api/admin/requests/{id}/{approve|reject}`.

### UI Changes
Requests panel on player/coach portal pages; `/admin/requests`, `/admin/requests/[id]`.

### Known Limitations
No attachments; informational types need manual follow-up.

---

## Phase H — Tournament management

### Date
Before 2026-09-24 (not confirmed). A temporary verification script `prisma/_phase-h-verify.ts` was removed on 2026-09-24 (`8cb09e7`).

### Summary / Features
Admin tournament create/edit, statuses, IST date handling and ordering rules, registration window, capacity, poster URL (Google Drive link stored in `banner`), eligibility flag, fee-bearing registration categories (disable-instead-of-delete when used).

### Database Changes
`Tournament.registrationStart`, `contactName/Phone/Email`, `requiresApprovedPlayer`; `TournamentRegistrationCategory` (+ `TournamentEventType`); `TournamentRegistration.categoryId`, `amount`.

### API Changes
`POST /api/admin/tournaments`, `PATCH /api/admin/tournaments/{id}`, category POST/PATCH/DELETE.

### UI Changes
`/admin/tournaments`, `/admin/tournaments/[id]`, public `/tournaments/[slug]`.

### Security Changes
`assertTournamentDistrictAccess` (state-wide = federation-only).

### Testing
T1–T20.

---

## Phase I — Tournament registration

### Date
Before or on 2026-09-24 (the registration service, API and portal pages appear in the diff of `8cb09e7`, 2026-09-24; not confirmed as the original delivery date).

### Summary / Features
Players register themselves into one active category per tournament from `/account/tournaments/[tournamentId]`.

### Database Changes
None beyond Phase H fields; uses unique `(tournamentId, playerId)`.

### API Changes
`POST /api/tournaments/{tournamentId}/registrations`.

### UI Changes
Account tournament list with "My registrations" (snapshot amount), tournament detail + register form, admin registrations table.

### Security Changes
Row lock (`SELECT … FOR UPDATE`), server-side price snapshot, duplicate and capacity checks in one transaction, audit in the same transaction.

### Testing
TR1–TR19 and the price snapshot test.

### Known Limitations
Registrations remain PENDING; no admin review, withdrawal, partner, or payment.

---

## Phase I.5 — Performance

### Date
2026-09-24 (`4082c58`), with follow-up fixes 2026-09-25 (`d4c7ee8`, `3058171`).

### Summary
Faster navigation without changing registration or permissions.

### Changes
- Public tournament list/detail cached (`unstable_cache`, 60 s, tag `public-tournaments`) with revalidation on every admin tournament/category write.
- JWT role/permission refresh throttled to once per 60 s (`authCheckedAt`); `getCurrentUser` React-cached.
- Loading skeletons for account panel and admin.
- Narrower queries on account dashboard, admin memberships/requests/audit/tournament pages.
- Fixed infinite redirect loop by checking all session-cookie name variants in middleware (`d4c7ee8`); removed secondary DB lookups/redirects in account pages (`3058171`).

### Testing
PF1–PF7 (no measurements recorded).

---

## UI & Verification refresh

### Date
2026-09-25 – 2026-09-26.

### Changes
- `b0d51cb`, `7297970`: safe name fallback on dashboard; hydration warning suppression.
- `8ddcc0f`: header user icon; verify link moved to footer and account panel.
- `a4d9c5b`: redesigned member dashboard, settings, profile, panel pages.
- `1dfe39d`: `/account/verify`, official visual certificate renderer, sample championship certificates and official signatories (static data), name/district verification.
- `a5dbe99`: split client-safe `verify.types.ts` to fix a build error (`fs` in client bundle).
- `c2900d2`, `80ef6bd`: admin portal redesign (sectioned sidebar, header bar, telemetry cards, command center dashboard).

### Database / API Changes
`/api/verify` gained `name`, `district`, `fatherName` parameters and a POST form. No schema changes.

---

## Documentation consolidation

### Date
2026-09-26.

### Changes
Documentation consolidated into five files: `RRA-PROJECT-STATUS.md`, `RRA-ARCHITECTURE.md`, `RRA-API.md`, `RRA-TESTING.md`, `RRA-CHANGELOG.md`. Previous `ER-DIAGRAM.md`, `TESTING.md`, `TEST-DATA.md`, `IMAGES.md` merged and removed. No application code changed.

---

## Pre-Phase-J Gap Fix & Readiness

### Date
2026-09-26.

### Summary
Closed the security and data-consistency gaps found in the documentation audit before starting payments. No new features, no schema change.

### Security Fixes
- `/admin/equipment-orders` now requires the new `equipment:read` permission (Super Admin, federation-admin) with district-name scoping; the sidebar item is gated too.
- `/api/files/*` requires a session plus ownership or module read permission in district; unknown/unauthorised → 404; `private, no-store`; storage-root confinement for local files. Local adapter URLs moved from `/uploads/...` to `/api/files/...`.

### Validation Fixes
- Rejection reason required (1–1000 chars) by the Player, Coach and Membership reject APIs; the players-table Reject now prompts for one.
- CONTACT_UPDATE / ADDRESS_UPDATE requests must carry the value to apply.
- Tournament edit form checks date order client-side (server unchanged).

### Data Consistency Fixes
- Public coach form: certification level was always saved as `LEVEL_1` (option values did not match the mapping); fixed, and the "Applying for Certification" option removed. Existing public-form coaches need admin review.
- Public Player/Coach/Club/School/Academy/Donation forms: removed fields the API discarded (Aadhaar, club, experience, established year, board, sports incharge, player capacity, academy cert level, additional info, PAN).
- `getPayableRegistrationAmount()` guard for Phase J; legacy null amounts are labelled in admin/member UIs.

### Database Changes
None to the schema. The seed creates the `equipment:read` permission — re-run `npm run db:seed` on existing databases.

### API Changes
Reject endpoints (players, coaches, memberships) require `reason`; `/api/files/*` requires auth; `POST /api/requests` validates contact/address values.

### Testing
`npx prisma validate` ✔, `npx tsc --noEmit` ✔, `npx next build --webpack` ✔ (`npm run build` with Turbopack fails on this Windows machine because native SWC bindings are unavailable — environmental). `npm run lint`: 0 errors in changed files; 5 pre-existing errors elsewhere. Logged-out runtime checks passed (see [RRA-TESTING.md §16](RRA-TESTING.md#16-pre-phase-j-regression-cases)); signed-in cases pending on a non-production database.

### Documentation
All five docs updated.

---

## Gallery CMS & Google Drive links

### Date
2026-09-26.

### Summary
The public photo gallery is now database/content driven and admin-managed. Existing UI (header, cards, category tabs, lightbox) is unchanged; clicking a gallery item now also offers an optional per-item Google Drive link in the lightbox.

### Features Added
- Public `/media/gallery` reads the `Gallery` table (active `isPublished` items only, `sortOrder` asc then newest) instead of the static `siteImages.gallery` list; static list retained as fallback when the DB is unavailable/empty.
- Gallery lightbox shows the item's description (when present) and a **View on Google Drive** button (`target="_blank"`, `rel="noopener noreferrer"`) when the item has a `driveUrl`; no button when it does not.
- Admin gallery management at `/admin/media/gallery`: add/edit/delete items, set/remove the Drive URL, activate/deactivate, change sort order. Sidebar entry gated by `media:read`; all writes require `media:manage`.
- New APIs: `POST /api/admin/gallery`, `PATCH|DELETE /api/admin/gallery/{id}` (`media:manage`, CSRF, Zod-validated).
- Server-side Drive URL validation (`drive.google.com`, or `docs.google.com/…/d/…` sharing links); stored as-is, never fetched/proxied.

### Database Changes
`Gallery` model extended with `imageUrl String?`, `driveUrl String?`, `sortOrder Int @default(0)` (+ `@@index([sortOrder])`). Existing `title`/`category`/`isPublished`/`publishedAt`/`slug` reused; `GalleryImage` unchanged. Applied with `npm run db:push` (no migrations dir). Seed now upserts the 14 previously static gallery items (order and imagery preserved; Drive URLs left empty — none invented).

### Security Changes
All gallery mutations behind `requirePermission(MEDIA_MANAGE)` + CSRF; public reads filtered to `isPublished = true`; Drive URL validated server-side; no user HTML rendered; audit events `GALLERY_ITEM_CREATED/UPDATED/ACTIVATED/DEACTIVATED/DELETED` (+ `GALLERY_DRIVE_URL_CHANGED` detail) in module `media`.

### Cache
New `public-gallery` unstable_cache tag (60 s) + `/media/gallery` path revalidation on every admin write — mirrors the public tournaments pattern.

---

## Contact inbox, Equipment shop, YouTube videos

### Date
2026-09-26.

### Summary
Three new modules on the existing architecture: (1) the contact form now persists and emails the Super Admin, with an admin inbox; (2) an authenticated equipment shop with a catalog, safe stock handling, snapshot-priced orders and member-facing order pages; (3) database-driven YouTube video management for the public videos page.

### Contact
- `ContactMessage` gained `status ContactStatus` (NEW/READ/REPLIED/CLOSED) + `emailSent`; the public form still stores first, then sends best-effort emails (Super Admin notification with reply-to, plus visitor confirmation). Recipient: Setting `contact_email` → `SUPER_ADMIN_EMAIL` env → site default — never hardcoded in code.
- Admin inbox `/admin/contact` (+ detail/status/delete) gated by the new `contact:read`/`contact:manage` permissions.

### Equipment
- New models `EquipmentItem` (integer-rupee `price`, `stockQuantity`, category enum, slug) and `EquipmentPurchaseOrder`/`EquipmentPurchaseOrderItem` (name + unit-price snapshots; order totals never re-priced).
- Public `/equipment` catalog (active items, category tabs, stock indicator, login-gated buy panel). New account pages `/account/orders` and `/account/equipment` (session-scoped queries).
- Purchase flow: one transaction reserves stock via conditional atomic decrement (never negative, 409 on race loss) and snapshots prices; cancellation restocks. Payment verification fails closed — orders stay `PENDING_PAYMENT` until the Phase-J gateway exists; the browser can never mark an order paid.
- Admin `/admin/equipment` (catalog CRUD) and `/admin/equipment/orders` (fulfilment status only) with the new `equipment:manage` permission; deletion of purchased items archives instead of destroying.

### Videos
- New `MediaVideo` model (normalized `youtubeVideoId`, original URL). The legacy unused `Video` model is untouched.
- Admin `/admin/media/videos` (new `videos:manage` permission) validates YouTube IDs server-side; public `/media/videos` now reads the DB (active, `sortOrder` asc, cached tag `public-videos`) with the static list as fallback; thumbnails derive from the video ID.

### Navigation
Public navbar gains **Equipment Shop**; account sidebar gains Equipment → My Orders / My Equipment; admin sidebar gains Communications (Contact Messages, Videos) and Equipment Shop (Catalog, Orders).

### Database Changes
`ContactMessage`: +`status`, `emailSent`, `updatedAt`, index on status. New enums: `ContactStatus`, `EquipmentCategory`, `PurchaseStatus`, `PaymentStatus`. New models: `EquipmentItem`, `EquipmentPurchaseOrder`, `EquipmentPurchaseOrderItem`, `MediaVideo`. New permissions: `contact:read/manage`, `equipment:manage`, `videos:manage` (federation-admin seeded; re-run `npm run db:seed`). Seed also adds a demo equipment placeholder. Apply with `npm run db:push`.

### Tournament payments untouched
Equipment orders are separate business entities with their own snapshots; `TournamentRegistration.amount` and its pricing rule are unchanged, and no payment provider was introduced.

---

## Scope correction, regression fixes and full runtime regression pass

### Date
2026-09-27.

### Summary
Per product decision, the broad "Website Content CMS" was reverted: all informational pages (Home sections, About, History, Executive Committee, News, Mission/Vision/Governance/Resources/Facilities) are static again; the generic content models, APIs, admin pages and seed were removed. The dynamic scope is exactly: **Districts, Gallery, Videos, Equipment shop, Contact submissions**. This pass also fixed the production regressions and ran a full runtime smoke test of every flow.

### Regression fixes
- Server Components render error (production): caused by public pages querying `Achievement`/`TimelineItem` tables that did not exist on the deployed database. Those pages are static again and the models are gone from the schema — pages render with static content even when tables are missing.
- `/news?_rsc=...` 404: `/news` was never a route (news lives at `/media/news`); the admin Media page linked to the wrong URL. Link corrected and a permanent `308` redirect `/news → /media/news` added in `next.config.ts`.

### Schema/seed corrections (CMS leftovers)
- `ExecutiveMember.order` restored (seed writes it; the column exists in live DBs).
- `Partner.updatedAt` removed (was a CMS-era addition that broke `db push` on populated tables).
- Seed news items no longer pass `isActive` (field does not exist on the original `News` model). `npm run db:seed` now runs cleanly.
- `prisma migrate diff` against the live database is now **purely additive** (new tables/columns/enums only, no drops).

### Verification
- `tsc --noEmit`, `prisma validate`, `prisma generate`: clean. Lint: 5 pre-existing baseline errors only. `next build --webpack`: 47 pages, all routes present, `/admin/content/*` gone.
- Runtime smoke test (49 checks) against an isolated disposable Postgres (Docker) with schema push + seed: public pages `200`; `/news` `308`; anonymous admin/account gating; contact submit (CSRF, validation, storage); login-gated purchase with atomic stock reservation; order cancellation with restock; admin CRUD for gallery (incl. Drive-URL validation), videos (YouTube URL validation, duplicate detection), districts (activate/deactivate) and equipment (create/price/delete); RBAC denials for non-admin users; audit rows written for every admin action. All 49 pass.
- The shared/production database was never modified during testing; no real emails were sent (email sends are best-effort and skipped without `RESEND_API_KEY`).

### Deploy checklist
On production after pulling: `npm run db:push` (additive only) then `npm run db:seed` (idempotent; adds the new permissions to federation-admin).

---

## Multi-state hierarchy & admin regression fixes

### Date
2026-09-27.

### Summary
The platform now models **Super Admin → State → District → members** without hard-coding any state, keeps all existing data (backfilled to the founding state), enforces State/District isolation server-side everywhere, and fixes five reported admin bugs plus three found while tracing them. Full detail: [RRA-PROJECT-STATUS.md §14](RRA-PROJECT-STATUS.md#14-multi-state-hierarchy--regression-fixes-2026-09-27).

### Database Changes (additive)
- New `State` model (`name`/`slug`/`code` unique, `isActive`, `sortOrder`).
- `District.stateId` (nullable for legacy rows), `District.sortOrder`; uniqueness is now `(stateId, name)` and `(stateId, slug)` instead of global.
- `Tournament.stateId`, `User.stateId` (+ indexes, FKs).
- No stateId on Player/Coach/memberships — ownership is inherited through the district.
- Seed: founding state row, idempotent backfill of districts and tournaments, `state-admin` role, `states:read|manage` permissions.

### Security / Authorization
- `src/security/rbac/org-scope.ts` replaces the district-only helpers: GLOBAL / STATE / DISTRICT / NONE scope, Prisma where-builders, and `assertInScope` (404 for out-of-scope records).
- Scope applied to players, coaches, memberships, applications, requests, certificates (+ file access), tournaments (+ categories), districts, users, dashboard stats and activity feed, equipment enquiries.
- Super Admin **state filter** (display-only) on dashboard and admin lists.
- Scope-changing user actions (state/district/federation-wide) are GLOBAL-only; scoped admins can only act on staff in their scope.

### API Changes
- New: `POST /api/admin/states`, `PATCH|DELETE /api/admin/states/{id}`, `POST /api/admin/districts`, `GET /api/admin/districts/{id}`; district PATCH now also edits name, state (GLOBAL only) and display order.
- `/api/admin/users/{id}/assign-state|remove-state`.
- Registration, membership and resubmit endpoints accept `state` (slug/id) and resolve the district inside it; tournament create/update accept `stateId`.
- Out-of-scope admin actions now return **404** (previously 403 "Access denied for this district").
- Prisma missing-table/column errors return **503 DATABASE_ERROR** with the missing object named.

### UI Changes
- `/admin/states` (new), sidebar entry. `/admin/districts`: Add District, server-loaded Edit modal (name, state, contacts, display order), state shown per card.
- `/admin/users`: State selector (district list filtered by state), jurisdiction column shows state/district.
- Tournament forms: "State / District" select grouped by state.
- Registration & membership forms (public + portal): State picker when more than one active state; district options from the database.
- Public `/districts`: database-driven, grouped by state, honours activate/deactivate and display order (static list only as DB-down fallback).

### Bug Fixes
- District Edit loads the selected district from the server (was seeded from stale props).
- Videos: Super Admin recognised via `hasPermission` (page used `permissions.includes`).
- Equipment 500: root cause is the configured database missing the equipment/video/contact/gallery schema; now a clear 503 + visible admin error. Needs `db push` + `db:seed` on that database.
- Certificates "Verify & Preview": deep link auto-verifies; QR values resolve in the serial box; **certificate PDFs are generated again** (`serverExternalPackages: ["pdfkit"]`, standard font by name, failures logged).
- `/news` 404 and the Server Components error were already fixed in HEAD; re-verified.
- `/admin/equipment` edit controls now require `equipment:manage`.

### Testing
`tsc`, `prisma validate`, `next build --webpack` pass; lint 0 errors in changed files. Upgrade rehearsal (old schema + legacy rows → new schema → seed) preserved all data; **92/92** HTTP isolation and regression checks passed on a disposable database ([RRA-TESTING.md §17](RRA-TESTING.md#17-multi-state-isolation-matrix)). Browser-only behaviour not automated.

### Deploy
`npx prisma db push --accept-data-loss` (the only warnings are the new per-state unique indexes, which existing data cannot violate — review before accepting), then `npm run db:seed`. Re-running the seed is safe.

---

## Operational ownership: certificates, signatories, tournaments, equipment

### Date
2026-09-27.

### Summary
Every operational record now has a clear State → District ownership path, enforced server-side (list queries + 404 on out-of-scope ids). Tournaments get their own certificates and signatories; equipment gets district stores. Detail: [RRA-PROJECT-STATUS.md §15](RRA-PROJECT-STATUS.md#15-operational-ownership--certificates-signatories-tournaments-equipment-2026-09-27).

### Database Changes (additive)
- New `CertificateSignatory` and `TournamentSignatory` models.
- `PlayerCertificate`: `tournamentId?` (+ unique `(tournamentId, playerId)`) and issue-time snapshot columns (title, event, dates, venue, district/state names, position, logo, signatories JSON, issuedById).
- `Tournament`: `certificateTitle?`, `certificateLogoUrl?`.
- `EquipmentItem` and `EquipmentPurchaseOrder`: `stateId?`, `districtId?`.
- Backfill: none needed — existing items/orders stay RRA Central (their true ownership), existing certificates stay registration certificates. Seed adds the founding state's officials as state-level signatories and equipment permissions for state/district admins.

### Security / Authorization
- New helpers `directOwnedWhere`, `playerCertificateWhere` (org-scope) and `resolveOwnership` (ownership.server).
- Scoped: equipment items (create/edit/delete), equipment orders (admin list + status), signatories, tournament certificate issuance, certificate list, file access for tournament certificates, dashboard equipment counts.
- Certificate images: SSRF-guarded loader (https named hosts or /images only).

### API Changes
New: `/api/admin/signatories` (POST), `/api/admin/signatories/{id}` (PATCH/DELETE), `/api/admin/tournaments/{id}/certificate-settings` (PUT), `/api/admin/tournaments/{id}/certificates` (POST). Changed: equipment create/update accept owner fields; purchase refuses mixed-store carts; public verify returns snapshot data (`signatoryList`, `title`, `stateName`, `eventDates`) and no longer returns `pdfPath`.

### UI Changes
Tournament detail: Certificates panel (title, logo, ordered signatories, generate for selected registrations with optional achievement). New `/admin/certificates/signatories`. `/admin/certificates`: scoped list with State/district/tournament/player/status/date filters and "Signed by" column. `/admin/equipment`: store column + selector, filters (State, store, category, status, stock). `/admin/equipment/orders`: scoped with store/status filters. Public shop: "Sold by" + store filter. My Equipment / My Orders / My Certificates / Documents: store and event context. Tournament list: district/status/name/date filters. Certificate renderer: prints the certificate's own signers; hides fields with no data.

### Bug Fixes
- Public verification invented event details for real certificates → now snapshot-only.
- Renderer hard-coded signer names → data-driven.
- Zod 4 `.partial()` defaults: price-only equipment edits reset stock to 0; gallery edits unpublished items; video edits re-activated them → fixed.
- Admin equipment orders were visible across scopes → scoped.
- Registration-certificate checks would have been blocked by tournament certificates → narrowed.

### Testing
`prisma validate`, `tsc`, `next build --webpack` pass; lint 0 errors in changed files. Upgrade rehearsal from the previously committed schema with legacy rows. **136/136** ownership checks + **22/22** regression checks ([RRA-TESTING.md §18](RRA-TESTING.md#18-operational-ownership-matrix)).

### Documentation correction
The previous entry referenced RRA-PROJECT-STATUS.md §14 and RRA-TESTING.md §17, but those sections had not been written (an editing-script error). Both were restored in this update with their original content.

### Deploy
`npx prisma db push --accept-data-loss` (only warning: the new unique index on the new `tournamentId` column) then `npm run db:seed`. Deploy the schema together with this code — the new pages/APIs read the new columns.

---

## Full Hierarchy Verification Audit — 2026-09-29

### Summary
End-to-end re-verification of the Super Admin → State → District → member → request → tournament → certificate → equipment chain on a disposable database and a production build: 326 HTTP/database, 12 browser and 15 performance/session checks, all passing after the fixes below. Production database only read. Report: [RRA-PROJECT-STATUS.md §16](RRA-PROJECT-STATUS.md#16-full-hierarchy-verification-audit-2026-09-29); matrix: [RRA-TESTING.md §19](RRA-TESTING.md#19-full-hierarchy-verification-2026-09-29).

### Bug Fixes
- A request body that is not valid JSON returned HTTP 500 on every JSON API → now 400 `BAD_REQUEST` (`with-api-handler.ts`).
- Unexpected 500s were logged as warnings without the exception and never sent to Sentry → logged at error level with the original exception and reported.
- Role permission edits now clear the permission cache for that role (`api/admin/roles/[id]`).
- `npm run lint` errors fixed (0 errors; warnings unchanged).

### Security Changes
- Credentials sign-in limited to 10 attempts per account + client IP per 15 minutes (`auth.ts`).
- Client IP for rate limiting prefers Netlify's `x-nf-client-connection-ip` over the client-controllable left-most `X-Forwarded-For` (`request-context.ts`, `middleware.ts`).

### Database Changes
None.

### Known Limitations
Default passwords on the remote database's privileged accounts (critical — change them), federation-wide seed roles, seed re-creating deleted demo rows, order COMPLETED without payment, per-instance caches — see Project Status §16.

---

## Release Hardening — 2026-09-30

### Summary
Production credential rotation, the decisions left open by the 2026-09-29 audit, and a development-only quick login for every admin account. Details: [RRA-PROJECT-STATUS.md §17](RRA-PROJECT-STATUS.md#17-release-hardening-2026-09-30); tests: [RRA-TESTING.md §20](RRA-TESTING.md#20-release-hardening-verification-2026-09-30).

### Security Changes
- The 16 privileged production accounts moved off their seed-default passwords (data change only; credentials kept outside the repository).
- Credentials sign-in: added a 30-attempts-per-15-minutes ceiling per account that forged `X-Forwarded-For` values cannot raise.
- `/login`: quick-login buttons and seed passwords removed from production builds; `callbackUrl` limited to same-site paths (open redirect fixed).
- `docker-compose.yml`: ports bound to `127.0.0.1`, committed placeholder secrets removed.
- Seed: never creates demo-password accounts on a non-local database unless `SEED_DEMO_ACCOUNTS=true`.

### Bug Fixes
- Equipment orders: an unpaid order could be marked COMPLETED and a cancelled order reopened → fulfilment now requires a verified payment, cancelled is final, no return to pending payment, paid orders cannot be cancelled until refunds exist.
- On-screen certificate QR was decorative → real QR with the PDF's payload (shared `verification-url.ts`).
- Switching accounts from `/login` while signed in could keep the old session (a concurrent session refresh re-issued the old cookie) → redundant nested `SessionProvider` removed; quick login waits for the session check and reloads the page.

### UI Changes
`/login` in `next dev`: Quick login lists every admin account (role and scope) from `RRA_QUICK_LOGIN_FILE` or the local seed accounts. Production `/login` shows only the sign-in form.

### API Changes
Public verify results add `verificationUrl`. `PATCH /api/admin/equipment/orders/{id}` enforces the order transitions (400/409).

### Database Changes
None (schema unchanged).

### Known Limitations
See Project Status §17 "Remaining gaps".

---

## Production Login Diagnosis — 2026-10-01

### Summary
The live "Invalid email or password" was the rotated credentials (seed passwords are rejected by design); the live site uses the intended Neon database and all four admin roles sign in correctly (35/35 live checks). Details: [RRA-PROJECT-STATUS.md §18](RRA-PROJECT-STATUS.md#18-production-login-diagnosis--credential-management-2026-10-01).

### Features Added
- Super Admin password reset in `/admin/users` (`POST /api/admin/users/{id}/reset-password`).

### Security Changes
- Rate-limit client IP no longer trusts Netlify's `x-nf-client-connection-ip` outside Netlify (production is on Vercel, where visitors could forge it).

### Database Changes
None. No production password was changed in this round.

### Known Limitations
Certificate PDFs cannot be stored on Vercel (no storage adapter for it). Docs that said production runs on Netlify are corrected.

---

## District Membership, Equipment Shop & Test Payments — 2026-10-01

### Summary
Google/new members choose their State and District at onboarding; the account Equipment Shop shows only their district's (plus state and central) stock; checkout snapshots buyer and delivery details and pays through a dummy Razorpay-style **test** gateway; orders separate payment status from fulfilment; districts raise equipment requirements for state/super review. Details: [RRA-PROJECT-STATUS.md §19](RRA-PROJECT-STATUS.md#19-district-membership-district-equipment--orders-2026-10-01).

### Features Added
Member onboarding and district identity; locations API; member Equipment Shop (cart, checkout, test payment); My Orders dashboard and order details; admin order search/filters/pagination/details/step transitions; district requirements; equipment image upload, SKU, specifications.

### Database Changes (additive)
`UserProfile`: home `stateId`, `districtId`, `memberType`, `onboardedAt`. `EquipmentItem`: `sku`, `specifications`. `EquipmentPurchaseOrder`: buyer/delivery snapshots, timeline timestamps, courier/tracking. `EquipmentPurchaseOrderItem`: `skuSnapshot`. Enums: order status PLACED/CONFIRMED/PROCESSING/SHIPPED/DELIVERED, payment status CANCELLED, MemberType, PaymentAttemptStatus, RequirementStatus/Priority, MediaAssetKind. New tables `equipment_payments`, `equipment_requirements`, `media_assets`. **Must be applied to production (`npx prisma db push`) before deploying this code.**

### API Changes
New: `/api/locations/states`, `/api/locations/districts`, `/api/account/onboarding`, `/api/account/equipment/orders`, `/api/account/equipment/payment/{create,simulate,verify,cancel}`, `/api/admin/media`, `/api/media/{id}`, `/api/admin/equipment/requirements(/{id})`. Changed: `PATCH /api/admin/equipment/orders/{id}` (new statuses and rules), `/api/equipment/purchase` (catalog visibility), equipment create/update (`sku`, `specifications`, uploaded images).

### Security
Catalog, checkout, payments, orders, requirements and uploads are scope-checked on the server (another district's ids → 404); payment success requires a gateway-issued, signature-verified payment; upload types detected from content; attachment probing closed.

### Known Limitations
Test gateway only (on by default — disable or replace before real sales); no refunds; see Project Status §19.

---

## Upcoming (not started)

Phases J–U are PLANNED — see [RRA-PROJECT-STATUS.md §10](RRA-PROJECT-STATUS.md#10-remaining-roadmap). Add an entry here using the template below when each lands:

```text
## Phase X — Name
### Date
### Summary
### Features Added
### Database Changes
### API Changes
### UI Changes
### Security Changes
### Testing
### Known Limitations
```
