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
| `BAD_REQUEST` | 400 | Missing path params, invalid action, missing rejection reason |
| `UNAUTHORIZED` | 401 | No/expired/inactive session on an authenticated route |
| `FORBIDDEN` | 403 | Missing permission, wrong district, **missing/invalid CSRF token** |
| `NOT_FOUND` | 404 | Record missing (or not owned by caller on owner routes) |
| `CONFLICT` | 409 | Already processed, duplicate registration/request/application |
| `RATE_LIMITED` | 429 | Per-route or global (120/min/IP on `/api/*`) limit |
| `INTERNAL_ERROR` | 500 | Unexpected; message hidden in production |

**CSRF:** routes marked *CSRF: yes* require `x-csrf-token` header equal to the `csrf_token` cookie obtained from `GET /api/csrf`. The browser client (`src/lib/api-client.ts → apiFetch`) handles this automatically.

**Auth levels:** *Public* (none) · *Session* (any signed-in user, `requireAuth`) · *Permission `x`* (`requirePermission`; `super-admin` always passes) · *District-scoped* (non-federation-wide users restricted to their district, 403 otherwise).

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
  "district": "Jaipur", "category": "Junior" }
```

| Field | Validation |
|---|---|
| name | 2–100 |
| dateOfBirth | string (parsed with `new Date`) |
| gender | `MALE`/`FEMALE`/`OTHER` |
| email | email ≤ 254 |
| mobile | 10–20 chars |
| district | 1–100; must match a `District.name` case-insensitively |
| category | optional ≤ 50 |

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
- **Authentication:** Permission `players:approve`; `certificate` additionally `certificates:issue`. District-scoped by `Player.districtId`. **CSRF:** yes.
- **Bodies:** approve — none. reject — `{ "reason": "…" }` — **required**, trimmed, 1–1000 chars (400 "A rejection reason is required" / "…1000 characters or fewer"; enforced since Pre-J). certificate — optional `{ "certificateNumber"?, "issuedAt"?, "expiresAt"? }` (ISO dates).
- **Success 200:**
  - approve → `{ playerId, status: "APPROVED" }`
  - reject → `{ playerId, status: "REJECTED" }`
  - certificate → `{ certificateNumber, qrCode, issuedAt, expiresAt, pdfUrl }`, message "Certificate CERT-… issued"
- **Errors:** 400 missing params / "Invalid action" / "Player not found or not approved" (certificate); 403 permission/district/CSRF; 404 player; 409 "already been processed" (approve/reject of non-PENDING) or "Certificate already issued: …".
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
- `POST /api/admin/coaches/{id}/approve|reject` — `coaches:approve`, district-scoped, CSRF.
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
- `POST /api/admin/memberships/{type}/{id}/approve|reject` — `memberships:approve`, district-scoped, CSRF.
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
| `requestedDistrict` | district **name**; required for `DISTRICT_CHANGE` |

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
- **Authentication:** `requests:approve`; district-scoped via linked Player/Coach district. **CSRF:** yes.
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
| `districtId` | optional; **ignored/forced** to the admin's district for non-federation-wide users; null = state-wide |
| `venue` ≤ 200, `city` ≤ 100 | optional |
| `startDate`, `endDate` | required strings: `YYYY-MM-DD` (UTC midnight) or `YYYY-MM-DDTHH:mm` (IST) or full ISO |
| `registrationStart`, `registrationDeadline` | optional/nullable, same formats |
| `maxParticipants` | int 1–10000, nullable |
| `banner` | poster URL, http(s), ≤ 500, nullable |
| `contactName` ≤ 100, `contactPhone` ≤ 20, `contactEmail` email/""/null | optional |
| `requiresApprovedPlayer` | boolean, default true |

- **Date rule:** regStart < regDeadline < startDate ≤ endDate (400 with a specific message otherwise).
- **Success:** `{ id, name, slug, status }`.
- **Errors:** 400 validation/dates/"Invalid district selected"; 403 permission / "District assignment required" / state-wide by district admin.
- **DB:** creates `Tournament` with unique slug. **Audit:** CREATE `TOURNAMENT_CREATED`. Revalidates public tournament cache.

### 9.2 Update tournament
- `PATCH /api/admin/tournaments/{id}` — same fields, all optional; `districtId` changes only honoured for federation-wide users. Dates are validated against the merged (existing + new) values.
- Access: `assertTournamentDistrictAccess` on the existing tournament (district admins cannot edit state-wide or other-district tournaments).
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
- **Lookup order:** static sample championship certificates (number match, ignoring `/` and `-`, substring allowed) → `PlayerCertificate`/`CoachCertificate` by number (case-insensitive, non-revoked) → Player/Coach by business ID (`PLR-…`/`CCH-…`) **only if that member has a non-revoked certificate** → by QR code → by candidate name: sample certificates (name + optional district), then **Players only** with a non-revoked certificate (name/district `contains`). `fatherName` is accepted but not used in any database match.
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
- **Authentication:** `users:update`. **CSRF:** yes. Not district-scoped.

| action | Body | Effect | Response |
|---|---|---|---|
| `activate` / `deactivate` | — | `isActive` true/false ("No change" if same) | `{ id, isActive }` |
| `assign-role` | `{ roleId }` | sets `roleId` (400 "Role not found") | `{ id, role: slug }` |
| `assign-district` | `{ districtId }` | sets `districtId` (400 "District not found") | `{ id, districtId }` |
| `remove-district` | — | `districtId = null` | `{ id, districtId: null }` |
| `toggle-federation-wide` | — | flips `isFederationWide` | `{ id, isFederationWide }` |

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

## 14. Public form APIs

| Route | Body | Success | Rate limit |
|---|---|---|---|
| `POST /api/contact` | `name` 2–100, `email`, `phone?` ≤ 20, `subject?` ≤ 200, `message` 10–5000 | `{ submitted: true }` "Message sent successfully" | 10/min |
| `POST /api/donations` | `name` 2–100, `email?`, `mobile?` ≤ 20, `amount` number > 0 ≤ 10,000,000, `message?` ≤ 1000 (the form sends `"<purpose>: <message>"`), `isAnonymous?` | `{ recorded: true }` "Thank you for your donation!" | 10/min |
| `POST /api/equipment/orders` | `name` 2–100, `mobile` 10–20, `address` 10–500, `district` 1–100 (free text), `equipment` 2–120 | `{ orderId }` | 10/min |

All Public + CSRF. DB: create `ContactMessage` / `Donation` (name stored as "Anonymous" when `isAnonymous`) / `EquipmentOrder`. No email is sent. No audit. No payment is taken for donations.
