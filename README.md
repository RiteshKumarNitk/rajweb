# Rajasthan Racquetball Association (RRA) Platform

Enterprise-grade sports federation digital platform for the Rajasthan Racquetball Association. Built with Next.js, PostgreSQL, and Prisma.

## Features

- **Public Website** — Premium federation portal with all RRA content
- **Membership System** — Club, School, and Academy registration workflows
- **Player & Coach Management** — Registration, approval, certificates with QR codes
- **Tournament Management** — Creation, registration, fixtures, results
- **Certificate Verification** — Public portal to verify player/coach certificates
- **Media CMS** — News, videos, and photo gallery management
- **Admin Dashboard** — Full RBAC-protected admin panel
- **Audit Logging** — Track all system activities
- **Security** — JWT auth, RBAC, rate limiting, security headers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Framer Motion, Lucide Icons |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Auth | NextAuth.js v5 (JWT) |
| Database | PostgreSQL + Prisma ORM |
| Email | Resend |
| PDF | PDFKit + QRCode |
| Storage | Local (abstracted for S3/Azure/MinIO) |

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or Docker)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your database URL and secrets.

### 3. Start Database (Docker)

```bash
docker compose up postgres -d
```

### 4. Run Migrations & Seed

```bash
npm run db:push
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Admin Login:** `admin@rajasthanracquetball.com` / `Admin@123`

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Public website pages
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   └── login/             # Auth pages
├── modules/               # Feature modules (auth, home)
├── core/                  # Core business logic
├── shared/                # Shared components & config
├── infrastructure/        # Database, storage adapters
├── security/              # Auth, RBAC, permissions
├── services/              # Business services (audit, certificates)
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities
└── types/                 # TypeScript types
prisma/
├── schema.prisma          # Database schema
└── seed.ts                # Seed data
```

## Roles & Permissions

| Role | Access |
|------|--------|
| Super Admin | Full system access |
| Federation Admin | Federation-level management |
| District Admin | District-scoped access |
| Tournament Manager | Tournament operations |
| Content Manager | CMS and media |
| Public User | Read-only |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contact` | Submit contact message |
| POST | `/api/donations` | Record donation |
| POST | `/api/players/register` | Player registration |
| POST | `/api/coaches/register` | Coach registration |
| POST | `/api/memberships/club` | Club membership application |
| POST | `/api/memberships/school` | School membership application |
| POST | `/api/memberships/academy` | Academy membership application |
| GET | `/api/verify` | Certificate verification |
| GET | `/api/health` | Database health check |
| POST | `/api/admin/players/[id]/[action]` | Approve/reject/issue certificate |

## Docker Deployment

### Full Stack

```bash
docker compose up -d
```

### Production Build

```bash
docker compose up --build -d
```

## Production Deployment

### Environment Variables

See `.env.example` for all required variables. Critical production settings:

```env
DATABASE_URL=postgresql://user:pass@host:5432/rra_db
NEXTAUTH_SECRET=<generate-32-char-secret>
NEXTAUTH_URL=https://rajasthanracquetball.com
JWT_SECRET=<generate-secret>
APP_URL=https://rajasthanracquetball.com
RESEND_API_KEY=re_xxxxx

# Required for public user login (Google OAuth + Gmail OTP) — omit and those
# two sign-in options simply fail with a clear error until configured.
GOOGLE_CLIENT_ID=<from Google Cloud Console — OAuth client ID>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
RESEND_FROM_EMAIL=<a verified Resend sender, e.g. no-reply@rajasthanracquetball.com>
```

Google OAuth setup: Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (type: Web application) → add authorized redirect URI `https://<your-domain>/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google` for local dev).

### Deploy Steps

1. Provision PostgreSQL database
2. Set environment variables on hosting platform (Vercel, AWS, etc.)
3. Run database migration: `npx prisma migrate deploy`
4. Seed initial data: `npm run db:seed`
5. Build: `npm run build`
6. Start: `npm start`

### Vercel Deployment

1. Connect GitHub repository
2. Set environment variables in Vercel dashboard
3. Add build command: `npx prisma generate && npm run build`
4. Use external PostgreSQL (Neon, Supabase, RDS)

### Netlify Deployment

The repo includes `netlify.toml` with the Next.js plugin. Netlify runs serverless functions, so you need an external PostgreSQL database (local Docker will not work).

1. Push the repository to GitHub and connect it in [Netlify](https://app.netlify.com)
2. Build settings are read from `netlify.toml`:
   - Build command: `npx prisma generate && npm run build`
   - Plugin: `@netlify/plugin-nextjs`
3. Set environment variables in Netlify → Site settings → Environment variables:

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/rra_db?sslmode=require
NEXTAUTH_SECRET=<generate-32-char-secret>
NEXTAUTH_URL=https://your-site.netlify.app
APP_URL=https://your-site.netlify.app
LOG_LEVEL=info
# Optional — recommended for production rate limiting
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

4. Run migrations against your Neon database (from your machine or CI):

```bash
npx prisma migrate deploy
npm run db:seed
```

5. Deploy. Verify health at `https://your-site.netlify.app/api/health`

**Notes for Netlify:**
- Set `STORAGE_TYPE=netlify` (or leave unset — auto-detects when `NETLIFY=true`) for certificate PDF storage via Netlify Blobs
- Certificate PDFs are served at `/api/files/certificates/...`
- Optional: set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` for error monitoring
- All POST forms require CSRF tokens (handled automatically via `/api/csrf`)
- Static images in `public/images/` deploy automatically
- Rate limiting falls back to in-memory without Upstash (fine for demo; use Upstash for production)

### Test Accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@rajasthanracquetball.com` | `Admin@123` |
| Jaipur District Admin | `district.jaipur@rajasthanracquetball.com` | `District@123` |

District admins only see and manage data for their assigned district.

## Database

See [docs/ER-DIAGRAM.md](docs/ER-DIAGRAM.md) for the entity relationship diagram.

See [docs/TESTING.md](docs/TESTING.md) for the manual testing guide.

See [docs/TEST-DATA.md](docs/TEST-DATA.md) for copy-paste test data (forms, certificates, logins).

### Key Tables

- `users`, `roles`, `permissions` — Auth & RBAC
- `players`, `coaches` — Member management
- `player_certificates`, `coach_certificates` — Certificates
- `club_memberships`, `school_memberships`, `academy_memberships`
- `tournaments`, `matches`, `fixtures`
- `news`, `videos`, `galleries` — Media CMS
- `audit_logs` — Activity tracking

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run migrations |
| `npm run db:push` | Push schema to DB |
| `npm run db:seed` | Seed sample data |
| `npm run db:studio` | Open Prisma Studio |

## License

Proprietary — Rajasthan Racquetball Association
