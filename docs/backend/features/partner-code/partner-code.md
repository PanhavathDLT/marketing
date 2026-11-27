# Partner / Creator Code Feature

## Overview

The Partner Code system lets the marketing team onboard **content creators** (freelancers, influencers, brand ambassadors) and issue each one a unique shareable code. When a mobile user signs up and applies that code, the creator is credited. When those users later take high-value LOS actions (loan application, approval), the system records a **conversion** attributed to the creator. Admin can view each creator's reach and conversion performance in the dashboard.

This is distinct from the peer-to-peer referral system. A PartnerCode is created by an **admin**, not a customer.

---

## Full End-to-End Flow

### Step 1 — Admin creates a creator profile

Admin opens the Partners page in the dashboard and fills in the creator's details.

**Endpoint:** `POST /api/v1/admin/partners`

**Option A — Auto-generate code (omit `code`):**
```json
{
  "name": "Dara Influencer",
  "phone": "0961234567",
  "channel": "TIKTOK",
  "note": "50k followers, fintech niche"
}
```
Backend generates a unique `PC****` code (e.g. `PC4R9X`).

**Option B — Manual code (include `code`):**
```json
{
  "name": "Dara Influencer",
  "phone": "0961234567",
  "channel": "TIKTOK",
  "note": "50k followers, fintech niche",
  "code": "DARA2026"
}
```
Backend uses the provided code after checking uniqueness.

**Manual code rules:** 3–20 characters, uppercase letters and digits only (`A-Z`, `0-9`), must be unique.

**Response `201`:**
```json
{
  "id": 12,
  "name": "Dara Influencer",
  "phone": "0961234567",
  "channel": "TIKTOK",
  "note": "50k followers, fintech niche",
  "code": "PC4R9X",
  "isActive": true,
  "createdAt": "2026-11-26T08:00:00.000Z",
  "updatedAt": "2026-11-26T08:00:00.000Z"
}
```

The `code` is returned so admin can copy it and hand it to the creator.

---

### Step 2 — Creator shares the code

The creator posts the code on social media. Their audience downloads the app and enters the code during onboarding.

---

### Step 3 — Mobile user applies the code

The existing `POST /customer/referral/apply` endpoint is extended to also check the `PartnerCode` table when the submitted code does not match any `CustomerProfile.referralCode`.

**Resolution order:**
1. Look up `code` in `CustomerProfile.referralCode` → if found, process as a **peer referral** (existing logic, unchanged).
2. If not found there, look up `code` in `PartnerCode.code` (active only) → if found, process as a **partner code application**.
3. If found in neither table → `404 Not Found`.

**When a partner code is matched:**
- Create a `PartnerCodeUsage` row: `{ partnerCodeId, customerId, appliedAt }`.
- Award `refereeBonus` points (from `ReferralConfig`) to the customer — same as peer referral.
- Do **not** set `CustomerProfile.referredById` (that field is for peer referrals only).
- Return the same response shape as peer referral so mobile needs no code change.

**Constraint:** a customer can only apply one code total — either a peer referral code or a partner code, not both. Check before resolving: if the customer already has `referredById` set **or** already has a `PartnerCodeUsage` row, return `409 Conflict`.

---

### Step 4 — LOS fires conversion events

When a customer who was onboarded via a partner code later submits a loan application or gets approved, the **LOS backend** fires:

```
POST /api/v1/los/missions/complete
X-Client-Id:     los-backend
X-Client-Secret: <secret>

{
  "losUserId": 891,
  "missionType": "APPLICATION_SUBMISSION"   // or "LOAN_APPROVAL"
}
```

The handler:
1. Resolves `losUserId` → `User.id` (auto-creates a `CustomerProfile` if the customer is not yet in the marketing DB).
2. Triggers active missions for the given `missionType`.
3. For `APPLICATION_SUBMISSION` and `LOAN_APPROVAL` only — queries `PartnerCodeUsage` for this customer; if a row exists, creates a `PartnerConversion` row: `{ partnerCodeId, customerId, eventType, occurredAt }`.
4. This is append-only — APPLICATION and APPROVAL each create their own row.

Always returns `200` — LOS flows must not break because of marketing state.

---

### Step 5 — Admin views creator performance

**List all creators:**
`GET /api/v1/admin/partners`

Supports optional filter via query param:

| Query | Result |
|---|---|
| `GET /admin/partners` | All partners (active + deactivated) |
| `GET /admin/partners?isActive=true` | Active only |
| `GET /admin/partners?isActive=false` | Deactivated only |

```json
[
  {
    "id": 12,
    "name": "Dara Influencer",
    "phone": "0961234567",
    "channel": "TIKTOK",
    "code": "PC4R9X",
    "isActive": true,
    "totalUsages": 47,
    "totalConversions": 12,
    "createdAt": "2026-11-26T08:00:00.000Z",
    "updatedAt": "2026-11-26T08:00:00.000Z"
  }
]
```

`totalUsages` = count of `PartnerCodeUsage` rows for this creator.
`totalConversions` = count of distinct `customerId` values in `PartnerConversion` for this creator.

**Creator detail + usages:**
`GET /api/v1/admin/partners/:id/usages`

```json
{
  "id": 12,
  "name": "Dara Influencer",
  "code": "PC4R9X",
  "channel": "TIKTOK",
  "isActive": true,
  "usages": [
    {
      "customerId": 201,
      "customerName": "Sophea Chan",
      "phone": "0971234567",
      "appliedAt": "2026-11-20T10:00:00.000Z",
      "conversions": ["APPLICATION_SUBMISSION", "LOAN_APPROVAL"]
    }
  ]
}
```

---

## Channel Enum

The `channel` field uses a predefined enum. Frontend should fetch the list dynamically:

`GET /api/v1/admin/partners/channels`

```json
[
  { "value": "TIKTOK",    "label": "TikTok" },
  { "value": "YOUTUBE",   "label": "YouTube" },
  { "value": "FACEBOOK",  "label": "Facebook" },
  { "value": "INSTAGRAM", "label": "Instagram" },
  { "value": "TELEGRAM",  "label": "Telegram" },
  { "value": "TWITTER",   "label": "Twitter / X" },
  { "value": "LINKEDIN",  "label": "LinkedIn" },
  { "value": "OTHER",     "label": "Other" }
]
```

Send the `value` (e.g. `"TIKTOK"`) in create/update requests. Display the `label` in the UI.

---

## Data Model

```prisma
enum PartnerChannel {
  TIKTOK
  YOUTUBE
  FACEBOOK
  INSTAGRAM
  TELEGRAM
  TWITTER
  LINKEDIN
  OTHER
}

model PartnerCode {
  id          Int            @id @default(autoincrement())
  name        String                          // creator's display name
  phone       String?
  channel     PartnerChannel?                 // social media channel
  note        String?
  code        String         @unique          // e.g. "PC4R9X" (auto) or "DARA2026" (manual)
  isActive    Boolean        @default(true)   // soft-delete flag
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  usages      PartnerCodeUsage[]
  conversions PartnerConversion[]
}

model PartnerCodeUsage {
  id            Int             @id @default(autoincrement())
  partnerCodeId Int
  customerId    Int             @unique        // one code per customer; enforces 1:1
  appliedAt     DateTime        @default(now())

  partnerCode   PartnerCode     @relation(fields: [partnerCodeId], references: [id])
  customer      CustomerProfile @relation(fields: [customerId], references: [id])
}

model PartnerConversion {
  id            Int         @id @default(autoincrement())
  partnerCodeId Int
  customerId    Int
  eventType     String      // "APPLICATION_SUBMISSION" | "LOAN_APPROVAL"
  occurredAt    DateTime    @default(now())

  partnerCode   PartnerCode @relation(fields: [partnerCodeId], references: [id])
}
```

The `customerId @unique` on `PartnerCodeUsage` enforces that a customer can only be attributed to one partner. Combined with the existing `referredById` check, a customer can hold at most one attribution (peer or partner).

`isActive = false` on `PartnerCode` means the code is deactivated — it will not be matched when a mobile user tries to apply it, but all historical usage and conversion data is preserved.

---

## Module Structure

```
src/modules/partner/
├── index.ts
├── partner.routes.ts       — composition root + Express routes
├── partner.controller.ts
├── partner.service.ts
└── partner.schema.ts

src/modules/los/
└── los.routes.ts           — LOS server-to-server handler (missions + partner conversion)
```

---

## Admin Endpoints Summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/admin/partners/channels` | List all valid channel options |
| `GET` | `/api/v1/admin/partners` | List creators with stats. Optional `?isActive=true\|false` |
| `POST` | `/api/v1/admin/partners` | Create a creator + generate or accept manual code |
| `GET` | `/api/v1/admin/partners/:id` | Get a single creator |
| `GET` | `/api/v1/admin/partners/:id/usages` | List all users who applied this code, with conversions |
| `PATCH` | `/api/v1/admin/partners/:id` | Update creator info (name, phone, channel, note) |
| `DELETE` | `/api/v1/admin/partners/:id` | Soft-deactivate (sets `isActive: false`) |

---

## Mobile Endpoint Change

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/customer/referral/apply` | Extended to also resolve against `PartnerCode.code`. Response shape unchanged: `{ referrerName, refereeBonus }`. |

---

## LOS Endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/los/missions/complete` | `X-Client-Id` + `X-Client-Secret` | Trigger mission progress + record partner conversion |

Body:
```json
{ "losUserId": 891, "missionType": "APPLICATION_SUBMISSION" }
```

Valid `missionType` values: `REFERRAL`, `APPLICATION_SUBMISSION`, `LOAN_APPROVAL`, `REPAYMENT`, `COMPLETE_FORM1`–`COMPLETE_FORM4`.

Partner conversions are only recorded for `APPLICATION_SUBMISSION` and `LOAN_APPROVAL`.

---

## Code Generation

| Mode | Behaviour |
|---|---|
| Auto (no `code` in request) | Backend generates `PC` + 4 random uppercase alphanumeric chars (e.g. `PC4R9X`), retries on collision |
| Manual (`code` in request) | Backend validates format (3–20 chars, `A-Z0-9`) and uniqueness, then saves as-is |

Partner codes coexist in the same `code` column as customer referral codes. Auto-generated codes use the `PC` prefix to avoid collisions in practice, but uniqueness is enforced by the DB `@unique` constraint on both tables regardless.

---

## Error Cases

| Scenario | Status | Message |
|----------|--------|---------|
| Code not found in either table | `404` | `"Code not found"` |
| Manual code already in use | `409` | `"This code is already in use. Please choose a different one."` |
| Customer already has a referral or partner code applied | `409` | `"You have already applied a referral or partner code"` |
| `losUserId` not found | — | Auto-creates a `CustomerProfile` and continues |
