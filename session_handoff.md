# Session Handoff — Marketing System

> **Date:** 2026-11-16  
> **Status:** Backend complete, migration applied, type-check passing.  
> **Purpose:** Hand this doc to any future agent or developer to understand the full system without reading the conversation history.

---

## 1. What This System Is

A **customer loyalty / marketing platform** that sits alongside an existing Loan Origination System (LOS). It rewards mobile customers for taking financial actions (applying for a loan, making repayments, referring friends) by awarding them points, which they redeem for physical gifts.

Three front-ends interact with one marketing backend:

| Client | Purpose |
|---|---|
| **Mobile app** (Flutter) | Customers earn points, complete missions, redeem rewards |
| **Marketing web** (Next.js admin) | Staff create campaigns/missions, manage the reward store, view analytics |
| **LOS backend** (separate service) | Fires events when customers do things in the loan system |

---

## 2. Core Concepts

### Campaign

A campaign is a **named promotional theme** — a container for one or more missions. It has no dates, status, or business logic of its own. Its status is **computed on the fly** from its missions.

| Status | Condition |
|---|---|
| `DRAFT` | Campaign has no missions yet |
| `UPCOMING` | All missions have `startDate` in the future |
| `ACTIVE` | At least one mission is within its `startDate`–`endDate` window |
| `COMPLETED` | All missions have `endDate` in the past |

Staff create a campaign first (it starts DRAFT), then add missions to it. The campaign automatically becomes UPCOMING/ACTIVE/COMPLETED as time passes.

---

### Mission

A mission is a **specific challenge** inside a campaign that customers complete to earn points. Key design decisions:

- **Date window on the mission, not the campaign.** Each mission has its own `startDate` and `endDate`. This lets a campaign have missions with overlapping or staggered windows.
- **Progress-based.** A mission has `requiredCount` (e.g. 3). The LOS fires an event every time a qualifying action happens. The marketing backend increments a `progress` counter per customer. When `progress >= requiredCount`, the mission becomes `CLAIMABLE`.
- **Customer can still claim after endDate.** If `progress` reached `requiredCount` before the window closed, the customer keeps their `CLAIMABLE` status and can still claim after the deadline.
- **MissionType drives mobile navigation.** The `type` field (e.g. `APPLICATION_SUBMISSION`) tells the mobile app which screen to deep-link to when the customer taps "Let's go!". It is not arbitrary — the LOS also uses it as the event identifier when calling the complete endpoint.

**MissionType values:**

| Value | When LOS fires it | Mobile "Let's go!" screen |
|---|---|---|
| `REFERRAL` | Referred friend successfully applies for a loan | Invite / QR share sheet |
| `APPLICATION_SUBMISSION` | Customer submits a loan application | Request-a-loan screen |
| `LOAN_APPROVAL` | Customer's loan is approved | Home / loan status card |
| `REPAYMENT` | Customer makes an on-time repayment | Repayment screen |
| `COMPLETE_FORM1` | Customer completes Form 1 | Form 1 screen |
| `COMPLETE_FORM2` | Customer completes Form 2 | Form 2 screen |
| `COMPLETE_FORM3` | Customer completes Form 3 | Form 3 screen |
| `COMPLETE_FORM4` | Customer completes Form 4 | Form 4 screen |

---

### Reward / Points

Points are the currency of the system:

- **Earned** via missions, daily check-ins, or referrals (positive `PointsHistory` entries)
- **Spent** by redeeming physical gifts from the reward store (negative entries)
- Tier is auto-calculated on every points change — no manual tier management needed

**Tiers** are **DB-driven** (not a fixed enum). Admin can create/rename/delete tiers and set `minPoints` thresholds. Defaults: BRONZE (0) → SILVER (200) → GOLD (500) → PLATINUM (1000) → DIAMOND (2000).

---

## 3. End-to-End Flows

### Flow A — Staff creates a campaign with missions (Marketing Web → Backend)

```
Marketing Web (admin dashboard)
  │
  ├─ POST /api/v1/admin/campaigns
  │     body: { title, description }
  │     → Campaign created, status = DRAFT (no missions yet)
  │
  ├─ GET /api/v1/admin/missions/types
  │     → [{ value: "REFERRAL", label: "Referral" }, ...]
  │     (populates the Type dropdown in the form — never hardcoded)
  │
  ├─ POST /api/v1/admin/upload
  │     body: multipart/form-data, field "file"
  │     → { url: "https://cdn.../icon.png" }   (optional, for icon)
  │
  └─ POST /api/v1/admin/campaigns/:campaignId/missions
        body: {
          campaignId, type, title, points,
          requiredCount,     ← how many events before claimable
          startDate, endDate, iconUrl
        }
        → Campaign status becomes UPCOMING or ACTIVE depending on startDate
```

---

### Flow B — Customer opens the app (Mobile → Backend)

```
Mobile App (Flutter)
  │
  ├─ POST /api/v1/auth/session
  │     body: { losToken }   ← LOS JWT the mobile app already has
  │     → { accessToken, refreshToken, user: { id, tier, points } }
  │
  ├─ GET /api/v1/customer/reward/points
  │     → { points, tier, tierName, nextTierName, pointsToNextTier, progress }
  │     (membership card)
  │
  ├─ GET /api/v1/customer/reward/missions
  │     → list of missions from active campaigns, with per-customer:
  │       { id, type, title, points, requiredCount, progress, startDate, endDate, status }
  │     status: IN_PROGRESS | CLAIMABLE | CLAIMED
  │
  ├─ GET /api/v1/customer/reward/check-in
  │     → streak strip (7 days), canCheckInToday
  │
  └─ GET /api/v1/customer/reward/store
        → available reward items
```

---

### Flow C — Customer completes a loan action (LOS Backend → Marketing Backend → Mobile)

This is the core mission-progress flow. The LOS backend fires events; the marketing backend counts them.

```
Customer does something in the loan app
  │
  ▼
LOS Backend
  │
  └─ POST /api/v1/los/missions/complete
        headers: X-Client-Id: los-backend
                 X-Client-Secret: <LOS_CLIENT_SECRET>
        body: { losUserId: 123, missionType: "REPAYMENT" }
        │
        Marketing Backend:
          1. Look up CustomerProfile by losUserId
          2. Find customer's IN_PROGRESS mission of type REPAYMENT
             within its active date window (startDate <= now <= endDate)
          3. Increment progress by 1
          4. If progress >= requiredCount → set status = CLAIMABLE
        │
        → 200 { triggered: true }
           or { triggered: false, reason: "no_active_mission" }
           or { triggered: false, reason: "mission_ended" }   ← endDate passed
        (unknown losUserId → CustomerProfile auto-created, progress tracked immediately)

Next time customer opens the mobile app:
  GET /api/v1/customer/reward/missions
    → mission now shows status: "CLAIMABLE"

Customer taps "Claim":
  POST /api/v1/customer/reward/missions/:missionId/claim
    → points credited, tier recalculated atomically
```

---

### Flow D — Customer claims a mission reward (Mobile → Backend)

```
Mobile App
  │
  └─ POST /api/v1/customer/reward/missions/:missionId/claim
        (requires mission status = CLAIMABLE)
        │
        Marketing Backend (atomic transaction):
          1. Set CustomerMission.status = CLAIMED, claimedAt = now
          2. CustomerProfile.points += mission.points
          3. Recalculate tier from TierConfig table
          4. CustomerProfile.tier = newTier
          5. Create PointsHistory entry (source: MISSION)
        │
        → 200 {}

Mobile re-fetches:
  GET /customer/reward/points   → updated balance and tier
  GET /customer/reward/missions → mission now shows CLAIMED
```

---

### Flow E — Customer refers a friend (Mobile → LOS → Marketing Backend)

```
Referrer opens mobile app:
  GET /api/v1/customer/referral/my-code
    → { code: "LL7K2Q" }   (permanent, same every time)

Referrer shares QR code with friend.

Friend (new customer) scans/enters the code:
  POST /api/v1/customer/referral/apply
    body: { code: "LL7K2Q" }
    → links referee to referrer in DB (referredById)
    → 200 { referrerName: "Dara Chan" }

When the referee successfully applies for a loan, LOS fires:
  POST /api/v1/los/missions/trigger
    body: { losUserId: <referee's LOS id>, missionType: "REFERRAL" }
    → increments the *referrer's* REFERRAL mission progress
```

---

### Flow F — Customer redeems a physical reward (Mobile → Backend)

```
Mobile App
  │
  ├─ GET /api/v1/customer/reward/store
  │     → list of available items with stock
  │
  └─ POST /api/v1/customer/reward/store/:rewardId/redeem
        header: Idempotency-Key: <uuid>   (optional, prevents double-submit)
        │
        Marketing Backend (atomic transaction):
          1. Check item.isActive and item.stock > 0
          2. Check customer.points >= item.points
          3. Decrement stock, deduct points, create Redemption record
          4. Create PointsHistory entry (source: REDEEM, negative points)
          5. Recalculate tier
        │
        → 200 {}

Admin later marks as collected:
  PATCH /api/v1/admin/reward/store/redemptions/:id/status
    body: { status: "COLLECTED" }
```

---

### Flow G — Daily check-in (Mobile → Backend)

```
Mobile App
  │
  ├─ GET /api/v1/customer/reward/check-in
  │     → streak data, canCheckInToday flag
  │
  └─ POST /api/v1/customer/reward/check-in
        (once per calendar day, Asia/Phnom_Penh timezone)
        → awards 20 pts (or 60 pts on Day 7 of a streak)

Streak rules:
  - Missing a day resets streak to Day 1
  - After Day 7, cycle resets to Day 1 on the next check-in
```

---

## 4. Authentication Model

| Consumer | Method | Token/Key |
|---|---|---|
| Mobile customer | LOS JWT → exchange at `/auth/session` | `Authorization: Bearer <accessToken>` |
| Admin web | Email + password at `/auth/login` | `Authorization: Bearer <accessToken>` |
| LOS backend | Client ID + Secret in headers | `X-Client-Id: los-backend` + `X-Client-Secret: <secret>` |

---

### Mobile customer — how `POST /auth/session` works

The mobile app already has a JWT issued by the LOS backend after the customer logs in. It exchanges that token at the marketing backend to get a marketing session.

**Verification steps the marketing backend performs:**

| Step | What it checks | Env var |
|---|---|---|
| 1. Signature | Fetches LOS public key via JWKS and verifies the JWT was signed by the LOS | `LOS_JWKS_URI` |
| 2. Issuer (`iss`) | JWT must claim `"iss": "los-backend"` — rejects tokens from other systems | `LOS_ISSUER` |
| 3. Audience (`aud`) | JWT must claim `"aud": "luyleun"` — rejects LOS tokens meant for other apps | `LOS_CUSTOMER_AUDIENCE` |

All three values must be agreed upon with the LOS backend team — they hardcode them into the tokens they issue, the marketing backend hardcodes the expected values in env vars.

**After verification:** the marketing backend finds or auto-creates a `CustomerProfile` linked to the LOS user ID extracted from the token. The customer never registers separately.

---

### LOS backend — `X-Client-Id` + `X-Client-Secret`

The LOS backend is a trusted machine caller. It identifies itself with a client ID and proves itself with a secret:

```
X-Client-Id:     los-backend        ← identifies which external service this is
X-Client-Secret: <LOS_CLIENT_SECRET> ← bcrypt-verified against MachineClient table
```

The `clientSecret` is **bcrypt-hashed** in the `MachineClient` table — same pattern as user passwords. Seeded via `pnpm db:seed` using `LOS_CLIENT_ID` + `LOS_CLIENT_SECRET` from `.env`.

**What to share with the LOS backend team:**
- `X-Client-Id` value: `los-backend`
- `X-Client-Secret` value: the plaintext value of `LOS_CLIENT_SECRET` from your `.env`

---

### JWT token lifecycle (admin + customer)

- Access token = **1 hour**, sent as `Authorization: Bearer <token>` on every request
- Refresh token = **7 days**, DB-backed (SHA-256 hash in `RefreshToken` table, supports revocation)
- On `401` → call `POST /auth/refresh` → get a new token pair → retry

---

### Admin permission model

- **Super admin** — staff user with no `staffRoleId` assigned → bypasses all permission checks
- **Scoped admin** — has a `staffRoleId` → only accesses modules/actions granted to their role → receives `403` on everything else
- Frontend should call `GET /admin/user-management/permissions` on login to get the user's permission set and conditionally show/hide menu items

---

## 5. Database Tables (key ones)

| Table | Purpose |
|---|---|
| `User` | Identity only — `id`, `role`, timestamps |
| `CustomerProfile` | Customer data — `losUserId`, `points`, `tier`, `referralCode`, streak |
| `StaffProfile` | Admin data — `email`, `password`, `staffRoleId` |
| `RefreshToken` | DB-backed refresh tokens (tokenHash, expiresAt, revokedAt) |
| `Campaign` | Promotional theme — `title`, `description` only (no dates/status) |
| `Mission` | Challenge within a campaign — `type`, `points`, `requiredCount`, `startDate`, `endDate` |
| `CustomerMission` | Per-customer mission progress — `progress`, `status` (IN_PROGRESS / CLAIMABLE / CLAIMED) |
| `TierConfig` | Admin-managed tier thresholds — `name`, `minPoints` |
| `RewardItem` | Reward store item — `title`, `points`, `stock`, `isActive` |
| `Redemption` | Customer redemption record — `status` (PENDING_PICKUP / COLLECTED / EXPIRED) |
| `PointsHistory` | Immutable audit log — signed `points`, `source`, `missionType` |
| `CheckIn` | Daily check-in record — one row per customer per calendar day |
| `StaffRole` / `Permission` / `StaffRolePermission` | RBAC — module+action permission matrix |

---

## 6. Complete Endpoint Reference

Base URL: `http://localhost:3000/api/v1`

### Public

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | Admin login — email + password |
| `POST` | `/auth/session` | Mobile login — exchange LOS JWT |
| `POST` | `/auth/refresh` | Refresh token pair |

---

### Customer (`Authorization: Bearer <token>`, role = CUSTOMER)

| Method | Path | Description |
|---|---|---|
| `GET` | `/customer/reward/points` | Balance, tier, tier progress |
| `GET` | `/customer/reward/points/history` | All points history (signed) |
| `GET` | `/customer/reward/check-in` | 7-day streak strip |
| `POST` | `/customer/reward/check-in` | Perform today's check-in |
| `GET` | `/customer/reward/missions` | Active missions with per-customer progress |
| `POST` | `/customer/reward/missions/:id/claim` | Claim a CLAIMABLE mission |
| `GET` | `/customer/reward/store` | Available reward items |
| `GET` | `/customer/reward/my-rewards` | Customer's redemption history |
| `POST` | `/customer/reward/store/:rewardId/redeem` | Redeem a reward item |
| `GET` | `/customer/referral/my-code` | Customer's own referral code |
| `POST` | `/customer/referral/apply` | Submit a referrer's code |
| `GET` | `/customer/campaigns` | Active campaigns with missions |
| `GET` | `/customer/campaigns/:id` | Single campaign |
| `GET` | `/customer/tiers` | All tiers sorted by minPoints |

---

### Admin (`Authorization: Bearer <token>`, role = ADMIN)

#### Campaigns

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/campaigns` | `CAMPAIGN:View` | List all campaigns (all statuses) |
| `GET` | `/admin/campaigns/:id` | `CAMPAIGN:View` | Single campaign with missions |
| `POST` | `/admin/campaigns` | `CAMPAIGN:Create` | Create campaign (`title`, `description`) |
| `PATCH` | `/admin/campaigns/:id` | `CAMPAIGN:Update` | Update campaign |
| `DELETE` | `/admin/campaigns/:id` | `CAMPAIGN:Delete` | Delete campaign |

#### Missions

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/missions/types` | `MISSION:View` | Available mission types (for dropdown) |
| `GET` | `/admin/campaigns/:cId/missions` | `MISSION:View` | List missions for campaign |
| `POST` | `/admin/campaigns/:cId/missions` | `MISSION:Create` | Add mission (`type`, `title`, `points`, `requiredCount`, `startDate`, `endDate`, `iconUrl`) |
| `PATCH` | `/admin/campaigns/:cId/missions/:id` | `MISSION:Update` | Update mission (all fields optional) |
| `DELETE` | `/admin/campaigns/:cId/missions/:id` | `MISSION:Delete` | Delete mission |

#### Reward Store

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/reward/store` | `REWARD_STORE:View` | All items (incl. inactive/zero-stock) |
| `GET` | `/admin/reward/store/:id` | `REWARD_STORE:View` | Single item |
| `POST` | `/admin/reward/store` | `REWARD_STORE:Create` | Create item |
| `PATCH` | `/admin/reward/store/:id` | `REWARD_STORE:Update` | Update item |
| `DELETE` | `/admin/reward/store/:id` | `REWARD_STORE:Delete` | Delete item |
| `GET` | `/admin/reward/store/redemptions` | `REWARD_STORE:View` | All customer redemptions |
| `PATCH` | `/admin/reward/store/redemptions/:id/status` | `REWARD_STORE:Update` | Update redemption status |

#### Tiers

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/tiers` | `TIER:View` | List all tiers |
| `GET` | `/admin/tiers/:id` | `TIER:View` | Single tier |
| `POST` | `/admin/tiers` | `TIER:Create` | Create tier (`name`, `minPoints`, `iconUrl`) |
| `PATCH` | `/admin/tiers/:id` | `TIER:Update` | Update tier (rename cascades to customers) |
| `DELETE` | `/admin/tiers/:id` | `TIER:Delete` | Delete tier (blocked if customers are on it) |

#### Analytics

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/analytics/overview` | `ANALYTICS:View` | Total customers, campaigns, redemptions, points issued |
| `GET` | `/admin/analytics/campaigns/:id` | `ANALYTICS:View` | Per-campaign participant + mission stats |
| `GET` | `/admin/analytics/check-ins` | `ANALYTICS:View` | Check-in counts (today + all-time) |

#### User Management

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/user-management/users` | `USER_MANAGEMENT:View` | List admin users |
| `GET` | `/admin/user-management/users/:id` | `USER_MANAGEMENT:View` | Single admin user |
| `POST` | `/admin/user-management/users` | `USER_MANAGEMENT:Create` | Create admin user |
| `PATCH` | `/admin/user-management/users/:id` | `USER_MANAGEMENT:Update` | Update admin user |
| `DELETE` | `/admin/user-management/users/:id` | `USER_MANAGEMENT:Delete` | Delete admin user |
| `GET` | `/admin/user-management/roles` | Super admin | List roles with permissions |
| `POST` | `/admin/user-management/roles` | Super admin | Create role |
| `PATCH` | `/admin/user-management/roles/:id` | Super admin | Update role |
| `DELETE` | `/admin/user-management/roles/:id` | Super admin | Delete role |
| `PUT` | `/admin/user-management/roles/:id/permissions` | Super admin | Replace role's permission set (atomic) |
| `GET` | `/admin/user-management/permissions` | Super admin | All permissions grouped by module |

#### Upload

| Method | Path | Description |
|---|---|---|
| `POST` | `/admin/upload` | Upload an image (multipart, field `file`, max 5 MB) → returns `{ url }` |

---

### LOS Backend (`X-Client-Id` + `X-Client-Secret`, server-to-server only)

| Method | Path | Description |
|---|---|---|
| `POST` | `/los/missions/complete` | Increment customer mission progress; sets CLAIMABLE when complete |

**Trigger body:** `{ losUserId: int, missionType: "REFERRAL" | "APPLICATION_SUBMISSION" | "LOAN_APPROVAL" | "REPAYMENT" | "COMPLETE_FORM1" | "COMPLETE_FORM2" | "COMPLETE_FORM3" | "COMPLETE_FORM4" }`

**Trigger response (always 200):**

| `triggered` | `reason` | Meaning |
|---|---|---|
| `true` | — | Progress incremented (or mission became CLAIMABLE) |
| `false` | `no_active_mission` | No IN_PROGRESS mission of this type in active window |
| `false` | `mission_ended` | Mission found but `endDate` has passed |

> **Unknown `losUserId`**: Marketing auto-creates a CustomerProfile immediately so progress is never lost. When the customer opens the mobile reward screen later, `POST /auth/session` finds this profile by `losUserId` and links it.

---

## 7. Key Business Rules

1. **Campaign status is derived, never stored.** Don't try to set it via PATCH — there is no `status` field on Campaign.

2. **Mission dates belong on the mission.** A campaign can have missions with different windows (e.g. one that runs for 2 weeks, one for the full month).

3. **LOS always gets 200.** The trigger endpoint never returns 4xx/5xx — LOS business flows must not break because of marketing system state.

4. **Claiming is always possible after endDate if already CLAIMABLE.** The window closing stops new progress; it doesn't invalidate earned progress.

5. **Tiers are DB rows, not an enum.** Always fetch `/customer/tiers` or `/admin/tiers` — never hardcode names or thresholds.

6. **MissionType drives mobile navigation.** The mobile app uses `type` to know which screen to open. Unknown types must be hidden gracefully, not crash.

7. **`requiredCount` is set by the marketing team, not the LOS.** The LOS fires a raw event every time a qualifying action happens. The marketing backend counts how many times up to `requiredCount`. This means the LOS never needs to know about "make 3 repayments" — it just fires `REPAYMENT` each time.

8. **Referral mission trigger:** When a *referee* applies for a loan, the LOS fires `REFERRAL` for the *referee's LOS user ID*. The marketing backend looks up the referee's CustomerProfile, then increments the *referrer's* mission progress (via the `referredBy` relationship).

9. **Idempotency on redemptions.** Mobile should send `Idempotency-Key: <uuid>` on `POST /customer/reward/store/:id/redeem` to prevent double-redemption on network retry.

10. **Super admin vs scoped admin.** A staff user with no `staffRoleId` is a super admin — bypasses all permission checks. Scoped admins only access modules/actions explicitly granted.

---

## 8. Pending / Future Work

- **Campaign-level dates (nice-to-have):** Currently status is derived purely from missions. If needed in future, a `publishedAt` or `isDraft` boolean on Campaign could give staff explicit control over visibility before missions are ready.
- **Mobile agent handoff:** The mobile app (Flutter) needs to implement all `/customer/*` endpoints. The LOS integration point is `/los/missions/trigger` — LOS team needs the `INTERNAL_API_KEY` env var value.
- **Frontend web agent handoff:** See `docs/backend/features/reward/api-handoff.md` for the full admin dashboard endpoint reference.
- **Seed data:** `prisma/seed.ts` exists — run `pnpm db:seed` to populate tiers, permissions, and a default super admin.
- **Cloudinary config:** `CLOUDINARY_*` env vars must be set in production for image uploads. Dev falls back to local disk storage.
