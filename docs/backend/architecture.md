# Marketing Backend

> Express 5 + TypeScript + Prisma 7 (PostgreSQL) REST API powering the marketing reward platform for the customer mobile app and the admin dashboard.

## Project Overview

The marketing backend drives a loyalty and reward system for a consumer-facing mobile app. It exposes two API namespaces:

| Namespace    | Consumers                           | Auth required         |
| ------------ | ----------------------------------- | --------------------- |
| `/admin`     | Internal staff (web dashboard)      | JWT — admin token     |
| `/customer`  | Registered customers (mobile app)   | JWT — customer token  |

Public (unauthenticated) routes are limited to auth (`/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`).

**Tech stack:** Node.js · Express 5 · TypeScript 7 · Prisma ORM 7 · PostgreSQL · Passport.js (JWT) · Zod 4 · `nanoid`

---

## API Namespaces

All routes are prefixed `/api/v1`.

```
/api/v1
├── /auth                            — public: register, login, refresh, logout
├── /customer                        — JWT (CUSTOMER role required)
│   ├── /campaigns                   — browse active campaigns & missions
│   ├── /reward
│   │   ├── /points                  — balance + tier progress
│   │   ├── /points/history          — signed point ledger
│   │   ├── /check-in                — daily check-in (GET status / POST claim)
│   │   ├── /missions                — enrolled missions per campaign
│   │   ├── /missions/:id/claim      — claim completed mission reward
│   │   ├── /store                   — available reward items
│   │   ├── /store/:id/redeem        — redeem a reward (idempotency-key supported)
│   │   └── /my-rewards              — redemption history
│   └── /referral
│       ├── /my-code                 — get own referral code
│       └── /apply                   — apply a referral code (one-time)
└── /admin                           — JWT (ADMIN role required)
    ├── /campaigns                   — CRUD campaigns
    ├── /campaigns/:id/missions      — CRUD missions within a campaign
    └── /analytics                   — platform-wide stats
```

---

## Project Structure

```
backend/
├── package.json
├── tsconfig.json
├── nodemon.json
├── prisma.config.ts            — Prisma v7 config (PrismaPg adapter, seed command)
├── prisma/
│   ├── schema.prisma           — data models and enums (no url in datasource block)
│   ├── migrations/             — generated migration SQL
│   └── seed.ts                 — seed admin user
└── src/
    ├── index.ts                — entry point: DB connect → app.listen
    ├── app.ts                  — Express setup: CORS, JSON, routes, 404, errorHandler
    ├── config/
    │   ├── env.ts              — Zod-validated env; process.exit on failure
    │   └── passport.ts         — JWT strategy registration
    ├── lib/
    │   └── prisma.ts           — PrismaClient singleton (PrismaPg adapter)
    ├── routes/
    │   └── v1.ts               — wires auth/customer/admin sub-routers
    ├── modules/
    │   ├── auth/               — register, login, refresh (repository · mapper · service · controller · routes)
    │   ├── campaign/           — campaign CRUD (admin) + browse (customer)
    │   ├── mission/            — mission CRUD (admin) + customer missions (via reward router)
    │   ├── reward/             — points, check-in, store, redemption, referral
    │   └── analytics/          — admin stats
    ├── shared/
    │   ├── errors/
    │   │   └── AppError.ts     — domain error class (message + statusCode)
    │   ├── middleware/
    │   │   ├── auth.middleware.ts      — authenticate, requireRole()
    │   │   ├── validate.middleware.ts  — Zod body/query/params validation
    │   │   └── error.middleware.ts     — global Express error handler
    │   ├── schemas/            — shared Zod schemas (pagination, etc.)
    │   ├── types/              — shared TypeScript types
    │   └── utils/
    │       └── response.ts     — success() helper
    └── jobs/
        └── cleanup.job.ts      — optional background jobs
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
const repo       = new CampaignRepository(prisma);   // DB dependency injected
const service    = new CampaignService(repo);         // repo injected
const controller = new CampaignController(service);   // service injected

export const adminCampaignRouter: IRouter = Router();
adminCampaignRouter.get('/', controller.list);
// ...
```

Controller methods are defined as arrow functions so `this` is always bound — no `.bind()` needed when passing to Express.

### Cross-module dependency

When a controller needs two services (e.g. `RewardController` delegates `/reward/missions` to `MissionService`), both are injected via the constructor and both are wired in the same composition root:

```typescript
// reward.routes.ts
const rewardService  = new RewardService(new RewardRepository(prisma));
const missionService = new MissionService(new MissionRepository(prisma));
export const rewardController = new RewardController(rewardService, missionService);
```

Modules that serve both audiences export separate routers from the same composition root (e.g. `adminCampaignRouter` and `customerCampaignRouter` from `campaign/routes.ts`).

See [`backend_project_guidelines.md`](backend_project_guidelines.md) for full conventions.

---

## Data Model

### Enums

| Enum               | Values                                                    |
| ------------------ | --------------------------------------------------------- |
| `Role`             | `CUSTOMER`, `ADMIN`                                       |
| `Tier`             | `BRONZE`, `SILVER`, `GOLD`, `PLATINUM`, `DIAMOND`         |
| `CampaignStatus`   | `DRAFT`, `ACTIVE`, `INACTIVE`                             |
| `MissionType`      | `REFERRAL`, `FIRST_LOAN_APPLICATION`, `FIRST_LOAN_APPROVAL`, `FIRST_REPAYMENT` |
| `MissionStatus`    | `IN_PROGRESS`, `CLAIMABLE`, `CLAIMED`                     |
| `PointsSource`     | `MISSION`, `CHECK_IN`, `REDEEM`, `REFERRAL`, `EXPIRE`     |
| `RedemptionStatus` | `PENDING_PICKUP`, `COLLECTED`, `EXPIRED`                  |

### Models

| Model             | Purpose                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `User`            | Customers and admins. Holds points, tier, check-in streak, referral code, self-referral relation. |
| `Campaign`        | A named marketing campaign with start/end dates and a status.        |
| `Mission`         | A task inside a campaign (typed by `MissionType`) worth a point reward. |
| `CustomerMission` | Join table: one row per customer per mission, tracks `MissionStatus`. Unique on `(customerId, missionId)`. |
| `CheckIn`         | One row per customer per day. Unique on `(customerId, checkInDate)`. Prevents duplicate check-ins. |
| `PointsHistory`   | Signed ledger: positive = earned, negative = spent.                  |
| `RewardItem`      | A catalogue item in the reward store (title, points cost, stock).    |
| `Redemption`      | Records a customer redeeming a `RewardItem`. Supports idempotency via `idempotencyKey`. |

---

## Key Subsystems

### Authentication

- Passport.js with a single JWT strategy; no Local strategy, no session, no Redis.
- Access token (`JWT_EXPIRES_IN`, default `1h`) + refresh token (`JWT_REFRESH_EXPIRES_IN`, default `7d`), both HS256.
- `authenticate` middleware = `passport.authenticate('jwt', { session: false })`.
- `requireRole(...roles)` middleware factory checks `req.user.role`.

### Points & Tier System

Tiers are calculated from cumulative lifetime points, not a separate column:

| Tier     | Minimum points |
| -------- | -------------- |
| BRONZE   | 0              |
| SILVER   | 200            |
| GOLD     | 500            |
| PLATINUM | 1 000          |
| DIAMOND  | 2 000          |

The `GET /customer/reward/points` response includes `tier`, `nextTierName`, `pointsToNextTier`, and a `progress` ratio (0–1).

### Daily Check-in

- 7-day streak cycle. Points per day: `[20, 20, 20, 20, 20, 20, 60]` (Day 7 bonus).
- Day boundary uses **Asia/Phnom_Penh** timezone; no midnight cron job needed — streak is resolved on every request by comparing `lastCheckInDate` to today.
- A unique DB constraint on `(customerId, checkInDate)` prevents double check-ins even under concurrent requests.
- After completing a full 7-day cycle, the streak resets to Day 1.

### Reward Store & Redemption

- `GET /customer/reward/store` returns only active items with stock > 0. Internal fields (`stock`, `isActive`) are not exposed to the customer.
- `POST /customer/reward/store/:id/redeem` runs in a transaction: decrement stock → deduct points → create `Redemption` → write `PointsHistory`.
- Clients should send an `Idempotency-Key` header; a duplicate key on an already-processed request is a silent no-op (returns `204`).

### Referral

- Each user gets a unique 6-character uppercase referral code (generated with `nanoid`) on registration.
- `POST /customer/referral/apply` links the caller to the referrer via `referredById`. Applying your own code or re-applying after already being referred is rejected.

### Error Handling

- `AppError` (in `src/shared/errors/AppError.ts`) carries `message` + `statusCode`. Throw it from any service to send a structured error response.
- The global `errorHandler` middleware catches both `AppError` instances and unexpected errors, returning `{ status: 'error', error: message }`.

---

## Environment Variables

| Variable                | Required | Default       | Description                                      |
| ----------------------- | :------: | ------------- | ------------------------------------------------ |
| `DATABASE_URL`          |   Yes    | —             | PostgreSQL connection string                     |
| `PORT`                  |    No    | `3000`        | HTTP port                                        |
| `NODE_ENV`              |   Yes    | —             | `development` \| `production`                    |
| `JWT_SECRET`            |   Yes    | —             | Access token secret (min 32 chars)               |
| `JWT_EXPIRES_IN`        |    No    | `1h`          | Access token lifetime                            |
| `JWT_REFRESH_SECRET`    |   Yes    | —             | Refresh token secret (min 32 chars)              |
| `JWT_REFRESH_EXPIRES_IN`|    No    | `7d`          | Refresh token lifetime                           |
| `BCRYPT_SALT_ROUNDS`    |    No    | `12`          | bcrypt work factor                               |
| `ADMIN_EMAIL`           |    No    | see `.env.example` | Seed admin email                            |
| `ADMIN_PASSWORD`        |    No    | see `.env.example` | Seed admin password                         |

---

## Available Commands

Run from `backend/`:

```bash
pnpm dev            # nodemon + tsx watch
pnpm build          # tsc + tsc-alias → dist/
pnpm start          # node dist/index.js
pnpm type-check     # tsc --noEmit  ← run this to verify changes

pnpm db:generate    # prisma generate
pnpm db:migrate     # prisma migrate dev
pnpm db:push        # prisma db push (schema prototyping)
pnpm db:seed        # prisma db seed
pnpm db:studio      # prisma studio
```

---

## Further Reading

| Document | Description |
| -------- | ----------- |
| [`backend_project_guidelines.md`](backend_project_guidelines.md) | Coding conventions, module authoring checklist, response shapes, error patterns |
| [`api-handoff.md`](api-handoff.md) | Full endpoint reference for the frontend/mobile teams |
| [`features/reward/backend_requirements.md`](features/reward/backend_requirements.md) | Original reward system specification (mobile endpoints) |
