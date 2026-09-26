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
