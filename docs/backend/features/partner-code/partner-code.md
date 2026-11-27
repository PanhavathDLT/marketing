# Partner / Creator Code Feature

## Overview

The Partner Code system lets the marketing team onboard **content creators** (freelancers, influencers, brand ambassadors) and issue each one a unique shareable code. When a mobile user signs up and applies that code, the creator is credited. When those users later take high-value LOS actions (loan application, approval), the system records a **conversion** attributed to the creator. Admin can view each creator's reach and conversion performance in the dashboard.

This is distinct from the peer-to-peer referral system. A PartnerCode is created by an **admin**, not a customer.

---

## Full End-to-End Flow

### Step 1 — Admin creates a creator profile

Admin opens the Partners page in the dashboard and fills in the creator's details.

**Endpoint:** `POST /api/v1/admin/partners`

```json
{
  "name": "Dara Influencer",
  "phone": "0961234567",
  "channel": "TikTok",
  "note": "50k followers, fintech niche"
}
```

Backend generates a unique 6-character alphanumeric `code` (e.g. `PC4R9X`) and stores a `PartnerCode` record. The code is returned in the response so admin can copy it and hand it to the creator.

**Response:**
```json
{
  "id": 12,
  "name": "Dara Influencer",
  "phone": "0961234567",
  "channel": "TikTok",
  "note": "50k followers, fintech niche",
  "code": "PC4R9X",
  "createdAt": "2026-11-26T08:00:00.000Z"
}
```

---

### Step 2 — Creator shares the code

The creator posts the code on social media (TikTok, Facebook, etc.). Their audience downloads the app and enters the code during onboarding.

---

### Step 3 — Mobile user applies the code

The existing `POST /customer/referral/apply` endpoint already handles peer referral codes. This endpoint must be **extended** to also check the `PartnerCode` table when the submitted code does not match any `CustomerProfile.referralCode`.

**Resolution order:**
1. Look up `code` in `CustomerProfile.referralCode` → if found, process as a **peer referral** (existing logic, unchanged).
2. If not found there, look up `code` in `PartnerCode.code` → if found, process as a **partner code application**.
3. If found in neither table → `404 Not Found`.

**When a partner code is matched:**
- Create a `PartnerCodeUsage` row: `{ partnerCodeId, customerId, appliedAt }`.
- Award `refereeBonus` points (from `ReferralConfig`) to the customer — same as peer referral.
- Do **not** set `CustomerProfile.referredById` (that field is for peer referrals only).
- Return the same response shape as peer referral so mobile needs no code change.

**Constraint:** a customer can only apply one code total — either a peer referral code or a partner code, not both. Enforce with a check before resolving: if the customer already has `referredById` set or already has a `PartnerCodeUsage` row, return `409 Conflict`.

---

### Step 4 — LOS fires conversion events

When a customer who was onboarded via a partner code later submits a loan application or gets approved, the **LOS backend** fires:

```
POST /api/v1/los/missions/complete
Authorization: Bearer <LOS_API_KEY>

{
  "losUserId": "LOS-USER-891",
  "eventType": "APPLICATION_SUBMISSION"   // or "LOAN_APPROVAL"
}
```

The marketing backend already resolves `losUserId → customerId` for mission tracking. In the same handler, **also check for partner attribution**:

1. Resolve `losUserId` → `customerId` (existing logic).
2. Query `PartnerCodeUsage` where `customerId = customerId` — if a row exists, fetch `partnerCodeId`.
3. Create a `PartnerConversion` row: `{ partnerCodeId, customerId, eventType, occurredAt }`.
4. This is append-only — multiple events (APPLICATION then APPROVAL) each create their own row.

No new endpoint needed for this step. It is wired inside the existing LOS event handler.

---

### Step 5 — Admin views creator performance

Admin opens the Partners page, selects a creator, and sees their stats.

**List all creators:**
`GET /api/v1/admin/partners`

```json
[
  {
    "id": 12,
    "name": "Dara Influencer",
    "channel": "TikTok",
    "code": "PC4R9X",
    "totalUsages": 47,
    "totalConversions": 12,
    "createdAt": "2026-11-26T08:00:00.000Z"
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

## Data Model

```prisma
model PartnerCode {
  id          Int      @id @default(autoincrement())
  name        String                        // creator's display name
  phone       String?
  channel     String?                       // e.g. "TikTok", "Facebook"
  note        String?
  code        String   @unique              // 6-char code, e.g. "PC4R9X"
  createdAt   DateTime @default(now())

  usages      PartnerCodeUsage[]
  conversions PartnerConversion[]
}

model PartnerCodeUsage {
  id            Int         @id @default(autoincrement())
  partnerCodeId Int
  customerId    Int         @unique        // one code per customer; enforces 1:1
  appliedAt     DateTime    @default(now())

  partnerCode   PartnerCode  @relation(fields: [partnerCodeId], references: [id])
  customer      CustomerProfile @relation(fields: [customerId], references: [id])
}

model PartnerConversion {
  id            Int         @id @default(autoincrement())
  partnerCodeId Int
  customerId    Int
  eventType     String                     // "APPLICATION_SUBMISSION" | "LOAN_APPROVAL"
  occurredAt    DateTime    @default(now())

  partnerCode   PartnerCode  @relation(fields: [partnerCodeId], references: [id])
}
```

The `customerId @unique` on `PartnerCodeUsage` enforces that a customer can only be attributed to one partner. Combined with the existing `referredById` check, a customer can hold at most one attribution (peer or partner).

---

## Module Structure

Follow the standard module layout (`backend_project_guidelines.md`):

```
src/modules/partner/
├── index.ts
├── partner.routes.ts
├── partner.controller.ts
├── partner.service.ts
└── partner.schema.ts
```

The LOS event handler lives in the existing `los` module (`src/modules/los/`). Add partner attribution logic to `los.service.ts` after the existing mission-completion logic.

---

## Admin Endpoints Summary

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/admin/partners` | Create a creator + generate code |
| `GET` | `/api/v1/admin/partners` | List all creators with aggregate stats |
| `GET` | `/api/v1/admin/partners/:id` | Get a single creator |
| `GET` | `/api/v1/admin/partners/:id/usages` | List all users who applied this creator's code, with conversions |
| `PATCH` | `/api/v1/admin/partners/:id` | Update creator info (name, channel, note) |
| `DELETE` | `/api/v1/admin/partners/:id` | Soft-delete / deactivate a creator |

---

## Mobile Endpoint Change

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/customer/referral/apply` | Extend to also resolve against `PartnerCode.code`. Response shape unchanged. |

---

## LOS Handler Change

| File | Change |
|------|--------|
| `src/modules/los/los.service.ts` | After resolving `losUserId → customerId`, query `PartnerCodeUsage` and insert `PartnerConversion` if a match exists. |

---

## Code Generation

Partner codes must be distinct from customer referral codes. Use a **`PC` prefix** (e.g. `PC4R9X`) or verify uniqueness across both tables. Recommended: generate 6 random alphanumeric characters and retry on collision (collisions will be extremely rare at expected scale).

---

## Error Cases

| Scenario | Status | Message |
|----------|--------|---------|
| Code not found in either table | `404` | `"Code not found"` |
| Customer already has a referral or partner code applied | `409` | `"You have already applied a referral or partner code"` |
| `losUserId` does not resolve to any customer | `404` | Existing LOS handler behaviour — no change |
