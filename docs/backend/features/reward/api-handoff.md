# Marketing Backend — Frontend / Mobile API Handoff

> **Base URL:** `http://localhost:3000/api/v1` (development)
> **Updated:** 2026-11-13 (campaign/mission date restructuring; progress-based missions; dynamic mission types endpoint)
> **Stack:** Express · TypeScript · Prisma 7 · PostgreSQL

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Authentication](#2-authentication)
3. [Auth Endpoints](#3-auth-endpoints)
4. [Customer — Reward & Points](#4-customer--reward--points)
5. [Customer — Daily Check-in](#5-customer--daily-check-in)
6. [Customer — Missions](#6-customer--missions)
7. [Customer — Reward Store](#7-customer--reward-store)
8. [Customer — Referral](#8-customer--referral)
9. [Customer — Tiers](#9-customer--tiers)
10. [Customer — Campaigns](#10-customer--campaigns)
11. [Admin — Campaigns](#11-admin--campaigns)
12. [Admin — Missions](#12-admin--missions)
13. [Admin — Reward Store & Redemptions](#13-admin--reward-store--redemptions)
14. [Admin — Tiers](#14-admin--tiers)
15. [Admin — Analytics](#15-admin--analytics)
16. [Admin — User Management](#16-admin--user-management)
17. [Admin — Upload](#17-admin--upload)
18. [LOS Backend Endpoints](#18-los-backend-endpoints)
19. [Error Reference](#19-error-reference)
20. [Enums Reference](#20-enums-reference)

---

## 1. Conventions

### Response envelope

Every response — success or error — is wrapped in a consistent envelope.

**Success**
```json
{ "status": "success", "data": { ... } }
```
For list endpoints, `data` is a JSON array:
```json
{ "status": "success", "data": [ ... ] }
```

**Error**
```json
{ "status": "error", "error": "Human-readable message" }
```

### Dates

All timestamps are **ISO-8601 with timezone**, e.g. `"2026-11-13T07:44:00.000Z"`.  
The backend uses `Asia/Phnom_Penh` as the timezone for day-boundary logic (check-in).

### IDs

All IDs are **integers**.

### POST responses

After any mutating POST (check-in, claim, redeem), the app should **re-fetch** the
relevant GET endpoint to reflect the new state. POST bodies return an empty `data: {}`.

### Content-Type

All requests with a body must send `Content-Type: application/json`.

---

## 2. Authentication

The API serves **three distinct consumer groups**, each with its own auth method.

### Consumer overview

| Consumer | Auth method | How to get a token |
|---|---|---|
| **Admin dashboard** (web) | Email + password → JWT | `POST /auth/login` |
| **Mobile customer** (Flutter) | Exchange LOS access token → JWT | `POST /auth/session` |
| **LOS backend** (server-to-server) | `X-Client-Id` + `X-Client-Secret` headers | Pre-shared via `pnpm db:seed` |

### JWT tokens (admin & customer)

| Token | Header | Lifetime | Use |
|---|---|---|---|
| `accessToken` | `Authorization: Bearer <token>` | 1 hour | All protected endpoints |
| `refreshToken` | Body of `/auth/refresh` | 7 days | Obtain a new access token |

### JWT payload

```json
{ "id": 1, "role": "CUSTOMER" }
```

`role` is either `"CUSTOMER"` or `"ADMIN"`.

### Admin permission model

Admin users have two tiers:

| Type | Condition | Access |
|---|---|---|
| **Super admin** | `role = ADMIN` with no staff role assigned | Full access to every admin endpoint |
| **Scoped admin** | `role = ADMIN` with a staff role assigned | Only the modules/actions granted to their role |

Scoped admins receive `403` on endpoints their role does not cover. The frontend should check the logged-in user's permission set (available via `GET /admin/user-management/permissions`) to conditionally show/hide menu items.

### Token expiry flow

1. Request fails with `401 Unauthorized`
2. Call `POST /auth/refresh` with the stored `refreshToken`
3. Store the new `accessToken` (and `refreshToken`)
4. Retry the original request

---

## 3. Auth Endpoints

All auth endpoints are **public** — no token required.

---

### `POST /auth/login`

Admin dashboard login — email + password.

**Request body**
```json
{
  "email": "admin@delightech.asia",
  "password": "secret123"
}
```

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "email": "admin@delightech.asia",
      "name": "Admin",
      "role": "ADMIN"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Errors**

| Status | Message |
|---|---|
| `401` | Invalid email or password |

---

### `POST /auth/session`

Mobile customer auth — exchange a LOS access token for a marketing session.

The marketing backend verifies the LOS token via JWKS, then finds or auto-creates the customer's marketing account. The mobile app never registers separately.

**Request body**
```json
{ "losToken": "<LOS access token>" }
```

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 42,
      "name": null,
      "role": "CUSTOMER",
      "tier": "BRONZE",
      "points": 0
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Errors**

| Status | Message |
|---|---|
| `401` | Invalid LOS token |

---

### `POST /auth/refresh`

Exchange a refresh token for a new token pair. Works for both admin and customer tokens.

**Request body**
```json
{ "refreshToken": "eyJ..." }
```

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Errors**

| Status | Message |
|---|---|
| `401` | Invalid or expired refresh token |

---

## 4. Customer — Reward & Points

> All `/customer/*` endpoints require `Authorization: Bearer <accessToken>`.

---

### `GET /customer/reward/points`

Membership card data — balance, tier, and progress toward the next tier.

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "points": 165,
    "tier": "BRONZE",
    "tierName": "Bronze",
    "nextTierName": "Silver",
    "pointsToNextTier": 35,
    "progress": 0.825
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `points` | int | Current balance |
| `tier` | string | Tier identifier (e.g. `"BRONZE"`) — use to pick card colour |
| `tierName` | string | Display text — first letter capitalised, rest lowercase |
| `nextTierName` | string \| null | `null` when on the highest tier |
| `pointsToNextTier` | int | `0` on the highest tier |
| `progress` | number 0–1 | Gauge fill toward the next tier |

> Tiers and their point thresholds are **admin-configurable**. Use `GET /customer/tiers` to get the current list for a progression UI. The default tiers are BRONZE → SILVER → GOLD → PLATINUM → DIAMOND.

---

### `GET /customer/reward/points/history`

All points changes, newest first. Redemptions are **negative**.

**Success `200`**
```json
{
  "status": "success",
  "data": [
    {
      "id": 12,
      "source": "REDEEM",
      "missionType": null,
      "title": "Hat",
      "points": -200,
      "createdAt": "2026-11-11T07:44:00.000Z"
    },
    {
      "id": 11,
      "source": "MISSION",
      "missionType": "APPLICATION_SUBMISSION",
      "title": "Submit Your Loan Application",
      "points": 100,
      "createdAt": "2026-11-10T03:10:00.000Z"
    },
    {
      "id": 10,
      "source": "CHECK_IN",
      "missionType": null,
      "title": "Daily check-in",
      "points": 20,
      "createdAt": "2026-11-09T01:02:00.000Z"
    }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `source` | `MISSION` \| `CHECK_IN` \| `REDEEM` \| `REFERRAL` \| `EXPIRE` | |
| `missionType` | string \| null | Only set when `source = MISSION` |
| `points` | int | Signed — positive = earned, negative = spent |

---

## 5. Customer — Daily Check-in

---

### `GET /customer/reward/check-in`

Returns the full 7-day streak strip plus today's state.

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "streakDays": 3,
    "canCheckInToday": true,
    "nextResetAt": "2026-11-13T17:00:00.000Z",
    "days": [
      { "day": 1, "points": 20, "isChecked": true,  "isToday": false },
      { "day": 2, "points": 20, "isChecked": true,  "isToday": false },
      { "day": 3, "points": 20, "isChecked": true,  "isToday": false },
      { "day": 4, "points": 20, "isChecked": false, "isToday": true  },
      { "day": 5, "points": 20, "isChecked": false, "isToday": false },
      { "day": 6, "points": 20, "isChecked": false, "isToday": false },
      { "day": 7, "points": 60, "isChecked": false, "isToday": false }
    ]
  }
}
```

| Field | Notes |
|---|---|
| `streakDays` | "You've checked in for N day(s)" |
| `canCheckInToday` | Drives the button enabled/disabled state |
| `nextResetAt` | Countdown target — re-fetch this endpoint when the timer hits zero |
| `days[].isToday` | Exactly one tile has `isToday: true` |
| `days[].isChecked` | All days up to current streak are checked |

**Streak rules (server-owned)**

- One check-in per calendar day (midnight `Asia/Phnom_Penh`)
- Missing a day resets the streak to Day 1
- After Day 7 the cycle resets to Day 1 on the next day
- Day 7 earns 60 pts; all other days earn 20 pts

---

### `POST /customer/reward/check-in`

Tap the "Check In" button.

**Request body** — none

**Success `200`**
```json
{ "status": "success", "data": {} }
```
Re-fetch `GET /reward/check-in` and `GET /reward/points` after this call.

**Errors**

| Status | Message |
|---|---|
| `409` | You have already checked in today. |

---

## 6. Customer — Missions

---

### `GET /customer/reward/missions`

All missions from currently active campaigns (within their date window), with per-customer progress.

**Success `200`**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "type": "REFERRAL",
      "title": "Invite 3 Friends to Apply",
      "points": 300,
      "requiredCount": 3,
      "progress": 1,
      "startDate": "2026-11-01T00:00:00.000Z",
      "endDate": "2026-11-30T23:59:59.000Z",
      "iconUrl": null,
      "status": "IN_PROGRESS"
    },
    {
      "id": 2,
      "type": "APPLICATION_SUBMISSION",
      "title": "Submit Your Loan Application",
      "points": 100,
      "requiredCount": 1,
      "progress": 1,
      "startDate": "2026-11-01T00:00:00.000Z",
      "endDate": "2026-11-30T23:59:59.000Z",
      "iconUrl": null,
      "status": "CLAIMABLE"
    },
    {
      "id": 3,
      "type": "REPAYMENT",
      "title": "Make 2 On-Time Repayments",
      "points": 200,
      "requiredCount": 2,
      "progress": 2,
      "startDate": "2026-11-01T00:00:00.000Z",
      "endDate": "2026-11-30T23:59:59.000Z",
      "iconUrl": null,
      "status": "CLAIMED"
    }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `requiredCount` | int | Total number of events needed to complete the mission |
| `progress` | int | How many events the customer has accumulated so far |
| `startDate` | ISO-8601 string | When the mission window opens |
| `endDate` | ISO-8601 string | When the mission window closes |
| `status` | string | See below |

**Mission status → UI action**

| `status` | Button shown |
|---|---|
| `IN_PROGRESS` | "Let's go!" — navigate to the relevant screen based on `type` |
| `CLAIMABLE` | "Claim" — call `POST /missions/:id/claim` |
| `CLAIMED` | Disabled "Claimed" badge |

> Customers can claim a `CLAIMABLE` mission even after its `endDate` has passed — the mission ended but the reward can still be collected.

**Mission type → "Let's go!" navigation**

| `type` | Deep link / screen |
|---|---|
| `REFERRAL` | Invite / share QR sheet |
| `APPLICATION_SUBMISSION` | Request-a-loan screen |
| `LOAN_APPROVAL` | Home (loan status card) |
| `REPAYMENT` | Repayment screen |
| `COMPLETE_FORM1` | Form 1 screen |
| `COMPLETE_FORM2` | Form 2 screen |
| `COMPLETE_FORM3` | Form 3 screen |
| `COMPLETE_FORM4` | Form 4 screen |

> **Unknown types must be hidden, not crash.** The server can add new types — handle gracefully.

**Progress display (suggested)**

Show `progress / requiredCount` as a progress bar or fraction label (e.g. "1 / 3 referrals").  
When `requiredCount = 1`, a progress bar can be omitted — just show the action button.

---

### `POST /customer/reward/missions/:missionId/claim`

Claim points for a completed mission.

**Request body** — none

**Success `200`**
```json
{ "status": "success", "data": {} }
```
Re-fetch `GET /reward/missions` and `GET /reward/points` after this call.

**Errors**

| Status | Message |
|---|---|
| `404` | Mission not found |
| `409` | Mission is not claimable |

---

## 7. Customer — Reward Store

---

### `GET /customer/reward/store`

All items currently available for redemption (in stock, active).

**Success `200`**
```json
{
  "status": "success",
  "data": [
    { "id": 101, "title": "Hat",        "points": 200, "imageUrl": "https://cdn.example.com/rewards/hat.png" },
    { "id": 102, "title": "Polo Shirt", "points": 200, "imageUrl": "https://cdn.example.com/rewards/polo.png" }
  ]
}
```

---

### `GET /customer/reward/my-rewards`

The customer's past redemptions, newest first.

**Success `200`**
```json
{
  "status": "success",
  "data": [
    {
      "id": 55,
      "title": "Hat",
      "points": 200,
      "imageUrl": "https://cdn.example.com/rewards/hat.png",
      "status": "PENDING_PICKUP",
      "redeemedAt": "2026-11-11T07:44:00.000Z"
    }
  ]
}
```

| `status` | Meaning |
|---|---|
| `PENDING_PICKUP` | Awaiting collection |
| `COLLECTED` | Picked up |
| `EXPIRED` | Not collected in time |

> `id` is the **redemption** ID, not the store item ID.

---

### `POST /customer/reward/store/:rewardId/redeem`

Redeem a reward. Called after the customer accepts the Terms sheet.

**Request body** — none

**Optional header for idempotency** (recommended — prevents double-submit on timeout retry):
```
Idempotency-Key: <uuid-or-unique-string>
```

**Success `200`**
```json
{ "status": "success", "data": {} }
```
Re-fetch `GET /reward/my-rewards` and `GET /reward/points` after this call.

**Errors**

| Status | Message |
|---|---|
| `404` | Reward not found |
| `409` | Reward is out of stock |
| `422` | You do not have enough points for this reward. |

---

## 8. Customer — Referral

---

### `GET /customer/referral/my-code`

The referrer's own code — used to generate the QR shown to friends.

**Success `200`**
```json
{
  "status": "success",
  "data": { "code": "LL7K2Q" }
}
```

The code is **permanent** — the same code is returned every time, so saved/printed QRs stay valid.

---

### `POST /customer/referral/apply`

The referee submits a referrer's code.

**Request body**
```json
{ "code": "LL7K2Q" }
```

**Success `200`**
```json
{
  "status": "success",
  "data": { "referrerName": "Dara Chan" }
}
```

**Errors**

| Status | Message |
|---|---|
| `404` | Referral code not found. |
| `409` | You are already linked to a referrer. |
| `422` | You cannot use your own referral code. |

---

## 9. Customer — Tiers

---

### `GET /customer/tiers`

List all tiers ordered by `minPoints` ascending. Use this to build a tier progression UI (cards, badges, unlock conditions).

**Success `200`**
```json
{
  "status": "success",
  "data": [
    { "id": 1, "name": "BRONZE",   "minPoints": 0,    "iconUrl": null, "createdAt": "2026-11-13T00:00:00.000Z", "updatedAt": "2026-11-13T00:00:00.000Z" },
    { "id": 2, "name": "SILVER",   "minPoints": 200,  "iconUrl": null, "createdAt": "2026-11-13T00:00:00.000Z", "updatedAt": "2026-11-13T00:00:00.000Z" },
    { "id": 3, "name": "GOLD",     "minPoints": 500,  "iconUrl": null, "createdAt": "2026-11-13T00:00:00.000Z", "updatedAt": "2026-11-13T00:00:00.000Z" },
    { "id": 4, "name": "PLATINUM", "minPoints": 1000, "iconUrl": null, "createdAt": "2026-11-13T00:00:00.000Z", "updatedAt": "2026-11-13T00:00:00.000Z" },
    { "id": 5, "name": "DIAMOND",  "minPoints": 2000, "iconUrl": null, "createdAt": "2026-11-13T00:00:00.000Z", "updatedAt": "2026-11-13T00:00:00.000Z" }
  ]
}
```

| Field | Notes |
|---|---|
| `name` | Tier identifier — matches the `tier` field in `GET /reward/points` |
| `minPoints` | Cumulative points needed to reach this tier |
| `iconUrl` | Optional icon URL set by admin — may be `null` |

> **Do not hardcode tier names or thresholds on the client.** Admins can create, rename, and delete tiers. Always fetch this endpoint to drive the progression UI.

---

## 10. Customer — Campaigns

---

### `GET /customer/campaigns`

Returns campaigns that have at least one currently active mission (within its date window).

**Success `200`**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "title": "November Promo",
      "description": "Complete missions to earn extra points",
      "status": "ACTIVE",
      "missions": [
        {
          "id": 1,
          "type": "REFERRAL",
          "title": "Invite 3 Friends",
          "points": 300,
          "requiredCount": 3,
          "startDate": "2026-11-01T00:00:00.000Z",
          "endDate": "2026-11-30T23:59:59.000Z",
          "iconUrl": null
        }
      ],
      "createdAt": "2026-10-28T00:00:00.000Z",
      "updatedAt": "2026-10-28T00:00:00.000Z"
    }
  ]
}
```

**Campaign `status` values**

| Value | Condition |
|---|---|
| `DRAFT` | Campaign has no missions yet |
| `UPCOMING` | All missions have `startDate` in the future |
| `ACTIVE` | At least one mission is within its date window |
| `COMPLETED` | All missions have `endDate` in the past |

> Status is **computed on the fly** — it is never stored in the database. The same campaign can move from UPCOMING → ACTIVE → COMPLETED automatically.

---

### `GET /customer/campaigns/:id`

Returns a single campaign by ID.

---

## 11. Admin — Campaigns

> All `/admin/*` endpoints require a JWT token with `role: "ADMIN"`.  
> Scoped admins also need the matching module permission — see [Admin permission model](#admin-permission-model). Super admins (no staff role) bypass all permission checks.

---

### Campaigns CRUD

| Method | Path | Permission | Action |
|---|---|---|---|
| `GET` | `/admin/campaigns` | `CAMPAIGN:View` | List all campaigns (all statuses) |
| `GET` | `/admin/campaigns/:id` | `CAMPAIGN:View` | Get one campaign with its missions |
| `POST` | `/admin/campaigns` | `CAMPAIGN:Create` | Create a new campaign |
| `PATCH` | `/admin/campaigns/:id` | `CAMPAIGN:Update` | Partial update |
| `DELETE` | `/admin/campaigns/:id` | `CAMPAIGN:Delete` | Delete campaign |

**Create / Update body**
```json
{
  "title": "November Promo",
  "description": "Complete missions to earn points"
}
```

| Field | PATCH required? | Notes |
|---|---|---|
| `title` | No | Required on POST |
| `description` | No | Optional |

> Campaigns no longer have `status`, `startDate`, or `endDate` fields. Status is derived from the campaign's missions. Dates belong on each mission.

**Response shape**
```json
{
  "id": 1,
  "title": "November Promo",
  "description": "Complete missions to earn points",
  "status": "DRAFT",
  "missions": [],
  "createdAt": "2026-10-28T00:00:00.000Z",
  "updatedAt": "2026-10-28T00:00:00.000Z"
}
```

A newly created campaign has `status: "DRAFT"` because it has no missions yet.

---

## 12. Admin — Missions

---

### Mission Types

#### `GET /admin/missions/types`

Returns the list of available mission types. Use this to populate the type dropdown in the mission creation form instead of hardcoding values on the client.

**Permission:** `MISSION:View`

**Success `200`**
```json
{
  "status": "success",
  "data": [
    { "value": "REFERRAL",               "label": "Referral" },
    { "value": "APPLICATION_SUBMISSION", "label": "Application Submission" },
    { "value": "LOAN_APPROVAL",          "label": "Loan Approval" },
    { "value": "REPAYMENT",              "label": "Repayment" },
    { "value": "COMPLETE_FORM1",         "label": "Complete Form 1" },
    { "value": "COMPLETE_FORM2",         "label": "Complete Form 2" },
    { "value": "COMPLETE_FORM3",         "label": "Complete Form 3" },
    { "value": "COMPLETE_FORM4",         "label": "Complete Form 4" }
  ]
}
```

| Field | Notes |
|---|---|
| `value` | The enum value to send in mission create/update body |
| `label` | Human-readable display text for dropdowns |

---

### Missions CRUD (nested under campaign)

| Method | Path | Permission | Action |
|---|---|---|---|
| `GET` | `/admin/campaigns/:campaignId/missions` | `MISSION:View` | List missions for a campaign |
| `POST` | `/admin/campaigns/:campaignId/missions` | `MISSION:Create` | Add a mission to a campaign |
| `PATCH` | `/admin/campaigns/:campaignId/missions/:id` | `MISSION:Update` | Update a mission |
| `DELETE` | `/admin/campaigns/:campaignId/missions/:id` | `MISSION:Delete` | Delete a mission |

**Create body**
```json
{
  "campaignId": 1,
  "type": "REFERRAL",
  "title": "Invite 3 Friends to Apply",
  "points": 300,
  "requiredCount": 3,
  "startDate": "2026-11-01T00:00:00.000Z",
  "endDate": "2026-11-30T23:59:59.000Z",
  "iconUrl": "https://cdn.example.com/icons/referral.png"
}
```

| Field | Required | Notes |
|---|---|---|
| `campaignId` | Yes | Must match the `:campaignId` in the path |
| `type` | Yes | See [MissionType enum](#missiontype) or fetch from `GET /admin/missions/types` |
| `title` | Yes | Display text shown to the customer |
| `points` | Yes | Positive integer — points awarded when claimed |
| `requiredCount` | No | Default `1`. Number of times the qualifying event must occur before the mission is claimable (e.g. `3` = make 3 repayments) |
| `startDate` | Yes | ISO-8601 datetime — when the mission window opens |
| `endDate` | Yes | ISO-8601 datetime — when the mission window closes |
| `iconUrl` | No | Full `https://` URL — use `POST /admin/upload` to get the URL |

**Update body** — same fields as POST, all optional. `campaignId` is excluded (cannot move a mission between campaigns).

**Response shape**
```json
{
  "id": 1,
  "campaignId": 1,
  "type": "REFERRAL",
  "title": "Invite 3 Friends to Apply",
  "points": 300,
  "requiredCount": 3,
  "startDate": "2026-11-01T00:00:00.000Z",
  "endDate": "2026-11-30T23:59:59.000Z",
  "iconUrl": null
}
```

**How `requiredCount` works**

The marketing backend tracks `progress` (a counter per customer per mission). The LOS backend fires events (e.g. `REPAYMENT`) every time a qualifying action happens. The marketing backend increments the counter. When `progress >= requiredCount`, the mission becomes `CLAIMABLE`. Example:

- Mission: "Make 2 On-Time Repayments" — `type: REPAYMENT`, `requiredCount: 2`
- LOS fires `REPAYMENT` → `progress = 1`
- LOS fires `REPAYMENT` again → `progress = 2`, status becomes `CLAIMABLE`
- Customer claims → `status = CLAIMED`, points awarded

---

## 13. Admin — Reward Store & Redemptions

Requires `REWARD_STORE` permission for scoped admins.

---

### Store Items CRUD

| Method | Path | Action |
|---|---|---|
| `GET` | `/admin/reward/store` | List all items (including inactive / out-of-stock) |
| `GET` | `/admin/reward/store/:id` | Get a single item |
| `POST` | `/admin/reward/store` | Create an item |
| `PATCH` | `/admin/reward/store/:id` | Partial update |
| `DELETE` | `/admin/reward/store/:id` | Delete an item |

**GET response shape (admin)**
```json
{
  "id": 101,
  "title": "Hat",
  "points": 200,
  "imageUrl": "https://cdn.example.com/rewards/hat.png",
  "stock": 50,
  "isActive": true,
  "createdAt": "2026-11-01T00:00:00.000Z",
  "updatedAt": "2026-11-01T00:00:00.000Z"
}
```

Admin response includes `stock` and `isActive` (hidden from customer view).

**Create / Update body**
```json
{
  "title": "Polo Shirt",
  "points": 300,
  "imageUrl": "https://cdn.example.com/rewards/polo.png",
  "stock": 100,
  "isActive": true
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | Yes (POST) | Display name |
| `points` | integer | Yes (POST) | Positive integer — redemption cost |
| `imageUrl` | string (URL) | No | Full `https://` URL |
| `stock` | integer ≥ 0 | Yes (POST) | Available quantity |
| `isActive` | boolean | No | Defaults to `true` |

---

### Redemptions

---

#### `GET /admin/reward/store/redemptions`

List all customer redemptions across all items, newest first.

**Success `200`**
```json
{
  "status": "success",
  "data": [
    {
      "id": 55,
      "status": "PENDING_PICKUP",
      "points": 200,
      "redeemedAt": "2026-11-11T07:44:00.000Z",
      "customer": {
        "id": 42,
        "name": "Dara Chan",
        "phone": "0123456789"
      },
      "rewardItem": {
        "id": 101,
        "title": "Hat",
        "imageUrl": "https://cdn.example.com/rewards/hat.png"
      }
    }
  ]
}
```

---

#### `PATCH /admin/reward/store/redemptions/:id/status`

Update the fulfilment status of a redemption.

**Request body**
```json
{ "status": "COLLECTED" }
```

| Allowed value | Meaning |
|---|---|
| `PENDING_PICKUP` | Reset to awaiting collection |
| `COLLECTED` | Mark as picked up |
| `EXPIRED` | Mark as not collected in time |

**Success `200`** — returns the updated redemption row.

**Errors**

| Status | Message |
|---|---|
| `404` | Redemption not found |
| `422` | Validation error |

---

## 14. Admin — Tiers

Manage tier definitions and their point thresholds. These tiers are used system-wide — `GET /customer/reward/points` and `GET /customer/tiers` both reflect whatever is configured here.

Requires `TIER` permission for scoped admins.

---

### `GET /admin/tiers`

List all tiers ordered by `minPoints` ascending.

**Success `200`**
```json
{
  "status": "success",
  "data": [
    { "id": 1, "name": "BRONZE",   "minPoints": 0,    "iconUrl": null, "createdAt": "...", "updatedAt": "..." },
    { "id": 2, "name": "SILVER",   "minPoints": 200,  "iconUrl": null, "createdAt": "...", "updatedAt": "..." },
    { "id": 3, "name": "GOLD",     "minPoints": 500,  "iconUrl": null, "createdAt": "...", "updatedAt": "..." },
    { "id": 4, "name": "PLATINUM", "minPoints": 1000, "iconUrl": null, "createdAt": "...", "updatedAt": "..." },
    { "id": 5, "name": "DIAMOND",  "minPoints": 2000, "iconUrl": null, "createdAt": "...", "updatedAt": "..." }
  ]
}
```

---

### `GET /admin/tiers/:id`

Get a single tier.

**Errors**

| Status | Message |
|---|---|
| `404` | Tier not found |

---

### `POST /admin/tiers`

Create a new tier.

**Request body**
```json
{
  "name": "VIP",
  "minPoints": 5000,
  "iconUrl": "https://cdn.example.com/icons/vip.png"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | Automatically uppercased. Must be unique. |
| `minPoints` | integer ≥ 0 | Yes | Minimum cumulative points to reach this tier |
| `iconUrl` | string (URL) | No | |

**Success `201`** — returns the created tier.

**Errors**

| Status | Message |
|---|---|
| `409` | Tier "VIP" already exists |
| `422` | Validation error |

---

### `PATCH /admin/tiers/:id`

Partial update — send only the fields to change.

> **Renaming a tier** (`name` field) cascades automatically — all customers currently on the old tier name are updated to the new name in the same operation.

**Request body** — same fields as POST, all optional.

**Success `200`** — returns the updated tier.

**Errors**

| Status | Message |
|---|---|
| `404` | Tier not found |
| `409` | Tier "VIP" already exists |

---

### `DELETE /admin/tiers/:id`

Delete a tier.

> Deletion is **blocked** if any customers are currently assigned to this tier. Reassign or delete those customers first.

**Success `200`**
```json
{ "status": "success", "data": {} }
```

**Errors**

| Status | Message |
|---|---|
| `404` | Tier not found |
| `409` | Cannot delete tier "BRONZE" — 234 customer(s) are assigned to it. |

---

## 15. Admin — Analytics

---

### `GET /admin/analytics/overview`

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "totalCustomers": 540,
    "totalCampaigns": 3,
    "totalRedemptions": 92,
    "totalPointsIssued": 48200
  }
}
```

---

### `GET /admin/analytics/campaigns/:campaignId`

```json
{
  "status": "success",
  "data": {
    "campaign": { "id": 1, "title": "November Promo", "status": "ACTIVE" },
    "totalParticipants": 210,
    "totalClaimedMissions": 87
  }
}
```

---

### `GET /admin/analytics/check-ins`

```json
{
  "status": "success",
  "data": {
    "totalToday": 134,
    "totalAllTime": 4820
  }
}
```

---

### `GET /admin/analytics/referrals`

Returns every referral relationship — one row per referee who applied a code. Newest first.

**Success `200`**
```json
{
  "status": "success",
  "data": [
    {
      "referrer": {
        "id": 1,
        "name": "Dara Chan",
        "phone": "012345678",
        "referralCode": "LL7K2Q",
        "tier": "SILVER"
      },
      "referee": {
        "id": 2,
        "name": "Sophea Kim",
        "phone": "098765432",
        "tier": "BRONZE"
      },
      "codeUsed": "LL7K2Q",
      "linkedAt": "2026-11-10T03:10:00.000Z"
    }
  ]
}
```

| Field | Notes |
|---|---|
| `referrer` | The customer who shared the code |
| `referee` | The customer who applied the code |
| `codeUsed` | The referral code that was applied |
| `linkedAt` | When the referee applied the code |

> Points earned from referrals come through the REFERRAL mission flow — not directly tied to a single referee. This table shows the referral link only.

---

## 16. Admin — User Management

Manage admin users and their roles/permissions. Mounted at `/admin/user-management`.

- **User CRUD** — requires `USER_MANAGEMENT` permission (scoped admins).
- **Role & permission management** — super admin only (no staff role assigned).

---

### Users

#### `GET /admin/user-management/users`

**Success `200`**
```json
{
  "status": "success",
  "data": [
    {
      "id": 2,
      "name": "Sokha Lim",
      "email": "sokha@delightech.asia",
      "staffRoleId": 1,
      "staffRoleName": "CONTENT_EDITOR",
      "isSuperAdmin": false,
      "createdAt": "2026-11-01T00:00:00.000Z"
    }
  ]
}
```

| Field | Notes |
|---|---|
| `isSuperAdmin` | `true` when `staffRoleId` is `null` — bypasses all permission checks |
| `staffRoleName` | `null` for super admins |

---

#### `GET /admin/user-management/users/:id`

**Errors**

| Status | Message |
|---|---|
| `404` | Admin user not found |

---

#### `POST /admin/user-management/users`

**Request body**
```json
{
  "name": "Sokha Lim",
  "email": "sokha@delightech.asia",
  "password": "secret123",
  "staffRoleId": 1
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | |
| `email` | string (email) | Yes | Must be unique |
| `password` | string | Yes | Min 8 characters |
| `staffRoleId` | integer | No | Omit to create a super admin |

**Success `201`** — returns the created user.

**Errors**

| Status | Message |
|---|---|
| `409` | Email already in use |
| `404` | Staff role not found |

---

#### `PATCH /admin/user-management/users/:id`

All fields optional. Pass `staffRoleId: null` to promote to super admin.

---

#### `DELETE /admin/user-management/users/:id`

Cannot delete your own account.

**Errors**

| Status | Message |
|---|---|
| `400` | You cannot delete your own account. |
| `404` | Admin user not found |

---

### Roles  _(super admin only)_

#### `GET /admin/user-management/roles`

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "CONTENT_EDITOR",
      "description": "Can manage campaigns and missions",
      "userCount": 3,
      "permissions": [
        { "id": 1, "module": "CAMPAIGN", "action": "View" },
        { "id": 2, "module": "CAMPAIGN", "action": "Create" }
      ],
      "createdAt": "2026-11-01T00:00:00.000Z",
      "updatedAt": "2026-11-01T00:00:00.000Z"
    }
  ]
}
```

---

#### `POST /admin/user-management/roles`

```json
{ "name": "content_editor", "description": "Can manage campaigns and missions" }
```

`name` is automatically uppercased.

**Success `201`** — returns the created role (permissions array will be empty).

---

#### `PATCH /admin/user-management/roles/:id`

`name` and/or `description`, both optional.

---

#### `DELETE /admin/user-management/roles/:id`

Fails if any user is currently assigned to it.

**Errors**

| Status | Message |
|---|---|
| `400` | Cannot delete role 'X': N user(s) are still assigned to it. |

---

#### `PUT /admin/user-management/roles/:id/permissions`

Replace the full permission set for a role (atomic).

```json
{ "permissionIds": [1, 2, 5, 9] }
```

Pass `[]` to clear all permissions.

**Success `200`** — returns the updated role with the new permissions.

---

### Permissions  _(super admin only)_

#### `GET /admin/user-management/permissions`

List all available permissions, grouped by module. Use to build a permission assignment matrix.

**Success `200`**
```json
{
  "status": "success",
  "data": [
    { "module": "CAMPAIGN",        "permissions": [{ "id": 1, "action": "View" }, { "id": 2, "action": "Create" }, { "id": 3, "action": "Update" }, { "id": 4, "action": "Delete" }] },
    { "module": "MISSION",         "permissions": [{ "id": 5, "action": "View" }, { "id": 6, "action": "Create" }, { "id": 7, "action": "Update" }, { "id": 8, "action": "Delete" }] },
    { "module": "REWARD_STORE",    "permissions": [{ "id": 9, "action": "View" }, { "id": 10, "action": "Create" }, { "id": 11, "action": "Update" }, { "id": 12, "action": "Delete" }] },
    { "module": "ANALYTICS",       "permissions": [{ "id": 13, "action": "View" }] },
    { "module": "USER_MANAGEMENT", "permissions": [{ "id": 14, "action": "View" }, { "id": 15, "action": "Create" }, { "id": 16, "action": "Update" }, { "id": 17, "action": "Delete" }] },
    { "module": "TIER",            "permissions": [{ "id": 18, "action": "View" }, { "id": 19, "action": "Create" }, { "id": 20, "action": "Update" }, { "id": 21, "action": "Delete" }] }
  ]
}
```

> **IDs above are illustrative** — always fetch this endpoint to get real IDs; never hardcode them.

---

## 17. Admin — Upload

A single generic upload endpoint for all image fields in the admin dashboard (campaign icons, tier icons, reward store items, etc.). Uploaded files are stored via the configured storage driver (Cloudinary in production, local disk in development).

---

### `POST /admin/upload`

**Request**

```
Content-Type: multipart/form-data
Authorization: Bearer <admin-token>

field: file   (the image binary)
```

| Constraint | Value |
|---|---|
| Field name | `file` |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| Max file size | 5 MB |

**Success `201`**
```json
{
  "status": "success",
  "data": {
    "url": "https://res.cloudinary.com/<cloud>/image/upload/v1234567890/marketing/abc123.jpg"
  }
}
```

Store the returned `url` as the `imageUrl` / `iconUrl` value when creating or updating a resource.

**Typical flow**
```
1. User picks an image in the form
2. POST /admin/upload  →  { url }
3. POST /admin/campaigns/:id/missions  with  { iconUrl: url, ... }
   or POST /admin/tiers  with  { iconUrl: url, ... }
   or POST /admin/reward/store  with  { imageUrl: url, ... }
```

**Errors**

| Status | Message |
|---|---|
| `422` | No file uploaded. Send a multipart/form-data request with field "file". |
| `422` | Unsupported file type. Allowed: image/jpeg, image/png, image/webp, image/gif |
| `422` | File too large. Maximum size is 5 MB. |

---

## 18. LOS Backend Endpoints

These endpoints are **server-to-server only** — called by the main LOS backend. Not for browsers or mobile clients.

**Authentication:** every request must include both headers:
```
X-Client-Id:     los-backend
X-Client-Secret: <LOS_CLIENT_SECRET>
```

`X-Client-Id` identifies which external service is calling. `X-Client-Secret` is verified against the bcrypt-hashed secret stored in the `MachineClient` table.

Missing, unknown, or wrong credentials → `401 Unauthorized`.

---

### `POST /los/missions/complete`

Called by the LOS backend when a customer completes a marketing mission condition (e.g. made a repayment on time, applied for a loan).

The **LOS owns** all business logic for *when* a mission is triggered. This endpoint increments the customer's `progress` counter on their matching `IN_PROGRESS` mission. When `progress` reaches `requiredCount`, the mission becomes `CLAIMABLE`.

**Request body**
```json
{
  "losUserId": 123,
  "missionType": "REPAYMENT"
}
```

| Field | Type | Notes |
|---|---|---|
| `losUserId` | integer | The user's ID in the LOS system |
| `missionType` | string | See [MissionType enum](#missiontype) |

**Response (always `200`)**

```json
{ "status": "success", "data": { "triggered": true } }
```

or if no action was taken:
```json
{ "status": "success", "data": { "triggered": false, "reason": "no_active_mission" } }
{ "status": "success", "data": { "triggered": false, "reason": "mission_ended" } }
```

| `reason` | Meaning |
|---|---|
| `no_active_mission` | Customer has no `IN_PROGRESS` mission of this type within its active date window |
| `mission_ended` | A matching mission was found but its `endDate` has passed — no progress recorded |

> If the `losUserId` has no marketing account yet, one is **auto-created silently**. When the customer opens the reward screen later, `POST /auth/session` finds this profile by `losUserId` and links it up — any progress already tracked is not lost.

> Always returns `200` so LOS business flows are never blocked by marketing system state.

---

## 19. Error Reference

All errors follow:
```json
{ "status": "error", "error": "Human-readable message" }
```

| HTTP Status | When |
|---|---|
| `400` | Generic bad request |
| `401` | Missing, invalid, or expired token / API key |
| `403` | Authenticated but not authorized (wrong role, or scoped admin lacks the required module permission) |
| `404` | Resource not found |
| `409` | Conflict (duplicate, already linked, out of stock, deletion blocked) |
| `422` | Validation failed (missing required field, insufficient points, type error) |
| `500` | Unexpected server error |

---

## 20. Enums Reference

### `Role`
| Value | Description |
|---|---|
| `CUSTOMER` | Mobile app user |
| `ADMIN` | Dashboard / internal staff |

### Tiers

Tiers are **not a fixed enum** — they are admin-managed records in the database. Fetch `GET /customer/tiers` or `GET /admin/tiers` for the current list. The defaults seeded on first deploy are:

| `name` | `minPoints` |
|---|---|
| `BRONZE` | 0 |
| `SILVER` | 200 |
| `GOLD` | 500 |
| `PLATINUM` | 1000 |
| `DIAMOND` | 2000 |

### `CampaignStatus`

Computed on the fly — not stored. Based on the campaign's missions' date windows.

| Value | Condition |
|---|---|
| `DRAFT` | Campaign has no missions |
| `UPCOMING` | All missions have `startDate` in the future |
| `ACTIVE` | At least one mission has `startDate <= now <= endDate` |
| `COMPLETED` | All missions have `endDate` in the past |

### `MissionType`

Fetch `GET /admin/missions/types` for the current list with labels.

| Value | LOS event that triggers progress increment |
|---|---|
| `REFERRAL` | Referred friend successfully applies for a loan |
| `APPLICATION_SUBMISSION` | Customer submits a loan application |
| `LOAN_APPROVAL` | Customer's loan application is approved |
| `REPAYMENT` | Customer makes an on-time repayment |
| `COMPLETE_FORM1` | Customer completes Form 1 |
| `COMPLETE_FORM2` | Customer completes Form 2 |
| `COMPLETE_FORM3` | Customer completes Form 3 |
| `COMPLETE_FORM4` | Customer completes Form 4 |

### `MissionStatus`
| Value | Meaning |
|---|---|
| `IN_PROGRESS` | Customer has not yet reached `requiredCount` progress |
| `CLAIMABLE` | `progress >= requiredCount` — customer can claim their points |
| `CLAIMED` | Points collected |

### `PointsSource`
| Value | Sign of `points` |
|---|---|
| `MISSION` | Positive |
| `CHECK_IN` | Positive |
| `REFERRAL` | Positive |
| `REDEEM` | **Negative** |
| `EXPIRE` | **Negative** |

### `RedemptionStatus`
| Value | Meaning |
|---|---|
| `PENDING_PICKUP` | Awaiting collection at branch |
| `COLLECTED` | Picked up |
| `EXPIRED` | Not collected in time |
