# Marketing Backend

> Express 5 + TypeScript + Prisma 7 (PostgreSQL) REST API powering the marketing reward platform for the customer mobile app and the admin dashboard.

## Project Overview

The marketing backend drives a loyalty and reward system for a consumer-facing mobile app. It exposes three API namespaces:

| Namespace    | Consumers                           | Auth required         |
| ------------ | ----------------------------------- | --------------------- |
| `/admin`     | Internal staff (web dashboard)      | JWT — admin token     |
| `/customer`  | Registered customers (mobile app)   | JWT — customer token  |
| `/los`       | LOS backend (server-to-server)      | `X-Client-Id` + `X-Client-Secret` headers |

Public (unauthenticated) routes are limited to auth (`/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`) and file serving (`/files/:id`).

**Tech stack:** Node.js · Express 5 · TypeScript 7 · Prisma ORM 7 · PostgreSQL (Neon DB in prod) · Passport.js (JWT) · Zod 4 · `nanoid`

---

## API Namespaces

All routes are prefixed `/api/v1`.

```
/api/v1
├── /auth                                   — public: register, login, refresh, logout
├── /customer                               — JWT (CUSTOMER role required)
│   ├── /campaigns                          — browse active campaigns & missions
│   ├── /tiers                              — browse tier config
│   ├── /reward
│   │   ├── /points                         — balance + tier progress
│   │   ├── /points/history                 — signed point ledger
│   │   ├── /check-in                       — daily check-in (GET status / POST claim)
│   │   ├── /missions                       — enrolled missions per campaign
│   │   ├── /missions/:id/claim             — claim completed mission reward
│   │   ├── /store                          — available reward items
│   │   ├── /store/:id/redeem               — redeem a reward (idempotency-key supported)
│   │   └── /my-rewards                     — redemption history
│   └── /referral
│       ├── /my-code                        — get own referral code
│       └── /apply                          — apply a referral code (one-time)
├── /admin                                  — JWT (ADMIN role required)
│   ├── /campaigns                          — CRUD campaigns
│   ├── /campaigns/:id/missions             — CRUD missions within a campaign
│   ├── /missions                           — standalone mission management
│   ├── /reward/store                       — CRUD reward store items
│   ├── /analytics                          — platform-wide stats
│   ├── /user-management                    — CRUD staff users & roles
│   ├── /upload                             — file/image upload (returns URL)
│   └── /tiers                              — CRUD tier config
└── /los                                    — LOS backend integration (X-Client-Id / X-Client-Secret)
    └── /missions                           — trigger mission progress updates
```

Also available at root (not under `/api/v1`):
```
GET /files/:id    — serve DB-stored files (images uploaded via STORAGE_DRIVER=db)
GET /health       — healthcheck used by Railway
```

---

## Project Structure

```
backend/
├── package.json
├── tsconfig.json
├── nodemon.json
├── prisma.config.ts            — Prisma v7 config (PrismaPg adapter, seed command)
├── Dockerfile                  — multi-stage build for Railway deployment
├── railway.toml                — tells Railway to use the Dockerfile
├── prisma/
│   ├── schema.prisma           — data models and enums (no url in datasource block)
│   ├── migrations/             — generated migration SQL
│   └── seed.ts                 — seeds admin user, permissions, tiers, LOS machine client
└── src/
    ├── index.ts                — entry point: DB connect → app.listen
    ├── app.ts                  — Express setup: CORS, JSON, routes, /files/:id, 404, errorHandler
    ├── config/
    │   ├── env.ts              — Zod-validated env; process.exit on failure
    │   └── passport.ts         — JWT strategy registration
    ├── lib/
    │   └── prisma.ts           — PrismaClient singleton (PrismaPg adapter)
    ├── routes/
    │   └── v1.ts               — wires auth/customer/admin/los sub-routers
    ├── modules/
    │   ├── auth/               — register, login, refresh, logout (repository · mapper · service · controller · routes)
    │   ├── campaign/           — campaign CRUD (admin) + browse (customer)
    │   ├── mission/            — mission CRUD (admin) + LOS trigger endpoint (mission.los.routes.ts)
    │   ├── reward/             — points, check-in, redemption, referral (reward.*); reward store admin (reward-store.*); referral.routes.ts
    │   ├── analytics/          — admin stats
    │   ├── user-management/    — staff user & role management (admin)
    │   ├── upload/             — file upload route (admin), delegates to storage driver
    │   └── tier/               — tier config CRUD (admin) + browse (customer)
    └── shared/
        ├── errors/
        │   └── AppError.ts             — domain error class (message + statusCode)
        ├── middleware/
        │   ├── auth.middleware.ts              — authenticate, requireRole()
        │   ├── validate.middleware.ts          — Zod body/query/params validation
        │   ├── permission.middleware.ts        — requirePermission() — checks StaffRole permissions
        │   ├── external-server.middleware.ts   — requireExternalServerClient() — X-Client-Id/Secret for LOS routes
        │   └── error.middleware.ts             — global Express error handler (AppError + P2002)
        ├── storage/
        │   ├── index.ts                — storage factory (reads STORAGE_DRIVER env)
        │   ├── local.storage.ts        — saves files to public/uploads/
        │   ├── cloudinary.storage.ts   — uploads to Cloudinary
        │   └── db.storage.ts           — stores binary in StoredFile table, served at /files/:id
        ├── schemas/            — shared Zod schemas (pagination, etc.)
        ├── types/              — shared TypeScript types
        └── utils/
            └── response.ts     — success() helper
```

---

## Module Structure

Each module is a flat folder of seven files following the DI + Repository + Mapper pattern:

```
src/modules/<name>/
├── <name>.routes.ts       — composition root: new Repo(prisma) → new Service(repo) → new Controller(service)
├── <name>.controller.ts   — class: constructor(service); arrow-method HTTP handlers → success()
├── <name>.service.ts      — class: constructor(repo); business logic → calls mapper → returns DTOs
├── <name>.repository.ts   — class: constructor(prisma); raw DB queries → returns Prisma entities
├── <name>.mapper.ts       — pure functions: entity → response DTO
├── <name>.schema.ts       — Zod schemas + exported z.infer<> input types
└── index.ts               — re-exports routers (and anything else public)
```

### Data flow

```
Request ──DTO──▶ validate (Zod) ──▶ Controller ──▶ Service ──▶ Repository ──entity──▶ DB
Client  ◀──DTO──  controller   ◀──   service   ◀── mapper  ◀──entity──   repository
```

### Dependency injection

Each routes file is the **composition root** — the only place where `prisma` is imported and classes are instantiated:

```typescript
// campaign.routes.ts
const repo       = new CampaignRepository(prisma);
const service    = new CampaignService(repo);
const controller = new CampaignController(service);

export const adminCampaignRouter: IRouter = Router();
adminCampaignRouter.get('/', controller.list);
```

Controller methods are defined as arrow functions so `this` is always bound — no `.bind()` needed when passing to Express.

See [`backend_project_guidelines.md`](backend_project_guidelines.md) for full conventions.

---

## Data Model

### Enums

| Enum               | Values                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `Role`             | `CUSTOMER`, `ADMIN`                                                                                           |
| `MissionType`      | `REFERRAL`, `APPLICATION_SUBMISSION`, `LOAN_APPROVAL`, `REPAYMENT`, `COMPLETE_FORM1`–`COMPLETE_FORM4`        |
| `MissionStatus`    | `IN_PROGRESS`, `CLAIMABLE`, `CLAIMED`                                                                         |
| `PointsSource`     | `MISSION`, `CHECK_IN`, `REDEEM`, `REFERRAL`, `EXPIRE`                                                         |
| `RedemptionStatus` | `PENDING_PICKUP`, `COLLECTED`, `EXPIRED`                                                                      |

### Models

| Model                 | Purpose                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `User`                | Root identity record for both customers and admins. Links to exactly one profile.                 |
| `CustomerProfile`     | Holds points, tier string, check-in streak, referral code, and self-referral relation.            |
| `StaffProfile`        | Email + bcrypt password for admin users. Linked to an optional `StaffRole`.                       |
| `RefreshToken`        | Hashed refresh tokens with expiry and revocation support.                                         |
| `StaffRole`           | Named role (e.g. "Editor") with a set of permissions. Assigned to `StaffProfile`.                 |
| `Permission`          | Immutable catalogue of `(module, action)` pairs seeded at startup.                                |
| `StaffRolePermission` | Join table linking `StaffRole` to `Permission`.                                                   |
| `Campaign`            | A named marketing campaign that groups missions.                                                  |
| `Mission`             | A task inside a campaign (typed by `MissionType`) worth a point reward.                           |
| `CustomerMission`     | Join table: one row per customer per mission, tracks `MissionStatus`. Unique on `(customerId, missionId)`. |
| `CheckIn`             | One row per customer per calendar day (Asia/Phnom_Penh). Unique on `(customerId, checkInDate)`. Prevents duplicate check-ins. |
| `PointsHistory`       | Signed ledger: positive = earned, negative = spent.                                               |
| `RewardItem`          | A catalogue item in the reward store (title, points cost, stock, image).                          |
| `Redemption`          | Records a customer redeeming a `RewardItem`. Supports idempotency via `idempotencyKey`.           |
| `TierConfig`          | Dynamic tier thresholds (name, minPoints, iconUrl). Seeded with 5 tiers; editable via admin UI.  |
| `MachineClient`       | Service account for server-to-server auth (LOS backend). Stores bcrypt-hashed `clientSecret`.    |
| `StoredFile`          | Binary file storage in the DB (Bytes column). Served via `GET /files/:id`. Used when `STORAGE_DRIVER=db`. |

---

## Key Subsystems

### Authentication

- Passport.js with a single JWT strategy; no Local strategy, no session, no Redis.
- Access token (`JWT_EXPIRES_IN`, default `1h`) + refresh token (`JWT_REFRESH_EXPIRES_IN`, default `7d`), both HS256.
- `authenticate` middleware = `passport.authenticate('jwt', { session: false })`.
- `requireRole(...roles)` middleware factory checks `req.user.role`.
- Server-to-server (LOS) uses `X-Client-Id` to look up a `MachineClient` row, then `bcrypt.compare` on `X-Client-Secret` against the stored hash.

### Points & Tier System

Tiers are configured in the `TierConfig` table (editable) and resolved at runtime by comparing cumulative points:

| Tier     | Default minimum points |
| -------- | ---------------------- |
| BRONZE   | 0                      |
| SILVER   | 200                    |
| GOLD     | 500                    |
| PLATINUM | 1 000                  |
| DIAMOND  | 2 000                  |

The `GET /customer/reward/points` response includes `tier`, `nextTierName`, `pointsToNextTier`, and a `progress` ratio (0–1).

### Daily Check-in

- 7-day streak cycle. Points per day: `[20, 20, 20, 20, 20, 20, 60]` (Day 7 bonus).
- Day boundary uses **Asia/Phnom_Penh** timezone; no midnight cron job needed — streak is resolved on every request by comparing `lastCheckInDate` to today.
- A unique DB constraint on `(customerId, checkInDate)` prevents double check-ins even under concurrent requests (race conditions are caught as `P2002` → 409).
- After completing a full 7-day cycle, the streak resets to Day 1.

### Pluggable Image Storage

Images are uploaded via `POST /api/v1/admin/upload`. The storage driver is selected by `STORAGE_DRIVER`:

| Driver       | Behaviour                                                                 | Used in |
| ------------ | ------------------------------------------------------------------------- | ------- |
| `db`         | Stores binary in `StoredFile` table; returns `APP_URL/files/<id>`        | Production (Neon) |
| `cloudinary` | Uploads to Cloudinary; returns CDN URL                                    | Local dev |
| `local`      | Saves to `public/uploads/`; returns `APP_URL/uploads/<filename>`         | Testing only |

### Reward Store & Redemption

- `GET /customer/reward/store` returns only active items with stock > 0. Internal fields (`stock`, `isActive`) are not exposed to the customer.
- `POST /customer/reward/store/:id/redeem` runs in a transaction: decrement stock → deduct points → create `Redemption` → write `PointsHistory`.
- Clients should send an `Idempotency-Key` header; a duplicate key on an already-processed request is a silent no-op (returns `204`).

### Referral

- Each customer gets a unique 6-character uppercase referral code (generated with `nanoid`) on registration.
- `POST /customer/referral/apply` links the caller to the referrer via `referredById`. Applying your own code or re-applying after already being referred is rejected.

### Error Handling

- `AppError` (in `src/shared/errors/AppError.ts`) carries `message` + `statusCode`. Throw it from any service to send a structured error response.
- The global `errorHandler` middleware:
  - `AppError` → responds with `statusCode` + `{ status: 'error', error: message }`
  - Prisma `P2002` (unique constraint) → 409 `{ status: 'error', error: 'Resource already exists or duplicate request.' }`
  - Everything else → 500 (logged to console)

---

## Environment Variables

| Variable                 | Required | Default       | Description                                      |
| ------------------------ | :------: | ------------- | ------------------------------------------------ |
| `DATABASE_URL`           |   Yes    | —             | PostgreSQL connection string (Neon in prod)      |
| `PORT`                   |    No    | `3000`        | HTTP port                                        |
| `NODE_ENV`               |    No    | `development` | `development` \| `production` \| `test`          |
| `APP_URL`                |    No    | `http://localhost:3000` | Base URL — used to build file URLs (`/files/:id`) |
| `JWT_SECRET`             |   Yes    | —             | Access token secret (min 32 chars)               |
| `JWT_EXPIRES_IN`         |    No    | `1h`          | Access token lifetime                            |
| `JWT_REFRESH_SECRET`     |   Yes    | —             | Refresh token secret (min 32 chars)              |
| `JWT_REFRESH_EXPIRES_IN` |    No    | `7d`          | Refresh token lifetime                           |
| `BCRYPT_SALT_ROUNDS`     |    No    | `12`          | bcrypt work factor                               |
| `STORAGE_DRIVER`         |    No    | `db`          | `db` \| `cloudinary` \| `local`                  |
| `CLOUDINARY_CLOUD_NAME`  |    No    | —             | Required only when `STORAGE_DRIVER=cloudinary`   |
| `CLOUDINARY_API_KEY`     |    No    | —             | Required only when `STORAGE_DRIVER=cloudinary`   |
| `CLOUDINARY_API_SECRET`  |    No    | —             | Required only when `STORAGE_DRIVER=cloudinary`   |
| `LOS_JWKS_URI`           |    No    | prod LOS URL  | JWKS endpoint for verifying customer JWTs        |
| `LOS_ISSUER`             |    No    | `los-backend` | Expected JWT issuer                              |
| `LOS_CUSTOMER_AUDIENCE`  |    No    | `luyleun`     | Expected JWT audience                            |
| `LOS_CLIENT_ID`          |    No    | `los-backend` | Machine client ID for server-to-server auth      |
| `LOS_CLIENT_SECRET`      |    No    | dev default   | Machine client secret (bcrypt-hashed in DB)      |
| `ADMIN_EMAIL`            |    No    | dev default   | Seed-only — admin email written to DB by `seed.ts`; not read at runtime |
| `ADMIN_PASSWORD`         |    No    | dev default   | Seed-only — admin password hashed and written to DB by `seed.ts`; not read at runtime |

---

## Available Commands

Run from `backend/`:

```bash
pnpm dev                # nodemon + tsx (loads .env.dev automatically)
pnpm build              # tsc + tsc-alias → dist/
pnpm start              # node dist/index.js
pnpm type-check         # tsc --noEmit  ← run this to verify changes

pnpm db:generate        # prisma generate
pnpm db:migrate         # prisma migrate dev (uses DATABASE_URL from env)
pnpm db:push            # prisma db push (schema prototyping)
pnpm db:seed            # prisma db seed (uses active DATABASE_URL)
pnpm db:seed:local      # seed local dev DB (loads .env.dev)
pnpm db:seed:prod       # seed Neon production DB (loads .env)
pnpm db:migrate:prod    # migrate Neon production DB (loads .env)
pnpm db:studio          # prisma studio
```

---

## Deployment

The backend is deployed to **Railway** as a Docker container. See:

| Document | Description |
| -------- | ----------- |
| [`infrastructure/deployment/docker.md`](../../infrastructure/deployment/docker.md) | Dockerfile breakdown, railway.toml, startup sequence |
| [`infrastructure/database/neon_setup.md`](../../infrastructure/database/neon_setup.md) | Neon DB project, connection strings, all Railway env vars |
| [`infrastructure/environment/multiple_env.md`](../../infrastructure/environment/multiple_env.md) | Local dev vs production workflow, branching strategy |

---

## Further Reading

| Document | Description |
| -------- | ----------- |
| [`backend_project_guidelines.md`](backend_project_guidelines.md) | Coding conventions, module authoring checklist, response shapes, error patterns |
| [`features/reward/api-handoff.md`](features/reward/api-handoff.md) | Reward & check-in endpoint reference for mobile team |
| [`features/auth/auth-sequence.md`](features/auth/auth-sequence.md) | Auth flow sequence diagrams |
| [`features/rbac/rbac.md`](features/rbac/rbac.md) | RBAC design and permission catalogue |
