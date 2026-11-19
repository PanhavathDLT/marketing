# Marketing Backend

Express 5 + Prisma 7 + PostgreSQL REST API serving three consumer groups.

## Base URL

```
/api/v1
```

## Authentication

| Consumer | Method | Header |
|---|---|---|
| Admin dashboard | `POST /auth/login` → JWT | `Authorization: Bearer <token>` |
| Mobile customer | `POST /auth/session` → JWT | `Authorization: Bearer <token>` |
| LOS backend | Static API key | `X-Internal-Key: <key>` |

---

## Namespaces

### `/auth` — Public

No authentication required.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | Admin email + password login |
| `POST` | `/auth/session` | Exchange a LOS customer access token for marketing session tokens |
| `POST` | `/auth/refresh` | Refresh marketing access + refresh tokens |

---

### `/admin` — Admin Dashboard

Requires a valid admin JWT (`Authorization: Bearer <token>`) with role `ADMIN`.

Most routes additionally require a module-level permission granted via the admin's `StaffRole`. Super admin accounts (no role assigned) bypass all permission checks.

#### Campaigns

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/campaigns` | `CAMPAIGN:View` | List all campaigns |
| `GET` | `/admin/campaigns/:id` | `CAMPAIGN:View` | Get campaign by ID |
| `POST` | `/admin/campaigns` | `CAMPAIGN:Create` | Create a campaign |
| `PATCH` | `/admin/campaigns/:id` | `CAMPAIGN:Update` | Update a campaign |
| `DELETE` | `/admin/campaigns/:id` | `CAMPAIGN:Delete` | Delete a campaign |

#### Missions

Nested under campaigns — `:campaignId` refers to a campaign.

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/campaigns/:campaignId/missions` | `MISSION:View` | List missions for a campaign |
| `POST` | `/admin/campaigns/:campaignId/missions` | `MISSION:Create` | Create a mission |
| `PATCH` | `/admin/campaigns/:campaignId/missions/:id` | `MISSION:Update` | Update a mission |
| `DELETE` | `/admin/campaigns/:campaignId/missions/:id` | `MISSION:Delete` | Delete a mission |

#### Reward Store

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/reward/store` | `REWARD_STORE:View` | List all reward items |
| `GET` | `/admin/reward/store/:id` | `REWARD_STORE:View` | Get reward item by ID |
| `POST` | `/admin/reward/store` | `REWARD_STORE:Create` | Create a reward item |
| `PATCH` | `/admin/reward/store/:id` | `REWARD_STORE:Update` | Update a reward item |
| `DELETE` | `/admin/reward/store/:id` | `REWARD_STORE:Delete` | Delete a reward item |
| `GET` | `/admin/reward/store/redemptions` | `REWARD_STORE:View` | List all customer redemptions |
| `PATCH` | `/admin/reward/store/redemptions/:id/status` | `REWARD_STORE:Update` | Update redemption status (`PENDING` → `FULFILLED` or `REJECTED`) |

#### Analytics

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/analytics/overview` | `ANALYTICS:View` | Overall stats (users, campaigns, points) |
| `GET` | `/admin/analytics/campaigns/:campaignId` | `ANALYTICS:View` | Per-campaign stats |
| `GET` | `/admin/analytics/check-ins` | `ANALYTICS:View` | Daily check-in stats |

#### User Management

Manage admin users, roles, and permissions.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/user-management/users` | `USER_MANAGEMENT:View` | List admin users |
| `GET` | `/admin/user-management/users/:id` | `USER_MANAGEMENT:View` | Get admin user by ID |
| `POST` | `/admin/user-management/users` | `USER_MANAGEMENT:Create` | Create admin user |
| `PATCH` | `/admin/user-management/users/:id` | `USER_MANAGEMENT:Update` | Update admin user |
| `DELETE` | `/admin/user-management/users/:id` | `USER_MANAGEMENT:Delete` | Delete admin user |
| `GET` | `/admin/user-management/roles` | Super admin only | List roles |
| `GET` | `/admin/user-management/roles/:id` | Super admin only | Get role by ID |
| `POST` | `/admin/user-management/roles` | Super admin only | Create role |
| `PATCH` | `/admin/user-management/roles/:id` | Super admin only | Update role |
| `DELETE` | `/admin/user-management/roles/:id` | Super admin only | Delete role |
| `PUT` | `/admin/user-management/roles/:id/permissions` | Super admin only | Set permissions for a role (replaces all) |
| `GET` | `/admin/user-management/permissions` | Super admin only | List all available permissions |

#### Tiers

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/tiers` | `TIER:View` | List all tiers (ordered by minPoints) |
| `GET` | `/admin/tiers/:id` | `TIER:View` | Get tier by ID |
| `POST` | `/admin/tiers` | `TIER:Create` | Create a tier |
| `PATCH` | `/admin/tiers/:id` | `TIER:Update` | Update a tier (renaming cascades to all users on that tier) |
| `DELETE` | `/admin/tiers/:id` | `TIER:Delete` | Delete a tier (blocked if any customers are assigned) |

#### Upload

| Method | Path | Description |
|---|---|---|
| `POST` | `/admin/upload` | Upload an image; returns `{ url: string }`. Max 5 MB. JPEG/PNG/WEBP/GIF only. |

Upload flow for reward items / campaigns:

1. `POST /admin/upload` → get `url`
2. Store `url` in the resource field (e.g. `imageUrl`)
3. `POST/PATCH` the resource with `imageUrl: url`

---

### `/customer` — Mobile App (Flutter)

Requires a valid customer JWT obtained from `POST /auth/session`.

#### Campaigns

| Method | Path | Description |
|---|---|---|
| `GET` | `/customer/campaigns` | List active campaigns |
| `GET` | `/customer/campaigns/:id` | Get campaign by ID |

#### Reward

| Method | Path | Description |
|---|---|---|
| `GET` | `/customer/reward/points` | Get current points, tier, and progress |
| `GET` | `/customer/reward/points/history` | Points history (source, amount, date) |
| `GET` | `/customer/reward/check-in` | Today's check-in status |
| `POST` | `/customer/reward/check-in` | Perform daily check-in |
| `GET` | `/customer/reward/missions` | List customer missions with status |
| `POST` | `/customer/reward/missions/:missionId/claim` | Claim a CLAIMABLE mission reward |
| `GET` | `/customer/reward/store` | Browse active reward items |
| `POST` | `/customer/reward/store/:rewardId/redeem` | Redeem a reward item |
| `GET` | `/customer/reward/my-rewards` | Customer's redemption history |

#### Tiers

| Method | Path | Description |
|---|---|---|
| `GET` | `/customer/tiers` | List all tiers with their minPoints (for progression UI) |

#### Referral

| Method | Path | Description |
|---|---|---|
| `GET` | `/customer/referral/my-code` | Get the customer's referral code |
| `POST` | `/customer/referral/apply` | Apply a referral code (body: `{ code }`) |

---

### `/los` — LOS Backend

Protected by `X-Internal-Key` header. Not for browsers or mobile clients.

These endpoints are called server-to-server by the main LOS backend to push events into the marketing system.

| Method | Path | Description |
|---|---|---|
| `POST` | `/los/missions/trigger` | Mark a customer's mission as CLAIMABLE when a condition is met in LOS |

**`POST /los/missions/trigger` body:**

```json
{
  "losUserId": 123,
  "missionType": "LOAN_APPLICATION" 
}
```

**Mission types:** `DAILY_CHECK_IN`, `LOAN_APPLICATION`, `LOAN_REPAYMENT`, `REFERRAL`

**Response (always 200):**

```json
{ "triggered": true }
// or
{ "triggered": false, "reason": "customer_not_found" }
// or
{ "triggered": false, "reason": "no_active_mission" }
```

> Always returns 200 so LOS business flows are never blocked by marketing system state.

---

## Standard Response Shape

```json
{
  "status": "success",
  "data": { ... }
}
```

Errors:

```json
{
  "status": "error",
  "error": "Human-readable message"
}
```

| Status | Meaning |
|---|---|
| `401` | Missing or invalid token / API key |
| `403` | Authenticated but insufficient permissions |
| `404` | Resource not found |
| `422` | Validation error |
| `500` | Internal server error |

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing marketing JWTs |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `STORAGE_DRIVER` | `local` or `cloudinary` |
| `APP_URL` | Base URL (used for local storage URLs) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `LOS_JWKS_URI` | LOS backend JWKS endpoint |
| `LOS_ISSUER` | Expected `iss` claim in LOS JWTs |
| `LOS_CUSTOMER_AUDIENCE` | Expected `aud` claim in LOS JWTs |
| `INTERNAL_API_KEY` | Shared secret for `/los` namespace |

## Development

```bash
pnpm dev           # nodemon + tsx watch
pnpm build         # tsc + tsc-alias
pnpm type-check    # tsc --noEmit
pnpm db:generate   # prisma generate
pnpm db:migrate    # prisma migrate dev
pnpm db:seed       # seed permissions, roles, store items
pnpm db:studio     # prisma studio
```

## Prisma studio
Run this from backend/ directory

```bash
pnpm db:studio

```
## Generate Key

```bash
openssl rand -hex 32
pnpm db:seed

```
# Database Command

pnpm db:migrate
pnpm db:seed