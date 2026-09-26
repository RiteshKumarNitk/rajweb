# RRA Platform — Testing & QA

Manual QA guide, test data, regression checklist and production smoke test.
There is **no automated test suite** in the repository (no Jest/Vitest/Playwright); every check below is manual (browser or `curl`).
Contracts referenced here: [RRA-API.md](RRA-API.md). Rules: [RRA-PROJECT-STATUS.md](RRA-PROJECT-STATUS.md).

---

## 1. Environment Setup

### 1.1 Requirements

| Item | Value (source) |
|---|---|
| Node.js | 22 (`netlify.toml` `NODE_VERSION`, `Dockerfile` `node:22-alpine`; README agrees) |
| Package manager | npm (`package-lock.json`) |
| Database | PostgreSQL — local via `docker compose up postgres -d` (`postgres:16-alpine`, db `rra_db`, user `rra`/`rra_password`) or a hosted Postgres (e.g. Neon) |

### 1.2 Environment variables

Create `.env` in the project root (there is no `.env.example` in the repo — use this list):

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `AUTH_SECRET` or `NEXTAUTH_SECRET` | yes | NextAuth JWT secret |
| `NEXTAUTH_URL` / `APP_URL` / `NEXT_PUBLIC_APP_URL` | recommended | Public base URL |
| `NEXT_PUBLIC_ENABLE_LIVE_FORMS` | for form testing | Must be `true`, otherwise public registration/membership/donation forms only show "Coming Soon" |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for Google login | Redirect URI `http://localhost:3000/api/auth/callback/google` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | for OTP login | Without the key OTP emails fail (response stays generic; error logged) |
| `STORAGE_TYPE`, `STORAGE_LOCAL_PATH` | optional | `local` (default `./uploads`) or `netlify`. `STORAGE_PUBLIC_URL` is no longer used |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | optional | Distributed rate limiting |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | optional | Monitoring |
| `LOG_LEVEL` | optional | Pino level |
| `DEPLOY_TARGET=docker` | Docker only | Enables `output: "standalone"` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | not used by code | Present in local `.env`; safe to omit |

### 1.3 Commands

```bash
npm install                 # also runs prisma generate (postinstall)
docker compose up postgres -d
npm run db:push             # apply schema (no migrations directory exists)
npm run db:seed             # roles, permissions, 33 districts, admins, sample data, settings
npm run dev                 # next dev --webpack  → http://localhost:3000
npm run lint                # eslint
npm run build               # production build (must exit 0)
npx next build --webpack    # use this if Turbopack fails with "native bindings are not available" (seen on Windows)
npx prisma validate
npm run db:studio           # inspect data
```

### 1.4 Infrastructure checks

| Check | How | Expected |
|---|---|---|
| App | `GET /` | 200 |
| DB | `GET /api/health` | 200 `{status:"healthy", checks:{database:"ok"}}`; 503 `degraded` if DB down |
| CSRF | `GET /api/csrf` | `{ token }` + `csrf_token` cookie |
| Build | `npm run build` | exit 0, no TS errors |

---

## 2. Test Accounts & Test Data

All created by `npm run db:seed` (idempotent upserts; re-run to restore).

### 2.1 Login accounts

| Role | Email | Password | Login at | Scope |
|---|---|---|---|---|
| Super Admin | `admin@rajasthanracquetball.com` | `Admin@123` | `/login` | Everything |
| District Admin (Jaipur) | `district.jaipur@rajasthanracquetball.com` | `District@123` | `/login` | Jaipur only |

`/login` has one-click "Quick login" buttons for both. There is **no seeded public (member) account** — member testing requires a Google account or a working Resend setup for OTP. Other roles (federation-admin, tournament-manager, content-manager) exist but have no seeded user; create one by signing in a new user and using `/admin/users → assign role`.

### 2.2 Seeded records

| Type | ID | Name | District | Status |
|---|---|---|---|---|
| Player | `PLR-TEST-001` | Rahul Sharma | Jaipur | APPROVED + certificate `RRA-2025-PLR001` / QR `QR-RRA-2025-PLR001` |
| Player | `PLR-TEST-002` | Vikram Singh | Jodhpur | PENDING |
| Coach | `CCH-TEST-001` | Priya Mehta | Jaipur | APPROVED + certificate `RRA-2025-CCH001` / QR `QR-RRA-2025-CCH001` |
| Coach | `CCH-TEST-002` | Sanjay Patel | Udaipur | PENDING |
| Club | `CLB-TEST-001` | Jaipur Racquetball Club | Jaipur | PENDING |
| Tournament | `rajasthan-state-championship-2025` | Rajasthan State Championship 2025 | Jaipur | REGISTRATION_OPEN, deadline 2025-08-01 (past), max 128, **no categories** |
| Tournament | `jaipur-district-open-2025` | Jaipur District Open 2025 | Jaipur | REGISTRATION_OPEN, deadline 2025-06-10 (past), max 64, **no categories** |

Seeded players/coaches are not linked to any user. Seeded tournaments have past deadlines, so registration against them returns "Registration is closed." — create a fresh tournament for registration tests (§11).

Settings seeded: membership prices (Club 51,000/21,000; School 31,000/11,000; Academy 21,000/5,100), `site_name`, contact email/phone.

### 2.3 Form test values

| Form | Values |
|---|---|
| Contact `/contact` | Arun Kumar · `arun.test@example.com` · 9928962982 · "Membership enquiry" · "I would like to know about club membership in Jaipur district." |
| Player `/register/player` | Ankit · Verma · `ankit.player@example.com` · 9876501234 · 2012-01-15 · Male · Jaipur · Junior |
| Coach `/register/coach` | Neha Gupta · `neha.coach@example.com` · 9876505678 · Udaipur · Level 2 · "Level 2 IRA certified coach, 5 years' district tournament experience." |
| Club | Pink City Racquetball Club · Rakesh Malhotra · `pinkcity.club@example.com` · 9876512345 · Jaipur · "C-Scheme, Jaipur, Rajasthan 302001" · 3 courts |
| School | St. Xavier's School Jaipur · Dr. Meena Sharma · `sports.stxaviers@example.com` · 9876523456 · Jaipur · "Civil Lines, Jaipur, Rajasthan 302006" · 1200 students |
| Academy | Rajasthan Racquetball Academy · Coach Vikram Rao · `academy@rrajasthan.com` · 9876534567 · Jaipur · "Tonk Road, Jaipur, Rajasthan 302015" · 4 coaches |
| Donation | Rajesh Agarwal · `rajesh.donor@example.com` · 9876545678 · 5000 · Youth Development |

Since Pre-J the public forms show **only** fields the API stores (no Aadhaar, club name, experience years, established year, board, sports incharge, player capacity, additional info, PAN).

Districts accepted: any of the 33 Rajasthan district names (case-insensitive), e.g. Jaipur, Jodhpur, Udaipur, Kota, Ajmer, Bikaner, Alwar, Bharatpur, Sikar, Pali.

---

## 3. Public Website Tests

| # | Route | Expected |
|---|---|---|
| P1 | `/` | Hero, about, president message, stats, news (empty in static mode), partners; no console errors |
| P2 | `/about/history`, `/about/executive-committee`, `/about/racquetball`, `/about/rules-policies` | Load with images |
| P3 | `/districts` | District list |
| P4 | `/membership/club|school|academy`, `/register/player|coach` | Forms render; with live forms **off** submit shows "Website Under Development" toast and sends nothing |
| P5 | `/tournaments` | Static event card (poster at bottom) + DB tournaments in public statuses; DRAFT/CANCELLED not shown |
| P6 | `/tournaments/{slug}` | Details + active categories with current fees; DRAFT slug → 404 |
| P7 | `/media/news|videos|gallery` | Load; gallery shows DB items (seeded 14, `sortOrder` asc) or static fallback; filters still work |
| P7a | Gallery item with Drive URL → click card | Lightbox opens with image/category/title (+description if set) and **View on Google Drive** button; opens the item's URL in a new tab |
| P7b | Gallery item without Drive URL → click card | Lightbox opens normally; **no** Drive button rendered (no empty/broken link) |
| P8 | `/resources/equipment` | Images + equipment order form submits (not gated) |
| P9 | `/resources/court-specifications`, `/resources/physio-partners` | Load |
| P10 | `/governance/rti|anti-doping|privacy-policy`, `/privacy` | Load |
| P11 | `/contact` | Valid → success toast; invalid email / short message (<10) → validation error |
| P12 | `/donations` | Live forms on: valid → thank-you; amount ≤ 0 → error |
| P13 | `/verify` | See §3.1 |
| P14 | Header/footer | Logo → `/`; dropdowns; mobile menu; user icon → portal; verify link in footer |
| P15 | `robots.txt`, `sitemap.xml` | Served |
| P16 | Response headers on any page | CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, X-Request-Id |

### 3.1 Certificate verification (`/verify` and `/account/verify`)

| Input | Expected |
|---|---|
| `RRA-2025-PLR001` or `PLR-TEST-001` or QR `QR-RRA-2025-PLR001` | Valid — Player, Rahul Sharma, Jaipur |
| `RRA-2025-CCH001` or `CCH-TEST-001` or QR `QR-RRA-2025-CCH001` | Valid — Coach, Priya Mehta |
| `PLR-TEST-002` / `CCH-TEST-002` (no certificate) | `valid: false`, "No certificate found…" |
| `RRA-2025-FAKE99` | `valid: false` |
| Empty | 400 "Please enter a Certificate Number, QR code, or Candidate Name…" |
| Name "Rahul Sharma" + district Jaipur | Valid |
| A sample championship certificate number from `src/modules/verify/verify.types.ts` | Valid — type `championship` |

---

## 4. Authentication Tests

| # | Scenario | Expected |
|---|---|---|
| A1 | `/login` wrong password | "Invalid email or password"-style error, no session |
| A2 | `/login` Super Admin / District Admin | Redirect to `/admin`; `AuditLog` LOGIN row |
| A3 | Logged out → `/admin/players` | 302 to `/login?callbackUrl=/admin/players` |
| A4 | Logged out → `/account/player` | 302 to `/account/login?callbackUrl=/account/player` |
| A5 | `/account` | Redirect to `/account/dashboard` |
| A6 | Google sign-in (new email) | New `User` with role `public-user`, `authProvider GOOGLE`; lands in portal |
| A7 | Google sign-in with `admin@rajasthanracquetball.com` | Refused, `/account/login?error=account_exists_with_password` |
| A8 | Public user → `/admin` | Redirected to `/` |
| A9 | OTP request | Generic message regardless of email; 4th request within 10 min for same email still generic but no email sent |
| A10 | OTP wrong code ×5 then right code | Login fails (attempt cap) |
| A11 | OTP after 10 min | Fails (expired) |
| A12 | Deactivate a signed-in user via `/admin/users` | Within ≤ 60 s their next request is treated as signed-out |
| A13 | Change a user's role/permissions | Takes effect within ≤ 60 s without re-login |
| A14 | Sign out (header or `/account/settings`) | Session cleared; protected routes redirect again |
| A15 | Session idle > 30 min | Must sign in again |
| A16 | `/login` > 20 requests/min from one IP | 429 "Too many login attempts" |

---

## 5. Player Tests

Pre-req: `NEXT_PUBLIC_ENABLE_LIVE_FORMS=true` for public form; a signed-in member for portal tests.

| # | Scenario | Expected |
|---|---|---|
| PL1 | Register via `/account/player` | PENDING, `PLR-…` shown, linked to user |
| PL2 | Register again as same user | 409 "You already have a player registration." |
| PL3 | Anonymous public registration | PENDING, unlinked (not visible in any portal) |
| PL4 | District "Atlantis" | 400 "Invalid district selected" |
| PL5 | Admin approves (Super Admin) | APPROVED, approvedAt/By set, audit APPROVE; portal shows Approved |
| PL6 | Approve the same player again / two tabs | Second → 409 "already been processed" |
| PL7 | Admin rejects with reason (review page or players-table prompt) | REJECTED, reason visible in portal, audit REJECT with reason |
| PL7a | `POST /api/admin/players/{id}/reject` with `{}` or `{"reason":"  "}` | 400 "A rejection reason is required"; status unchanged |
| PL7b | Reason of 1001 chars | 400 |
| PL8 | Owner resubmits corrected data | Same `playerId`, PENDING, reason cleared, audit UPDATE `APPLICATION_RESUBMITTED`; history timeline shows submitted → rejected → resubmitted |
| PL9 | Resubmit when PENDING/APPROVED | 409 "not in a rejected state" |
| PL10 | Resubmit someone else's player id | 404 |
| PL11 | Issue certificate to APPROVED player | PDF generated, visible in `/admin/certificates`, `/account/certificates`, `/account/documents`; verifiable |
| PL12 | Issue certificate to PENDING player | 400 "Player not found or not approved" |
| PL13 | Issue certificate twice | 409 "Certificate already issued: …" |
| PL14 | District Admin (Jaipur) approves Jodhpur player `PLR-TEST-002` via API | 403 "Access denied for this district" |

---

## 6. Coach Tests

Repeat PL1–PL10 and PL14 against `/account/coach`, `/api/coaches/*`, `/api/admin/coaches/*` (use `CCH-TEST-002`, Udaipur, for the district test). Also:

| # | Scenario | Expected |
|---|---|---|
| C1 | Missing certification level | Validation error |
| C1a | Public form, choose "Level 3" / "International" | Stored as `LEVEL_3` / `INTERNATIONAL` (was always `LEVEL_1` before Pre-J) |
| C1b | Reject coach without reason via API | 400 |
| C2 | Coach certificate issuance | **No UI/API** — confirm absent (not a bug; see Status §5.5) |

---

## 7. Membership Tests

For each of Club, School, Academy:

| # | Scenario | Expected |
|---|---|---|
| M1 | `/account/memberships` | Three cards with New and Renewal prices matching settings |
| M2 | Apply via portal | PENDING, `CLB-`/`SCH-`/`ACD-` id |
| M3 | Apply twice (same user, same type) | 409 |
| M4 | Club with `courts` 0 or address < 10 chars | 400 |
| M5 | Admin approve / reject (reason) | Status updates; audit includes `type` |
| M5a | Reject without reason via API | 400 "A rejection reason is required" |
| M6 | Resubmit after rejection | PENDING again, same membershipId |
| M7 | District Admin on other district's membership | 403 |
| M8 | Wrong type in URL (`/api/admin/memberships/gym/...`) | 400 |
| M9 | Renewal / payment | Not available — confirm no renewal action exists |

---

## 8. Application Review Tests

| # | Scenario | Expected |
|---|---|---|
| AP1 | `/admin/applications` as Super Admin | Player, Coach, Club, School, Academy sections |
| AP2 | Same as District Admin (Jaipur) | Only Jaipur records |
| AP3 | Open another district's record by URL as District Admin | 404 |
| AP4 | Reject without reason in UI | Blocked by UI; API also returns 400 |
| AP5 | Approve → check `/admin/audit-logs` | APPROVE row with admin user |
| AP6 | Tournament Manager (only `players:read`) | Sees Players section; approve/reject returns 403 |
| AP7 | User without any read permission | Redirect `/admin?error=forbidden` |

---

## 9. Request Tests

Pre-req: signed-in member with a linked Player (and/or Coach).

| # | Type | Scenario | Expected on approval |
|---|---|---|---|
| R1 | CONTACT_UPDATE | new mobile/email | Player/Coach mobile/email updated |
| R2 | DISTRICT_CHANGE | Jaipur → Kota | Player/Coach `districtId` = Kota; now visible to Kota admins, not Jaipur |
| R3 | DISTRICT_CHANGE without district | — | 400 "Select the district you want to move to" |
| R4 | ADDRESS_UPDATE | new address | `UserProfile.address` updated (profile page) |
| R5 | PROFILE_CORRECTION | current/requested value | Status APPROVED only; no data changes |
| R6 | CERTIFICATE_REQUEST | — | Status only |
| R7 | CERTIFICATE_CORRECTION | — | Status only |
| R8 | DOCUMENT_UPDATE | — | Status only |
| R9 | OTHER | — | Status only |

General:

| # | Scenario | Expected |
|---|---|---|
| R10 | Reason < 10 chars | 400 |
| R10a | CONTACT_UPDATE with neither `requestedMobile` nor `requestedEmail` | 400 "Enter the new mobile number or email address" |
| R10b | ADDRESS_UPDATE without `requestedAddress` | 400 "Enter the new address" |
| R11 | Second PENDING request of same type | 409 "You already have a pending … request." |
| R12 | Same type after first resolved | Allowed |
| R13 | `profileType: "coach"` with no coach record | 404 |
| R14 | Admin reject without reason | 400 "A rejection reason is required" |
| R15 | Approve twice | 409 |
| R16 | Audit | CREATE/APPROVE/REJECT rows with `REQUEST_*` events |

---

## 10. Tournament Management Tests

| # | Scenario | Expected |
|---|---|---|
| T1 | Create (Super Admin) with name, OPEN, dates | DRAFT by default, unique slug, audit `TOURNAMENT_CREATED` |
| T2 | Duplicate name | Slug gets `-1`, `-2` |
| T3 | End before start | 400 "Tournament end must be on or after the tournament start" |
| T4 | Registration end ≥ tournament start | 400 "Registration end must be before the tournament start" |
| T5 | Registration start ≥ registration end | 400 |
| T6 | `datetime-local` 10:00 | Stored as 04:30 UTC; displayed "10:00 am" IST |
| T6a | Edit form: set registration end after tournament start | Toast with the date-order message; no request sent (server also rejects with 400) |
| T7 | `maxParticipants` 0 or 10001 | 400 |
| T8 | Poster `ftp://x` or non-URL | 400 "Poster must be a valid URL" |
| T9 | District Admin creates with another district id | Forced to Jaipur |
| T10 | District Admin edits a state-wide tournament via API | 403 "State-wide tournaments are managed by federation administrators" |
| T11 | Status DRAFT → REGISTRATION_OPEN | Audit `TOURNAMENT_STATUS_CHANGED {from,to}`; appears on `/tournaments` within seconds (cache revalidated) |
| T12 | Status CANCELLED | Hidden from public and account detail (404) |
| T13 | Add category "Senior Singles" SINGLES ₹500 | Audit `TOURNAMENT_CATEGORY_CREATED` |
| T14 | Fee −1 or 1,000,001 | 400 |
| T15 | Change fee 500 → 700 | Audit `TOURNAMENT_FEE_CHANGED {from:500,to:700}`; public page shows 700 |
| T16 | Change type on category with registrations | 400 |
| T17 | Delete unused category | Deleted |
| T18 | Delete category with registrations | Disabled instead, message says so; hidden from public |
| T19 | Category id from another tournament in the URL | 404 |
| T20 | Tournament Manager without district | Create → 403 "District assignment required" (unless federation-wide) |

---

## 11. Tournament Registration Tests

Setup: as Super Admin create tournament *QA Open* — status REGISTRATION_OPEN, registration window open now, start date in the future, `maxParticipants` 2, category *Senior Singles* ₹500. Members A, B, C each with an APPROVED linked Player (approve via admin).

| # | Scenario | Expected |
|---|---|---|
| TR1 | Not signed in → POST registration | 401 |
| TR2 | Signed-in user with no Player | 400 "must register as a player…" |
| TR3 | Player PENDING, `requiresApprovedPlayer` true | 400 "approved player registration is required" |
| TR4 | Same with `requiresApprovedPlayer` false | Allowed |
| TR5 | Tournament DRAFT / REGISTRATION_CLOSED | 400 "Registration is not open" |
| TR6 | Before `registrationStart` | 400 "has not started yet." |
| TR7 | After `registrationDeadline` (e.g. seeded tournaments) | 400 "Registration is closed." |
| TR8 | Inactive category / category of another tournament / random id | 400 "This category is not available…" |
| TR9 | A registers | 200, `amount` 500, PENDING; audit `TOURNAMENT_REGISTRATION_CREATED` with amount |
| TR10 | A registers again (same category) | 409 "already registered for this category" |
| TR11 | A registers for a second category | 409 "already registered for this tournament" |
| TR12 | B registers (2/2) | 200 |
| TR13 | C registers | 400 "Registration capacity has been reached." |
| TR14 | Concurrency: 2 slots left, fire ≥ 5 simultaneous requests from distinct approved players | Exactly 2 succeed, rest get capacity error; DB count = max |
| TR15 | Concurrency: same player, 5 parallel requests | Exactly 1 succeeds, others 409 |
| TR16 | Body includes `"amount": 1` | Ignored; stored amount = category fee |
| TR17 | Missing CSRF header | 403 |
| TR18 | `/account/tournaments` | Registration listed with snapshot fee and PENDING |
| TR19 | `/admin/tournaments/{id}` | Registrations table shows player and amount |
| TR20 | A registration with `amount` NULL (set manually in a test DB) | Admin table shows "Legacy · no amount"; member page shows "Not on record — contact RRA"; `getPayableRegistrationAmount()` throws 400 |

**Price snapshot test (mandatory in every regression run):**

```text
Category fee = ₹500
        ↓
Player A registers           → A.amount = 500
        ↓
Admin changes fee to ₹700    → audit TOURNAMENT_FEE_CHANGED {from 500, to 700}
        ↓
Player A registration        → still 500 (account page + admin table + DB)
        ↓
Player B registers           → B.amount = 700
```

SQL check: `SELECT player_id, amount FROM tournament_registrations WHERE tournament_id = '<id>';`

---

## 12. Performance Tests

No baseline numbers have been recorded. Record measurements here when taken (date, environment, tool).

| # | Check | How | Pass criterion |
|---|---|---|---|
| PF1 | Public pages | Lighthouse / DevTools on `/`, `/tournaments`, `/tournaments/{slug}` | No errors; record LCP/TTFB |
| PF2 | Tournament cache | Load `/tournaments` twice; edit a tournament; reload | Second load served from cache; edit visible after revalidation |
| PF3 | Session queries | Navigate account pages for > 60 s with DB query logging | Role/permission lookup at most once per 60 s per session |
| PF4 | Admin lists | Seed > 200 players | List caps at 200 (no pagination — expected limitation) |
| PF5 | Registration under load | TR14 with 50 parallel requests | No 500s; capacity respected |
| PF6 | Loading states | Throttle network | Skeletons render for account/admin |
| PF7 | API latency | `curl -w "%{time_total}"` on `/api/health`, `/api/verify` | Record |

---

## 13. Security Tests

| # | Scenario | Expected |
|---|---|---|
| S1 | Any mutating API without `x-csrf-token` | 403 "Invalid or missing CSRF token" |
| S2 | Admin API without session | 401 |
| S3 | Admin API as public user | 403 |
| S4 | District Admin on other district (players/coaches/memberships/requests/tournaments) | 403 |
| S5 | District-scoped user with **no** district | Admin lists empty; actions 403 "District assignment required" |
| S6 | Resubmit another user's application (guess cuid) | 404 |
| S7 | Request body with `playerId`/`userId` of someone else | Ignored — request attaches to caller's own profile |
| S8 | Registration with forged `amount` | Ignored (TR16) |
| S9 | Malformed ids (`/api/admin/players/xyz/approve`) | 404 |
| S10 | Invalid action (`/api/admin/players/{id}/delete`) | 400 "Invalid action" |
| S11 | Edit a system role via `PATCH /api/admin/roles/{id}` | 403 |
| S12 | > 120 API calls/min from one IP | 429 |
| S13 | XSS: submit `<script>` in names/descriptions | Stored HTML-escaped; rendered as text |
| S14 | `/api/files/../../.env` signed in | 400 "Invalid file path" (401 when logged out — auth is checked first) |
| S15 | `/admin/equipment-orders`: logged out → `/login`; District Admin / Tournament Manager → `/admin?error=forbidden`; Super Admin → list | As stated |
| S16 | `/api/files/certificates/<CERT>.pdf`: logged out → 401; another member → 404; owner → PDF; Jaipur admin for a Jodhpur player's cert → 404; Super Admin → PDF | As stated |
| S17 | `/api/files/certificates/unknown.pdf` as Super Admin | 404 (not referenced by any record) |
| S18 | Gallery: logged out / public-user POST `/api/admin/gallery` | 401 / 403 |
| S19 | Gallery: `media:read`-only admin POST/PATCH/DELETE | 403 (`media:manage` required) |
| S20 | Gallery: `driveUrl: "https://evil.example.com/x"` | 400 "Must be a valid Google Drive sharing URL…" |
| S21 | Gallery: deactivate item → public `/media/gallery` | Item disappears immediately (cache revalidated); card UI/filters unchanged |
| S22 | Content: logged out / public-user POST `/api/admin/content/committee` | 401 / 403 |
| S23 | Content: `content:read`-only admin POST/PATCH/DELETE | 403 (`content:manage` required) |
| S24 | Content: deactivate a committee member / timeline item / news item | Disappears from the public page after revalidation; still listed (Inactive) in admin |
| S25 | Content: invalid image ref (`javascript:alert(1)`) or non-http(s) website URL | 400 validation error |

---

## 14. Regression Checklist

Run after **every** phase before merging. Tick all.

```text
[ ] npm run lint — no errors
[ ] npm run build — exit 0
[ ] npm run db:push && npm run db:seed on a clean DB — succeeds
[ ] /api/health healthy
[ ] Public: P1, P5, P6, P11, P16, verify valid + invalid
[ ] Auth: A2, A3, A4, A8, A14
[ ] Player: PL1, PL5, PL7, PL8, PL11, PL14
[ ] Coach: approve + reject + resubmit
[ ] Membership: M2, M5, M6 for one type
[ ] Requests: R1, R2, R11, R14
[ ] Tournament: T1, T11, T13, T15, T18
[ ] Registration: TR2, TR5, TR7, TR9, TR10, TR13, TR16
[ ] PRICE SNAPSHOT TEST (§11) — old registration keeps old amount
[ ] Security: S1, S2, S4, S6, S15, S16
[ ] Rejection reason required: PL7a, C1b, M5a
[ ] /admin/audit-logs shows entries for the actions above
[ ] All five docs in docs/ updated for the phase
```

---

## 15. Production Smoke Tests

After each deploy (Netlify or Docker):

```text
[ ] Home page loads over HTTPS; security headers present
[ ] /api/health → healthy (DATABASE_URL correct)
[ ] Admin login at /login works (AUTH_SECRET / NEXTAUTH_URL correct); seeded demo passwords changed
[ ] Member Google login works (redirect URI registered for the production domain)
[ ] OTP email arrives (RESEND_API_KEY, verified RESEND_FROM_EMAIL)
[ ] NEXT_PUBLIC_ENABLE_LIVE_FORMS set as intended (true = forms live)
[ ] One public form submission (contact) persists
[ ] /tournaments shows expected tournaments
[ ] Certificate issue → PDF opens via /api/files/... (STORAGE_TYPE=netlify on Netlify)
[ ] /verify with a known certificate → valid
[ ] Rate limiting: Upstash configured for multi-instance production (else per-instance memory)
[ ] Sentry receives a test error (if DSN set)
```

When reporting a bug include: role, URL, steps, expected vs actual, environment, and the `meta.requestId` from the API error.

---

## 16. Pre-Phase-J Regression Cases

Added 2026-09-26. Run them on a **local or staging** database (they write data). First run `npm run db:seed` so `equipment:read` exists.

| # | Area | Case | Expected | Status |
|---|---|---|---|---|
| J1 | Equipment | Logged out → `/admin/equipment-orders` | Redirect to `/login` | Verified 2026-09-26 (307) |
| J2 | Equipment | District Admin → page | `/admin?error=forbidden`; sidebar item hidden | Not yet run |
| J3 | Equipment | Custom role with `equipment:read`, district Jaipur | Only enquiries whose district is "Jaipur" | Not yet run |
| J4 | Files | Logged out `GET /api/files/certificates/x.pdf` | 401 | Verified 2026-09-26 |
| J5 | Files | Owner / other member / other-district admin / Super Admin | 200 / 404 / 404 / 200 | Not yet run |
| J6 | Files | Account certificates & documents pages, admin certificates "View" | Links open PDFs via `/api/files/...` for permitted users | Not yet run |
| J7 | Verify | `/api/verify?certificateNumber=RRA-2025-PLR001` logged out | `valid: true` | Verified 2026-09-26 |
| J8 | Reject | Player/Coach/Membership reject with empty reason | 400, status unchanged | Not yet run |
| J9 | Reject | Players table "Reject" → cancel prompt | No request sent | Not yet run |
| J10 | Forms | Public forms show no Aadhaar/PAN/extra fields; submit succeeds with live forms on | As stated | Not yet run |
| J11 | Coach level | Public form "International" | `INTERNATIONAL` stored | Not yet run |
| J12 | Requests | R10a, R10b | 400 | Not yet run |
| J13 | Tournament | T6a | Client and server block | Not yet run |
| J14 | Registration | Price snapshot test (§11) + TR14/TR15 concurrency | Unchanged behaviour | Not yet run |
| J15 | Legacy amount | TR20 | As stated | Not yet run |
| J16 | APIs | Mutations without CSRF → 403; with CSRF but logged out → 401 | As stated | Verified 2026-09-26 (players reject, requests, registrations) |
