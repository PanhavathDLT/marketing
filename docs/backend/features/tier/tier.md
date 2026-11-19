# Tier System

## Overview

Customer tiers are determined entirely by **loan cycle count** — the number of completed loans a customer has with Delightech. Points have no effect on tier; they are only used for redeeming rewards in the reward store.

When a customer reaches a higher tier, the system automatically awards them bonus points as a reward.

---

## How Tier Is Determined

Each tier has a `minLoanCount` threshold configured in the `TierConfig` table. The marketing backend resolves a customer's tier by finding the highest tier whose `minLoanCount` is less than or equal to the customer's current `loanCycleCount`.

**Default seed values (configurable by admin):**

| Tier     | Min Loan Count | Reward Points (tier-up bonus) |
|----------|---------------|-------------------------------|
| BRONZE   | 0             | 0 pts                         |
| SILVER   | 1             | 200 pts                       |
| GOLD     | 2             | 500 pts                       |
| PLATINUM | 3             | 1,000 pts                     |
| DIAMOND  | 5             | 2,000 pts                     |

Admin can change both `minLoanCount` and `rewardPoints` per tier from the admin dashboard under **Tiers**.

---

## How the Mobile App Sends Loan Cycle Count

The mobile app (Flutter / LOS-integrated) knows the customer's current completed loan count from the LOS system. After a loan cycle completes, the mobile app pushes the updated count to the marketing backend.

### Endpoint

```
PATCH /api/v1/customer/reward/loan-cycle
Authorization: Bearer <customer_access_token>

Body:
{
  "loanCount": 2
}
```

### What Happens on the Backend

```
Mobile sends PATCH /customer/reward/loan-cycle { loanCount: 2 }
        ↓
1. Fetch CustomerProfile + all TierConfig rows
2. Resolve new tier: find highest tier where minLoanCount <= loanCount
3. Compare new tier vs current tier
        ↓
   ┌─── Tier is higher (tier-up) ──────────────────────────┐
   │  - Get rewardPoints from the new TierConfig row        │
   │  - In one transaction:                                 │
   │      • Update CustomerProfile.loanCycleCount           │
   │      • Update CustomerProfile.tier                     │
   │      • Increment CustomerProfile.points += rewardPoints│
   │      • Write PointsHistory row (source: MISSION,       │
   │          title: "Tier-up bonus — GOLD")                │
   └────────────────────────────────────────────────────────┘
        ↓
   ┌─── Same tier or tier-down ────────────────────────────┐
   │  - Update CustomerProfile.loanCycleCount only          │
   │  - No points awarded                                   │
   └────────────────────────────────────────────────────────┘
        ↓
Response:
{
  "loanCycleCount": 2,
  "tier": "GOLD",
  "bonusPointsAwarded": 500
}
```

`bonusPointsAwarded` will be `0` if no tier-up occurred.

---

## Automatic Bonus Points (Tier-Up Reward)

When a customer moves to a higher tier, the `rewardPoints` value configured for that tier is automatically credited to their points balance. This happens atomically in the same database transaction as the tier update — no separate action is needed from the customer.

The bonus appears in the customer's points history as:

```json
{
  "source": "MISSION",
  "title": "Tier-up bonus — GOLD",
  "points": 500
}
```

The `rewardPoints` value per tier is configurable by admin and defaults to the values in the table above. Setting `rewardPoints` to `0` for a tier means no bonus is awarded when reaching it.

---

## Points vs Tier — Separation of Concerns

| Concern | Driven by |
|---------|-----------|
| Tier level | `loanCycleCount` only |
| Points balance | Check-ins, mission claims, referral bonus, tier-up bonus |
| Reward redemption | Points balance |

Points accumulate from multiple sources but **do not influence tier**. Tier can only change when the mobile app calls `PATCH /customer/reward/loan-cycle`.

---

## What the Customer Sees (GET /customer/reward/points)

```json
{
  "points": 720,
  "tier": "GOLD",
  "tierName": "Gold",
  "nextTierName": "Platinum",
  "loanCycleCount": 2,
  "loansToNextTier": 1
}
```

`loansToNextTier` is `null` when the customer is already at the highest tier.

---

## Admin Configuration

Tiers are managed from the admin dashboard under **Tiers**. Each tier exposes:

- **Name** — unique identifier (e.g. `GOLD`)
- **Min Loan Count** — loans needed to reach this tier
- **Reward Points** — bonus points auto-awarded on tier-up
- **Icon** — optional display image

Endpoints:

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/v1/admin/tiers` | List all tiers |
| `POST` | `/api/v1/admin/tiers` | Create a tier |
| `PATCH` | `/api/v1/admin/tiers/:id` | Update name / minLoanCount / rewardPoints / icon |
| `DELETE` | `/api/v1/admin/tiers/:id` | Delete (blocked if customers are on this tier) |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/modules/tier/tier.utils.ts` | `resolveTierByLoanCount()` — core resolution logic |
| `src/modules/tier/tier.repository.ts` | DB queries for `TierConfig` |
| `src/modules/tier/tier.mapper.ts` | `TierDTO` shape returned to frontend |
| `src/modules/reward/reward.service.ts` | `updateLoanCycle()` — tier-up logic + bonus award |
| `src/modules/reward/reward.repository.ts` | `updateLoanCycle()` — atomic DB transaction |
| `prisma/schema.prisma` | `TierConfig` and `CustomerProfile.loanCycleCount` |
