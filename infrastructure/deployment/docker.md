# Docker Setup

## Overview

Only the **backend** is containerized with Docker. The **frontend** lets Railway handle the build automatically via Nixpacks (Next.js auto-detection).

| Service | Build Method | Why |
|---|---|---|
| `backend/` | Dockerfile | Full control over Node, Prisma, migrations |
| `frontend/` | Railway Nixpacks (auto) | Next.js detected automatically, no config needed |

---

## Files

| File | Purpose |
|---|---|
| `backend/Dockerfile` | Multi-stage build — compiles TypeScript, generates Prisma client |
| `backend/.dockerignore` | Excludes `node_modules`, `dist`, `.env`, `.neon`, logs from build context |
| `backend/railway.toml` | Tells Railway to use the Dockerfile instead of auto-detection |

---

## Dockerfile Breakdown

```
Stage 1 — builder
  - node:22-alpine
  - corepack enable (activates pnpm)
  - pnpm install --frozen-lockfile  (installs all deps including devDeps)
  - prisma generate                 (generates Prisma client into node_modules)
  - pnpm build                      (tsc + tsc-alias → outputs to dist/)

Stage 2 — production
  - node:22-alpine
  - copies node_modules from builder (includes prisma CLI for migrations)
  - copies dist/ from builder
  - copies prisma/ schema + migrations (needed for migrate deploy at runtime)
  - EXPOSE 4000
  - CMD: prisma migrate deploy && node dist/index.js
```

### Why copy full `node_modules` from builder

pnpm uses a virtual store (`node_modules/.pnpm/`) with symlinks. Running a fresh `pnpm install --prod` in the production stage would regenerate a different node_modules layout and lose the generated Prisma client (`.prisma/client/`). Copying the entire `node_modules` from the builder avoids this and guarantees the generated client is present.

---

## railway.toml

```toml
[build]
builder = "DOCKERFILE"        # use Dockerfile, not Railpack/Nixpacks (must be uppercase)

[deploy]
healthcheckPath = "/health"   # Railway pings this after deploy to confirm the app is alive
healthcheckTimeout = 100      # seconds before marking deploy as failed
restartPolicyType = "on_failure"    # auto-restart if the process crashes
restartPolicyMaxRetries = 3         # give up after 3 consecutive crashes
```

Without `railway.toml`, Railway would use Railpack (auto-detection) and **ignore the Dockerfile entirely**.

---

## Startup Sequence

Every time the container starts (including on new deploys):

```
prisma migrate deploy   →   applies any pending migrations to Neon DB
node dist/index.js      →   starts the Express server
```

This means schema changes are automatically applied on deploy — no manual migration step needed on Railway.

---

## Local Docker Build (optional)

If you want to test the Docker build locally before pushing:

```bash
# Make sure Docker Desktop is running first
docker build -t marketing-backend ./backend
docker run --env-file ./backend/.env.dev -p 4000:4000 marketing-backend
```

---

## Updating the Docker Setup

If you change the Node version or add build steps:
1. Update the `FROM node:XX-alpine` lines in `backend/Dockerfile`
2. Push to `master` — Railway rebuilds the image automatically
