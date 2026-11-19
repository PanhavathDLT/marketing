# Referral Feature

## Overview

The referral system lets customers share a unique code with friends. When a friend applies the code, both sides are rewarded. The reward amount depends on whether a **REFERRAL campaign mission** is currently active.

---

## Roles

| Term | Who |
|---|---|
| **Referrer (Customer A)** | The customer who owns and shares the referral code |
| **Referee (Customer B)** | The new customer who applies the referral code |

---

## Reward Logic

The trigger is **Customer B applying the referral code** via `POST /customer/referral/apply`.

| Scenario | Customer B (referee) | Customer A (referrer) |
|---|---|---|
| **No active REFERRAL mission** | Gets `refereeBonus` from config (auto, instant) | Gets `referrerBonus` from config (auto, instant) |
| **Active REFERRAL mission** | Gets `refereeBonus` from config (auto, instant) | Gets mission progress recorded → must **claim** the mission to earn points |

Key rules:
- **Referee always gets the config bonus** — regardless of mission state.
- **Referrer auto bonus only fires when no mission is active.** Once a REFERRAL mission exists, the config bonus is suppressed for the referrer so they aren't double-rewarded.
- A code can only be applied once per customer (enforced by `referredById` uniqueness).
- A customer cannot apply their own code.

---

## Config (Admin-Configurable)

Managed via `GET/PATCH /api/v1/admin/settings/referral`.

| Field | Description |
|---|---|
| `refereeBonus` | Points auto-awarded to the referee (Customer B) on code apply |
| `referrerBonus` | Points auto-awarded to the referrer (Customer A) when no active REFERRAL mission |

Both default to `0`. Set them to `0` to effectively disable auto-bonus for either side.

---

## Mission Integration

When admin creates a REFERRAL-type campaign mission:
- `referrerBonus` is automatically suppressed (set to 0 at apply time).
- Referrer (Customer A) gets one progress increment on every referral code applied by their referees.
- When `progress >= requiredCount`, mission status becomes `CLAIMABLE`.
- Referrer must open the app and claim the mission to receive the mission's `points`.

REFERRAL mission progress is **not** triggered by `POST /customer/missions/complete` — it is wired internally to `POST /customer/referral/apply`.

---

## Mobile Integration

### Endpoints

| Method | Path | Who calls | Purpose |
|---|---|---|---|
| `GET` | `/customer/referral/my-code` | Customer A | Get their shareable code |
| `POST` | `/customer/referral/apply` | Customer B | Apply a code — triggers all reward logic |

### `POST /customer/referral/apply`

**Request**
```json
{ "code": "LL7K2Q" }
```

**Response**
```json
{
  "referrerName": "Chan Panha",
  "refereeBonus": 50,
  "referrerBonus": 100
}
```

`referrerBonus` will be `0` when a REFERRAL mission is active (referrer earns through the mission instead).

**Error responses**

| Status | Reason |
|---|---|
| `404` | Code not found |
| `409` | Customer B is already linked to a referrer |
| `422` | Customer B tried to apply their own code |

### `GET /customer/referral/my-code`

**Response**
```json
{ "code": "LL7K2Q" }
```

---

## Data Model

```
CustomerProfile
  referralCode    String   @unique   -- the shareable code (auto-generated on signup)
  referredById    Int?               -- CustomerProfile.id of the referrer; null if not referred
```

```
ReferralConfig (single row, id=1)
  refereeBonus   Int   -- points for Customer B
  referrerBonus  Int   -- points for Customer A when no active mission
```

---

## Points History

Both bonuses are recorded as `source: REFERRAL` entries in `PointsHistory`:

| Event | customerId | title |
|---|---|---|
| Referee bonus | Customer B's userId | `"Referral joining bonus"` |
| Referrer auto bonus | Customer A's userId | `"Referral bonus"` |
| Referrer mission claim | Customer A's userId | Mission title (via `source: MISSION`) |
