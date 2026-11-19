# Mobile App — Marketing Backend Endpoint Reference

Base URL: `https://<host>/api/v1`  
All customer endpoints require `Authorization: Bearer <accessToken>`.

---

## Authentication

### `POST /auth/session`
Exchange a LOS JWT for a marketing session.

**Body**
```json
{ "losToken": "<LOS_JWT>" }
```

**Response**
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { "id": 1, "role": "CUSTOMER" }
}
```

---

### `POST /auth/refresh`
Rotate an expired access token.

**Body**
```json
{ "refreshToken": "..." }
```

**Response** — same shape as `/auth/session`

---

## Points & Tier

### `GET /customer/reward/points`
Current points balance and tier status.

**Response**
```json
{
  "points": 450,
  "tier": "SILVER",
  "loanCycleCount": 1,
  "loansToNextTier": 1
}
```

`loansToNextTier` is `null` when the customer is already at the highest tier.

---

### `GET /customer/reward/points/history`
Chronological list of point transactions.

**Response**
```json
[
  {
    "id": 12,
    "source": "CHECK_IN",
    "title": "Daily check-in",
    "points": 10,
    "createdAt": "2026-11-18T04:00:00.000Z"
  }
]
```

`source` values: `CHECK_IN`, `MISSION`, `REFERRAL`, `REDEEM`  
`points` is negative for redemptions.

---

### `PATCH /customer/reward/loan-cycle`
Push the customer's total completed loan count from LOS. The backend resolves the new tier from this number. If the customer moves to a higher tier, bonus points are awarded automatically.

**When to call:** whenever LOS confirms the customer has completed a loan cycle.

**Body**
```json
{ "loanCount": 2 }
```

**Response**
```json
{
  "loanCycleCount": 2,
  "tier": "GOLD",
  "bonusPointsAwarded": 500
}
```

`bonusPointsAwarded` is `0` when tier did not change or went down.

---

## Daily Check-in

### `GET /customer/reward/check-in`
Check-in calendar state.

**Response**
```json
{
  "streakDays": 3,
  "canCheckInToday": true,
  "nextResetAt": "2026-11-19T00:00:00.000+07:00",
  "days": [
    { "day": 1, "points": 10, "isChecked": true,  "isToday": false },
    { "day": 2, "points": 20, "isChecked": true,  "isToday": false },
    { "day": 3, "points": 30, "isChecked": false, "isToday": true  },
    { "day": 4, "points": 40, "isChecked": false, "isToday": false },
    { "day": 5, "points": 50, "isChecked": false, "isToday": false },
    { "day": 6, "points": 60, "isChecked": false, "isToday": false },
    { "day": 7, "points": 100,"isChecked": false, "isToday": false }
  ]
}
```

---

### `POST /customer/reward/check-in`
Perform today's check-in. No request body needed.

**Success:** `200 { }`  
**Already checked in today:** `409`

---

## Missions

### `GET /customer/reward/missions`
All missions for the authenticated customer.

**Response**
```json
[
  {
    "id": 5,
    "title": "Make 3 repayments",
    "description": "...",
    "missionType": "REPAYMENT",
    "requiredCount": 3,
    "rewardPoints": 200,
    "progress": 1,
    "status": "IN_PROGRESS"
  }
]
```

`status` values: `IN_PROGRESS`, `CLAIMABLE`, `CLAIMED`

---

### `POST /customer/reward/missions/:missionId/claim`
Claim points for a completed mission.

**Success:** `200 { }`  
**Not claimable yet:** `409`

---

### `POST /customer/missions/complete`
Trigger progress for a mission type. Call this when a qualifying event occurs in the LOS app (form submission, repayment, loan approval, etc.).

**Body**
```json
{ "missionType": "REPAYMENT" }
```

Available `missionType` values:

| Value | When to fire |
|---|---|
| `REFERRAL` | Referred friend successfully applied for a loan |
| `APPLICATION_SUBMISSION` | Customer submitted a loan application |
| `LOAN_APPROVAL` | Customer's loan was approved |
| `REPAYMENT` | Customer made an on-time repayment |
| `COMPLETE_FORM1` | Customer completed Form 1 |
| `COMPLETE_FORM2` | Customer completed Form 2 |
| `COMPLETE_FORM3` | Customer completed Form 3 |
| `COMPLETE_FORM4` | Customer completed Form 4 |

**Response**
```json
{
  "triggered": true,
  "missions": [
    {
      "missionId": 5,
      "progress": 2,
      "requiredCount": 3,
      "status": "IN_PROGRESS"
    }
  ]
}
```

Returns `200` even when no active mission matches — the app should not treat this as an error:
```json
{ "triggered": false, "reason": "no_active_mission" }
```

---

## Reward Store

### `GET /customer/reward/store`
All available reward items in stock.

**Response**
```json
[
  {
    "id": 101,
    "title": "Coffee voucher",
    "points": 100,
    "imageUrl": "https://...",
    "stock": 50
  }
]
```

---

### `GET /customer/reward/my-rewards`
Customer's redemption history.

**Response**
```json
[
  {
    "id": 3,
    "rewardItem": { "id": 101, "title": "Coffee voucher", "points": 100 },
    "status": "PENDING",
    "redeemedAt": "2026-11-18T10:00:00.000Z"
  }
]
```

`status` values: `PENDING`, `FULFILLED`, `CANCELLED`

---

### `POST /customer/reward/store/:rewardId/redeem`
Redeem a reward item. Optionally pass `Idempotency-Key: <uuid>` header to safely retry on network failure without double-redeeming.

**Success:** `200 { }`  
**Out of stock:** `409`  
**Insufficient points:** `422`

---

## Referral

### `GET /customer/referral/my-code`
The customer's shareable referral code.

**Response**
```json
{ "code": "LL7K2Q" }
```

---

### `POST /customer/referral/apply`
Link this customer to a referrer. Can only be done once.

**Body**
```json
{ "code": "LL7K2Q" }
```

**Response**
```json
{ "referrerName": "Chan Panha", "bonusPoints": 50 }
```

**Errors:** `404` code not found · `409` already linked · `422` own code

---

## Campaigns

### `GET /customer/campaigns`
All currently active campaigns.

**Response**
```json
[
  {
    "id": 1,
    "title": "November Loan Drive",
    "description": "...",
    "startDate": "2026-11-01",
    "endDate": "2026-11-30",
    "missions": [ ... ]
  }
]
```

---

### `GET /customer/campaigns/:id`
Single campaign by ID. Returns `404` if not found.

---

## Tiers

### `GET /customer/tiers`
All tier definitions. Use this to render the tier progress UI.

**Response**
```json
[
  { "name": "BRONZE",   "minLoanCount": 0, "rewardPoints": 0    },
  { "name": "SILVER",   "minLoanCount": 1, "rewardPoints": 200  },
  { "name": "GOLD",     "minLoanCount": 2, "rewardPoints": 500  },
  { "name": "PLATINUM", "minLoanCount": 3, "rewardPoints": 1000 },
  { "name": "DIAMOND",  "minLoanCount": 5, "rewardPoints": 2000 }
]
```

`rewardPoints` is the bonus awarded on reaching that tier, not the minimum points to reach it. Tier is determined solely by `loanCycleCount`.

---

## Common Error Shape

```json
{ "status": "error", "error": "<message>" }
```

| Status | Meaning |
|---|---|
| `400` | Validation error (bad request body) |
| `401` | Missing or expired token |
| `403` | Wrong role |
| `404` | Resource not found |
| `409` | Conflict (already checked in, already linked, out of stock) |
| `422` | Business rule violation (insufficient points, own referral code) |
| `500` | Unexpected server error |
