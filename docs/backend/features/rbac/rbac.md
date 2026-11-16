# RBAC & Permission Middleware

[← Back to project README](../README.md)

Access control is split into two layers that can be used independently or together on any route. Roles are **database-driven records** (not hardcoded), so you can add new roles without a deployment.

---

## Architecture Overview: Database-Driven Roles

Roles are no longer hardcoded TypeScript enums. They are stored as records in the `role` table and managed at runtime via CRUD APIs.

### Why Roles Are Database-Driven

**No deployment needed to add roles:** Staff can now manage new roles through admin endpoints without code changes or restarts.

**Flexible permissions:** Each role has a set of permissions defined in the `role_permission` junction table. Permissions are linked to a role via `roleId` and a permission via `permissionId`. A permission is identified by `(module, action)`.

**Dynamic validation:** The RBAC middleware validates role names against the database, not a TypeScript enum. Permission checks query the cached `role_permission` table to determine what a role can do.

### Data Model

**Role table:**

```prisma
model Role {
  id           Int              @id @default(autoincrement())
  name         String           @unique                    // "CREDIT_ASSESSMENT", "ADMIN", etc.
  description  String?                                    // Human-friendly explanation
  parentRoleId Int?             @map("parent_role_id")     // Self-relation — inheritance parent
  isAssignable Boolean          @default(true)             // false for BASE_STAFF (abstract root)
  createdAt    DateTime?        @map("created_at")
  updatedAt    DateTime?        @map("updated_at")
  permissions  RolePermission[]                           // Permissions assigned to this role
  staffMembers Staff[]                                    // Staff members with this role
  parentRole   Role?            @relation("RoleHierarchy", fields: [parentRoleId], references: [id])
  childRoles   Role[]           @relation("RoleHierarchy")
}
```

### Role Hierarchy

Every real role has a `parentRoleId` pointing at the role it inherits from. A role's **effective**
permission set is its own `RolePermission` rows unioned with every ancestor's, walked at request
time (`permission.middleware.ts`'s `getRoleChainIds`, cached under `rolechain:{role}`). This is
additive-only — a child never loses anything its parent grants.

`BASE_STAFF` is a real `Role` row (`isAssignable: false`) that sits at the root of every chain and
holds the grants every staff member gets (`DASHBOARD`, `NOTIFICATION`, `COMMENT`,
`COMMUNICATION`, `SMS`, `MESSAGE_TEMPLATE` view). It cannot be assigned to a staff member directly — `staff.service.ts`
rejects it defensively even if something bypasses the UI.

Current hierarchy:

| Role                        | Parent                   | Adds on top of parent                                                                                                                                                                                                                                                                                                         |
| --------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BASE_STAFF`                | — (root)                 | Dashboard, notifications, comments, communication log, SMS, message templates (view)                                                                                                                                                                                                                                          |
| `CREDIT_SUPPORT_OFFICER`    | `BASE_STAFF`             | LEAD, DRAFT (base actions + Approve Draft Application), LOAN_MANAGEMENT edits + PROCESS document edits (draft-stage-only, see [Draft-Stage Edit Guard](#draft-stage-edit-guard) below), EKYC (Verify Identity, Reset Verification Attempts)                                                                                   |
| `CREDIT_SUPPORT_SUPERVISOR` | `CREDIT_SUPPORT_OFFICER` | Lead/draft assignment, officer workload, activity log, assignment/stale-item settings, EKYC (Manual Verify Identity)                                                                                                                                                                                                          |
| `CREDIT_ASSESSMENT`         | `BASE_STAFF`             | PROCESS (review/recommend/decline, Reevaluate Draft Application — send back to Credit Support), LOAN_MANAGEMENT edits (customer info, occupation, loan info, relatives, contacts), EKYC (Verify Identity), officer workload (CS officer picker)                                                                               |
| `CREDIT_SUPERVISOR`         | `CREDIT_ASSESSMENT`      | Officer assignment, CREDIT_DECISION, BLACKLIST, officer workload, settings                                                                                                                                                                                                                                                    |
| `CREDIT_COMMITTEE`          | `BASE_STAFF`             | CREDIT_DECISION (final approval), BLACKLIST, LOAN_MANAGEMENT edits (customer info, occupation, loan info, relatives, contacts), PROCESS (full parity with CREDIT_ASSESSMENT — review/recommend/decline, Reevaluate Draft Application, for repeat customers), officer workload (CS officer picker)                             |
| `ACCOUNTANT_AP`             | `BASE_STAFF`             | DISBURSEMENT                                                                                                                                                                                                                                                                                                                  |
| `ACCOUNTANT_AR`             | `BASE_STAFF`             | REPAYMENT                                                                                                                                                                                                                                                                                                                     |
| `ACCOUNTANT_SUPERVISOR`     | `BASE_STAFF`             | DISBURSEMENT + REPAYMENT (spans both AP and AR) + assignment, officer workload                                                                                                                                                                                                                                                |
| `COLLECTION_OFFICER`        | `BASE_STAFF`             | COLLECTION, BLACKLIST (base actions), officer workload (collection officer filter)                                                                                                                                                                                                                                            |
| `COLLECTION_SUPERVISOR`     | `COLLECTION_OFFICER`     | Escalation, LOAN_MANAGEMENT, activity log                                                                                                                                                                                                                                                                                     |
| `OPERATION_SUPERVISOR`      | `BASE_STAFF`             | Cross-functional — its own copy of LOAN_MANAGEMENT/LEAD/DRAFT/PROCESS/CREDIT_DECISION/COLLECTION + EKYC (Verify Identity, Reset Verification Attempts, Manual Verify Identity) + MESSAGE_TEMPLATE create/update/delete (see note below) + CONTACT_INFO_SETTINGS view/update (not in BASE_STAFF, so no other role can view it) |
| `ADMIN`                     | — (bypasses entirely)    | Everything (special-cased, no DB check)                                                                                                                                                                                                                                                                                       |
| `SUPER_ADMIN`               | — (bypasses entirely)    | Everything ADMIN has, plus can create/modify ADMIN and SUPER_ADMIN accounts (see below)                                                                                                                                                                                                                                       |
| `IT_SUPPORT`                | — (no parent)            | USER_MANAGEMENT only (staff list/create/update/suspend/reactivate, role & department list), no delete flow; can't touch ADMIN/SUPER_ADMIN/IT_SUPPORT accounts (see [`adminOnly`](#it_support-and-adminonly))                                                                                                                  |

`OPERATION_SUPERVISOR` and `ACCOUNTANT_SUPERVISOR` don't cleanly extend a single sibling role —
they'd over-inherit modules (e.g. `STAFF`/`ASSIGNMENT_SETTINGS`/`BLACKLIST`) they're not meant to
have. Rather than force a false parent relationship, they extend `BASE_STAFF` directly and carry
their own full delta for the modules they need.

**Editing the hierarchy:** `POST /api/v1/admin/role/update` accepts an optional
`parentRoleName` (pass `null` to detach a role back to the root). The service rejects:

- Setting a role as its own parent
- Creating a cycle (the proposed parent's chain already contains this role)
- Chains deeper than 10 levels

Any reparent or role-permission edit invalidates the **entire** permission cache
(`permissionCache.invalidateAll()`) rather than just the one role, since a parent's grants (or
position in the tree) changes what every descendant resolves to.

### SUPER_ADMIN and `superAdminOnly`

`SUPER_ADMIN` has identical access to `ADMIN` everywhere in the app — both are recognized by the
centralized `isAdminRole(role)` helper in `rbac.middleware.ts`, which every ADMIN-bypass check
(`requireAdmin`, `requirePermission`, settings module-access checks, application status access,
etc.) calls instead of comparing to `Role.ADMIN` directly. The one difference: only a caller whose
own role is `SUPER_ADMIN` may create, promote into, or modify an **existing** account holding a
`Role.superAdminOnly` role (`ADMIN` or `SUPER_ADMIN`) — a plain `ADMIN` cannot. This is enforced in
`staff.service.ts`'s `assertCallerMayManageRole`, called from `createStaff`, `updateStaff`,
`suspendStaff`, `reactivateStaff`, `softDeleteStaff`, and `restoreStaff` — both when the _target
role being assigned_ is `superAdminOnly` and when the _staff record already being acted on_ holds
one. Read access (viewing ADMIN/SUPER_ADMIN entries in the staff list) is unrestricted for any
ADMIN-tier caller.

The same guard (`assertCallerMayManageRole`) also runs in `getDeletionImpact`.

Both `SUPER_ADMIN` and `ADMIN` are `isAssignable: true` — an existing `SUPER_ADMIN` can create more
super admins through the normal `POST /staff/create` flow. The very first `SUPER_ADMIN` account on
a given database has to be provisioned out-of-band (seed data in dev; a one-off manual
`UPDATE staff SET role_id = ...` against an existing trusted ADMIN in staging/production), since no
account exists yet that's allowed to create one through the API.

### IT_SUPPORT and `adminOnly`

`IT_SUPPORT` (department `IT`) runs the portal's User Management screen and nothing else. It has
**no parent role**, so it inherits none of `BASE_STAFF`'s dashboard, comment or application grants.
Its own grants are the `USER_MANAGEMENT` module minus the delete flow:

| Route                                  | `USER_MANAGEMENT` action    | IT_SUPPORT |
| -------------------------------------- | --------------------------- | :--------: |
| `GET /admin/staff/list/all`            | View Staff List             |     ✅     |
| `POST /admin/staff/create`             | Create Staff                |     ✅     |
| `POST /admin/staff/update`             | Update Staff                |     ✅     |
| `POST /admin/staff/:id/suspend`        | Suspend Staff               |     ✅     |
| `POST /admin/staff/:id/reactivate`     | Reactivate Staff            |     ✅     |
| `GET /admin/role/list`                 | View Role List              |     ✅     |
| `GET /admin/department/list`           | View Department List        |     ✅     |
| `GET /admin/staff/:id/deletion-impact` | Check Staff Deletion Impact |     ❌     |
| `GET /admin/staff/list/deleted`        | View Deleted Staff          |     ❌     |
| `POST /admin/staff/:id/soft-delete`    | Delete Staff                |     ❌     |
| `POST /admin/staff/:id/restore`        | Restore Staff               |     ❌     |

The ❌ actions are ordinary grantable permissions (ADMIN can tick them for a role in the portal),
just not granted to `IT_SUPPORT`. Role/department create/update/delete and every
`/admin/staff/permission/*` route stay `requireAdmin`, since permission grants have no escalation
check of their own.

`Role.adminOnly` is the `superAdminOnly` pattern one tier down: only an `ADMIN` or `SUPER_ADMIN`
caller may assign an `adminOnly` role or act on an account that holds one. `IT_SUPPORT` is the only
`adminOnly` role, so an IT caller can't promote itself, reset a peer's password, or create another
IT account. `GET /admin/role/list` returns every role to ADMIN-tier callers. Any other caller only
gets the roles it may assign, without `superAdminOnly`, `adminOnly` or non-assignable ones.

Changing a staff member's `role` or `username` through `POST /admin/staff/update` ends all their
sessions (`ROLE_CHANGED` / `USERNAME_CHANGED`) for every caller, ADMIN included, because both values
live in the access token. A password reset in the same request takes precedence
(`PASSWORD_RESET_BY_ADMIN`). An ADMIN renaming their own account logs themselves out.

Accepted residual risk: IT can reset an operational user's password and sign in as them, or create a
second operational-role account for itself. Both are recorded in the activity log
(`RESET_STAFF_PASSWORD`, `CREATE_STAFF`).

**Permission & RolePermission tables:**

```prisma
model Permission {
  id    Int              @id @default(autoincrement())
  module String                                          // "DRAFT", "CREDIT_DECISION", "DISBURSEMENT", etc.
  action String                                          // real-world name, e.g. "View Draft Applications", "Approve Loan Request"
  roles RolePermission[]                                 // All roles that have this permission
}

model RolePermission {
  id           Int        @id @default(autoincrement())
  roleId       Int        @map("role_id")
  permissionId Int        @map("permission_id")
  role         Role       @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@unique([roleId, permissionId])
}
```

**Staff table (references roles):**

```prisma
model Staff {
  id             Int
  fullName       String?
  phone          String?
  roleId         Int?       @map("role_id")               // Foreign key to Role table
  userId         Int?
  lastActiveAt   DateTime?
  user           User?      @relation(fields: [userId], references: [id])
  staffRole      Role?      @relation(fields: [roleId], references: [id])   // The role assigned to this staff
}
```

---

## Role Management: CRUD APIs

The [Role Management Module](../src/modules/role/README.md) provides endpoints to create, read, update, and delete roles. Create/update/delete are ADMIN-only; `GET /list` requires `USER_MANAGEMENT`/`View Role List` and is filtered for non-admin callers (see [IT_SUPPORT and `adminOnly`](#it_support-and-adminonly)).

**Base path:** `/api/v1/admin/role`  
**Authentication:** JWT Bearer

### List All Roles

**Request:**

```bash
GET /api/v1/admin/role/list
Authorization: Bearer {token}
```

**Response (200):**

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "ADMIN",
      "description": "Full system access, bypasses all permission checks",
      "parentRoleId": null,
      "isAssignable": true,
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "name": "CREDIT_ASSESSMENT",
      "description": "Evaluates credit applications and makes lending decisions",
      "parentRoleId": 5,
      "isAssignable": true,
      "createdAt": "2026-02-01T08:15:00Z",
      "updatedAt": "2026-02-01T08:15:00Z"
    },
    {
      "id": 5,
      "name": "BASE_STAFF",
      "description": "Abstract root of the role hierarchy — not directly assignable",
      "parentRoleId": null,
      "isAssignable": false,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### Create a New Role

**Request:**

```bash
POST /api/v1/admin/role/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "RISK_ANALYST",
  "description": "Analyzes risk profiles and recommends interventions"
}
```

**Response (201):**

```json
{
  "status": "success",
  "data": {
    "id": 14,
    "name": "RISK_ANALYST",
    "description": "Analyzes risk profiles and recommends interventions",
    "createdAt": "2026-04-30T14:22:00Z",
    "updatedAt": "2026-04-30T14:22:00Z"
  }
}
```

**Rules:**

- **Name is uppercased:** `risk_analyst` → `RISK_ANALYST`
- **Name must be unique:** Attempting to create `CREDIT_ASSESSMENT` again returns `400 Bad Request` — `"Role 'CREDIT_ASSESSMENT' already exists"`
- **Maximum lengths:** `name` ≤ 255 chars, `description` ≤ 500 chars

### Update a Role

The name can be changed via `newName`; `parentRoleName` reassigns where the role sits in the
[hierarchy](#role-hierarchy) (omit to leave it unchanged, pass `null` to detach to the root).

**Request:**

```bash
POST /api/v1/admin/role/update
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "RISK_ANALYST",
  "description": "Reviews credit risk, identifies policy violations, recommends limits",
  "parentRoleName": "BASE_STAFF"
}
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "id": 14,
    "name": "RISK_ANALYST",
    "description": "Reviews credit risk, identifies policy violations, recommends limits",
    "createdAt": "2026-04-30T14:22:00Z",
    "updatedAt": "2026-04-30T15:45:00Z"
  }
}
```

**Error (404):** If the role does not exist — `"Role 'NONEXISTENT_ROLE' not found"`

### Delete a Role

**Request:**

```bash
DELETE /api/v1/admin/role/:name
Authorization: Bearer {token}
```

Example:

```bash
DELETE /api/v1/admin/role/RISK_ANALYST
```

**Response (200):**

```json
{
  "status": "success",
  "data": null
}
```

**Error (404):** If the role does not exist — `"Role 'NONEXISTENT_ROLE' not found"`

**Error (400):** If active staff are assigned to the role — `"Cannot delete role 'RISK_ANALYST': 3 active staff member(s) assigned to this role"`

---

## Role-Based Access Control (`rbac.middleware.ts`)

Enforces coarse-grained role checks using JWT claims and database validation.

### How It Works

When a request hits an `rbac`-protected route:

1. **JWT claim is extracted:** The middleware reads the `role` field from the JWT token
2. **Database lookup:** The middleware validates that a `Role` record with that name exists (via `RoleRepository.isValidRole(name)`)
3. **Comparison:** The requested role(s) are compared against the JWT role
4. **Decision:** Access is granted or denied

### Available Roles

These are **seed data** that are created during database initialization. They serve as reference — the canonical list is always in the `role` table.

| Role                        | Description                                                          |
| --------------------------- | -------------------------------------------------------------------- |
| `ADMIN`                     | Full system access, bypasses all permission checks                   |
| `SUPER_ADMIN`               | Same as ADMIN, plus can create/modify ADMIN and SUPER_ADMIN accounts |
| `CREDIT_SUPPORT_SUPERVISOR` | Supervises credit support officers                                   |
| `CREDIT_SUPPORT_OFFICER`    | Handles draft application review                                     |
| `CREDIT_SUPERVISOR`         | Supervises credit assessment officers                                |
| `CREDIT_ASSESSMENT`         | Handles credit assessment                                            |
| `CREDIT_COMMITTEE`          | Final credit decision                                                |
| `ACCOUNTANT_SUPERVISOR`     | Supervises accountants                                               |
| `ACCOUNTANT_AR`             | Accounts receivable                                                  |
| `ACCOUNTANT_AP`             | Accounts payable / deposit                                           |
| `COLLECTION_SUPERVISOR`     | Supervises collection officers                                       |
| `COLLECTION_OFFICER`        | Handles overdue repayments                                           |
| `OPERATION_SUPERVISOR`      | Operations oversight                                                 |
| `IT_SUPPORT`                | User Management only (staff accounts), department `IT`               |
| `CUSTOMER`                  | Mobile app user                                                      |

### Usage

```typescript
import { requireRole, requireAdmin, requireCustomer } from '@shared/middleware/rbac.middleware.js';

// Restrict to ADMIN only
router.delete('/admin/role/:name', authenticate, requireAdmin, handler);

// Restrict to CREDIT_ASSESSMENT or CREDIT_SUPERVISOR
router.get(
  '/applications',
  authenticate,
  requireRole('CREDIT_ASSESSMENT', 'CREDIT_SUPERVISOR'),
  handler
);

// Restrict to CUSTOMER (mobile app)
router.get('/profile', authenticate, requireCustomer, handler);
```

---

## Fine-Grained Permission Middleware (`permission.middleware.ts`)

Enforces module/action permissions stored in the `role_permission` database table. Includes an in-memory cache to avoid repeated DB lookups.

**ADMIN and SUPER_ADMIN always bypass permission checks.**

### How It Works

When a request hits a `requirePermission`-protected route:

1. **Role is extracted** from JWT claims
2. **Admin-tier check:** If `isAdminRole(role)` is true (`ADMIN` or `SUPER_ADMIN`), access is granted immediately (no database lookup)
3. **Cache lookup:** Middleware checks if the permission is cached for this role
4. **Database lookup (if needed):** If not cached, middleware queries `role_permission` joined with `permission` to find if `(roleId, module, action)` exists
5. **Cache update:** Result is stored in memory cache
6. **Decision:** Access is granted or denied based on the permission result

### `PermissionCache` API

The permission cache is a singleton exported as `permissionCache` from `@shared/middleware/permission.middleware.js`.

| Method                                 | Description                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `check(role, module, action, userId?)` | Returns `true` if the role's resolved chain OR the staff member's overrides (if `userId` given) has the permission |
| `invalidate(role)`                     | Clears the resolved-permission cache for one role                                                                  |
| `invalidateStaff(staffId)`             | Clears one staff member's override cache (after their `StaffPermission` rows change)                               |
| `invalidateAll()`                      | Clears every role-permission and role-chain cache entry (used after any role/hierarchy edit)                       |

Cache keys and TTLs:

| Key                    | Holds                                                          | TTL                                                       |
| ---------------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| `perms:{role}`         | Resolved (inherited) permission set for a role                 | 5 minutes                                                 |
| `rolechain:{role}`     | Ancestor role ids walked via `parentRoleId`                    | 5 minutes                                                 |
| `staffperms:{staffId}` | A staff member's active (non-expired) `StaffPermission` grants | 60 seconds — overrides are meant to be reviewed/temporary |
| `staffid:{userId}`     | `User.id` → `Staff.id` lookup (JWT has no `staffId`)           | 1 hour — this mapping essentially never changes           |

### Usage

Actions are human-readable, real-world names — not a fixed CRUD+ASSIGN enum. The grantable set is derived from `routeAction()` calls at route load time (see `@shared/middleware/permission-registry.ts`); the check is an exact string match on the `(module, action)` pair. Prefer `routeAction()` — it registers the pair as grantable and stamps the same name on the activity log:

```typescript
import { routeAction } from '@shared/middleware/route-action.middleware.js';
import { requirePermission } from '@shared/middleware/permission.middleware.js';

// Standard: named route action — permission check + activity-log label in one
router.get('/list', authenticate, ...routeAction('DRAFT', 'View Draft Applications'), handler);
router.post('/assign', authenticate, ...routeAction('DRAFT', 'Assign Sales Officer'), handler);

// Combine with requireRole for defense-in-depth
router.post(
  '/approve',
  authenticate,
  requireRole('CREDIT_ASSESSMENT', 'CREDIT_COMMITTEE'),
  ...routeAction('CREDIT_DECISION', 'Approve Loan Request'),
  handler
);

// Bare requirePermission — only for routes that need a check without a named, loggable action
router.get('/export', authenticate, requirePermission('REPORTING', 'Export Report'), handler);
```

---

## Managing Permissions

To view and update role permissions at runtime, use the [Permission Management Module](../src/modules/permission/README.md). That module exposes ADMIN-only endpoints to read and replace the permission set for any role, with automatic cache invalidation on update.

**Role-scoped endpoints:**

- `GET /api/v1/admin/staff/permission/modules` — List all registered modules
- `GET /api/v1/admin/staff/permission/role/{role}` — View a role's own permissions
- `POST /api/v1/admin/staff/permission/role/{role}/update` — Replace a role's own permission set

**Staff-scoped endpoints (individual overrides — see below):**

- `GET /api/v1/admin/staff/permission/staff/{staffId}` — View a staff member's overrides
- `POST /api/v1/admin/staff/permission/staff/{staffId}/grant` — Grant one or more additional permissions
- `DELETE /api/v1/admin/staff/permission/staff/{staffId}/{permissionId}` — Remove one override

`{staffId}` here is the same public staff identifier used throughout the [Staff module](../src/modules/staff/README.md) (`User.id`, resolved internally to the `Staff` record).

**Frontend integration:** see [frontend-rbac-migration.md](frontend-rbac-migration.md) for the portal-facing contract, migration checklist, and the full action→endpoint catalog.

**Where the grantable catalog comes from:** there is deliberately no "list all grantable permissions" endpoint. `GET .../permission/modules` returns module names only, and `GET .../permission/role/{role}` returns what a role has been _granted_ — neither can enumerate never-granted actions. The catalog is delivered through the ADMIN's own session: `resolvePermissionsForRole()` special-cases `ADMIN` to return the full in-memory permission registry, so an ADMIN's `GET /admin/auth/me` response contains every registered `(module, action)` pair. Since all permission-management endpoints are ADMIN-only, the frontend matrix UI renders its columns from the logged-in ADMIN's `/me` permissions. This is an intentional contract — see the warning comment in `permission.service.ts` before changing the ADMIN branch. (Caveat: the session is fetched at login, so a newly deployed `routeAction` appears in the matrix only after the ADMIN refreshes their session.)

### Published action rules

`GET /api/v1/admin/application/action-rules` (any authenticated staff) publishes one table of staff actions: `key`, `stage`, `allowedStatuses`, `permission` and `requiresOwnership`, plus the list-filter `aliases`. It is built from `STAFF_ACTION_RULES` in `src/modules/applications/shared/staff-action-rules.ts`.

- Routes get their permission from the table through `ruleRouteAction('<key>')`, and the allowed statuses come from `STATUS_TRANSITIONS`. The guard and the published rule cannot disagree.
- `requiresOwnership: true` means status plus permission is not enough: a Credit Support officer must also own the application (`csOwnershipViolation`). Use the detail's `availableActions` or the row's `salesId`.
- The response is sent with `Cache-Control: private, max-age=300` and an ETag, so revalidation returns 304 until a deploy changes the rules.
- `draft.assign` publishes New, Submitted, Re-Evaluate and Amending. It does not accept `DRAFT_REVIEWING_S1`: like the S2/S4 assign actions, assignment is only allowed before someone has picked the application up.

### Per-application `availableActions`

`GET /api/v1/admin/application/{id}` adds `availableActions: { action, allowed, reason }[]`, built by `evaluateAvailableActions` in `src/modules/applications/shared/available-actions.ts`. The static table above says what an action needs; this says what the caller can do with _this_ application right now.

- **Which actions are listed.** Every rule in the worklists (`stage`) that accept the application's current status. The stage comes from the rules themselves, not from the status name, so `OFFER_ACCEPTED_S3` gets the disbursement actions. A status no rule accepts (for example a failed or completed one) gets `[]`.
- **Reason order**, the order the endpoints enforce, so `reason` is the code the call would return:
  1. `NO_PERMISSION`: the caller lacks the rule's permission. Resolved once per request with `resolvePermissionChecker` (admin roles pass; others use the same effective set as `/admin/auth/me`).
  2. `INVALID_STATUS`: the status is not in the rule's allowed statuses (the call returns `INVALID_STATUS_TRANSITION`).
  3. `NOT_OWNER` / `UNASSIGNED`: a Credit Support officer does not own the application, or nobody does (`csOwnershipViolation`). Applies only where the guard enforces ownership, see `ownershipApplies`: `draft.approve` and `draft.amend` at every accepted status, `draft.fail` only in the CS-owned statuses.
- **What `allowed: true` promises.** Status, permission and ownership pass. Request-specific rules can still reject the call: `draft.approve` needs a complete application with a verified identity, and `process.send_back` needs an active Credit Support officer to hand back to. The frontend handles those from the error.
- **After a CA to CS send-back** nothing special is stored: ownership is read from the live `salesId`, so the officer set by the send-back owns the application, other officers get `NOT_OWNER`, and supervisors bypass. Credit Assessment and the other stages have no ownership check, so their rules never report `NOT_OWNER`.
- **Drift guard.** `available-actions.test.ts` checks every rule and status against the guard primitives, and `admin-draft.service.test.ts` drives the real `failDraft`, `approveDraft` and `requestAmending` and compares their outcome with the published verdict.

---

## Per-Staff Permission Overrides (`StaffPermission`)

Sometimes one individual needs more access than their role grants — the canonical case is a
staff member acting up into more responsibility ahead of an official promotion. Rather than
creating a one-off role for them, an ADMIN can grant them named permissions directly.

```prisma
model StaffPermission {
  id           Int        @id @default(autoincrement())
  staffId      Int        @map("staff_id")
  permissionId Int        @map("permission_id")
  reason       String?                            // why this was granted, for audit
  expiresAt    DateTime?                          // optional — lets a trial grant lapse automatically
  grantedById  Int?                               // the granting admin's User.id
  staff        Staff      @relation(fields: [staffId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@unique([staffId, permissionId])
}
```

**Precedence — additive-only:** a staff member's effective permissions are their resolved
role-chain permissions **union** their active `StaffPermission` grants. A `StaffPermission` row
can never revoke something the role already grants — only add. An override with a past
`expiresAt` is treated as inactive (filtered out at read time, not deleted).

**Example:** grant a `CREDIT_SUPPORT_OFFICER` temporary access to an assignment action their
role doesn't include:

```bash
POST /api/v1/admin/staff/permission/staff/482/grant
Authorization: Bearer {token}
Content-Type: application/json

{
  "permissions": [
    {
      "module": "LEAD",
      "action": "Assign Lead to Sales Agent",
      "reason": "Acting supervisor while CREDIT_SUPPORT_SUPERVISOR is on leave",
      "expiresAt": "2026-08-01T00:00:00.000Z"
    }
  ]
}
```

Removing an override early (e.g. the trial ends or the promotion is finalized and the person
gets the real role instead): `DELETE /api/v1/admin/staff/permission/staff/482/{permissionId}`.

---

## Reference: Standard Roles & Permissions by Lifecycle Stage

The roles documented below represent the standard role architecture and their permissions throughout the loan lifecycle. While role names can be customized via the Role Management APIs, this reference describes the **intended roles and their permissions** as seeded during initialization.

**Note:** To add a new custom role, use [`POST /api/v1/admin/role/create`](#create-a-new-role). To assign permissions to a role, use the [Permission Management Module](../src/modules/permission/README.md).

### Role Terminology

These role names were refactored for clarity:

- `SALES_OFFICER` → `CREDIT_SUPPORT_OFFICER` — emphasizes support function in intake stage
- `SALES_SUPERVISOR` → `CREDIT_SUPPORT_SUPERVISOR` — emphasizes team leadership in support
- `CREDIT_OFFICER` → `CREDIT_ASSESSMENT` — emphasizes evaluation/assessment function

This refactoring affects all 50+ files that reference roles. See [Breaking Changes in main README](../README.md#breaking-changes) for migration guidance.

### Stage 1 — Credit Support (Lead Intake & Draft Review)

**Department:** Credit Support  
**Primary Module:** LEAD (intake), DRAFT (application review)

**`CREDIT_SUPPORT_OFFICER`**

- ✅ Creates leads from bulk uploads or manual entry
- ✅ Reads and updates leads they are assigned to
- ✅ Reads draft applications they are assigned to
- ✅ Updates draft applications (personal info, employment, loan details, documents)
- ✅ Submits draft applications to credit assessment (transitions to REQUEST_NEW_S2)
- ✅ Runs the "Verify Identity" check (`EKYC`) — CamDX text-only MOI cross-check of the submitted identity fields, in the draft/request (S2) window
- ✅ Resets both eKYC verification-attempt pools (`EKYC` → Reset Verification Attempts) once a pool is exhausted — the common-case rescue for a customer stuck in draft after burning all 3 attempts; CamDX still has to pass on the fresh attempts
- ✅ Views the re-engagement list (`GET /draft/reengagement-customers?status=…`): repaid customers (`REPAYMENT_COMPLETED_S5`) and canceled offers (`OFFER_CANCELED_S3`), one row per customer (their newest application in that status), customers with an application in progress left out. Not filtered to their own assignments; the whole CS team sees it.
- ✅ Receives a draft back from `CREDIT_ASSESSMENT` (`DRAFT_REEVALUATE_S1`) when it has a data
  problem (wrong occupation, bad contact, missing document) instead of the customer-facing
  "request amending" flow, and can edit it directly (`LOAN_MANAGEMENT` data + `PROCESS`
  documents — see [Draft-Stage Edit Guard](#draft-stage-edit-guard) below)
- ✅ Picks up a customer-submitted draft (`DRAFT` → Review Draft Application, `POST /draft/submitted/review`
  or `/draft/:id/submitted/review`): `DRAFT_SUBMITTED_S1` → `DRAFT_SUBMITTED_REVIEWING_S1`. A
  `CREDIT_SUPPORT_OFFICER` may pick up an application assigned to them or an unassigned one (picking it
  up claims it and counts toward the reviewing cap); supervisors, operations and admin may pick up any
  application and keep its owner. Approve, fail and request
  amending only run from `DRAFT_SUBMITTED_REVIEWING_S1` (`DRAFT_REEVALUATE_S1` stays direct). A picked-up
  application can no longer be reassigned via `assign-sales`
- ✅ Approves a customer-submitted draft (`DRAFT_SUBMITTED_S1`, or `DRAFT_SUBMITTED_REVIEWING_S1` once picked up; first-loan customers only)
  or a fixed-up handed-back draft (`DRAFT` → Approve Draft Application). Submitted drafts always go
  to the `REQUEST_NEW_S2` pool; handed-back drafts return to the same CA (`REQUEST_REVIEWING_S2`,
  keeping `creditId`) when that CA is still active, otherwise the pool (`creditId` cleared). The
  pool path auto-assigns a CA, best-effort — same completeness + identity-verification gates the
  customer's own submit uses
- ✅ Fails a `DRAFT_SUBMITTED_S1` / `DRAFT_SUBMITTED_REVIEWING_S1` / `DRAFT_REEVALUATE_S1` / `DRAFT_AMENDING_S1` draft (`DRAFT` → Fail Draft Application)
- ✅ Asks the customer to resend documents (`DRAFT` → Request Draft Amending) from `DRAFT_SUBMITTED_S1` / `DRAFT_SUBMITTED_REVIEWING_S1`
  or `DRAFT_REEVALUATE_S1`: the application moves to `DRAFT_AMENDING_S1` and then to
  `DRAFT_REEVALUATE_S1` once the customer uploads every requested item. While amending, CS may still fail,
  reassign, or upload on the customer's behalf, but cannot approve
- ⚠️ Approve/fail/request-amending on those statuses is owner-only: a `CREDIT_SUPPORT_OFFICER` may act only when
  `salesId` is themself (`403` otherwise; an unassigned draft needs a supervisor).
  `CREDIT_SUPPORT_SUPERVISOR`, `OPERATION_SUPERVISOR` and `ADMIN` bypass the check
- ❌ Cannot approve or reject applications
- ❌ Cannot access credit process (PROCESS module) statuses
- ❌ Cannot record a manual identity verification (supervisor-tier — see below)

**`CREDIT_SUPPORT_SUPERVISOR`** (inherits `CREDIT_SUPPORT_OFFICER` — see [Role Hierarchy](#role-hierarchy))

- ✅ Everything `CREDIT_SUPPORT_OFFICER` can do, plus:
- ✅ Manages all leads (create, read, update, delete, assign)
- ✅ Assigns credit support officers to leads and drafts
- ✅ Views team dashboard and performance metrics
- ✅ Can send SMS notifications
- ✅ Records a manual identity verification (`EKYC` → Manual Verify Identity) with a written reason, bypassing CamDX entirely — the escalation path when a customer genuinely can't match MOI records

**Auto-Assignment Behavior:**

- **On lead creation:** Auto-assigns to CREDIT_SUPPORT_OFFICER with fewest active leads
- **On draft creation (first-time customer):** If the customer has no prior application and their phone matches a `Lead` with an active, currently-eligible `salesId`, the draft reuses that lead's officer instead of running fresh auto-assignment (preserves officer continuity from the original OTP lead)
- **On draft creation (fallback):** Auto-assigns to CREDIT_SUPPORT_OFFICER with fewest active drafts — used for returning customers, or when no matching lead/officer is found for a first-time customer
- **On submit (CS gate, `DRAFT_SUBMITTED_S1`):** Keeps the draft's existing officer if still employed (not deleted or suspended); otherwise the lead officer from the customer's latest lead that has one (assigned even when offline); otherwise the least-loaded online officer; otherwise the draft stays unassigned and a supervisor must pick it up
- **On CS officer login (unassigned `DRAFT_SUBMITTED_S1`):** The on-login shuffle hands unassigned submitted drafts to the least-loaded online CS officer, but only when no lead with the customer's login phone (`user.username` = `leads.phone`) has a `salesId`. Drafts with a lead officer, or with no customer username, stay unassigned. Owned submitted drafts are never moved
- **Caveat:** Same officer can have different load across leads vs. drafts (separate load-balancing contexts)

#### Draft-Stage Edit Guard

`CREDIT_SUPPORT_OFFICER`'s `LOAN_MANAGEMENT` data-edit actions and `PROCESS` document-edit
actions listed above are permission-granted unconditionally, but a second, status-aware check —
`draft-stage-edit-guard.middleware.ts` — narrows them at request time to applications still in
`DRAFT_NEW_S1`, `DRAFT_REVIEWING_S1`, `DRAFT_REEVALUATE_S1`, `DRAFT_SUBMITTED_S1`, `DRAFT_SUBMITTED_REVIEWING_S1`, or `DRAFT_AMENDING_S1`. Any other status → `403 Credit
support may only edit draft-stage applications`, even though the role permission itself would
otherwise allow the action. The same guard also locks the credit roles
(`CREDIT_ASSESSMENT`, `CREDIT_SUPERVISOR`, `CREDIT_COMMITTEE`) out of those routes while the
application is `DRAFT_REEVALUATE_S1` or `DRAFT_AMENDING_S1` (with Credit Support) → `403 Application is with Credit Support;
edits are locked until it is returned`. At every other status they keep their normal access. This
is code-only (not a `RolePermission` row). `OPERATION_SUPERVISOR`/`ADMIN`/`SUPER_ADMIN` are
untouched.

### Stage 2 — Credit Assessment (Evaluation & Decision)

**Department:** Credit  
**Primary Module:** PROCESS (application review & credit decisions)

**`CREDIT_ASSESSMENT`**

- ✅ Reviews applications assigned to them (REQUEST_NEW_S2, REQUEST_REVIEWING_S2, REQUEST_AMENDING_S2, REQUEST_REEVALUATE_S2)
- ✅ Makes lending decisions: recommend loan offer or decline application
- ✅ Requests applicant amendments (returns to REQUEST_AMENDING_S2)
- ✅ Sends a draft/registration data problem straight down to Credit Support instead
  (`PROCESS` → Reevaluate Draft Application, from `REQUEST_REVIEWING_S2` or
  `REQUEST_REEVALUATE_S2` → `DRAFT_REEVALUATE_S1`) with a mandatory remark; is locked out of
  edits (server-enforced) while Credit Support fixes it, and gets it back automatically once
  resubmitted (same `creditId`, unless reassigned to a different CS officer at handover time)
- ✅ Views and runs fraud checks (`FRAUD_DETECTION`) — advisory only, never changes status
- ✅ Views application detail, loan history, and contact list; edits customer info, occupation, loan info, and relatives (`LOAN_MANAGEMENT`)
- ✅ Cannot view or access any OFFER or DEPOSIT processing
- ✅ Views the loans they handled after payout in the Disbursed tab (`GET /application/list/process?status=DEPOSIT_COMPLETED_S4,REPAYMENT_COMPLETED_S5,REPAYMENT_TERMINATED_S5`, same `View All Process Applications` permission as the other tabs), scoped to their own assignments. These statuses are filter-only: `/list/process` without `status` leaves them out
- ❌ Cannot approve final loan (only recommend); requires CREDIT_COMMITTEE

**`CREDIT_SUPERVISOR`** (inherits `CREDIT_ASSESSMENT` — see [Role Hierarchy](#role-hierarchy))

- ✅ Everything `CREDIT_ASSESSMENT` can do, plus:
- ✅ Reassigns applications between credit assessment officers
- ✅ Views department dashboard with collection analytics
- ✅ Can override certain decisions

**`CREDIT_COMMITTEE`**

- ✅ Reviews recommended applications (REQUEST_RECOMMENDED_S2)
- ✅ Final approval authority: approves or rejects loans
- ✅ Can re-evaluate rejected applications (returns to REQUEST_NEW_S2 for re-review by CREDIT_ASSESSMENT)
- ✅ Views and runs fraud checks (`FRAUD_DETECTION`) — advisory only, never changes status
- ✅ Views application detail, loan history, and contact list; edits customer info, occupation, loan info, and relatives (`LOAN_MANAGEMENT`)
- ✅ Views all process applications (`PROCESS` → `View All Process Applications`) — read-only, no review/recommend/decline authority
- ✅ Can also send a draft/registration data problem down to Credit Support
  (`PROCESS` → Reevaluate Draft Application), same as `CREDIT_ASSESSMENT` — granted for
  PROCESS-parity rather than a distinct committee-specific reason
- ✅ Loads the Credit Support officer list for the send-back form (`STAFF` → View Officer Workload)
- ✅ Views the loans they approved after payout in the Disbursed tab (`GET /application/list/credit?status=DEPOSIT_COMPLETED_S4,REPAYMENT_COMPLETED_S5,REPAYMENT_TERMINATED_S5`, same `View All Credit Decision Applications` permission as the other tabs), scoped to their own assignments. These statuses are filter-only: `/list/credit` without `status` leaves them out
- ❌ Cannot make direct modifications to PROCESS document uploads (photo/NID/payslip/employment agreement) — that's `CREDIT_ASSESSMENT`-only

**Auto-Assignment Behavior:**

- **On application submission:** Auto-assigns to CREDIT_ASSESSMENT with fewest active reviews
- **On recommendation:** Auto-assigns to CREDIT_COMMITTEE for final decision
- **Entry point only:** Assignments occur at status entry points (REQUEST_NEW_S2, REQUEST_RECOMMENDED_S2); reassignments handled separately by supervisors

### Stage 3 — Offer & Deposit (Disbursement Processing)

**Department:** Accounting (AP)  
**Primary Module:** DISBURSEMENT (offer acceptance, deposit receipt)

**`ACCOUNTANT_AP`**

- ✅ Receives notification when customer accepts loan offer (OFFER_ACCEPTED_S3)
- ✅ Uploads deposit receipt to confirm funds received
- ✅ Cannot access credit or repayment modules

**`ACCOUNTANT_SUPERVISOR`** (extends `BASE_STAFF` directly — spans both AP and AR, see [Role Hierarchy](#role-hierarchy))

- ✅ Everything `ACCOUNTANT_AP` and `ACCOUNTANT_AR` can do, plus:
- ✅ Reassigns disbursement/repayment tasks
- ✅ Views disbursement performance dashboard

**Auto-Assignment Behavior:**

- **On offer acceptance:** Auto-assigns to ACCOUNTANT_AP with fewest active disbursements

### Stage 4 — Active Loan Management

Once a loan transitions to **ACTIVE** status after deposit completion, it enters the active loan lifecycle. Day-to-day management involves minor updates (contact info, phone changes) and risk assessment.

- **ADMIN** and **OPERATION_SUPERVISOR** can perform account management tasks
- Other roles have read-only or limited access depending on modules

### Stage 5 — Repayment & Collection

**Department:** Accounting (AR) & Collections  
**Primary Modules:** REPAYMENT (repayment tracking), COLLECTION (overdue recovery)

**`ACCOUNTANT_AR`**

- ✅ Reviews pending repayments
- ✅ Marks repayments as completed (with receipt upload)
- ✅ Cannot directly mark accounts as failed; requires COLLECTION_SUPERVISOR
- ✅ Records the refund of an overpaid installment (`POST /admin/repayment/:id/refund`, `Record Repayment Refund`), once per installment, on any AR's row

**`ACCOUNTANT_SUPERVISOR`**

- ✅ Completes or fails repayments after ACCOUNTANT_AR review
- ✅ Reassigns repayments between accountants
- ✅ Records refunds of overpaid installments (same `Record Repayment Refund` permission as AR)
- ✅ Views repayment KPI dashboard

**`COLLECTION_OFFICER`**

- ✅ Tracks overdue accounts
- ✅ Creates communication logs for collection efforts
- ✅ Views their promise-to-pay (PTP) follow-up queue — `GET /list/promise-to-pay`
- ✅ Views, adds, updates, and deletes customer contacts (LOAN_MANAGEMENT contact actions)
- ✅ Limited dashboard access

**`COLLECTION_SUPERVISOR`** (inherits `COLLECTION_OFFICER` — see [Role Hierarchy](#role-hierarchy))

- ✅ Everything `COLLECTION_OFFICER` can do, plus:
- ✅ Assigns collection officers to overdue accounts
- ✅ Views collection performance and aging reports

**Auto-Assignment Behavior:**

- **On repayment due:** Auto-assigns to ACCOUNTANT_AR with fewest pending reviews
- **On overdue:** No longer auto-assigned one-at-a-time via the generic per-role mechanism.
  Collection officer assignment instead has **two** distinct mechanisms, both sharing the same
  bucketing/balancing engine (`collection-balancing.algorithm.ts`) but triggered differently:

  **Collection Reassignment (daily, full-portfolio rebalance)** —
  `src/modules/repayment/admin-collection/collection-reassign.service.ts`:
  - **Trigger:** daily cron (2am — gated behind `ENABLE_COLLECTION_REASSIGN_CRON`, on by default),
    or on demand via `GET /admin/repayment/reassign/preview` (dry run, no writes) and the actual
    persisting run triggered through the `cron-job-settings` admin module.
    - **Preview response:** `plan[]` is the computed rows —
      `{ applicationId, collectionId, currentCollectionId, changeType }`, not persisted.
      `currentCollectionId` is the officer on the app's most-overdue installment today (`null` if
      none); `changeType` is one of `ALREADY_CORRECT` (uniform owner already equals the target),
      `RECLAIMED_FROM_NON_DEFAULT` (owner outside the default pool — a regular officer or a former
      default collector), `MOVED_BETWEEN_DEFAULTS` (owner is another pool officer), `NEWLY_ASSIGNED`
      (no owner). `summary` — `totalAppsProcessed`/`byBucket` describe the whole scanned book (all
      **seven** tiers, `BEFORE_DUE` → `L365_PLUS`); `defaultAppsRouted`, `unassignedAppCount`,
      `defaultSliceAppCount` and `byAgent[]` describe only the 91+ dpd default slice.
      `alreadyCorrect` + `reclaimedFromNonDefault` + `movedBetweenDefaults` + `newlyAssigned` sum to
      `defaultAppsRouted`; `changedAppCount` (the last three) is what the persisting run actually
      writes. **An `ALREADY_CORRECT` app is not rewritten and its `lastActivityAt` is not touched.**
      `defaultCollectorPoolSize` is the size of the `isDefaultCollector` pool (`0` ⇒ nothing can be
      routed, so `unassignedAppCount === defaultSliceAppCount` and `byAgent` is `[]`). Each
      `byAgent[]` row carries `agentName` + `profileUrl` — resolved for the preview only, so the FE
      needs no second call to `GET /admin/repayment/collection-priority`. `computedAt`/
      `referenceDate` are when the plan was computed and the day anchor its days-overdue maths
      used — both **Phnom Penh local time (UTC+7)**; `computedAt`'s trailing `Z` is nominal, same
      as every other timestamp this API serialises, so clients must not re-shift it. The persisting
      run returns the same `summary` but no `computedAt`/`referenceDate`/`agentName`/`profileUrl`.
  - **Scope:** scans every active unpaid repayment to bucket the whole book, but only **routes
    the default slice** — applications with any installment 91+ days overdue. Non-default loans
    are left with their current officer; the job never moves a healthy loan.
  - **Bucketing:** every active unpaid repayment is rolled up per application, bucketed by its
    most-overdue repayment's tier (`COLLECTION_BUCKET_TIERS`/`COLLECTION_BUCKET_RANGES` —
    `BEFORE_DUE`, `ON_DUE`, `L1_30`, `L31_60`, `L61_90`, `L91_365`, `L365_PLUS`).
  - **Default (severely overdue) routing:** applications with any repayment 91+ days overdue
    (`L91_365 ∪ L365_PLUS`) are routed to the `isDefaultCollector` staff pool — a boolean flag on
    `Staff`, toggleable via `POST /admin/repayment/default-agent`, any number of staff may be
    flagged (not a single dedicated agent).
  - **Balancing goal:** every officer in the `isDefaultCollector` pool ends up with an **equal
    number of applications (±1)**. Ties are broken by `collectionPriority` rank, then `userId` —
    the same chain `selectCollectorForApp` uses for the event-driven non-default path. Each
    officer's total dollar exposure (remaining principal + interest) is **reported** in the run
    summary for visibility but is **never balanced** — it does not influence assignment.

  **Collection Auto-Assignment (event-driven, new loans)** —
  `src/modules/repayment/admin-collection/collection-auto-assign.service.ts`:
  - **Trigger:** fires once per loan, the moment its repayment schedule first gets real due
    dates — either inside `generateAndSaveRepaymentSchedule` (Wing disbursement, due dates known
    at creation) or in `AdminDisbursementService#submitDepositReceipt` right after
    `fillRepaymentDueDates` (manual deposit-receipt path, due dates were `null` at offer
    acceptance). No cron involved — always on, same as every other role's event-driven assignment.
  - **Scope:** only ever assigns that **one** brand-new, never-before-assigned loan
    (`collectionId IS NULL` guard makes repeat calls idempotent).
  - **Selection:** picks the least-loaded collector in the relevant pool (regular, or
    `isDefaultCollector` if already 91+ days overdue — practically never true for a new loan)
    against each candidate's **current live load** (distinct application count only), ties broken
    by `collectionPriority` rank then `userId`, so day-to-day assignments keep the whole
    portfolio balanced over time.

  **Default-Pool Exit Reassignment (event-driven, per-loan)** —
  `CollectionAutoAssignService#reassignIfExitedDefault`, hooked into both repayment-completion
  call sites (`AdminRepaymentService#completeRepayment` and the ABA/Wing auto-payment webhook
  path via `repayment.auto-complete.ts`):
  - **Trigger:** a repayment completes **fully** (not partially), and the application's current
    officer is in the `isDefaultCollector` pool.
  - **Scope:** touches only that **one** application. No-ops (leaves the app with its current
    officer) when: the loan has no active repayments left (fully closed), the current officer
    isn't actually in the default pool, the app still has another 91+ day overdue repayment, or
    the regular pool has nobody eligible.
  - **Selection:** always runs the least-loaded balancer fresh against the regular pool —
    deliberately does **not** reuse the "inherit officer from customer's other active loan" logic,
    since the customer's other loan(s) could themselves currently be in the default pool.
  - **Relationship to the daily batch job:** the daily full-portfolio rebalance
    (`collection-reassign.service.ts`) would eventually move a recovered loan back to the regular
    pool on its own — this makes that same outcome immediate instead of waiting up to a day.

  **Scope (all three):** additive — the existing manual
  `POST /admin/repayment/assign/collection-officer` (one batch of repayment IDs to one officer,
  supervisor-picked) is untouched and still available for ad-hoc reassignment outside these
  mechanisms.

---

## Entry Points & Auto-Assignment

Certain roles are **auto-assigned only at entry points**, never persisted across status transitions:

> `OVERDUE` is **not** a real `Repayment.status` value — only `PENDING`, `IN_REVIEW`, `SUCCESS`,
> `PARTIAL_PAID` and `FAILED` are ever written. "Overdue" is derived from `dueDate`, not status.
> The collection set below is `COLLECTION_ACTIVE_STATUSES` in `auto-assignment.service.ts`.

| Role                           | Entry Status           | Entry Point Event     | Workload Counted From                                                       | Auto-Assignment Excludes            |
| ------------------------------ | ---------------------- | --------------------- | --------------------------------------------------------------------------- | ----------------------------------- |
| CREDIT_SUPPORT_OFFICER (lead)  | LEAD_PENDING           | New lead created      | `lead` table (PENDING, FOLLOW_UP)                                           | Past FOLLOW_UP leads                |
| CREDIT_SUPPORT_OFFICER (draft) | DRAFT_NEW_S1           | New application draft | `application` table (DRAFT_NEW_S1, DRAFT_REVIEWING_S1, DRAFT_REEVALUATE_S1) | DRAFT_FAILED statuses               |
| CREDIT_ASSESSMENT              | REQUEST_NEW_S2         | Draft submitted       | `application` table (REQUEST\_\*\_S2)                                       | DEPOSIT, REPAYMENT, ACTIVE statuses |
| CREDIT_COMMITTEE               | REQUEST_RECOMMENDED_S2 | Credit recommends     | `application` table (REQUEST_RECOMMENDED_S2)                                | Already approved/rejected           |
| ACCOUNTANT_AP                  | OFFER_ACCEPTED_S3      | Offer accepted        | `application` table (`OFFER_*`, `DEPOSIT_*`)                                | Completed disbursements             |
| ACCOUNTANT_AR                  | REPAYMENT (any)        | Repayment due         | `repayment` table (IN_REVIEW)                                               | Completed repayments                |
| COLLECTION_OFFICER             | REPAYMENT (any)        | New loan / rebalance  | `repayment` table (PENDING, IN_REVIEW, FAILED)                              | SUCCESS / PARTIAL_PAID repayments   |

---

## Row-Level Access Control

Beyond role-based grants, **staff can typically only see and manage work assigned to them**. This is enforced at the service layer:

| Role                   | Can See Only           | Exception                         |
| ---------------------- | ---------------------- | --------------------------------- |
| CREDIT_SUPPORT_OFFICER | Assigned leads/drafts  | Supervisors can see all           |
| CREDIT_ASSESSMENT      | Assigned applications  | CREDIT_SUPERVISOR can see all     |
| ACCOUNTANT_AP          | Assigned disbursements | ACCOUNTANT_SUPERVISOR can see all |
| ACCOUNTANT_AR          | Assigned repayments    | ACCOUNTANT_SUPERVISOR can see all |
| COLLECTION_OFFICER     | Assigned collections   | COLLECTION_SUPERVISOR can see all |
| ADMIN                  | Everything             | Full access                       |
| OPERATION_SUPERVISOR   | Everything             | Cross-department access           |

### Status access gate (`ENABLE_STATUS_ACCESS_GATE`)

`canAccessApplication(role, status)` (`STATUS_ALLOWED_ROLES` in `application.status.ts`) decides which
role may **open** an application's detail (`GET /admin/application/:id`) and loan contract
(`GET /admin/application/:id/loan/contract`) at each status. It is the only per-application read
restriction; the route permissions are held by every staff role.

| `ENABLE_STATUS_ACCESS_GATE` | Behavior                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `true` (default)            | Role × status map enforced; a denied role gets 403.                                  |
| `false`                     | The check is skipped: any staff can open any application's detail and loan contract. |

The loan contract adds one carve-out on top of the map: `canAccessLoanContract(role, status)`. Credit
Support (`CREDIT_SUPPORT_OFFICER`, `CREDIT_SUPPORT_SUPERVISOR`) may open the **detail** of
`OFFER_CANCELED_S3` and `REPAYMENT_COMPLETED_S5` applications, which they need for the re-engagement list,
but gets 403 on their **loan contract**. The carve-out is part of the gate, so with the flag `false` the
contract stays open to every staff role.

`CREDIT_COMMITTEE`, `CREDIT_SUPERVISOR` and `CREDIT_ASSESSMENT` may open the detail **and** loan contract of
`DEPOSIT_COMPLETED_S4`, `REPAYMENT_COMPLETED_S5` and `REPAYMENT_TERMINATED_S5` applications, so a row in
the Credit Decision or Process Disbursed tab can be opened. Read-only: no action rule lets them act at those statuses.

Writes are unaffected either way — action rules and `draftStageEditGuard` still guard every mutation.

---

## Troubleshooting Access Issues

### 403 Forbidden responses

The exact `message` text is now context-specific (e.g. `Role CREDIT_ASSESSMENT cannot access application 123 at status DRAFT_NEW_S1`) rather than a single generic string, and the response body includes a `details` object with the role/status/id values behind the denial — see [api-response-contracts.md](api-response-contracts.md#error-classes). Use those fields directly instead of matching on message text.

1. **Check role assignment:** Verify staff member has the correct role assigned via [`GET /api/v1/admin/role/list`](#list-all-roles) or staff management endpoints
2. **Check module permissions:** Use the [Permission Management Module](../src/modules/permission/README.md) to inspect what modules/actions the role can perform
3. **Check row-level assignment:** For lead/draft/application, verify the item is assigned to the user's ID (e.g., `salesId`, `creditId`)
4. **Verify role exists in database:** If you get a "Role not found" error, ensure the role was created via [`POST /api/v1/admin/role/create`](#create-a-new-role)

### JWT Token Shows Old Role Name or Role Not Found

This can occur after a version upgrade or when staff roles are manually modified in the database without updating corresponding JWT tokens.

**Solution:**

1. Log out completely and log in again to refresh the JWT token
2. If the issue persists, verify the staff member's `roleId` references a valid `Role` record in the database
3. Ensure the Role Management Module is deployed and accessible

### "Cannot delete role: N active staff member(s) assigned to this role"

You attempted to delete a role while staff members with that role are still active in the system.

**Solution:**

1. Reassign those staff members to a different role (via staff management endpoints)
2. Or mark them as inactive (set `user.status` to something other than 'active')
3. Then retry the delete operation

### "Auto-assignment failed: No active [ROLE] available"

No staff members with the target role are currently logged in or available. The system will attempt a fallback assignment to the requesting user.

**Solution:**

1. Ensure sufficient staff with the required role are actively using the system
2. Check staff activity logs to verify they are logged in and have current sessions
