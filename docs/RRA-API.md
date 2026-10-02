# RRA Platform — API Documentation

Every HTTP endpoint under `src/app/api/` as of commit `80ef6bd` plus the Pre-Phase-J Gap Fix (2026-09-26). If an endpoint is not listed here, it does not exist.
Architecture of the handler pipeline: [RRA-ARCHITECTURE.md → Backend](RRA-ARCHITECTURE.md#4-backend-architecture). Business rules: [RRA-PROJECT-STATUS.md](RRA-PROJECT-STATUS.md).

---

## 0. Conventions (apply to every endpoint unless stated)

**Envelope**

```json
// success
{ "success": true, "data": { }, "message": "optional", "meta": { "requestId": "uuid", "timestamp": "ISO" } }
// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [] }, "meta": { … } }
```

**Error codes → HTTP**

| Code | HTTP | Typical cause |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod failure (`details` = Zod issues) or business-rule validation |
| `BAD_REQUEST` | 400 | Missing path params, invalid action, missing rejection reason, request body that is not valid JSON ("Request body must be valid JSON" — applies to every JSON API) |
| `UNAUTHORIZED` | 401 | No/expired/inactive session on an authenticated route |
| `FORBIDDEN` | 403 | Missing permission, wrong district, **missing/invalid CSRF token** |
| `NOT_FOUND` | 404 | Record missing (or not owned by caller on owner routes) |
| `CONFLICT` | 409 | Already processed, duplicate registration/request/application, or any unique-value clash such as a role/district name that already exists ("A record with these details already exists.") |
| `RATE_LIMITED` | 429 | Per-route or global (120/min/IP on `/api/*`) limit |
| `DATABASE_ERROR` | 503 | Database schema is behind the code (Prisma P2021 missing table / P2022 missing column): "Database schema is out of date (missing table X). Apply the current schema with `npm run db:push` and then `npm run db:seed`." Logged as an error and sent to Sentry |
| `INTERNAL_ERROR` | 500 | Unexpected; message hidden in production. Logged at error level with the original exception and sent to Sentry |

**CSRF:** routes marked *CSRF: yes* require `x-csrf-token` header equal to the `csrf_token` cookie obtained from `GET /api/csrf`. The browser client (`src/lib/api-client.ts → apiFetch`) handles this automatically.

**Auth levels:** *Public* (none) · *Session* (any signed-in user, `requireAuth`) · *Permission `x`* (`requirePermission`; `super-admin` always passes) · *Scoped* (organisational scope from `org-scope.ts`: GLOBAL = Super Admin / federation-wide, STATE = own state, DISTRICT = own district). A record outside the caller's scope returns **404** with the same message as a missing record — never 403 — so IDs from another state reveal nothing.

**Audit:** see [RRA-ARCHITECTURE.md → Audit](RRA-ARCHITECTURE.md#11-audit-architecture).

### Endpoint index

| # | Method | Route | Auth | CSRF |
|---|---|---|---|---|
| 1 | GET, POST | `/api/auth/[...nextauth]` | NextAuth | NextAuth |
| 2 | POST | `/api/auth/otp/request` | Public | yes |
| 3 | GET | `/api/csrf` | Public | — |
| 4 | GET | `/api/health` | Public | — |
| 5 | GET | `/api/account/me` | Session | — |
| 6 | GET | `/api/account/profile` | Session | — |
| 7 | PATCH | `/api/account/profile` | Session | yes |
| 8 | POST | `/api/players/register` | Public (links if signed in) | yes |
| 9 | POST | `/api/players/{id}/resubmit` | Session (owner) | yes |
| 10 | POST | `/api/coaches/register` | Public (links if signed in) | yes |
| 11 | POST | `/api/coaches/{id}/resubmit` | Session (owner) | yes |
| 12 | POST | `/api/memberships/club` | Public (links if signed in) | yes |
| 13 | POST | `/api/memberships/school` | Public (links if signed in) | yes |
| 14 | POST | `/api/memberships/academy` | Public (links if signed in) | yes |
| 15 | POST | `/api/memberships/{type}/{id}/resubmit` | Session (owner) | yes |
| 16 | POST | `/api/requests` | Session | yes |
| 17 | POST | `/api/tournaments/{tournamentId}/registrations` | Session | yes |
| 18 | GET, POST | `/api/verify` | Public | — |
| 19 | GET | `/api/files/{...path}` | Session + owner/permission (Pre-J) | — |
| 20 | POST | `/api/contact` | Public | yes |
| 21 | POST | `/api/donations` | Public | yes |
| 22 | POST | `/api/equipment/orders` | Public | yes |
| 23 | POST | `/api/admin/players/{id}/{approve\|reject\|certificate}` | `players:approve` (+`certificates:issue`) | yes |
| 24 | POST | `/api/admin/coaches/{id}/{approve\|reject}` | `coaches:approve` | yes |
| 25 | POST | `/api/admin/memberships/{type}/{id}/{approve\|reject}` | `memberships:approve` | yes |
| 26 | POST | `/api/admin/requests/{id}/{approve\|reject}` | `requests:approve` | yes |
| 27 | POST | `/api/admin/tournaments` | `tournaments:manage` | yes |
| 28 | PATCH | `/api/admin/tournaments/{id}` | `tournaments:manage` | yes |
| 29 | POST | `/api/admin/tournaments/{id}/categories` | `tournaments:manage` | yes |
| 30 | PATCH | `/api/admin/tournaments/{id}/categories/{categoryId}` | `tournaments:manage` | yes |
| 31 | DELETE | `/api/admin/tournaments/{id}/categories/{categoryId}` | `tournaments:manage` | yes |
| 32 | POST | `/api/admin/users/{id}/{action}` | `users:update` | yes |
| 33 | POST | `/api/admin/roles` | `roles:manage` | yes |
| 34 | PATCH | `/api/admin/roles/{id}` | `roles:manage` | yes |
| 35 | POST | `/api/admin/gallery` | `media:manage` | yes |
| 36 | PATCH, DELETE | `/api/admin/gallery/{id}` | `media:manage` | yes |
| 37 | PATCH, DELETE | `/api/admin/contact/{id}` | `contact:manage` | yes |
| 38 | POST | `/api/equipment/purchase` | Session | yes |
| 39 | POST | `/api/equipment/orders/{id}/cancel` | Session (owner) | yes |
| 40 | POST | `/api/admin/equipment` | `equipment:manage` | yes |
| 41 | PATCH, DELETE | `/api/admin/equipment/{id}` | `equipment:manage` | yes |
| 42 | PATCH | `/api/admin/equipment/orders/{id}` | `equipment:manage` | yes |
| 43 | POST | `/api/admin/media/videos` | `videos:manage` | yes |
| 44 | PATCH, DELETE | `/api/admin/media/videos/{id}` | `videos:manage` | yes |
| 45 | POST | `/api/admin/districts` | `districts:manage` (GLOBAL or STATE scope) | yes |
| 46 | GET, PATCH, DELETE | `/api/admin/districts/{id}` | GET `districts:read`; PATCH/DELETE `districts:manage`; scoped | PATCH/DELETE |
| 47 | POST | `/api/admin/states` | `states:manage` + GLOBAL scope | yes |
| 48 | PATCH, DELETE | `/api/admin/states/{id}` | `states:manage` + GLOBAL scope | yes |
| 49 | POST | `/api/admin/signatories` | `certificates:issue`; owner from scope | yes |
| 50 | PATCH, DELETE | `/api/admin/signatories/{id}` | `certificates:issue`; scoped | yes |
| 51 | PUT | `/api/admin/tournaments/{id}/certificate-settings` | `tournaments:manage`; scoped | yes |
| 52 | POST | `/api/admin/tournaments/{id}/certificates` | `certificates:issue`; scoped | yes |

**There are no list/GET APIs for admin data** — admin pages read the database directly in Server Components. There are no Payment, Receipt, Notification, Fixture, Match, Ranking, Media-CMS-write, Settings-write, or Certificate-revoke APIs.

---

## 1. Authentication APIs

### 1.1 NextAuth handlers
- **Method / Route:** `GET, POST /api/auth/[...nextauth]` (standard Auth.js endpoints: `/signin`, `/callback/{provider}`, `/session`, `/csrf`, `/signout`, …)
- **Purpose:** sign-in/out and session for providers `credentials`, `google`, `email-otp`.
- **Authentication:** n/a. **CSRF:** Auth.js built-in.
- **Request body (via `signIn()` from `next-auth/react`):**
  - `credentials`: `{ email, password }`
  - `email-otp`: `{ email, otp }`
  - `google`: OAuth redirect; callback `/api/auth/callback/google`.
- **Errors:** redirects to `/account/login?error=…` — `missing_email`, `account_exists_with_password`, `inactive`, `Callback`; credentials failures return `CredentialsSignin`.
- **Password-guessing limit (credentials):** at most 10 sign-in attempts per account per client IP, and at most 30 per account from all IPs together, in 15 minutes; further attempts fail as `CredentialsSignin` — even with the right password — until the window passes. The per-account ceiling cannot be raised by sending different `X-Forwarded-For` values; the trade-off is that 30 bad attempts lock that account's password sign-in for 15 minutes.
- **Development-only quick login (`/login`):** a Server Function (`app/login/actions.ts → quickLogin(email)`) signs in with a password looked up **on the server** (from `RRA_QUICK_LOGIN_FILE`, or the seed accounts on a local database); the browser only receives e-mails and role/scope labels. It returns an error unless `NODE_ENV=development`.
- **Database effects:** Google/OTP may create a `User` (role `public-user`) or update name/avatar/googleId; `lastLoginAt` updated.
- **Audit:** `LOGIN` (auth); `CREATE` (users) for new public users.
- **Security notes:** Google/OTP cannot sign into an email owned by a `CREDENTIALS` account. Session JWT 30 min; role/permissions refreshed every ≤ 60 s. `/login*` pages limited to 20 req/min/IP by middleware.

### 1.2 Request email OTP
- **Method / Route:** `POST /api/auth/otp/request`
- **Purpose:** email a 6-digit login code.
- **Authentication:** Public. **CSRF:** yes. **Rate limit:** 10 / 10 min per IP; 3 / 10 min per email (silently).
- **Body:** `{ "email": "user@example.com" }` (valid email ≤ 254).
- **Success 200:** `{ "sent": true }`, message `"If this email can receive a code, we've sent it."` — **always** the same, including when rate-limited per email or when email sending fails.
- **Errors:** 400 invalid email; 403 CSRF; 429 IP limit.
- **Database effects:** inserts `EmailOtp` (bcrypt hash, expires in 10 min).
- **Audit:** none.
- **Security notes:** plaintext code never logged/returned; verification allows 5 attempts per code; latest unconsumed code only.

---

## 2. Utility APIs

### 2.1 CSRF token
- `GET /api/csrf` — Public. Returns `{ "token": "uuid" }` and sets httpOnly `csrf_token` cookie (SameSite=Strict, 8 h, `secure` in production).

### 2.2 Health
- `GET /api/health` — Public. Runs `SELECT 1`.
- **200:** `{ "status": "healthy", "checks": { "app": "ok", "database": "ok", "timestamp", "version", "environment" } }`
- **503:** same shape with `"status": "degraded"`, `"database": "unavailable"`.

---

## 3. Account APIs

### 3.1 Current user
- **Method / Route:** `GET /api/account/me`
- **Authentication:** Session. **Permission:** none.
- **Success 200:** `{ id, name, email, avatar, authProvider, createdAt, lastLoginAt }`
- **Errors:** 401; 404 if the user row vanished.
- **DB / Audit:** read only / none.

### 3.2 Read profile
- **Method / Route:** `GET /api/account/profile`
- **Authentication:** Session.
- **Success 200:** `{ name, email, phone, dateOfBirth, gender, address, city, state, country, pincode, completion: { percent, missing[] } }` — completion counts `name, phone, address, city, state, pincode`.

### 3.3 Update profile
- **Method / Route:** `PATCH /api/account/profile`
- **Authentication:** Session. **CSRF:** yes.
- **Body (all optional; `""` clears a field):**

| Field | Validation |
|---|---|
| `name` | 2–100 |
| `phone` | `^[6-9]\d{9}$` (Indian mobile) or `""` |
| `dateOfBirth` | `YYYY-MM-DD` or `""` |
| `gender` | `MALE`/`FEMALE`/`OTHER` |
| `address` ≤ 300, `city`/`state`/`country` ≤ 100 | or `""` |
| `pincode` | 6 digits or `""` |

- **Success 200:** `{ completion }`, message "Profile updated successfully".
- **Errors:** 400 validation; 401; 403 CSRF.
- **DB effects:** updates `User.name/phone`; upserts `UserProfile`.
- **Audit:** none.
- **Security notes:** body cannot target another user — id/userId/email are not in the schema; the row is always the session user.

---

## 4. Player APIs

### 4.1 Register player
- **Method / Route:** `POST /api/players/register`
- **Authentication:** Public; if a session exists the record is linked to that user. **CSRF:** yes. **Rate limit:** 20/min/IP.
- **Body:**

```json
{ "name": "Ankit Verma", "dateOfBirth": "2012-01-15", "gender": "MALE",
  "email": "ankit.player@example.com", "mobile": "9876501234",
  "district": "Jaipur", "state": "rajasthan", "category": "Junior" }
```

| Field | Validation |
|---|---|
| name | 2–100 |
| dateOfBirth | string (parsed with `new Date`) |
| gender | `MALE`/`FEMALE`/`OTHER` |
| email | email ≤ 254 |
| mobile | 10–20 chars |
| district | 1–100; must match a `District.name` case-insensitively **within the submitted state** |
| state | optional ≤ 100 — state **slug** (or id). Required in practice when the district name exists in more than one state (400 "Select your state — this district name exists in more than one state"); a district that is not in the given state → 400 "Invalid district selected" |
| category | optional ≤ 50 |

**State ownership:** the record belongs to the resolved district, and through it to that district's state (`resolveRegistrationDistrict`, server-side). The same `district` + `state` pair applies to **every** registration, membership and resubmit endpoint (players, coaches, club/school/academy, and their resubmits). Forms send the state automatically when only one state is active.

Unknown fields (e.g. `aadharNumber`) are stripped.
- **Success 200:** `{ "playerId": "PLR-…", "status": "PENDING" }`, message "Player registration submitted for approval".
- **Errors:** 400 validation / "Invalid district selected"; 403 CSRF; 409 "You already have a player registration." (signed-in users only); 429.
- **DB effects:** creates `Player` (PENDING, `userId` = session user or null).
- **Audit:** none.

### 4.2 Resubmit player
- **Method / Route:** `POST /api/players/{id}/resubmit` (`id` = `Player.id` cuid)
- **Authentication:** Session, must own the record. **CSRF:** yes. **Rate limit:** 10/min.
- **Body:** same schema as 4.1.
- **Success 200:** `{ playerId, status: "PENDING" }`, message "Application resubmitted for approval".
- **Errors:** 400 validation/district; 401; 404 "Player application not found" (missing **or not owned**); 409 "not in a rejected state".
- **DB effects:** in-place update of the REJECTED row → PENDING; clears `rejectionReason`, `approvedAt`, `approvedBy`.
- **Audit:** UPDATE `players` `APPLICATION_RESUBMITTED`.

### 4.3 Admin player actions
- **Method / Route:** `POST /api/admin/players/{id}/approve` · `/reject` · `/certificate`
- **Authentication:** Permission `players:approve`; `certificate` additionally `certificates:issue`. Scoped by the player's district → state. **CSRF:** yes.
- **Bodies:** approve — none. reject — `{ "reason": "…" }` — **required**, trimmed, 1–1000 chars (400 "A rejection reason is required" / "…1000 characters or fewer"; enforced since Pre-J). certificate — optional `{ "certificateNumber"?, "issuedAt"?, "expiresAt"? }` (ISO dates).
- **Success 200:**
  - approve → `{ playerId, status: "APPROVED" }`
  - reject → `{ playerId, status: "REJECTED" }`
  - certificate → `{ certificateNumber, qrCode, issuedAt, expiresAt, pdfUrl }`, message "Certificate CERT-… issued"
- **Errors:** 400 missing params / "Invalid action" / "Player not found or not approved" (certificate); 403 permission/CSRF; 404 player missing **or outside the caller's state/district**; 409 "already been processed" (approve/reject of non-PENDING) or "Certificate already issued: …".
- **DB effects:** status guard update (`approvedAt`, `approvedBy` = admin id, `rejectionReason`). Certificate: QR + PDF → storage `certificates/<number>.pdf` → `PlayerCertificate`.
- **Audit:** APPROVE / REJECT (`players`, reject always includes reason); CREATE (`certificates`, `{certificateNumber}`).

---

## 5. Coach APIs

### 5.1 Register coach
- `POST /api/coaches/register` — Public (links if signed in). CSRF yes. 20/min.
- **Body:** `{ name 2–100, email, mobile 10–20, qualification 2–500, certificationLevel: LEVEL_1|LEVEL_2|LEVEL_3|INTERNATIONAL, district }` (the public form now sends these enum values directly — see Status §5.5)
- **Success:** `{ "coachId": "CCH-…" }`, "Coach registration submitted for approval".
- **Errors:** 400; 403; 409 "You already have a coach registration."; 429.
- **DB:** creates `Coach` PENDING. **Audit:** none.

### 5.2 Resubmit coach
- `POST /api/coaches/{id}/resubmit` — Session owner, CSRF, 10/min. Body as 5.1. Same semantics/errors as 4.2 (404 "Coach application not found"). Audit UPDATE `coaches` `APPLICATION_RESUBMITTED`.

### 5.3 Admin coach actions
- `POST /api/admin/coaches/{id}/approve|reject` — `coaches:approve`, scoped (404 outside scope), CSRF.
- reject body `{ reason }` — **required**, 1–1000 chars (400 otherwise). Returns `{ coachId, status }`. 409 when not PENDING. Audit APPROVE/REJECT `coaches`.
- **No certificate action exists for coaches.**

---

## 6. Membership APIs

### 6.1 Apply

| Route | Body fields | ID prefix | 409 message |
|---|---|---|---|
| `POST /api/memberships/club` | `clubName` 2–200, `contactPerson` 2–100, `email`, `phone` 10–20, `district`, `address` 10–500, `courts` int 1–100 | `CLB` | "You already have a club membership application." |
| `POST /api/memberships/school` | `schoolName`, `principalName`, `email`, `phone`, `district`, `address`, `studentCount?` int 1–100000 | `SCH` | "…school membership application." |
| `POST /api/memberships/academy` | `academyName`, `directorName`, `email`, `phone`, `district`, `address`, `coachCount?` int 1–1000 | `ACD` | "…academy membership application." |

- **Authentication:** Public, linked to session user if present. **CSRF:** yes. **Rate limit:** 10/min.
- **Success:** `{ "membershipId": "CLB-…" }`.
- **DB:** creates membership row, status PENDING. **Audit:** none.
- **Note:** no fee or payment is involved; prices are only displayed in the portal.

### 6.2 Resubmit membership
- `POST /api/memberships/{type}/{id}/resubmit` — `type` ∈ `club|school|academy`. Session owner, CSRF, 10/min.
- Body = the type's apply schema. Returns `{ membershipId, status }`.
- Errors: 400 bad type/validation; 404 missing or not owned; 409 not REJECTED.
- Audit UPDATE `memberships` `{ event: APPLICATION_RESUBMITTED, type }`.

### 6.3 Admin membership actions
- `POST /api/admin/memberships/{type}/{id}/approve|reject` — `memberships:approve`, scoped (404 outside scope), CSRF.
- reject body `{ reason }` — **required**, 1–1000 chars (400 otherwise). Returns `{ membershipId, status }`. 409 when not PENDING.
- Audit APPROVE `{type}` / REJECT `{type, reason?}` in `memberships`.

---

## 7. Application & Resubmission APIs

There is no separate "applications" endpoint. The admin application queue (`/admin/applications`) is a Server Component page; its actions call **4.3, 5.3, 6.3**. Resubmission endpoints are **4.2, 5.2, 6.2**.

---

## 8. Request APIs

### 8.1 Create request
- **Method / Route:** `POST /api/requests`
- **Authentication:** Session. **CSRF:** yes. **Rate limit:** 20/min.
- **Body:**

| Field | Validation / meaning |
|---|---|
| `profileType` | `player` \| `coach` — the caller's own record is looked up by session |
| `type` | one of `PROFILE_CORRECTION, CONTACT_UPDATE, ADDRESS_UPDATE, DISTRICT_CHANGE, CERTIFICATE_REQUEST, CERTIFICATE_CORRECTION, DOCUMENT_UPDATE, OTHER` |
| `reason` | 10–1000 (required) |
| `currentValue`, `requestedValue` | optional ≤ 500 |
| `requestedMobile` | optional 10–20 |
| `requestedEmail` | optional email |
| `requestedAddress` | optional ≤ 500 |
| `requestedDistrict` | district **name**; required for `DISTRICT_CHANGE`; must be a district **in the member's current state** (400 "Invalid district selected" otherwise — cross-state transfers are not self-service) |

Example:

```json
{ "profileType": "player", "type": "CONTACT_UPDATE",
  "reason": "My mobile number has changed.", "requestedMobile": "9876500000" }
```

- **Success 200:** `{ "requestNumber": "REQ-…", "status": "PENDING" }`.
- **Errors:** 400 validation / "Select the district you want to move to" / invalid district / "Enter the new mobile number or email address" (CONTACT_UPDATE with neither) / "Enter the new address" (ADDRESS_UPDATE without one); 401; 404 "You do not have a player|coach registration…"; 409 "You already have a pending {Type} request."
- **DB:** creates `Request`.
- **Audit:** CREATE `requests` `{ event: REQUEST_CREATED, type, profileType }`.
- **Security:** playerId/coachId never accepted from client.

### 8.2 Admin request actions
- **Method / Route:** `POST /api/admin/requests/{id}/approve` · `/reject`
- **Authentication:** `requests:approve`; scoped via the linked Player/Coach district → state (404 outside scope). **CSRF:** yes.
- **Bodies:** approve `{ "remarks"?: string }`; reject `{ "reason": string }` — **required** (400 "A rejection reason is required").
- **Success:** `{ requestId, status }`.
- **Errors:** 400; 403; 404; 409 "already been processed".
- **DB effects (approve, one transaction):** status → APPROVED, `resolvedAt/By`, `adminRemarks`; then auto-apply: `CONTACT_UPDATE` → Player/Coach `mobile`/`email`; `DISTRICT_CHANGE` → Player/Coach `districtId`; `ADDRESS_UPDATE` → upsert `UserProfile.address`. Other types change nothing else.
- **Audit:** APPROVE `REQUEST_APPROVED` / REJECT `REQUEST_REJECTED` (+reason).

---

## 9. Tournament APIs (admin)

### 9.1 Create tournament
- **Method / Route:** `POST /api/admin/tournaments`
- **Authentication:** `tournaments:manage`. **CSRF:** yes.
- **Body:**

| Field | Validation |
|---|---|
| `name` | 3–200 (required) |
| `description` | ≤ 2000 |
| `category` | `JUNIOR`/`SENIOR`/`OPEN`/`PROFESSIONAL` (required) |
| `status` | optional, default `DRAFT` |
| `stateId` | optional; owning state for a state-wide event (GLOBAL users only — STATE users always get their own state) |
| `districtId` | optional; DISTRICT-scope users are forced to their own district; STATE users may pick a district **in their state**; if given, the tournament's state is the district's state; omitted = state-wide |
| `venue` ≤ 200, `city` ≤ 100 | optional |
| `startDate`, `endDate` | required strings: `YYYY-MM-DD` (UTC midnight) or `YYYY-MM-DDTHH:mm` (IST) or full ISO |
| `registrationStart`, `registrationDeadline` | optional/nullable, same formats |
| `maxParticipants` | int 1–10000, nullable |
| `banner` | poster URL, http(s), ≤ 500, nullable |
| `contactName` ≤ 100, `contactPhone` ≤ 20, `contactEmail` email/""/null | optional |
| `requiresApprovedPlayer` | boolean, default true |

- **Date rule:** regStart < regDeadline < startDate ≤ endDate (400 with a specific message otherwise).
- **Success:** `{ id, name, slug, status }`.
- **Ownership** (`tournament-ownership.server.ts`): every new tournament gets a `stateId`. A GLOBAL user creating a state-wide event must pass `stateId` when more than one active state exists.
- **Errors:** 400 validation/dates/"Invalid district selected" (incl. a district in another state) / "Select the state this tournament belongs to"; 403 permission / "A state or district assignment is required…".
- **DB:** creates `Tournament` with unique slug. **Audit:** CREATE `TOURNAMENT_CREATED`. Revalidates public tournament cache.

### 9.2 Update tournament
- `PATCH /api/admin/tournaments/{id}` — same fields, all optional. `stateId`/`districtId` re-home the tournament only within the caller's scope (DISTRICT users cannot re-home). Dates are validated against the merged (existing + new) values.
- Access: `assertInScope` on the existing tournament — another state's (or, for district admins, another district's) tournament is 404.
- **Success:** `{ id, name, status }`.
- **Audit:** UPDATE `TOURNAMENT_STATUS_CHANGED {from,to}` when status changes, else `TOURNAMENT_UPDATED`. Revalidates cache.
- **Note:** changing status to `REGISTRATION_OPEN` is what opens registration; there are no automatic status transitions.

### 9.3 Add registration category
- `POST /api/admin/tournaments/{id}/categories` — `tournaments:manage`, tournament district access, CSRF.
- **Body:** `{ "name": "Senior Singles", "type": "SINGLES", "fee": 500 }` — name 2–100, type `SINGLES|DOUBLES`, fee integer 0–1,000,000 (whole rupees; numeric strings coerced).
- **Success:** full category row. **Audit:** CREATE `TOURNAMENT_CATEGORY_CREATED {name,type,fee}`.

### 9.4 Update registration category
- `PATCH /api/admin/tournaments/{id}/categories/{categoryId}` — body any of `{ name?, type?, fee?, isActive? }`.
- 404 if the category doesn't belong to `{id}`. 400 if changing `type` when registrations exist.
- **Fee changes affect future registrations only** — existing `TournamentRegistration.amount` values are untouched.
- **Audit:** UPDATE with `TOURNAMENT_FEE_CHANGED {from,to}` (if fee changed), else `TOURNAMENT_CATEGORY_DISABLED` (if deactivated), else `TOURNAMENT_CATEGORY_UPDATED`.

### 9.5 Remove registration category
- `DELETE /api/admin/tournaments/{id}/categories/{categoryId}`
- **Behaviour:** hard delete if no registration ever referenced it → `{ deleted: true, disabled: false }`, audit DELETE `TOURNAMENT_CATEGORY_DELETED`; otherwise sets `isActive=false` → `{ deleted: false, disabled: true }`, message "Registration category disabled (existing registrations depend on it)", audit UPDATE `TOURNAMENT_CATEGORY_DISABLED`.

---

## 10. Tournament Registration APIs

### 10.1 Register for a tournament
- **Method / Route:** `POST /api/tournaments/{tournamentId}/registrations`
- **Purpose:** register the caller's Player in one active category.
- **Authentication:** Session. **Permission:** none (Player ownership via session). **CSRF:** yes. **Rate limit:** 20/min.
- **Body:** `{ "categoryId": "ckx…" }` — the **only** accepted field. `amount`, `fee`, `playerId`, `status` in the body are ignored.
- **Success 200:**

```json
{ "success": true,
  "data": { "registration": {
      "id": "…", "tournamentId": "…", "tournamentName": "Jaipur District Open 2025",
      "categoryId": "…", "categoryName": "Senior Singles",
      "amount": 500, "status": "PENDING", "registeredAt": "…" } },
  "message": "Registered for Jaipur District Open 2025" }
```

- **Errors:**

| HTTP | Message |
|---|---|
| 400 | Invalid body (missing `categoryId`) |
| 400 | "Registration is not open for this tournament" (status ≠ REGISTRATION_OPEN) |
| 400 | "Registration has not started yet." / "Registration is closed." |
| 400 | "You must register as a player before registering for a tournament." |
| 400 | "An approved player registration is required for this tournament." |
| 400 | "This category is not available for registration." (wrong tournament, inactive, bad fee) |
| 400 | "Registration capacity has been reached." |
| 401 | not signed in |
| 403 | CSRF |
| 404 | "Tournament not found" |
| 409 | "You are already registered for this category." / "…for this tournament." (also on unique-constraint race) |
| 429 | rate limit |

- **DB effects:** one `TournamentRegistration` (`amount = category.fee` snapshot, `status = PENDING`) inside a transaction holding a row lock on the tournament.
- **Audit:** CREATE `tournaments`, entityType `TournamentRegistration`, `TOURNAMENT_REGISTRATION_CREATED` with tournament/category/player/registration ids and `amount` — written in the same transaction.
- **Security notes:** price is server-derived; one registration per player per tournament; capacity race-safe. See [RRA-PROJECT-STATUS.md §6](RRA-PROJECT-STATUS.md#6-tournament-pricing--business-rule).

No GET/DELETE registration endpoints exist; registrations are shown via Server Components.

### 10.2 Payable amount guard (service, not an endpoint)
`getPayableRegistrationAmount(registration)` in `src/modules/tournaments/registration.service.ts` returns `registration.amount`, or throws 400 `VALIDATION_ERROR` "This registration has no valid registration-time amount and cannot be paid online. Please contact RRA administration." when it is null, non-integer or negative. It never falls back to the category fee or a client value. Every Phase J payment endpoint must use it.

---

## 11. Payment APIs

**NOT IMPLEMENTED.** No payment routes, models, or provider SDKs exist. (`POST /api/donations` records a pledge only.) Phase J must charge `TournamentRegistration.amount` via `getPayableRegistrationAmount()` (§10.2).

---

## 12. Certificate & Verification APIs

### 12.1 Issue player certificate
See 4.3 (`/api/admin/players/{id}/certificate`). No coach issuance and no revocation endpoint exist.

### 12.2 Verify certificate
- **Method / Route:** `GET /api/verify?certificateNumber=&qrCode=&name=&district=&fatherName=` or `POST /api/verify` with the same keys as JSON.
- **Authentication:** Public. **CSRF:** none (POST is read-only). **Rate limit:** 60/min.
- **Validation:** at least one of `certificateNumber`, `qrCode`, `name` (400 otherwise).
- **QR values:** a certificate's QR value (`QR-…`) typed or scanned into the serial box (`certificateNumber`) also resolves (fixed 2026-09-27 — previously every scanned certificate read as invalid).
- **Lookup order:** static sample championship certificates (number match, ignoring `/` and `-`, substring allowed) → `PlayerCertificate`/`CoachCertificate` by number (case-insensitive, non-revoked) → Player/Coach by business ID (`PLR-…`/`CCH-…`) **only if that member has a non-revoked certificate** → by QR code → by candidate name: sample certificates (name + optional district), then **Players only** with a non-revoked certificate (name/district `contains`). `fatherName` is accepted but not used in any database match.
- **Result content (changed 2026-09-27):** built **only from the certificate's own snapshot** — `title`, `championshipName` (tournament name, or "Player Registration"), `organizedBy` ("District, State"), `district`, `stateName`, `venue` and `eventDates` (tournament certificates), `position` (achievement, may be empty), `signatoryList` (the certificate's signers in order), `verificationUrl` (`{APP_URL}/verify?qrCode=…` — exactly what the PDF QR and the on-screen QR encode; absent for sample records). Certificates issued before snapshots existed fall back to the legacy `signatories` pair. Previously real certificates were returned with invented championship/venue/guardian details. `pdfPath` is no longer returned.
- Tournament certificates return `type: "championship"`; registration certificates `"player"`.
- **Success 200 (always 200):** a result object with `valid: true|false`, `type` (`player`, `coach`, or `championship`), name, district, certificate number, issue date, signatories, and a message. Anything not found — including a registered member with no certificate — returns `valid: false` with "No certificate found matching the provided details. Please verify the serial number or candidate details."
- **DB:** read only. **Audit:** none.
- **Security note:** name-based lookup reveals whether a named person holds a certificate — intended public behaviour; NEEDS CONFIRMATION for privacy policy.

### 12.3 Serve stored file
- **Method / Route:** `GET /api/files/{...path}`
- **Authentication:** Session (401 otherwise). No CSRF (read-only).
- **Authorization:** the path must equal a `PlayerCertificate.pdfPath`, `CoachCertificate.pdfPath` or membership `certificatePath`. Allowed for the record's linked user, or for admins with `certificates:read` (certificates) / `memberships:read` (memberships) and district access. Everything else → 404 "File not found" (same response as a missing file, so it does not reveal whether a file exists).
- **Validation:** 400 "Invalid file path" for `..`, `\\` or NUL; local reads are confined to `STORAGE_LOCAL_PATH`.
- **Success:** file bytes inline; `Content-Type` from blob or `application/pdf`; `Cache-Control: private, no-store`; `X-Content-Type-Options: nosniff`.
- **Storage:** Netlify Blobs (store `NETLIFY_BLOBS_STORE` or `rra-uploads`) or local `STORAGE_LOCAL_PATH`.
- **Changed Pre-J:** previously public with `Cache-Control: public`.

---

## 13. Admin APIs (users & roles)

### 13.1 User actions
- **Method / Route:** `POST /api/admin/users/{id}/{action}`
- **Authentication:** `users:update`. **CSRF:** yes. Target user must be inside the caller's scope (404 otherwise). **Scope-changing actions (`assign-state`, `remove-state`, `assign-district`, `remove-district`, `toggle-federation-wide`) require GLOBAL scope** (403 otherwise).

| action | Body | Effect | Response |
|---|---|---|---|
| `activate` / `deactivate` | — | `isActive` true/false ("No change" if same) | `{ id, isActive }` |
| `assign-role` | `{ roleId }` | sets `roleId` (400 "Role not found") | `{ id, role: slug }` |
| `assign-state` | `{ stateId }` | sets `stateId` (State Admin scope); clears a district from another state (400 "State not found") | `{ id, stateId }` |
| `remove-state` | — | `stateId = null` and `districtId = null` | `{ id, stateId: null }` |
| `assign-district` | `{ districtId }` | sets `districtId` **and** `stateId` = the district's state (400 "District not found" / district without a state) | `{ id, districtId }` |
| `remove-district` | — | `districtId = null` (state kept → State scope) | `{ id, districtId: null }` |
| `toggle-federation-wide` | — | flips `isFederationWide` | `{ id, isFederationWide }` |
| `reset-password` | `{ password }` | **Super Admin only** (403 for every other role, even with `users:update`). Only for e-mail + password accounts (400 for Google / e-mail-code accounts). Password: 12–128 characters with upper- and lower-case letters, a digit and a symbol, not a published demo password (400). Stored as a bcrypt hash; 10 resets per admin per 15 minutes; audit `PASSWORD_RESET` (no password recorded). Sessions already open stay valid until they expire (≤ 30 min) | `{ id }` — the password is never returned |

- **Errors:** 400 invalid action; 404 user.
- **Audit:** UPDATE `users` `{ field, previousValue, newValue }`.
- **Security notes:** no guard against an admin deactivating/demoting themselves or the last Super Admin — NEEDS DECISION. Changes reach the target's session within ≤ 60 s.

### 13.2 Create role
- `POST /api/admin/roles` — `roles:manage`, CSRF.
- **Body:** `{ "name": "Certificate Manager", "description"?: "…", "permissionIds": ["<Permission.id>", …] }` (name 2–60, description ≤ 200).
- Slug auto-generated and de-duplicated. `isSystem=false`.
- **Success:** `{ id, slug }`. **Audit:** CREATE `roles`.

### 13.3 Update role permissions
- `PATCH /api/admin/roles/{id}` — body `{ "permissionIds": [...] }` replaces the set atomically.
- **Errors:** 403 "Built-in system roles cannot be edited"; 404.
- **Success:** `{ id, permissions: [slugs] }`. **Audit:** UPDATE `roles` with previous/new slugs.

---

## 13c. States & Districts APIs

### States — `POST /api/admin/states`, `PATCH|DELETE /api/admin/states/{id}`
- **Authentication:** `states:manage` **and** GLOBAL scope (403 "Only the Super Admin can manage states"). CSRF.
- **Body:** `{ name 2–100, code? ≤10 (upper-cased, "" clears), isActive?, sortOrder? 0–100000 }`; PATCH: any subset (400 "No changes provided" if empty).
- **Errors:** 409 duplicate name/slug/code; DELETE 409 while the state has districts, state admins or tournaments ("Deactivate it instead"); 404.
- **Audit:** `STATE_CREATED` / `STATE_UPDATED {fields, previousValues, newValues}` / `STATE_DELETED` (module `states`). Revalidates public district lists.

### Districts — `POST /api/admin/districts`, `GET|PATCH|DELETE /api/admin/districts/{id}`
- **Authentication:** GET `districts:read`; others `districts:manage`. All record routes are scoped (404 outside scope). CSRF on mutations.
- **Create body:** `{ name 2–100, stateId?, president?, secretary?, email?, phone?, address?, isActive?, sortOrder? }`. GLOBAL users must pass `stateId`; STATE users always create in their own state; DISTRICT users are refused (403).
- **Update body:** any subset of the above. Renaming regenerates the slug. **Changing `stateId` is GLOBAL-only** (403) because it re-homes every player/coach/member of the district. `sortOrder` is the public/admin display order.
- **GET** returns the full district row — the admin Edit modal loads from it on open, so it always shows the selected district's current data.
- **Errors:** 409 duplicate name within the state; DELETE 409 while users/players/coaches/memberships/tournaments/requests reference it ("Deactivate it instead").
- **Audit:** `DISTRICT_CREATED` / `DISTRICT_UPDATED {fields, previousValues, newValues}` / `DISTRICT_DELETED` (module `districts`).

## 13d. Certificate Signatories & Tournament Certificates

### Signatories — `POST /api/admin/signatories`, `PATCH|DELETE /api/admin/signatories/{id}`
- **Auth:** `certificates:issue`; record in scope (404 otherwise). CSRF.
- **Body:** `{ name 2–100, designation 2–100, organization? ≤150, signatureImageUrl? (/images/… or https), stateId?, districtId?, isActive?, sortOrder? }`. Owner resolved from scope (district admins → own district; state admins → own state or a district in it; GLOBAL may leave both empty = federation level).
- **DELETE:** a signatory assigned to any tournament is **deactivated** instead (issued certificates keep their snapshot).
- **Audit:** `SIGNATORY_CREATED/UPDATED/DEACTIVATED/DELETED` (module `certificates`).

### Tournament certificate settings — `PUT /api/admin/tournaments/{id}/certificate-settings`
- **Auth:** `tournaments:manage` + tournament in scope. CSRF.
- **Body:** `{ certificateTitle? 3–120 | "" , certificateLogoUrl? (/images/… or https) | "", signatoryIds?: string[] (≤4, ordered = signing order, replaces the list) }`.
- Every signatory must be active and **usable by this tournament** (federation level, the tournament's state, or its district) — otherwise 400.
- **Audit:** `TOURNAMENT_CERTIFICATE_SETTINGS_UPDATED` with previous/new signatory ids and state/district.

### Issue tournament certificates — `POST /api/admin/tournaments/{id}/certificates`
- **Auth:** `certificates:issue` + tournament in scope (district admins: own district's tournaments; state admins: own state; Super Admin: any). CSRF, 20/min.
- **Body:** `{ entries: [{ playerId, position? ≤120 }] }` (1–200).
- **Rules:** tournament `COMPLETED` (else 400); ≥1 active signatory assigned (else 400); each player must hold a PENDING/APPROVED registration for this tournament (else skipped "Not registered for this tournament"); one certificate per player per tournament (else skipped "Already issued: CERT-…").
- **Success:** `{ issued: [{ id, playerId, playerName, certificateNumber, pdfPath, pdfUrl }], skipped: [{ playerId, reason }] }`.
- **Effects:** certificate rows with the tournament snapshot and signer snapshot; PDF via storage. **Audit:** one `TOURNAMENT_CERTIFICATE_ISSUED` per certificate (tournament, player, state, district).

The registration-certificate route (`POST /api/admin/players/{id}/certificate`) is unchanged except that it now ignores tournament certificates when enforcing "one active registration certificate", snapshots the player's state officials, and audits `REGISTRATION_CERTIFICATE_ISSUED` with state/district.

## 13e. Member Onboarding, District Equipment, Test Payments & Requirements (2026-10-01)

### Locations (public)
- `GET /api/locations/states` — active states with at least one active district: `[{ id, name }]`. 120/min.
- `GET /api/locations/districts?stateId=…` — active districts **of that state only**: `[{ id, name }]`. Missing `stateId` → 400; unknown/inactive state → 404.

### Onboarding (removed 2026-10-02 — see §13f)
- ~~`POST /api/account/onboarding`~~ — removed; now 404. Was: Session, CSRF, 20/min. Body `{ name, phone (10-digit), memberType: "PLAYER"|"COACH"|"SUPPORTER", stateId, districtId, address?, city?, pincode? }`. The district must belong to the state (**400** "The selected district does not belong to the selected state"); inactive/unknown district → 400. Sets the member's home State/District on `UserProfile` once — if a home already exists (here or through a player/coach registration) → **409** (moves go through a District Change request). Response `{ stateName, districtName, next }` (`/account/player`, `/account/coach` or `/account/dashboard`). Audit `MEMBER_ONBOARDED`.
- `PATCH /api/account/profile` never changes the home State/District (extra fields are dropped).

### Member checkout
- `POST /api/account/equipment/orders` — Session, CSRF, 20/min. Body `{ items: [{ equipmentId, quantity 1–10 }], delivery: { name, phone, email?, address (≥ 10), city, pincode (6 digits) } }`. A member without a home district sees and can order from the central store only (the onboarding requirement was removed on 2026-10-02). Items outside the member's catalog → 404; one store per order → 400; stock → 409. Creates Order `PENDING_PAYMENT` / Payment `PENDING` with snapshots: buyer name/email/phone, member ID, delivery address/city/pincode, home district/state names, item name, SKU, unit price, line totals. Response `{ id, orderNumber, status, paymentStatus, total }`.

### Test payments (dummy Razorpay)
All Session + CSRF, 20/min; another member's order or attempt → 404. `PAYMENT_PROVIDER=disabled` turns payments off (400 "Online payment is not available right now").
- `POST /api/account/equipment/payment/create` — `{ orderId }` → a gateway order for an unpaid order: `{ provider: "dummy-razorpay", isTest: true, providerOrderId: "order_TEST…", amount, currency: "INR", orderNumber, checkout }`. Paid → 409; no longer payable → 409. Earlier unfinished attempts are superseded.
- `POST /api/account/equipment/payment/simulate` — test gateway only: `{ providerOrderId, outcome: "success"|"failure" }`. Success returns `{ razorpay_order_id, razorpay_payment_id: "pay_TEST…", razorpay_signature }` (HMAC-SHA256 of `order_id|payment_id` with a server-only key) and records the payment id on the attempt. Failure marks the attempt FAILED and the order's Payment FAILED (order stays awaiting payment). A finished attempt → 409.
- `POST /api/account/equipment/payment/verify` — `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`. Paid **only** when the signature verifies, the payment id is the one the gateway issued for that attempt, the amount equals the order total and the attempt belongs to the caller — otherwise 400 "Payment could not be verified" (audited). Success: attempt PAID, Order `PLACED` / Payment `PAID`, `paidAt`. Repeating is idempotent (`alreadyPaid: true`).
- `POST /api/account/equipment/payment/cancel` — `{ providerOrderId }`: the member closed the checkout → attempt and Payment `CANCELLED`; the order stays and can be paid or cancelled later.

### Uploads
- `POST /api/admin/media` — `equipment:manage`, CSRF, 30/min, multipart `file` + `kind` (`equipment-image`: PNG/JPEG/WebP ≤ 2 MB; `requirement-attachment`: PNG/JPEG/WebP/PDF ≤ 4 MB). Type is detected from the file content (SVG, text and disguised files → 400). Owned by the uploader's scope. Response `{ id, url: "/api/media/{id}", mimeType, size, fileName }`.
- `GET /api/media/{id}` — equipment images are public (`Cache-Control: public, immutable`, `nosniff`); requirement attachments need `equipment:read` and the owning district in scope (out of scope → 404, anonymous → 401), `Cache-Control: private, no-store`.

### District requirements
- `POST /api/admin/equipment/requirements` — `equipment:manage`, CSRF. Body `{ itemName, category, quantity ≥ 1, estimatedUnitPrice?, priority: LOW|MEDIUM|HIGH|URGENT, requiredBy? (YYYY-MM-DD), description?, notes?, attachmentId?, districtId? }`. District Admins always file for their own district (`districtId` ignored); State Admins for a district of their state (another state → 400; none → 400); Super Admin any district. An attachment must be a requirement upload within the caller's scope (400 otherwise — missing and out-of-scope look the same).
- `PATCH /api/admin/equipment/requirements/{id}` — out of scope → 404. With `status` = review: State Admin (own state) or Super Admin only (District Admin → 403); moves `PENDING → UNDER_REVIEW | APPROVED | REJECTED`, `UNDER_REVIEW → APPROVED | REJECTED`, `APPROVED → FULFILLED` (others 409); `REJECTED` needs `reviewNote` (400). Without `status`: edit fields — pending requirements only (409 otherwise).
- `DELETE /api/admin/equipment/requirements/{id}` — pending only (409 otherwise). Audit `EQUIPMENT_REQUIREMENT_CREATED/UPDATED/REVIEWED/DELETED`.

## 13f. Player & Coach Applications (2026-10-02)

- `POST /api/players/register`, `POST /api/players/{id}/resubmit`, `POST /api/coaches/register`, `POST /api/coaches/{id}/resubmit` accept the location either as ids — `stateId` + `districtId` (account forms) — or as names — `district` + optional `state` (public forms). One of `districtId` / `district` is required (400).
- With ids: `districtId` without `stateId` → **400** "Select your state"; unknown or inactive district/state → **400** "Invalid district selected"; district of another state → **400** "The selected district does not belong to the selected state". The owning state is always the district's.
- One application per account and type. A second `register` call → **409** with the current status: "Your player application is already under review." / "You are already a registered player." / "Your player application was returned — correct and resubmit it from the Player Portal." (coach likewise). The unique `userId` column backs this against races (409).
- `resubmit` works only on the owner's REJECTED record (another member's → 404; pending or approved → 409) and updates the same record.
- Registering never changes the account's role.

## 13g. One Registration per Account & Government ID (2026-10-02)

- **One registration per account.** `POST /api/players/register`, `/api/coaches/register`, `/api/memberships/{club,school,academy}` and the resubmit routes check, for a signed-in caller, the account's existing Player / Coach / Club-School-Academy records. If the account holds another type → **409** "You are registered as a Player. An account can hold only one registration — Player, Coach or Membership." (approved) or "You already have a Coach application. …" (pending/returned/expired). An approved type outranks others. Account submissions are serialised per account (database advisory lock). Anonymous public submissions are not linked to an account and are not affected.
- `POST /api/account/documents/government-id` — Session, CSRF, 10/min. `multipart/form-data` with `file` (PDF, PNG, JPEG or WebP by content; ≤ 5 MB; otherwise 400). Only for accounts that may apply as Player or Coach (else 409). Response `{ id, fileName, mimeType, size }`. Audit `GOVERNMENT_ID_UPLOADED` (no number).
- Player/Coach register and resubmit accept `governmentIdType` (`AADHAAR` | `PAN` | `PASSPORT` | `VOTER_ID` | `DRIVING_LICENCE`), `governmentIdNumber`, `governmentIdDocumentId`. Required for a signed-in applicant (400 "Select your Government ID type" / "Enter your Government ID number" / "Upload your Government ID document"); the number must match the type's format (400) and is stored without spaces/hyphens, upper-cased; the document must be a `GOVERNMENT_ID` upload by the same account not attached elsewhere (400 otherwise). On resubmit, a blank number or no new document keeps what is on file; a replaced document is deleted.
- `GET /api/media/{id}` for a `GOVERNMENT_ID` document: the uploader, or a user with `players:read` / `coaches:read` whose scope covers the linked application's district → 200 (`private, no-store`); anyone else signed in → 404; anonymous → 401.

## 13h. Member Account APIs (2026-10-02 / 10-03)

All derive the member from the session; ids in the URL or query never grant access.

- `GET /api/account/tournaments` — Session, 60/min. The player's own entries. Query: `q` (name or code), `status` (`reg:PENDING|APPROVED|REJECTED`, `t:UPCOMING|IN_PROGRESS|COMPLETED|CANCELLED`), `year`, `state`, `district`, `certificate` (`yes|no`), `page`, `pageSize` (10/20/25). Response `{ rows, total, page, pageSize, pages }`. No player → empty list.
- `GET /api/account/certificates/{id}` — Session. One of the member's own player certificates (snapshot fields, `type`, `downloadUrl`); others → 404.
- `GET /api/certificates/{id}/pdf` — Session, 30/min. The certificate PDF (attachment, `private, no-store`): owner, or `certificates:read` within scope; others 404; owner of a revoked certificate 409. Only GET (other methods 405).
- `POST /api/account/requests/{id}/cancel` — Session, CSRF, 20/min. Own PENDING request → `CANCELLED` (kept; audit `REQUEST_CANCELLED`); processed → 409; not the caller's → 404.
- `POST /api/requests` — adds `requestedField` (`NAME|DATE_OF_BIRTH|GENDER|CATEGORY`) for a PROFILE_CORRECTION; `currentValue` is set by the server. Approval applies the field and audits `changes: [{ field, previousValue, newValue }]`.
- `POST /api/tournaments/{id}/registrations` — same rules as the pages (status, IST window, categories, capacity, approved player); messages say why.
- `PATCH /api/account/profile` — with an approved Player/Coach registration, changing `address` → 400 (use an Address Update request).
- `POST /api/players/register` / resubmit — Government ID optional.

## 13a. Admin Gallery APIs

### 13a.1 Create gallery item
- `POST /api/admin/gallery` — `media:manage`, CSRF.
- **Body:** `{ "title": 2–200, "category": 1–100 (Tournament/Events/Action/Training/Team/Facilities/Leadership on the form), "imageUrl": 1–500, "description"?: ≤2000, "driveUrl"?: Google Drive URL | null, "sortOrder"?: int ≥0 (default 0), "isPublished"?: bool (default false) }`.
- **driveUrl validation:** server-side `isValidDriveUrl()` — https/http on `drive.google.com` (or `docs.google.com` with `/d/`); stored as-is, never fetched server-side. null/"" removes the link.
- **Success:** `{ id, title, slug, isPublished }` (slug auto-deduped). **Audit:** CREATE `GALLERY_ITEM_CREATED`. Revalidates `public-gallery` + `/media/gallery`.

### 13a.2 Update / delete gallery item
- `PATCH /api/admin/gallery/{id}` — same fields, all optional; `driveUrl: null` removes the link; `isPublished` toggles public visibility (publishedAt kept from first publish).
- **Audit:** UPDATE `GALLERY_ITEM_ACTIVATED` / `GALLERY_ITEM_DEACTIVATED` / `GALLERY_ITEM_UPDATED` (+ `GALLERY_DRIVE_URL_CHANGED` detail when the link changed), with previous/new values.
- `DELETE /api/admin/gallery/{id}` — hard delete (cascades `GalleryImage` rows). **Audit:** DELETE `GALLERY_ITEM_DELETED`.
- **Errors:** 400 validation / "No changes provided"; 401/403 (session/permission/CSRF); 404 unknown id.
- Public page always shows only `isPublished = true` items, ordered `sortOrder` asc then `createdAt` desc; the lightbox shows the Drive button only when a link exists.

---

## 13b. Contact, Equipment Shop & Media Videos APIs

### Contact inbox
- `PATCH /api/admin/contact/{id}` — `contact:manage`, CSRF. Body `{ "status": "NEW"\|"READ"\|"REPLIED"\|"CLOSED" }`. Audit `CONTACT_STATUS_CHANGED`.
- `DELETE /api/admin/contact/{id}` — `contact:manage`. Audit `CONTACT_MESSAGE_DELETED`.
- Public `POST /api/contact` (existing) now also: sends a **New Contact Us Message - RRA** email to the configured Super Admin address (Setting `contact_email` → `SUPER_ADMIN_EMAIL` env → site default) with reply-to = the visitor, plus a best-effort visitor confirmation. Emails are sent **after** persistence; failures never lose the message and only set `emailSent=false`. Rate limit 10/min/IP unchanged.

### Equipment shop
- `POST /api/equipment/purchase` — Session, CSRF, 20/min. Older single-step endpoint, same rules as the member checkout below (delivery details optional — taken from the profile). Every item must be in the buyer's catalog (central store, own state store, own district store) — anything else is **404 "Equipment not found"**; one store per order (400); client price/total fields ignored; stock reserved atomically (409 when insufficient).
- `POST /api/equipment/orders/{id}/cancel` — Session owner (404 otherwise); **unpaid** orders only (409 otherwise). Restocks reserved items and sets Order `CANCELLED` / Payment `CANCELLED` in one transaction. Audit `EQUIPMENT_ORDER_CANCELLED`.
- `POST/PATCH/DELETE /api/admin/equipment…` — `equipment:manage` **and scope**: body may carry `stateId`/`districtId` (district admins are forced to their district, state admins to their state, only GLOBAL may use the central store — omit both); out-of-scope items → 404. Fields: `name`, `category`, `price` (whole ₹), `stockQuantity`, `sortOrder`, `isActive`, `shortDescription`, `description`, `sku` (≤ 60), `specifications` ("Label: value" lines, ≤ 3000), `image` (an uploaded `/api/media/{id}`, a `/images/…` path or an http(s) URL; anything else 400). Items with orders are archived (deactivated) on delete.
- `PATCH /api/admin/equipment/orders/{id}` — `equipment:manage`, CSRF; order must be in the caller's scope (404 otherwise). Body `{ status: "CONFIRMED"|"PROCESSING"|"SHIPPED"|"DELIVERED"|"CANCELLED", courierName?, trackingNumber? }` (courier/tracking saved on SHIPPED). One step at a time: `PLACED → CONFIRMED → PROCESSING → SHIPPED → DELIVERED` (skipping or going back → 409); every step needs `paymentStatus = PAID` (400 otherwise); `CANCELLED` only for unpaid orders (releases stock) — paid orders 409 (no refunds yet); cancelled is final (409). Never changes `paymentStatus`. Audit `EQUIPMENT_ORDER_STATUS_CHANGED`.
- **Payment status:** set to `PAID` only by `verifyAndMarkPaid()` after server-side verification by the payment provider (§13e). Today the provider is the dummy Razorpay-style **test** gateway (no real money).

### Media videos (YouTube)
- `POST /api/admin/media/videos` and `PATCH/DELETE …/{id}` — `videos:manage`, CSRF.
- The server extracts the 11-char video ID from watch / youtu.be / shorts / embed / bare-ID forms; non-YouTube URLs are rejected (400) and duplicate IDs get 409. URL changes are audited (`MEDIA_VIDEO_URL_CHANGED`) alongside `MEDIA_VIDEO_CREATED/UPDATED/ACTIVATED/DEACTIVATED/DELETED`. Thumbnails are derived from the video ID (`i.ytimg.com`), never uploaded.
- Public `/media/videos` reads active rows (`sortOrder` asc, cached tag `public-videos`), falling back to the static YouTube list when empty.

---

## 14. Public form APIs

| Route | Body | Success | Rate limit |
|---|---|---|---|
| `POST /api/contact` | `name` 2–100, `email`, `phone?` ≤ 20, `subject?` ≤ 200, `message` 10–5000 | `{ submitted: true }` "Message sent successfully" | 10/min |
| `POST /api/donations` | `name` 2–100, `email?`, `mobile?` ≤ 20, `amount` number > 0 ≤ 10,000,000, `message?` ≤ 1000 (the form sends `"<purpose>: <message>"`), `isAnonymous?` | `{ recorded: true }` "Thank you for your donation!" | 10/min |
| `POST /api/equipment/orders` | `name` 2–100, `mobile` 10–20, `address` 10–500, `district` 1–100 (free text), `equipment` 2–120 | `{ orderId }` | 10/min |

All Public + CSRF. DB: create `ContactMessage` / `Donation` (name stored as "Anonymous" when `isAnonymous`) / `EquipmentOrder`. No email is sent. No audit. No payment is taken for donations.
