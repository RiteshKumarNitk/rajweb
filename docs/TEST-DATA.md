# RRA Platform — Test Data

Copy-paste values for manual QA. Run `npm run db:seed` to load seeded records into the database.

**Base URL (local):** http://localhost:3000

---

## 1. Login Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@rajasthanracquetball.com` | `Admin@123` |
| District Admin (Jaipur) | `district.jaipur@rajasthanracquetball.com` | `District@123` |

---

## 2. Certificate Verification — `/verify`

Use these after running `npm run db:seed`.

> **Tip:** The verify field accepts **certificate number**, **player/coach ID**, or **QR code**.

### Admin test records — full reference

| Type | Record ID | Name | District | Status | Use on `/verify` |
|------|-----------|------|----------|--------|------------------|
| Player | `PLR-TEST-001` | Rahul Sharma | Jaipur | Approved + cert | `RRA-2025-PLR001` or `PLR-TEST-001` |
| Player | `PLR-TEST-002` | Vikram Singh | Jodhpur | Pending | `PLR-TEST-002` → “no certificate issued yet” |
| Coach | `CCH-TEST-001` | Priya Mehta | Jaipur | Approved + cert | `RRA-2025-CCH001` or `CCH-TEST-001` |
| Coach | `CCH-TEST-002` | Sanjay Patel | Udaipur | Pending | `CCH-TEST-002` → “no certificate issued yet” |
| Club | `CLB-TEST-001` | Jaipur Racquetball Club | Jaipur | Pending | Admin only (not on verify page) |

### Certificate numbers & QR codes

| Record | Certificate Number | QR Code | Verify result |
|--------|-------------------|---------|---------------|
| Rahul Sharma (Player) | `RRA-2025-PLR001` | `QR-RRA-2025-PLR001` | Valid — Player, Jaipur |
| Priya Mehta (Coach) | `RRA-2025-CCH001` | `QR-RRA-2025-CCH001` | Valid — Coach, Jaipur |

### Quick copy-paste — valid verify

**Player (any one value in Certificate Number field):**

- `RRA-2025-PLR001`
- `PLR-TEST-001`
- QR: `QR-RRA-2025-PLR001`

**Coach (any one value in Certificate Number field):**

- `RRA-2025-CCH001`
- `CCH-TEST-001`
- QR: `QR-RRA-2025-CCH001`

### Pending records (no certificate yet)

| Enter in verify field | Expected message |
|-----------------------|------------------|
| `PLR-TEST-002` | Registered but no certificate issued yet |
| `CCH-TEST-002` | Registered but no certificate issued yet |

### Invalid (negative test)

| Certificate Number | Expected |
|--------------------|----------|
| `RRA-2025-FAKE99` | Certificate not found or has been revoked |

---

## 3. Admin Panel — Seeded Records

**Admin flows to test:**

- **Super Admin** → Approve `PLR-TEST-002` (Jodhpur), issue certificate
- **District Admin (Jaipur)** → Sees Rahul & Priya only; cannot approve Jodhpur player
- **Club** `CLB-TEST-001` → visible under `/admin/memberships`

---

## 4. Contact Form — `/contact`

| Field | Value |
|-------|-------|
| Name | `Arun Kumar` |
| Email | `arun.test@example.com` |
| Phone | `9928962982` |
| Subject | `Membership enquiry` |
| Message | `I would like to know about club membership in Jaipur district.` |

---

## 5. Player Registration — `/register/player`

| Field | Value |
|-------|-------|
| First Name | `Ankit` |
| Last Name | `Verma` |
| Email | `ankit.player@example.com` |
| Phone | `9876501234` |
| Date of Birth | `2012-01-15` |
| Gender | `Male` |
| District | `Jaipur` |
| Category | `Junior` |
| Club Name | `Jaipur Racquetball Club` |
| Aadhar Number | `123456789012` |

---

## 6. Coach Registration — `/register/coach`

| Field | Value |
|-------|-------|
| Full Name | `Neha Gupta` |
| Email | `neha.coach@example.com` |
| Phone | `9876505678` |
| District | `Udaipur` |
| Certification Level | `Level 2` |
| Experience Years | `5` |
| Affiliated Club | `Udaipur Sports Academy` |
| Qualifications | `Level 2 IRA certified coach with district tournament experience.` |
| Aadhar Number | `234567890123` |

---

## 7. Club Membership — `/membership/club`

| Field | Value |
|-------|-------|
| Club Name | `Pink City Racquetball Club` |
| Contact Person | `Rakesh Malhotra` |
| Email | `pinkcity.club@example.com` |
| Phone | `9876512345` |
| District | `Jaipur` |
| Address | `C-Scheme, Jaipur, Rajasthan 302001` |
| Number of Courts | `3` |
| Established Year | `2020` |
| Additional Info | `Indoor courts with coaching facility.` |

---

## 8. School Membership — `/membership/school`

| Field | Value |
|-------|-------|
| School Name | `St. Xavier's School Jaipur` |
| Principal Name | `Dr. Meena Sharma` |
| Email | `sports.stxaviers@example.com` |
| Phone | `9876523456` |
| District | `Jaipur` |
| Address | `Civil Lines, Jaipur, Rajasthan 302006` |
| Board Affiliation | `CBSE` |
| Student Count | `1200` |
| Sports Incharge | `Mr. Rajesh Kumar` |

---

## 9. Academy Membership — `/membership/academy`

| Field | Value |
|-------|-------|
| Academy Name | `Rajasthan Racquetball Academy` |
| Director / Head Coach | `Coach Vikram Rao` |
| Email | `academy@rrajasthan.com` |
| Phone | `9876534567` |
| District | `Jaipur` |
| Address | `Tonk Road, Jaipur, Rajasthan 302015` |
| Number of Coaches | `4` |
| Player Capacity | `60` |
| Highest Coach Certification | `Level 2` |

---

## 10. Donations — `/donations`

| Field | Value |
|-------|-------|
| Donor Name | `Rajesh Agarwal` |
| Email | `rajesh.donor@example.com` |
| Phone | `9876545678` |
| Amount | `5000` |
| Purpose | `Youth Development` |
| PAN Number | `ABCDE1234F` |
| Message | `Supporting junior racquetball in Rajasthan.` |

---

## 11. Districts (form dropdowns)

Any of these work in registration/membership forms:

`Jaipur`, `Jodhpur`, `Udaipur`, `Kota`, `Ajmer`, `Bikaner`, `Alwar`, `Bharatpur`, `Sikar`, `Pali`

(Full list in site config — all 33 Rajasthan districts are seeded.)

---

## 12. API Quick Test (curl)

```bash
# Valid verify
curl "http://localhost:3000/api/verify?certificateNumber=RRA-2025-PLR001"

# Invalid verify
curl "http://localhost:3000/api/verify?certificateNumber=RRA-2025-FAKE99"
```

---

## 13. Refresh Test Data

Re-run seed to reset demo records:

```bash
npm run db:seed
```

Seeded certificate numbers stay fixed (`RRA-2025-PLR001`, `RRA-2025-CCH001`) so verify tests remain repeatable.
