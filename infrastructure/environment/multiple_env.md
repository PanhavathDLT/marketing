# Multiple Environment Workflow

## Overview

Two environments — local development and production (Railway). Each has its own database, storage config, and env file. No code changes are needed to switch between them; everything is driven by environment variables.

---

## Environment Comparison

| | Local Dev | Production (Railway) |
|---|---|---|
| Git branch | `dev` | `master` |
| Env file | `.env.dev` | Railway dashboard (no file) |
| Database | Local PostgreSQL `marketing_db` | Neon DB — `production` branch |
| Image storage | Cloudinary | Neon DB (`StoredFile` table) |
| `STORAGE_DRIVER` | `cloudinary` | `db` |
| `APP_URL` | `http://localhost:4000` | `https://<railway-domain>.up.railway.app` |
| `NODE_ENV` | `development` | `production` |

---

## How the Storage Driver Works

The storage system is a pluggable factory in `backend/src/shared/storage/index.ts`. The rest of the app calls `getStorageService().upload(file)` without knowing which driver is active. Switching drivers is a config-only change — no code change required.

```
STORAGE_DRIVER=cloudinary  →  CloudinaryStorageService  (uploads to Cloudinary)
STORAGE_DRIVER=db          →  DbStorageService          (stores in Neon StoredFile table, served at APP_URL/files/<id>)
STORAGE_DRIVER=local       →  LocalStorageService       (saves to public/uploads/, served at APP_URL/uploads/<filename>)
```

---

## Environment Files

| File | Committed? | Purpose |
|---|---|---|
| `.env.dev` | No (git-ignored) | Local dev secrets and config |
| `.env` | No (git-ignored) | Holds Neon vars written by `neon init` — do not use for local dev |
| `.env.example` | Yes | Template showing all required vars — no real secrets |

> Never commit `.env` or `.env.dev`. The `.env.example` is the only env file that goes into git.

---

## Local Dev Setup

First-time setup:
```bash
# 1. Create and start local Postgres DB
createdb marketing_db

# 2. Apply all migrations to local DB
pnpm db:migrate

# 3. Seed local DB (admin user, tiers, permissions)
pnpm db:seed

# 4. Start dev server (loads .env.dev automatically via nodemon)
pnpm dev
```

Nodemon is configured (`nodemon.json`) to load `.env.dev` via `tsx --env-file=.env.dev`. No manual export needed.

---

## Daily Development Workflow

```bash
# Work on the dev branch
git checkout dev

# Make changes and test locally
pnpm dev

# Commit to dev — does NOT trigger Railway deploy
git add .
git commit -m "your message"
git push origin dev

# ── Ready for production release ──────────────────────
git checkout master
git merge dev
git push origin master    # Railway auto-deploys on push to master
```

---

## Railway Deployment

Railway is connected to the `master` branch. It:
1. Detects the `Dockerfile` in `backend/` (via `railway.toml`)
2. Builds the Docker image
3. On container start: runs `prisma migrate deploy` then `node dist/index.js`

Railway reads env vars from its own dashboard — not from any `.env` file.

### Railway Environment Variables to Set

```env
DATABASE_URL=postgresql://neondb_owner:...@neon.tech/neondb?sslmode=require
NODE_ENV=production
PORT=4000
APP_URL=https://<your-railway-domain>.up.railway.app

STORAGE_DRIVER=db

JWT_SECRET=<openssl rand -hex 32>
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=<openssl rand -hex 32>
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

ADMIN_EMAIL=<admin email>
ADMIN_PASSWORD=<strong password>

LOS_JWKS_URI=https://api-uat.los.delightech.asia/api/v1/guest/.well-known/jwks.json
LOS_ISSUER=los-backend
LOS_CUSTOMER_AUDIENCE=luyleun
LOS_CLIENT_ID=los-backend
LOS_CLIENT_SECRET=<openssl rand -hex 32>
```

> See `infrastructure/database/neon_setup.md` for the full Neon connection strings.

---

## Frontend

The frontend (`frontend/`) is a separate Railway service. Railway auto-detects Next.js — no Dockerfile needed. Set its **Root Directory** to `frontend/` in the Railway service settings and it handles the rest.
