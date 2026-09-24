# RRA Platform — Testing Guide

Manual testing checklist for the Rajasthan Racquetball Association platform. Use this before demos, releases, or Netlify deploys.

---

## 1. Environment Setup

### Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL) **or** external Postgres (Neon, etc.)

### Start services (local)

```bash
# Database
docker compose up postgres -d

# Install & migrate (first time or after schema changes)
npm install
npm run db:push
npm run db:seed

# Dev server
npm run dev

# If Turbopack cache errors occur, use webpack mode:
# npx next dev --webpack
```

Open **http://localhost:3000**

### Verify infrastructure

| Check | Command / URL | Expected |
|-------|---------------|----------|
| Dev server | http://localhost:3000 | Home page loads (200) |
| Database health | http://localhost:3000/api/health | `{ "success": true, "data": { "status": "healthy" } }` |
| CSRF token | http://localhost:3000/api/csrf | `{ "success": true, "data": { "token": "..." } }` + `csrf_token` cookie |
| Production build | `npm run build` | Exit code 0, no TypeScript errors |
| Lint | `npm run lint` | No blocking errors |

---

## 2. Test Accounts

Run `npm run db:seed` if accounts are missing.

> **Full copy-paste values:** [docs/TEST-DATA.md](TEST-DATA.md)

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Super Admin | `admin@rajasthanracquetball.com` | `Admin@123` | Full admin panel |
| District Admin (Jaipur) | `district.jaipur@rajasthanracquetball.com` | `District@123` | Jaipur district data only |

**Login paths**

- Header → **Admin Login** → `/login`
- Login page → **Quick login** buttons (one-click for each role)

---

## 3. Public Website

### Navigation & pages

Visit each page and confirm it loads without console errors.

> **Image assets:** See [docs/IMAGES.md](IMAGES.md) for all `/images/*` paths and which pages use them.

| Page | URL |
|------|-----|
| Home | `/` |
| About — History | `/about/history` |
| About — Executive Committee | `/about/executive-committee` |
| About — Rules & Policies | `/about/rules-policies` |
| About — Racquetball | `/about/racquetball` |
| About — Districts | `/districts` (also under **About** nav dropdown) |
| Tournaments | `/tournaments` |
| Media — News | `/media/news` |
| Media — Videos | `/media/videos` |
| Media — Gallery | `/media/gallery` |
| Resources — Equipment | `/resources/equipment` |
| Resources — Court Specs | `/resources/court-specifications` |
| Resources — Physio Partners | `/resources/physio-partners` |
| Governance — RTI | `/governance/rti` |
| Governance — Anti-Doping | `/governance/anti-doping` |
| Contact | `/contact` |
| Donations | `/donations` |
| Verify Certificate | `/verify` |

### Header & footer

- [ ] Logo links to home (uses `/images/cropped-rra-logo.webp`)
- [ ] Main nav dropdowns open (**About** includes Districts; **Membership**, **Media**, **Resources**)
- [ ] **Verify Certificate** and **Join RRA** buttons work
- [ ] **Admin Login** visible when logged out
- [ ] **Dashboard** + **Sign Out** visible when logged in as admin
- [ ] Mobile menu opens/closes and all links work

---

## 4. Public Forms (CSRF + validation)

All POST forms fetch a CSRF token from `/api/csrf` automatically. Submit each form and confirm a success toast appears.

### Contact — `/contact`

- [ ] Valid submission → success toast
- [ ] Invalid email → inline validation error
- [ ] Empty message → validation error

### Player registration — `/register/player`

- [ ] Valid form → success toast with Player ID
- [ ] Invalid district → error message
- [ ] Duplicate or invalid Aadhar length → validation error

### Coach registration — `/register/coach`

- [ ] Valid form → success toast with Coach ID
- [ ] Missing certification level → validation error

### Membership forms

| Type | URL |
|------|-----|
| Club | `/membership/club` |
| School | `/membership/school` |
| Academy | `/membership/academy` |

- [ ] Each form submits successfully and shows membership ID in toast

### Donations — `/donations`

- [ ] Valid amount and purpose → thank-you toast
- [ ] Invalid amount → validation error

### Certificate verification — `/verify`

- [ ] Valid certificate number (from seed/admin) → green “Valid Certificate” card with details
- [ ] Valid **player/coach ID** (e.g. `PLR-TEST-001`, `CCH-TEST-001`) → valid result
- [ ] Valid **QR code** (e.g. `QR-RRA-2025-PLR001`) in optional QR field → valid result
- [ ] Invalid number → red “Verification Failed” card
- [ ] Empty both fields → validation error

---

## 5. Authentication & Authorization

### Login — `/login`

- [ ] Wrong password → “Invalid email or password”
- [ ] **Super Admin** quick login → redirects to `/admin`
- [ ] **District Admin** quick login → redirects to `/admin`
- [ ] Manual email/password login works
- [ ] **Back to website** link returns to `/`

### Session & access control

- [ ] Logged-out user visiting `/admin` → redirect to `/login`
- [ ] Super Admin sees all sidebar items (Players, Users, Audit Logs, Settings, etc.)
- [ ] District Admin sees limited sidebar (no Users, Audit Logs, Settings)
- [ ] Sign out from header → returns to public site, `/admin` blocked again

### District scoping (District Admin)

Log in as `district.jaipur@rajasthanracquetball.com`:

- [ ] **Dashboard** counts reflect Jaipur data only (or zero if no Jaipur records)
- [ ] **Players** list shows only Jaipur players
- [ ] **Coaches** / **Memberships** / **Certificates** / **Tournaments** scoped to Jaipur
- [ ] **Districts** shows only Jaipur
- [ ] Cannot access `/admin/users`, `/admin/audit-logs`, `/admin/settings` (redirect or forbidden)

Log in as Super Admin:

- [ ] Sees players/coaches from **all** districts

---

## 6. Admin Panel Workflows

### Dashboard — `/admin`

- [ ] Stat cards show numbers (not all zero after seed)
- [ ] Quick action links navigate correctly

### Players — `/admin/players`

As **Super Admin** (or District Admin for Jaipur player):

1. Register a new player via public form (status: `PENDING`)
2. In admin, find the player
3. [ ] **Approve** → status becomes `APPROVED`, success toast
4. [ ] **Issue Cert** → certificate issued, success toast
5. [ ] Reject flow on another pending player → status `REJECTED`

As **District Admin**:

- [ ] Can approve/reject **only** players in assigned district
- [ ] Approve action on another district’s player → error (403) if attempted via API

### Certificates — `/admin/certificates`

- [ ] **Issue Certificate** button opens player dropdown modal
- [ ] Issued certificates appear in list
- [ ] **View** PDF link opens (local: `/uploads/...` or `/api/files/...` on Netlify)

### Tournaments — `/admin/tournaments`

- [ ] **Add Tournament** button opens create modal (district admin: Jaipur locked)
- [ ] Tournament list from seed / newly created entries

### Other admin pages

| Page | What to check |
|------|----------------|
| `/admin/coaches` | Coach list loads, district filter for district admin |
| `/admin/memberships` | Club / school / academy tables populate |
| `/admin/tournaments` | Tournament list; **Add Tournament** for managers |
| `/admin/media` | News, videos, galleries (Super Admin / content roles) |
| `/admin/districts` | All districts (Super Admin) vs one (District Admin) |
| `/admin/users` | User list (Super Admin only) |
| `/admin/audit-logs` | Logs after approve/reject/certificate actions |
| `/admin/settings` | Settings groups display (Super Admin only) |

---

## 7. API Testing (optional)

Fetch CSRF token first, then use it on POST requests.

```bash
# Health
curl http://localhost:3000/api/health

# CSRF token
curl -c cookies.txt http://localhost:3000/api/csrf
TOKEN=$(curl -s -b cookies.txt http://localhost:3000/api/csrf | jq -r '.data.token')

# Contact (example)
curl -X POST http://localhost:3000/api/contact \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $TOKEN" \
  -d '{"name":"Test User","email":"test@example.com","phone":"9876543210","subject":"Test","message":"Hello from API test"}'

# Verify certificate
curl "http://localhost:3000/api/verify?certificateNumber=CERT-XXXXX"
```

### API endpoints

| Method | Endpoint | Auth | CSRF |
|--------|----------|------|------|
| GET | `/api/health` | No | No |
| GET | `/api/csrf` | No | No |
| GET | `/api/verify` | No | No |
| POST | `/api/contact` | No | Yes |
| POST | `/api/donations` | No | Yes |
| POST | `/api/players/register` | No | Yes |
| POST | `/api/coaches/register` | No | Yes |
| POST | `/api/memberships/club` | No | Yes |
| POST | `/api/memberships/school` | No | Yes |
| POST | `/api/memberships/academy` | No | Yes |
| POST | `/api/admin/players/[id]/approve` | Session + permission | Yes |
| POST | `/api/admin/players/[id]/reject` | Session + permission | Yes |
| POST | `/api/admin/players/[id]/certificate` | Session + permission | Yes |
| GET | `/api/files/[...path]` | No | No |

### Expected API response shape

```json
{
  "success": true,
  "data": { },
  "message": "Optional message",
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

Error:

```json
{
  "success": false,
  "error": { "code": "...", "message": "..." }
}
```

---

## 8. Security Checks

- [ ] POST without CSRF token → `403 Forbidden`
- [ ] Rate limiting: rapid API calls → `429 Too Many Requests` (after threshold)
- [ ] `/admin` without session → redirect to login
- [ ] Security headers present (check in browser DevTools → Network → response headers): `X-Frame-Options`, `Content-Security-Policy`, etc.

---

## 9. Netlify / Production Smoke Test

After deploy, verify:

- [ ] Home page loads on production URL
- [ ] `/api/health` returns healthy (Neon `DATABASE_URL` set)
- [ ] Login works with production `NEXTAUTH_URL` and `NEXTAUTH_SECRET`
- [ ] Public form submission works (CSRF + DB write)
- [ ] Certificate PDF upload/serve works with `STORAGE_TYPE=netlify`
- [ ] Optional: Sentry receives a test error when `SENTRY_DSN` is set

---

## 10. Pre-Release Checklist

```bash
npm run lint
npm run build
npm run db:seed    # on staging DB only
```

- [ ] All sections above passed on local
- [ ] Build succeeds
- [ ] No secrets in git (`.env` not committed)
- [ ] Demo accounts documented for stakeholders
- [ ] Netlify env vars set (`DATABASE_URL`, `AUTH_SECRET` / `NEXTAUTH_*`, `APP_URL`)

---

## 11. Known Limitations

- **Email**: Resend not configured locally — contact/donation emails may not send (DB record still created where applicable).
- **Rate limiting**: Uses in-memory fallback without Upstash Redis locally.
- **PDF storage**: Local dev uses `./uploads`; production Netlify uses Blobs + `/api/files/...`.
- **Automated tests**: No Jest/Playwright suite yet — this document covers manual QA only.

---

## 12. Reporting Issues

When logging a bug, include:

1. Role used (Super Admin / District Admin / public)
2. URL and steps to reproduce
3. Expected vs actual result
4. Browser and environment (local / Netlify)
5. API `requestId` from error response (if applicable)
