# Redemption Feature

## Overview

Customers spend accumulated points to redeem reward items from the store. Each redemption is tracked until a staff member confirms physical pickup. Expiry is **manual** — an admin must explicitly mark a redemption as `EXPIRED`.

---

## Redemption Status

| Status | Meaning | Set by |
|---|---|---|
| `PENDING_PICKUP` | Default on redeem — waiting for the customer to collect | System (automatic on redeem) |
| `COLLECTED` | Staff confirmed the customer picked it up | Web admin (manual) |
| `EXPIRED` | Item was not collected; slot is closed | Web admin (manual) |

There is no automatic expiry. No scheduled job runs to transition statuses.

---

## How It Works

### 1. Customer browses the store (Mobile)
`GET /customer/reward/store` returns all active items with stock > 0. Items that are out of stock or inactive are hidden.

### 2. Customer redeems an item (Mobile)
`POST /customer/reward/store/:rewardId/redeem`

The backend performs these steps in a **single atomic transaction**:
1. Decrements `RewardItem.stock` by 1
2. Decrements `CustomerProfile.points` by `item.points`
3. Creates a `Redemption` row with status `PENDING_PICKUP`
4. Creates a `PointsHistory` row (`source: REDEEM`, negative points)

Guards before the transaction:
- Item must exist, be active, and have `stock > 0` → `409` if not
- Customer must have enough points → `422` if not
- Optional `Idempotency-Key` header: if a redemption with that key already exists, the call is a no-op (safe retry on network failure)

### 3. Customer views their redemptions (Mobile)
`GET /customer/reward/my-rewards` returns the customer's full redemption history ordered by newest first.

### 4. Staff views all redemptions (Web)
`GET /api/v1/admin/reward/store/redemptions` returns all redemptions across all customers, with customer name, phone, reward title, points cost, and current status.

### 5. Staff updates status (Web)
`PATCH /api/v1/admin/reward/store/redemptions/:id/status`

Admin manually transitions the redemption to `COLLECTED` or `EXPIRED`. There are no transition rules enforced — any status can be set to any other status.

---

## Communication Flow

```
Mobile App                  Backend                     Web Admin
──────────────────────────────────────────────────────────────────

GET  /customer/reward/store
  ──────────────────────►
                          Returns active items
  ◄──────────────────────

POST /customer/reward/store/:id/redeem
  ──────────────────────►
                          Atomic tx:
                          - decrement stock
                          - deduct points
                          - create Redemption (PENDING_PICKUP)
                          - write PointsHistory
  ◄──────────────────────
  200 {}

GET  /customer/reward/my-rewards
  ──────────────────────►
                          Returns redemptions (shows PENDING_PICKUP)
  ◄──────────────────────

                                          GET /admin/reward/store/redemptions
                                            ──────────────────────►
                                          Returns all redemptions list
                                            ◄──────────────────────

                          [Customer arrives, staff verifies]

                                          PATCH /admin/reward/store/redemptions/:id/status
                                          { "status": "COLLECTED" }
                                            ──────────────────────►
                                          Updates status
                                            ◄──────────────────────

GET  /customer/reward/my-rewards
  ──────────────────────►
                          Returns redemptions (now shows COLLECTED)
  ◄──────────────────────
```

---

## Endpoints Reference

### Mobile (Customer)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/customer/reward/store` | Browse active reward items |
| `POST` | `/customer/reward/store/:rewardId/redeem` | Redeem a reward item |
| `GET` | `/customer/reward/my-rewards` | View personal redemption history |

**Redeem request headers (optional):**
```
Idempotency-Key: <uuid>
```
Pass a UUID on the first attempt and repeat the same UUID on retries. The backend ignores duplicate requests with the same key — safe for mobile retry logic.

**Redeem error responses:**

| Status | Reason |
|---|---|
| `409` | Item is out of stock or inactive |
| `422` | Customer has insufficient points |

### Web Admin

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/admin/reward/store` | `REWARD_STORE / View` | List all store items |
| `GET` | `/admin/reward/store/:id` | `REWARD_STORE / View` | Get single item |
| `POST` | `/admin/reward/store` | `REWARD_STORE / Create` | Create a reward item |
| `PATCH` | `/admin/reward/store/:id` | `REWARD_STORE / Update` | Update item (title, points, stock, active flag) |
| `DELETE` | `/admin/reward/store/:id` | `REWARD_STORE / Delete` | Delete a reward item |
| `GET` | `/admin/reward/store/redemptions` | `REWARD_STORE / View` | List all redemptions |
| `PATCH` | `/admin/reward/store/redemptions/:id/status` | `REWARD_STORE / Update` | Update redemption status |

**Update status request body:**
```json
{ "status": "COLLECTED" }
```
Allowed values: `PENDING_PICKUP`, `COLLECTED`, `EXPIRED`

---

## Data Model

```
RewardItem
  id        -- referenced by Redemption
  title
  points    -- cost to redeem
  imageUrl
  stock     -- decremented on each redemption; customer-facing store hides items at 0
  isActive  -- admin can deactivate without deleting

Redemption
  id
  customerId     -- User.id of the customer
  rewardItemId   -- RewardItem.id
  points         -- cost snapshot at time of redemption (preserved even if item price changes)
  status         -- PENDING_PICKUP | COLLECTED | EXPIRED
  idempotencyKey -- optional, unique; prevents duplicate redemptions on mobile retry
  redeemedAt
```

---

## Notes

- **Stock is decremented at redeem time**, not at pickup. If an admin later marks a redemption `EXPIRED`, the stock is **not** automatically restored — this must be done manually via `PATCH /admin/reward/store/:id` if needed.
- **Points cost is snapshotted** into `Redemption.points` at the time of redemption. Changing an item's price later does not affect existing redemptions.
- **No push notification** is sent when staff updates the status — the customer must pull `GET /my-rewards` to see the latest state.
