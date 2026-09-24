# RRA Platform — Image Assets

All static images live in `public/images/`. Paths below are web URLs (prefix with site origin, e.g. `http://localhost:3000`).

Configuration source: `src/shared/config/site.ts` → `siteImages`, `executiveCommittee`, `heroSlides`, `tournamentEvents`, `districtLogos`, `physioPartners`.

Official WhatsApp/doc assets are copied to `public/images/rra/` from `docs/IMG-20260619-WA*.jpg`.

---

## Leadership portraits (`public/images/rra/`)

| Person | Role | File |
|--------|------|------|
| Mr. Aamir Khan | President | `portrait-aamir-khan.jpg` |
| Mr. Ravindra Singh Bhati | Vice President (Support By RRA) | `portrait-ravindra-bhati.jpg` |
| Mr. Ajay Singh Meena | Vice President | `portrait-ajay-meena.jpg` |
| Mr. Aashish Poonia | General Secretary | `asishpooniawalaimage.jpeg` (existing) |
| Mr. Manoj Choudhary | Treasurer | `manoj-kumar-edited-1.webp` (existing) |

Banner: `leadership-team-banner.jpg` · Affiliation poster: `rra-affiliation-poster.jpg`

---

Single event on `/tournaments` — details card first, poster at bottom (`tournamentEvents` in `site.ts`).

| Field | Value |
|-------|-------|
| Event | Racquetball Training Camp & Racquetball State Championship |
| Poster | `/images/rra-state-championship-2026-poster.png` |
| Date | 30 June 2026 |
| Venue | Jaipur |
| Age Group | Sub Junior, Junior, Senior |
| Event types | Singles, Doubles, Mixed |

---

## Branding & layout

| Asset | Path | Used on |
|-------|------|---------|
| Logo (header/footer) | `/images/cropped-rra-logo.webp` | All pages — header, footer, login |
| Logo large | `/images/rra-logo-2-1024x995.webp` | Reserved for print/marketing |
| Favicon | `/images/cropped-rra-logo-32x32.webp` | Browser tab (`layout.tsx`) |

---

## Homepage

| Asset | Path | Section |
|-------|------|---------|
| Hero slide 1 | `/images/IMG_20260119_152906-edited-scaled.jpg` | Hero slider |
| Hero slide 2 | `/images/IMG_20260119_153432-edited-scaled.jpg` | Hero slider |
| Hero slide 3 | `/images/racquetball-court-1024x674.webp` | Hero slider |
| President photo | `/images/mangi-ram.webp` | President's message |
| Sponsor — Brightmoon | `/images/brightmoon.jpeg` | Partners |
| Sponsor — EMASA | `/images/emasa1.jpeg` | Partners |
| Federation logos (7) | `indianrracqasso-1.jpg`, `irflogo2.jpeg`, `olympiccouncil.jpeg`, etc. | Federations strip |
| Road to Chengdu banner | `/images/LED_Banner_2240x128px-Road-to-Chengdu3-1024x59.png` | Below federations |

---

## About & leadership

| Asset | Path | Page |
|-------|------|------|
| About racquetball | `/images/Screenshot-2026-01-06-at-4.35.13-PM-1024x758.png` | `/about/racquetball` |
| President | `/images/mangi-ram.webp` | `/about/executive-committee`, homepage |
| General Secretary | `/images/asishpooniawalaimage.jpeg` | `/about/executive-committee` |
| Treasurer | `/images/manoj-kumar-edited-1.webp` | `/about/executive-committee` |

---

## Resources

| Asset | Path | Page |
|-------|------|------|
| Equipment overview | `/images/racquetball-spec-1024x1024.webp` | `/resources/equipment` |
| Racquet | `/images/racquetballracquet.jpeg` | `/resources/equipment` |
| Balls | `/images/racquetball-balls.webp` | `/resources/equipment` |
| Eyewear | `/images/equipemntimage1.jpeg` | `/resources/equipment` |
| Indoor court | `/images/racquetball-court-1024x674.webp` | `/resources/court-specifications` |
| Outdoor court | `/images/image123modern.jpeg` | `/resources/court-specifications` |

---

## Media gallery

| Title | Path |
|-------|------|
| RRA Event | `/images/IMG_20260119_152906-edited-scaled.jpg` |
| RRA Tournament | `/images/IMG_20260119_153432-edited-scaled.jpg` |
| Racquetball Action | `/images/8040892_orig.jpg` |
| Training Session | `/images/1001067424-1024x768.jpg` |
| RRA Leadership | `/images/rajbalajs-edited-2.jpeg` |

Page: `/media/gallery`

---

## Social icons (footer)

| Network | Path |
|---------|------|
| Facebook | `/images/fb-1-1024x1024.webp` |
| Instagram | `/images/Instagram_icon.png-1024x1024.webp` |
| YouTube | `/images/yt-image-1.png` |

---

## Contact page icons

| Icon | Path |
|------|------|
| Email | `/images/icon-email.png` |
| Phone | `/images/icon-phone-call.png` |
| Location | `/images/icon-push-pin-simple.png` |

---

## Replacing images

1. Add new file under `public/images/` (keep similar aspect ratio where possible).
2. Update path in `src/shared/config/site.ts`.
3. Restart dev server; hard-refresh browser (Ctrl+F5).
4. On Netlify, images in `public/` deploy automatically with the build.

---

## QA checklist (visual)

See [TESTING.md](TESTING.md) §3 — confirm these pages load images without broken links:

- `/tournaments` — event details card with “View Event Poster” button
- `/about/racquetball` — banner image
- `/about/executive-committee` — three committee photos
- `/media/gallery` — five gallery items
- `/resources/equipment` — overview + three product images
- `/resources/court-specifications` — indoor/outdoor court photos
