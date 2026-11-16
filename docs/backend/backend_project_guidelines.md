# Backend Project Guidelines

> **Scope:** How modules are built in this codebase. Read this before writing a new module or reviewing a PR.
> **Reference module:** `src/modules/campaign/` — the clearest example of every rule below.

---

## Table of Contents

1. [Module structure](#1-module-structure)
2. [File responsibilities](#2-file-responsibilities)
3. [Dependency wiring](#3-dependency-wiring)
4. [Audience split](#4-audience-split)
5. [Request validation](#5-request-validation)
6. [Response shape](#6-response-shape)
7. [Error handling](#7-error-handling)
8. [Path aliases](#8-path-aliases)
9. [Adding a new module — checklist](#9-adding-a-new-module--checklist)
10. [What to adopt when triggers appear](#10-what-to-adopt-when-triggers-appear)

---

## 1. Module structure

Every module lives in `src/modules/<name>/` and contains exactly these files:

```
src/modules/campaign/
├── index.ts                  ← barrel: exports routers only
├── campaign.routes.ts        ← composition root + route definitions
├── campaign.controller.ts    ← HTTP in / HTTP out
├── campaign.service.ts       ← business logic
└── campaign.schema.ts        ← Zod schemas + inferred input types
```

**Rules:**
- File names follow `<module-name>.<role>.ts` — no abbreviations, no deviations.
- `index.ts` exports **only the routers** (and any instance outside code needs, like `authService` for passport). Nothing else.
- Keep one module per domain concept. Do not put campaign logic in the mission file.

---

## 2. File responsibilities

### `<name>.schema.ts` — Zod schemas and input types

Owns all Zod schemas for the module. Exports inferred TypeScript types so the rest of the module is fully typed.

```typescript
// campaign.schema.ts
import { z } from 'zod';

export const createCampaignSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial().extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']).optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
```

**Rules:**
- One schema per distinct request shape (create, update, list query, URL param, etc.)
- Always export `z.infer<typeof schema>` as a named type — never use `any` in the service or controller.
- Never put response shapes here. Schemas describe what comes **in**, not what goes **out**.

---

### `<name>.service.ts` — business logic

Owns all data access and business rules. Imports `prisma` directly and throws `AppError` for domain errors.

```typescript
// campaign.service.ts
import prisma from '@lib/prisma.js';
import { AppError } from '@shared/errors/AppError.js';
import { CreateCampaignInput, UpdateCampaignInput } from './campaign.schema.js';

export async function getCampaignById(id: number) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { missions: true },
  });
  if (!campaign) throw new AppError('Campaign not found', 404);
  return campaign;
}

export async function createCampaign(input: CreateCampaignInput) {
  return prisma.campaign.create({
    data: {
      title: input.title,
      description: input.description,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    },
    include: { missions: true },
  });
}
```

**Rules:**
- Functions, not a class. Export named async functions.
- Import `prisma` from `@lib/prisma.js` — never construct a new client.
- Use typed input parameters from the schema (`CreateCampaignInput`), not `any`.
- Throw `AppError` for expected business errors (`404`, `409`, `422`). Let unexpected errors bubble up to the global handler as `500`.
- When a response needs to hide internal fields, map it explicitly here (see `getStore()` in `reward.service.ts` as an example).

---

### `<name>.controller.ts` — HTTP layer

Bridges HTTP and the service. Calls `success()` or delegates to `next(err)` — no other logic.

```typescript
// campaign.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as campaignService from './campaign.service.js';
import { success } from '@shared/utils/response.js';

export async function createCampaign(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await campaignService.createCampaign(req.body);
    success(res, data, 201);
  } catch (err) {
    next(err);
  }
}

export async function deleteCampaign(req: Request, res: Response, next: NextFunction) {
  try {
    await campaignService.deleteCampaign(Number(req.params.id));
    success(res, null);
  } catch (err) {
    next(err);
  }
}
```

**Rules:**
- Every handler is `async` and wraps in `try/catch` → `next(err)`.
- No business logic, no Prisma calls, no `AppError` throws here.
- Use `req.body` typed via `as CreateCampaignInput` only when `validate()` has already run on the route — it has narrowed the type at runtime.
- For authenticated routes, read the user via `req.user as User`.

---

### `<name>.routes.ts` — router definitions

Wires schemas, controllers, and middleware. Each exported router is a self-contained unit for one audience.

```typescript
// campaign.routes.ts
import { Router, IRouter } from 'express';
import { validate } from '@shared/middleware/validate.middleware.js';
import { createCampaignSchema, updateCampaignSchema } from './campaign.schema.js';
import * as campaignController from './campaign.controller.js';

// Admin routes — mounted at /api/v1/admin/campaigns
export const adminCampaignRouter: IRouter = Router();

adminCampaignRouter.get('/', campaignController.listCampaigns);
adminCampaignRouter.post('/', validate(createCampaignSchema), campaignController.createCampaign);
adminCampaignRouter.patch('/:id', validate(updateCampaignSchema), campaignController.updateCampaign);
adminCampaignRouter.delete('/:id', campaignController.deleteCampaign);

// Customer routes — mounted at /api/v1/customer/campaigns
export const customerCampaignRouter: IRouter = Router();

customerCampaignRouter.get('/', campaignController.listActiveCampaigns);
customerCampaignRouter.get('/:id', campaignController.getCampaign);
```

**Rules:**
- Always type routers as `IRouter` (not inferred) to avoid portable-type errors.
- Apply `validate(schema)` before the controller handler on every mutating route.
- Authentication (`authenticate`) and role guards (`requireRole`) are applied in `src/routes/v1.ts`, not here.
- The routes file is where `import * as` is used — never use wildcard imports in services or controllers.

---

### `index.ts` — barrel

```typescript
// campaign/index.ts
export { adminCampaignRouter, customerCampaignRouter } from './campaign.routes.js';
```

Only routers (and any singleton needed outside, e.g. `authService` for passport). Never re-export service functions or schema types from `index.ts`.

---

## 3. Dependency wiring

This project uses **functional modules** — no classes, no dependency injection containers.

**Services** import `prisma` directly:

```typescript
// ✅ correct
import prisma from '@lib/prisma.js';

export async function getCampaignById(id: number) {
  return prisma.campaign.findUnique({ where: { id } });
}
```

**Controllers** import the service with a wildcard:

```typescript
// ✅ correct
import * as campaignService from './campaign.service.js';
```

This keeps the dependency graph simple and readable: `routes → controller → service → prisma`.

**What we do NOT use:**
- Classes with injected constructors
- Repository layer (service goes directly to Prisma)
- Default-parameter dependency injection (`constructor(repo = new Repo())`)

---

## 4. Audience split

This project has two audiences: **customer** (mobile app) and **admin** (dashboard). They are split at the routing level in `src/routes/v1.ts`, not at the module folder level.

```typescript
// src/routes/v1.ts
const customer: IRouter = Router();
customer.use(authenticate, requireRole('CUSTOMER'));
customer.use('/campaigns', customerCampaignRouter);
customer.use('/reward', rewardRouter);

const admin: IRouter = Router();
admin.use(authenticate, requireRole('ADMIN'));
admin.use('/campaigns', adminCampaignRouter);
```

**Within a module**, audiences are expressed as **separately exported routers** from the same flat folder:

```
src/modules/campaign/
├── campaign.routes.ts     ← exports adminCampaignRouter + customerCampaignRouter
├── campaign.service.ts    ← shared service, functions called by both routers
└── ...
```

When a module's service logic diverges significantly between audiences (different rules, different response shapes), extract audience-specific service functions by naming them clearly:

```typescript
// campaign.service.ts
export async function listCampaigns() { ... }           // admin: all statuses
export async function listActiveCampaigns() { ... }     // customer: ACTIVE only
```

**Sub-folder split** (not yet needed) — if a module grows to the point where the routes file becomes unwieldy (many schemas, conflicting controller functions), split into sub-folders:

```
src/modules/campaign/
├── shared/
│   └── campaign.service.ts       ← shared logic
├── admin-campaign/
│   ├── admin-campaign.routes.ts
│   ├── admin-campaign.controller.ts
│   └── admin-campaign.schema.ts
├── customer-campaign/
│   └── ...
└── index.ts
```

**Current modules by audience:**

| Module | Customer routes | Admin routes |
|---|---|---|
| `auth` | register, login, refresh | — |
| `campaign` | list active, get one | full CRUD |
| `mission` | — (via reward module) | CRUD nested under campaign |
| `reward` | points, check-in, missions, store, redeem | — |
| `analytics` | — | overview, campaign stats, check-in stats |

---

## 5. Request validation

Every request body, query string, or URL param that the service uses **must be validated** with a Zod schema.

**Schema file:**
```typescript
// campaign.schema.ts
export const createCampaignSchema = z.object({
  title: z.string().min(1),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']).optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
```

**Route file** — apply `validate()` before the controller:
```typescript
adminCampaignRouter.post('/', validate(createCampaignSchema), campaignController.createCampaign);
```

**Service** — accept the inferred type, never `any`:
```typescript
export async function createCampaign(input: CreateCampaignInput) { ... }
```

The `validate()` middleware (`src/shared/middleware/validate.middleware.ts`) runs the schema at runtime and returns `422` with the first error message if it fails. After it runs, `req.body` holds the parsed, coerced value — it is safe to cast in the controller.

**Rules:**
- Always export `z.infer<typeof schema>` as a named type.
- Use Zod's built-in coercion (`z.coerce.number()`) for URL params before passing to the service, rather than a bare `Number(req.params.id)` — or at minimum document the assumption.
- Never call `validate()` on a schema you don't export a type from.

---

## 6. Response shape

**Success:**
```json
{ "status": "success", "data": { ... } }
```
For lists, `data` is an array:
```json
{ "status": "success", "data": [ ... ] }
```
For mutations with no meaningful body (delete, check-in, claim):
```json
{ "status": "success", "data": null }
```

**Error:**
```json
{ "status": "error", "error": "Human-readable message" }
```

Use the helpers in `src/shared/utils/response.ts`:

```typescript
import { success } from '@shared/utils/response.js';

success(res, data);          // 200
success(res, data, 201);     // 201
success(res, null);          // 200, data: null
```

**Controlling what gets sent:**

The service is responsible for ensuring only the right fields reach the controller. When a Prisma query returns more than the client should see, map the result explicitly in the service before returning:

```typescript
// reward.service.ts — only expose id, title, points, imageUrl; never expose stock or isActive
export async function getStore() {
  const items = await prisma.rewardItem.findMany({ where: { isActive: true, stock: { gt: 0 } } });
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    points: item.points,
    imageUrl: item.imageUrl,
  }));
}
```

For simple read-through queries (e.g. `getCampaignById`) where every column is safe to expose, returning the Prisma object directly is acceptable for now.

**When to add a formal mapper:** when a resource needs computed fields, nested objects (e.g. `author: { id, name }`), renamed columns, or the same data served differently to two audiences. At that point, create a `<name>.mapper.ts` with a pure exported function (`toCampaignResponse`). See [Section 10](#10-what-to-adopt-when-triggers-appear).

---

## 7. Error handling

### `AppError` — expected domain errors

Throw from the service for any error the client can act on:

```typescript
import { AppError } from '@shared/errors/AppError.js';

if (!campaign) throw new AppError('Campaign not found', 404);
if (user.points < item.points) throw new AppError('You do not have enough points.', 422);
if (existing) throw new AppError('Email already in use', 409);
```

`AppError` signature: `new AppError(message: string, statusCode: number = 400)`.

The global `errorHandler` in `src/shared/middleware/error.middleware.ts` catches it and serialises it as:
```json
{ "status": "error", "error": "Campaign not found" }
```

### Unexpected errors

Do not catch errors you can't handle. Let them bubble up — the global handler returns `500`. Never swallow an error silently.

```typescript
// ✅ correct — unexpected DB errors become 500 automatically
export async function createCampaign(input: CreateCampaignInput) {
  return prisma.campaign.create({ data: input });
}

// ❌ wrong — hides the real error
export async function createCampaign(input: CreateCampaignInput) {
  try {
    return prisma.campaign.create({ data: input });
  } catch {
    throw new AppError('Something went wrong', 500);
  }
}
```

### Status code conventions

| Code | When to use |
|---|---|
| `400` | Generic bad request (default `AppError`) |
| `401` | Not authenticated — missing / expired token |
| `403` | Authenticated but not permitted (wrong role) |
| `404` | Resource not found |
| `409` | Conflict — duplicate, already linked, out of stock |
| `422` | Validation failure — insufficient points, own referral code |
| `500` | Unexpected — never throw this explicitly |

---

## 8. Path aliases

All imports within `src/` use aliases. Never write relative `../` paths.

| Alias | Resolves to | Example |
|---|---|---|
| `@modules/*` | `src/modules/*` | `import { authRouter } from '@modules/auth/index.js'` |
| `@shared/*` | `src/shared/*` | `import { AppError } from '@shared/errors/AppError.js'` |
| `@config/*` | `src/config/*` | `import { env } from '@config/env.js'` |
| `@lib/*` | `src/lib/*` | `import prisma from '@lib/prisma.js'` |

Always include the `.js` extension — TypeScript 7 with `"module": "CommonJS"` requires it.

Aliases are resolved at dev time by `tsx` (via `tsconfig.json` `paths`) and rewritten to relative paths at build time by `tsc-alias`.

---

## 9. Adding a new module — checklist

1. Create `src/modules/<name>/`
2. Write `<name>.schema.ts` — Zod schema(s) + `z.infer` types
3. Write `<name>.service.ts` — functions importing `prisma` and `AppError`
4. Write `<name>.controller.ts` — one handler per route, `try/catch → next(err)`
5. Write `<name>.routes.ts` — export one `IRouter` per audience, apply `validate()` on mutations
6. Write `index.ts` — export the router(s) only
7. Register the router in `src/routes/v1.ts` under the correct audience block
8. Add Prisma models if needed in `prisma/schema.prisma` and run `pnpm db:migrate`
9. Run `pnpm type-check` — must pass with zero errors before committing

---

## 10. What to adopt when triggers appear

The current approach is intentionally lean. These are deferred until a concrete need arises.

### Response mapper (`<name>.mapper.ts`)

**Adopt when:** a resource needs computed fields, nested related objects (`author: { id, name }`), renamed columns, or the same data served with different shapes to customer vs admin.

```typescript
// campaign.mapper.ts — pure function, no I/O, fully unit-testable
import type { Campaign, Mission } from '@prisma/client';

type CampaignWithMissions = Campaign & { missions: Mission[] };

export interface CampaignResponse {
  id: number;
  title: string;
  status: string;
  missionCount: number;
  startDate: string | null;
  endDate: string | null;
}

export const toCampaignResponse = (c: CampaignWithMissions): CampaignResponse => ({
  id: c.id,
  title: c.title,
  status: c.status,
  missionCount: c.missions.length,
  startDate: c.startDate?.toISOString() ?? null,
  endDate: c.endDate?.toISOString() ?? null,
});
```

The service calls the mapper before returning:
```typescript
export async function getCampaignById(id: number): Promise<CampaignResponse> {
  const campaign = await prisma.campaign.findUnique({ where: { id }, include: { missions: true } });
  if (!campaign) throw new AppError('Campaign not found', 404);
  return toCampaignResponse(campaign);
}
```

### Sub-folder audience split

**Adopt when:** a module's routes file or service has grown to the point where admin and customer logic clearly belong in separate files (many schemas, conflicting controller functions, diverging service rules). See [Section 4](#4-audience-split) for the folder layout.

### Paginated responses

**Adopt when:** a list endpoint grows large enough to need pagination. Add `page` and `limit` query params validated in the schema, and return:

```json
{
  "status": "success",
  "data": [ ... ],
  "meta": { "total": 100, "page": 1, "limit": 20 }
}
```

The `paginatedResponseSchema` helper in `src/shared/schemas/index.ts` already defines this shape.

### `select` whitelist on Prisma queries

**Adopt when:** a Prisma model gains sensitive columns (e.g. internal flags, payment data) that must never reach clients, and an explicit map in the service is insufficient. Declare a `const <name>Select` in the service and pass it to every query:

```typescript
const campaignSelect = {
  id: true, title: true, status: true, startDate: true, endDate: true,
} as const;

export async function listCampaigns() {
  return prisma.campaign.findMany({ select: campaignSelect });
}
```

Prisma infers the return type from `select`, so the result stays fully typed without a separate interface.
