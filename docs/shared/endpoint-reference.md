# Marketing Backend — Full Endpoint Reference

> **Base URL:** `http://localhost:3000/api/v1`  
> **Updated:** 2026-11-16  
> All request bodies require `Content-Type: application/json` unless stated otherwise.  
> All responses are wrapped: `{ "status": "success", "data": ... }` or `{ "status": "error", "error": "..." }`

---

## Consumer Quick Reference

| # | Section | Consumer |
|---|---|---|
| 1 | Auth | `MOBILE` `ADMIN WEB` |
| 2 | Customer — Reward & Points | `MOBILE` |
| 3 | Customer — Check-in | `MOBILE` |
| 4 | Customer — Missions | `MOBILE` |
| 5 | Customer — Reward Store | `MOBILE` |
| 6 | Customer — Referral | `MOBILE` |
| 7 | Customer — Campaigns | `MOBILE` |
| 8 | Customer — Tiers | `MOBILE` |
| 9 | Admin — Campaigns | `ADMIN WEB` |
| 10 | Admin — Missions | `ADMIN WEB` |
| 11 | Admin — Reward Store & Redemptions | `ADMIN WEB` |
| 12 | Admin — Tiers | `ADMIN WEB` |
| 13 | Admin — Analytics | `ADMIN WEB` |
| 14 | Admin — User Management | `ADMIN WEB` |
| 15 | Admin — Upload | `ADMIN WEB` |
| 16 | LOS Backend | `LOS BACKEND` |

---

## Auth Headers Quick Reference

| Consumer | Required header |
|---|---|
| Admin / Customer | `Authorization: Bearer <accessToken>` |
| LOS backend | `X-Client-Id: los-backend` + `X-Client-Secret: <secret>` |

---

## Authentication Flows

### Mobile App → Marketing Backend

The mobile app never uses email/password. It authenticates using the JWT it already holds from the LOS (loan) system.

```
Mobile App                    LOS System                  Marketing Backend
    │                              │                               │
    │── opens Reward screen ──────▶│                               │
    │◀── LOS JWT (access token) ───│                               │
    │                              │                               │
    │── POST /auth/session ────────────────────────────────────────▶│
    │   body: { losToken: "<LOS JWT>" }                            │
    │                              │          verify JWT signature  │
    │                              │◀── fetch JWKS ────────────────│
    │                              │─── JWKS (public keys) ───────▶│
    │                              │                               │
    │◀── { accessToken, refreshToken } ────────────────────────────│
    │                              │                               │
    │── GET /customer/reward/... ──────────────────────────────────▶│
    │   Authorization: Bearer <accessToken>                        │
```

**Key points:**
- The LOS JWT is verified by the marketing backend using the LOS's public JWKS endpoint — no shared secret
- On success, the marketing backend returns its own short-lived `accessToken` + `refreshToken`
- If the customer has no marketing profile yet, one is auto-created on first session
- When `accessToken` expires, call `POST /auth/refresh` with the `refreshToken` to get a new pair

---

### LOS Backend → Marketing Backend (Server-to-Server)

The LOS backend fires mission events directly to the marketing backend using a pre-shared `clientId` + `clientSecret`.

```
LOS Backend                                         Marketing Backend
    │                                                       │
    │── POST /los/missions/complete ───────────────────────▶│
    │   X-Client-Id:     los-backend                        │
    │   X-Client-Secret: <secret>                           │
    │                              look up MachineClient     │
    │                              bcrypt.compare(secret)    │
    │◀── 200 { triggered: true } ──────────────────────────│
```

**Key points:**
- Credentials are provisioned once by the marketing backend team via `pnpm db:seed` (reads `LOS_CLIENT_ID` + `LOS_CLIENT_SECRET` from `.env`)
- The marketing backend stores a **bcrypt hash** of the secret — the plaintext is never stored
- Share `LOS_CLIENT_ID` and `LOS_CLIENT_SECRET` values with the LOS backend team over a secure channel (not email or chat)
- Both headers must be present on every LOS request — missing either returns `401`

---

## 1. Auth — `MOBILE` `ADMIN WEB`

---

### `POST /auth/login`
Admin email + password login.

**Body**
```json
{
  "email": "admin@example.com",
  "password": "Admin12345!"
}
```

**Response `200`**
```json
{
  "user": { "id": 1, "email": "admin@example.com", "name": "Admin", "role": "ADMIN" },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Errors**
| Status | Message |
|---|---|
| `401` | Invalid email or password |

---

### `POST /auth/session`
Mobile customer — exchange LOS JWT for a marketing session.

**Body**
```json
{
  "losToken": "<LOS access token>"
}
```

**Response `200`**
```json
{
  "user": { "id": 42, "name": null, "role": "CUSTOMER", "tier": "BRONZE", "points": 0 },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Errors**
| Status | Message |
|---|---|
| `401` | Invalid LOS token |

---

### `POST /auth/refresh`
Exchange refresh token for a new token pair.

**Body**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response `200`**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Errors**
| Status | Message |
|---|---|
| `401` | Invalid or expired refresh token |

---

## 2. Customer — Reward & Points — `MOBILE`

> `Authorization: Bearer <accessToken>` required on all customer endpoints.

---

### `GET /customer/reward/points`
No body.

**Response `200`**
```json
{
  "points": 165,
  "tier": "BRONZE",
  "tierName": "Bronze",
  "nextTierName": "Silver",
  "pointsToNextTier": 35,
  "progress": 0.825
}
```

---

### `GET /customer/reward/points/history`
No body.

**Response `200`**
```json
[
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
  }
]
```

---

## 3. Customer — Check-in — `MOBILE`

### `GET /customer/reward/check-in`
No body.

**Response `200`**
```json
{
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
```

---

### `POST /customer/reward/check-in`
No body.

**Response `200`** `{}`

**Errors**
| Status | Message |
|---|---|
| `409` | You have already checked in today. |

---

## 4. Customer — Missions — `MOBILE`

### `GET /customer/reward/missions`
No body.

**Response `200`**
```json
[
  {
    "id": 1,
    "type": "REFERRAL",
    "title": "Invite 3 Friends",
    "points": 300,
    "requiredCount": 3,
    "progress": 1,
    "startDate": "2026-11-01T00:00:00.000Z",
    "endDate": "2026-11-30T23:59:59.000Z",
    "iconUrl": null,
    "status": "IN_PROGRESS"
  }
]
```

---

### `POST /customer/reward/missions/:missionId/claim`
No body.

**Response `200`** `{}`

**Errors**
| Status | Message |
|---|---|
| `404` | Mission not found |
| `409` | Mission is not claimable |

---

## 5. Customer — Reward Store — `MOBILE`

### `GET /customer/reward/store`
No body.

**Response `200`**
```json
[
  { "id": 101, "title": "Hat", "points": 200, "imageUrl": "https://..." }
]
```

---

### `GET /customer/reward/my-rewards`
No body.

**Response `200`**
```json
[
  {
    "id": 55,
    "title": "Hat",
    "points": 200,
    "imageUrl": "https://...",
    "status": "PENDING_PICKUP",
    "redeemedAt": "2026-11-11T07:44:00.000Z"
  }
]
```

---

### `POST /customer/reward/store/:rewardId/redeem`
No body. Optional header: `Idempotency-Key: <uuid>`

**Response `200`** `{}`

**Errors**
| Status | Message |
|---|---|
| `404` | Reward not found |
| `409` | Reward is out of stock |
| `422` | You do not have enough points for this reward. |

---

## 6. Customer — Referral — `MOBILE`

### `GET /customer/referral/my-code`
No body.

**Response `200`**
```json
{ "code": "LL7K2Q" }
```

---

### `POST /customer/referral/apply`

**Body**
```json
{ "code": "LL7K2Q" }
```

**Response `200`**
```json
{ "referrerName": "Dara Chan" }
```

**Errors**
| Status | Message |
|---|---|
| `404` | Referral code not found. |
| `409` | You are already linked to a referrer. |
| `422` | You cannot use your own referral code. |

---

## 7. Customer — Campaigns — `MOBILE`

### `GET /customer/campaigns`
No body.

**Response `200`**
```json
[
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
```

---

### `GET /customer/campaigns/:id`
No body. Same response shape as single item above.

**Errors**
| Status | Message |
|---|---|
| `404` | Campaign not found |

---

## 8. Customer — Tiers — `MOBILE`

### `GET /customer/tiers`
No body.

**Response `200`**
```json
[
  { "id": 1, "name": "BRONZE",   "minPoints": 0,    "iconUrl": null, "createdAt": "...", "updatedAt": "..." },
  { "id": 2, "name": "SILVER",   "minPoints": 200,  "iconUrl": null, "createdAt": "...", "updatedAt": "..." },
  { "id": 3, "name": "GOLD",     "minPoints": 500,  "iconUrl": null, "createdAt": "...", "updatedAt": "..." },
  { "id": 4, "name": "PLATINUM", "minPoints": 1000, "iconUrl": null, "createdAt": "...", "updatedAt": "..." },
  { "id": 5, "name": "DIAMOND",  "minPoints": 2000, "iconUrl": null, "createdAt": "...", "updatedAt": "..." }
]
```

---

## 9. Admin — Campaigns — `ADMIN WEB`

> `Authorization: Bearer <adminToken>` required on all admin endpoints.

---

### `GET /admin/campaigns`
No body.

**Response `200`** — array of campaign objects (all statuses).
```json
[
  {
    "id": 1,
    "title": "November Promo",
    "description": "Complete missions to earn extra points",
    "status": "ACTIVE",
    "missions": [ { "id": 1, "type": "REFERRAL", "title": "...", "points": 300, "requiredCount": 3, "startDate": "...", "endDate": "...", "iconUrl": null } ],
    "createdAt": "2026-10-28T00:00:00.000Z",
    "updatedAt": "2026-10-28T00:00:00.000Z"
  }
]
```

---

### `GET /admin/campaigns/:id`
No body. Same shape as single item above.

**Errors**
| Status | Message |
|---|---|
| `404` | Campaign not found |

---

### `POST /admin/campaigns`

**Body**
```json
{
  "title": "November Promo",
  "description": "Complete missions to earn extra points"
}
```

| Field | Type | Required |
|---|---|---|
| `title` | string | Yes |
| `description` | string | No |

**Response `201`** — created campaign object.

---

### `PATCH /admin/campaigns/:id`

**Body** — all fields optional
```json
{
  "title": "November Promo Updated",
  "description": "Updated description"
}
```

**Response `200`** — updated campaign object.

**Errors**
| Status | Message |
|---|---|
| `404` | Campaign not found |

---

### `DELETE /admin/campaigns/:id`
No body.

**Response `200`** `{}`

**Errors**
| Status | Message |
|---|---|
| `404` | Campaign not found |

---

## 10. Admin — Missions — `ADMIN WEB`

---

### `GET /admin/missions/types`
No body.

**Response `200`**
```json
[
  { "value": "REFERRAL",               "label": "Referral" },
  { "value": "APPLICATION_SUBMISSION", "label": "Application Submission" },
  { "value": "LOAN_APPROVAL",          "label": "Loan Approval" },
  { "value": "REPAYMENT",              "label": "Repayment" },
  { "value": "COMPLETE_FORM1",         "label": "Complete Form 1" },
  { "value": "COMPLETE_FORM2",         "label": "Complete Form 2" },
  { "value": "COMPLETE_FORM3",         "label": "Complete Form 3" },
  { "value": "COMPLETE_FORM4",         "label": "Complete Form 4" }
]
```

---

### `GET /admin/campaigns/:campaignId/missions`
No body.

**Response `200`** — array of mission objects.
```json
[
  {
    "id": 1,
    "campaignId": 1,
    "type": "REFERRAL",
    "title": "Invite 3 Friends",
    "points": 300,
    "requiredCount": 3,
    "startDate": "2026-11-01T00:00:00.000Z",
    "endDate": "2026-11-30T23:59:59.000Z",
    "iconUrl": null
  }
]
```

---

### `POST /admin/campaigns/:campaignId/missions`

**Body**
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

| Field | Type | Required | Notes |
|---|---|---|---|
| `campaignId` | int | Yes | Must match `:campaignId` in path |
| `type` | string | Yes | See `GET /admin/missions/types` |
| `title` | string | Yes | Display text shown to customer |
| `points` | int | Yes | Positive integer |
| `requiredCount` | int | No | Default `1`. Events needed before claimable |
| `startDate` | ISO-8601 string | Yes | Mission window open |
| `endDate` | ISO-8601 string | Yes | Mission window close |
| `iconUrl` | string (URL) | No | Use `POST /admin/upload` to get URL |

**Response `201`** — created mission object.

---

### `PATCH /admin/campaigns/:campaignId/missions/:id`

**Body** — all fields optional (except `campaignId` which is excluded)
```json
{
  "title": "Invite 3 Friends Updated",
  "points": 350,
  "requiredCount": 3,
  "startDate": "2026-11-01T00:00:00.000Z",
  "endDate": "2026-12-31T23:59:59.000Z",
  "iconUrl": null
}
```

**Response `200`** — updated mission object.

**Errors**
| Status | Message |
|---|---|
| `404` | Mission not found |

---

### `DELETE /admin/campaigns/:campaignId/missions/:id`
No body.

**Response `200`** `{}`

**Errors**
| Status | Message |
|---|---|
| `404` | Mission not found |

---

## 11. Admin — Reward Store & Redemptions — `ADMIN WEB`

---

### `GET /admin/reward/store`
No body.

**Response `200`**
```json
[
  {
    "id": 101,
    "title": "Hat",
    "points": 200,
    "imageUrl": "https://...",
    "stock": 50,
    "isActive": true,
    "createdAt": "2026-11-01T00:00:00.000Z",
    "updatedAt": "2026-11-01T00:00:00.000Z"
  }
]
```

---

### `GET /admin/reward/store/:id`
No body. Same shape as single item above.

**Errors**
| Status | Message |
|---|---|
| `404` | Reward not found |

---

### `POST /admin/reward/store`

**Body**
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
| `title` | string | Yes | |
| `points` | int | Yes | Positive integer |
| `imageUrl` | string (URL) | No | |
| `stock` | int ≥ 0 | Yes | |
| `isActive` | boolean | No | Default `true` |

**Response `201`** — created item object.

---

### `PATCH /admin/reward/store/:id`

**Body** — all fields optional, same as POST.

**Response `200`** — updated item object.

**Errors**
| Status | Message |
|---|---|
| `404` | Reward not found |

---

### `DELETE /admin/reward/store/:id`
No body.

**Response `200`** `{}`

**Errors**
| Status | Message |
|---|---|
| `404` | Reward not found |

---

### `GET /admin/reward/store/redemptions`
No body.

**Response `200`**
```json
[
  {
    "id": 55,
    "status": "PENDING_PICKUP",
    "points": 200,
    "redeemedAt": "2026-11-11T07:44:00.000Z",
    "customer": { "id": 42, "name": "Dara Chan", "phone": "0123456789" },
    "rewardItem": { "id": 101, "title": "Hat", "imageUrl": "https://..." }
  }
]
```

---

### `PATCH /admin/reward/store/redemptions/:id/status`

**Body**
```json
{ "status": "COLLECTED" }
```

| Allowed value | Meaning |
|---|---|
| `PENDING_PICKUP` | Awaiting collection |
| `COLLECTED` | Picked up |
| `EXPIRED` | Not collected in time |

**Response `200`** — updated redemption object.

**Errors**
| Status | Message |
|---|---|
| `404` | Redemption not found |
| `422` | Validation error |

---

## 12. Admin — Tiers — `ADMIN WEB`

---

### `GET /admin/tiers`
No body.

**Response `200`**
```json
[
  { "id": 1, "name": "BRONZE",   "minPoints": 0,    "iconUrl": null, "createdAt": "...", "updatedAt": "..." },
  { "id": 2, "name": "SILVER",   "minPoints": 200,  "iconUrl": null, "createdAt": "...", "updatedAt": "..." },
  { "id": 3, "name": "GOLD",     "minPoints": 500,  "iconUrl": null, "createdAt": "...", "updatedAt": "..." },
  { "id": 4, "name": "PLATINUM", "minPoints": 1000, "iconUrl": null, "createdAt": "...", "updatedAt": "..." },
  { "id": 5, "name": "DIAMOND",  "minPoints": 2000, "iconUrl": null, "createdAt": "...", "updatedAt": "..." }
]
```

---

### `GET /admin/tiers/:id`
No body. Same shape as single item above.

**Errors**
| Status | Message |
|---|---|
| `404` | Tier not found |

---

### `POST /admin/tiers`

**Body**
```json
{
  "name": "VIP",
  "minPoints": 5000,
  "iconUrl": "https://cdn.example.com/icons/vip.png"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | Auto-uppercased. Must be unique. |
| `minPoints` | int ≥ 0 | Yes | |
| `iconUrl` | string (URL) | No | |

**Response `201`** — created tier object.

**Errors**
| Status | Message |
|---|---|
| `409` | Tier "VIP" already exists |

---

### `PATCH /admin/tiers/:id`

**Body** — all fields optional, same as POST.

**Response `200`** — updated tier object.

**Errors**
| Status | Message |
|---|---|
| `404` | Tier not found |
| `409` | Tier already exists |

---

### `DELETE /admin/tiers/:id`
No body.

**Response `200`** `{}`

**Errors**
| Status | Message |
|---|---|
| `404` | Tier not found |
| `409` | Cannot delete tier "BRONZE" — 234 customer(s) are assigned to it. |

---

## 13. Admin — Analytics — `ADMIN WEB`

---

### `GET /admin/analytics/overview`
No body.

**Response `200`**
```json
{
  "totalCustomers": 540,
  "totalCampaigns": 3,
  "totalRedemptions": 92,
  "totalPointsIssued": 48200
}
```

---

### `GET /admin/analytics/campaigns/:campaignId`
No body.

**Response `200`**
```json
{
  "campaign": { "id": 1, "title": "November Promo", "status": "ACTIVE" },
  "totalParticipants": 210,
  "totalClaimedMissions": 87
}
```

---

### `GET /admin/analytics/check-ins`
No body.

**Response `200`**
```json
{
  "totalToday": 134,
  "totalAllTime": 4820
}
```

---

### `GET /admin/analytics/referrals`
No body.

Returns every referral relationship — one row per referee who applied a code.

**Response `200`**
```json
[
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
```

| Field | Notes |
|---|---|
| `referrer` | The customer who shared the code |
| `referee` | The customer who applied the code |
| `codeUsed` | The referral code that was applied (always the referrer's code) |
| `linkedAt` | When the referee applied the code |

> Points earned from referrals are tracked via the REFERRAL mission flow — visible in each customer's points history. This table shows the referral relationship only.

---

## 14. Admin — User Management — `ADMIN WEB`

---

### `GET /admin/user-management/users`
No body.

**Response `200`**
```json
[
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
```

---

### `GET /admin/user-management/users/:id`
No body. Same shape as single item above.

**Errors**
| Status | Message |
|---|---|
| `404` | Admin user not found |

---

### `POST /admin/user-management/users`

**Body**
```json
{
  "name": "Sokha Lim",
  "email": "sokha@delightech.asia",
  "password": "Secret123!",
  "staffRoleId": 1
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | |
| `email` | string | Yes | Must be unique |
| `password` | string | Yes | Min 8 characters |
| `staffRoleId` | int | No | Omit to create a super admin |

**Response `201`** — created user object.

**Errors**
| Status | Message |
|---|---|
| `409` | Email already in use |
| `404` | Staff role not found |

---

### `PATCH /admin/user-management/users/:id`

**Body** — all fields optional. Pass `staffRoleId: null` to promote to super admin.
```json
{
  "name": "Sokha Lim Updated",
  "staffRoleId": null
}
```

**Response `200`** — updated user object.

---

### `DELETE /admin/user-management/users/:id`
No body.

**Response `200`** `{}`

**Errors**
| Status | Message |
|---|---|
| `400` | You cannot delete your own account. |
| `404` | Admin user not found |

---

### `GET /admin/user-management/roles`
No body.

**Response `200`**
```json
[
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
```

---

### `POST /admin/user-management/roles`

**Body**
```json
{
  "name": "content_editor",
  "description": "Can manage campaigns and missions"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | Auto-uppercased. Must be unique. |
| `description` | string | No | |

**Response `201`** — created role (permissions will be empty array).

---

### `PATCH /admin/user-management/roles/:id`

**Body** — all fields optional, same as POST.

**Response `200`** — updated role object.

---

### `DELETE /admin/user-management/roles/:id`
No body.

**Response `200`** `{}`

**Errors**
| Status | Message |
|---|---|
| `400` | Cannot delete role 'X': N user(s) are still assigned to it. |

---

### `PUT /admin/user-management/roles/:id/permissions`

**Body**
```json
{ "permissionIds": [1, 2, 5, 9] }
```

Pass `[]` to clear all permissions.

**Response `200`** — updated role with new permissions.

---

### `GET /admin/user-management/permissions`
No body.

**Response `200`**
```json
[
  { "module": "CAMPAIGN",        "permissions": [{ "id": 1, "action": "View" }, { "id": 2, "action": "Create" }, { "id": 3, "action": "Update" }, { "id": 4, "action": "Delete" }] },
  { "module": "MISSION",         "permissions": [{ "id": 5, "action": "View" }, { "id": 6, "action": "Create" }, { "id": 7, "action": "Update" }, { "id": 8, "action": "Delete" }] },
  { "module": "REWARD_STORE",    "permissions": [{ "id": 9, "action": "View" }, { "id": 10, "action": "Create" }, { "id": 11, "action": "Update" }, { "id": 12, "action": "Delete" }] },
  { "module": "ANALYTICS",       "permissions": [{ "id": 13, "action": "View" }] },
  { "module": "USER_MANAGEMENT", "permissions": [{ "id": 14, "action": "View" }, { "id": 15, "action": "Create" }, { "id": 16, "action": "Update" }, { "id": 17, "action": "Delete" }] },
  { "module": "TIER",            "permissions": [{ "id": 18, "action": "View" }, { "id": 19, "action": "Create" }, { "id": 20, "action": "Update" }, { "id": 21, "action": "Delete" }] }
]
```

> IDs are illustrative — always fetch this endpoint to get real IDs.

---

## 15. Admin — Upload — `ADMIN WEB`

---

### `POST /admin/upload`

**Request** — `Content-Type: multipart/form-data`

| Field | Notes |
|---|---|
| `file` | Image binary. Allowed: `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Max 5 MB. |

**Response `201`**
```json
{ "url": "https://res.cloudinary.com/.../marketing/abc123.jpg" }
```

**Errors**
| Status | Message |
|---|---|
| `422` | No file uploaded. Send a multipart/form-data request with field "file". |
| `422` | Unsupported file type. Allowed: image/jpeg, image/png, image/webp, image/gif |
| `422` | File too large. Maximum size is 5 MB. |

---

## 16. LOS Backend — `LOS BACKEND`

> Headers required on every request:
> ```
> X-Client-Id:     los-backend
> X-Client-Secret: <LOS_CLIENT_SECRET>
> ```

---

### `POST /los/missions/complete`

**Body**
```json
{
  "losUserId": 123,
  "missionType": "REPAYMENT"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `losUserId` | int | Yes | Customer's ID in the LOS system |
| `missionType` | string | Yes | See valid values below |

**Valid `missionType` values**

| Value | When to fire |
|---|---|
| `REFERRAL` | Referred friend successfully applies for a loan |
| `APPLICATION_SUBMISSION` | Customer submits a loan application |
| `LOAN_APPROVAL` | Customer's loan is approved |
| `REPAYMENT` | Customer makes an on-time repayment |
| `COMPLETE_FORM1` | Customer completes Form 1 |
| `COMPLETE_FORM2` | Customer completes Form 2 |
| `COMPLETE_FORM3` | Customer completes Form 3 |
| `COMPLETE_FORM4` | Customer completes Form 4 |

**Response (always `200`)**
```json
{
  "triggered": true,
  "missions": [
    { "missionId": 3, "progress": 1, "requiredCount": 1, "status": "CLAIMABLE" }
  ]
}
```
or
```json
{ "triggered": false, "reason": "no_active_mission" }
{ "triggered": false, "reason": "already_completed" }
```

> If `losUserId` is not found in the marketing database, a CustomerProfile is **auto-created** so progress is tracked from this event onward. When the customer later opens the mobile reward screen, `POST /auth/session` finds the profile by `losUserId` and links it seamlessly.

> The event counts toward **every** mission of this type whose `startDate`–`endDate` window includes now (e.g. two campaigns each running a `REFERRAL` mission). The customer's progress row is created on the first event, so there is no separate enrollment step. Progress goes up by 1 per event; when it reaches `requiredCount` the status becomes `CLAIMABLE`.

| `reason` | Meaning |
|---|---|
| `no_active_mission` | No mission of this type is within its date window |
| `already_completed` | Every active mission of this type is already `CLAIMABLE` or `CLAIMED` for this customer |

> Always returns `200` — LOS flows must never break because of marketing system state.
