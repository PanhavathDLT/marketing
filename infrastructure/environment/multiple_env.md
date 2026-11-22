# Multiple Environments: Map and Diagnosis Guide

Load this doc when debugging anything that might be the wrong environment: data that doesn't match, a frontend calling the wrong backend, a backend writing to the wrong database or bucket, or a deploy that didn't happen.

> This file is committed. It contains **no secrets**: hostnames, storage endpoint IDs, bucket names and file locations only. Real values live in the gitignored `.env.*` files and in the Vercel dashboards.

_Last updated: 2026-11-22._

---

## 1. Environment map

| | **local** | **dev** | **prod** |
|---|---|---|---|
| Purpose | Your machine | Shared dev / QA on Vercel | Production on Vercel |
| Frontend URL | `http://localhost:3000` | `https://marketing-dev-frontend.vercel.app` | _(prod frontend domain: fill in)_ |
| Backend URL | `http://localhost:4000` | `https://marketing-dev-backend.vercel.app` | `https://marketing-portal-zeta.vercel.app` |
| Frontend → API (`NEXT_PUBLIC_API_URL`) | `http://localhost:4000/api/v1` | `https://marketing-dev-backend.vercel.app/api/v1` | `https://marketing-portal-zeta.vercel.app/api/v1` |
| Database | Local Postgres `localhost:5432/marketing_db` | Neon **dev** database, host `ep-green-brook-b3xvaudf-pooler…` | Neon **production** branch `br-little-meadow-b3yivmcl`, host `ep-little-meadow-b3yivmcl-pooler…` |
| Neon project | — | _(unverified: may be a separate project)_ | `still-dew-06896370` (from `backend/.neon`) |
| `STORAGE_DRIVER` | `cloudinary` | `s3` (Neon Object Storage) | `s3` (Neon Object Storage) |
| Storage endpoint ID (start of `AWS_ENDPOINT_URL_S3`) | — | `br-bitter-bar-b3ax12os` | `br-divine-darkness-b371vhaf` |
| Storage bucket | Cloudinary cloud `iojmwwsv` | `uploads`, **Public** (checked 2026-11-22) | `uploads`, **Private** (checked 2026-11-22): image links return `AccessDenied` |
| Backend env file (local) | `backend/.env.local` | `backend/.env.dev` | `backend/.env.production` |
| Frontend env file (local) | `frontend/.env.local` | `frontend/.env.dev` | `frontend/.env.production` |
| Git repo / branch that deploys | — | `PanhavathDLT/marketing` → **`deploy/dev`** | _(verify: company repo `DELIGHTECH-Co-LTD/marketing_portal` → `master`?)_ |
| Vercel account | — | personal (`panhavathdlt's projects`, Hobby) | _(verify)_ |
| Vercel projects | — | `marketing-backend`, `marketing-frontend` | _(verify)_ |
| LOS JWKS (`LOS_JWKS_URI`) | UAT `api-uat.los.delightech.asia` | UAT | **UAT** ⚠️ see §6 |

Quick fingerprint: if you see `ep-green-brook` / `br-bitter-bar`, that's **dev**. If you see `ep-little-meadow` / `br-divine-darkness`, that's **prod**.

Other branches: `deploy/stage` exists on GitHub, but **no staging environment is set up yet**. `feature/*` branches only produce Vercel Preview deploys.

---

## 2. How each layer picks its config

### Backend on Vercel
- Reads **only** the Vercel project's Environment Variables (**Settings → Environments → Production**). The `.env.*` files are gitignored and never reach Vercel.
- Changing a variable has **no effect until you redeploy**.
- Must have `NODE_ENV=production` and `APP_URL=<its own Vercel URL>`. Must **not** have `PORT`, `DATABASE_URL_UNPOOLED` or `NEON_*` (unused by the code).

### Frontend on Vercel
- `NEXT_PUBLIC_API_URL` is **baked into the JS at build time**. After changing it, redeploy with build cache **off**.
- Set the variable's Type to **Config**, not Secret. Vercel refuses `NEXT_PUBLIC_*` as a secret, and an existing secret can't be switched to Config: remove it and add it again.

### Running locally (Makefile at repo root)
- `make <target> ENV=local|dev|prod` loads `backend/.env.<local|dev|production>` / `frontend/.env.<…>` via `dotenv run --override`. The chosen file **wins over anything exported in your shell**.
- There is deliberately **no `backend/.env`**. Prisma (`prisma.config.ts`), `prisma/seed.ts` and `src/config/env.ts` all call `dotenv`, which reads `.env` by default. Without that file, a bare `pnpm prisma …` has no `DATABASE_URL` and fails instead of silently hitting production. **Don't recreate `backend/.env`.**
- `pnpm dev` in `backend/` (nodemon) always uses `.env.local`.
- Next.js always loads `frontend/.env.local` too, but values passed in by `make` take precedence.

### Neon CLI
- `backend/.neon` (gitignored) links the folder to Neon project `still-dew-06896370`, and is currently on branch **`production`**. Only the `neon` CLI uses it; the app ignores it. Switch branch (`neon checkout <dev-branch>`) before using the CLI for dev work.

---

## 3. Commands

Run from the repo root (`make help` lists everything). `make` does **not** work from inside `frontend/` or `backend/`.

| Command | What it does |
|---|---|
| `make run-back-local` / `run-back-dev` / `run-back-prod` | API on `localhost:4000` with that env's DB + storage (`prod` asks to confirm) |
| `make run-front-local` / `run-front-dev` / `run-front-prod` | Next.js on `localhost:3000` pointing at that env's backend |
| `make migrate ENV=…` | local: `prisma migrate dev`; dev/prod: `prisma migrate deploy` |
| `make migrate-new NAME=…` | Create a migration (local only) |
| `make migrate-status ENV=…` | Read-only: shows which DB host it hit and pending migrations |
| `make seed ENV=…` | Run `prisma/seed.ts` (admin user, tiers, permissions, LOS client) |
| `make setup ENV=…` | migrate + seed |
| `make studio ENV=…` | Prisma Studio on that DB |
| `make migrate-reset` | Drop and rebuild the local DB (local only) |

Anything that writes with `ENV=prod` asks you to type `prod` first.

---

## 4. Diagnosis playbook

### "The data on dev doesn't match the dev database"
The backend is probably pointing at a different DB. Compare the same table in both DBs (read-only):
```bash
cd backend
for f in .env.dev .env.production; do
  url=$(grep -E '^DATABASE_URL=' $f | cut -d= -f2- | tr -d '"' | sed 's/&channel_binding=require//')
  echo "== $f"; psql "$url" -At -c 'SELECT * FROM "TierConfig" ORDER BY 1;'
done
```
Then compare with what the UI or API shows. `createdAt` dates are a good fingerprint: the dev DB was seeded 2026-11-16 and prod 2026-11-19. If the UI matches the wrong DB, fix `DATABASE_URL` (and `AWS_*`, JWT secrets) in that Vercel backend project, then redeploy.

### "Which backend is this frontend calling?"
```bash
B=https://marketing-dev-frontend.vercel.app
for c in $(curl -s $B/login | grep -oE '/_next/static/[^"]+\.js' | sort -u); do
  curl -s "$B$c" | grep -oE 'https://[a-z0-9-]+\.vercel\.app/api/v1|http://localhost:4000/api/v1'
done | sort -u
```
If it's wrong, update `NEXT_PUBLIC_API_URL` on Vercel and **redeploy**. Also check `frontend/.env.<env>` for local runs.

### "Is the backend up, and can it reach its DB?"
```bash
curl https://<backend>/health
# → 200 {"status":"ok"}  (doesn't touch the DB)
curl -X POST https://<backend>/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"nobody@example.com","password":"WrongPass123!"}'
# → 401 means the DB was reached; 500 means DB/env problem
```
`GET /` → 404 `{"status":"error","error":"Not found"}` is normal: there's no root route. A Vercel "This page is unavailable / FUNCTION_INVOCATION_FAILED" page means the function crashed. Check the deployment's **Runtime Logs**.

### "Which DB does my local env file point at?"
`make migrate-status ENV=dev` prints `Datasource "db": … at "<host>"`.

### "Uploaded files go to the wrong place"
Check the URL of an uploaded file. It should start with the storage endpoint in the table above (`br-bitter-bar…/uploads/` for dev, `br-divine-darkness…/uploads/` for prod, `res.cloudinary.com` for local). If it's wrong, fix `STORAGE_DRIVER` / `AWS_*` / `APP_URL` on that Vercel project and redeploy.

### "Image link shows an XML error"
The bucket name is the constant `uploads` in `backend/src/shared/storage/s3.storage.ts`. S3 storage needs only the four values Neon provides: `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`. `AWS_S3_BUCKET` is no longer read.
- `AccessDenied`: the bucket is private. Visibility can't be edited after creation, so back up the files, then recreate `uploads` as **Public** and re-upload them with the same names.
- `NoSuchBucket`: there is no `uploads` bucket on that endpoint. Create it as **Public**.
- `NoSuchKey`: the bucket is public, but that file isn't in it. It may be in another environment's storage.

### "I pushed but nothing deployed" / "it deployed as Preview"
- Check the right remote: the dev Vercel projects watch **`PanhavathDLT/marketing`**. Run `git remote -v`.
- In both dev projects, **Settings → Environments → Production → Branch Tracking** must be `deploy/dev`. Otherwise pushes to `deploy/dev` only make Preview deploys, which don't update the `marketing-dev-*` domains.
- Open the deployment and check **Source** (branch + commit). **Redeploy** rebuilds the *same* commit; push to deploy new code.
- An old deployment marked **Stale** isn't what's serving the domain. Look at the newest **Current** one.

### "Login fails with Invalid email or password on a fresh environment"
The DB isn't seeded. Run `make seed ENV=<env>`. Changing `JWT_SECRET` on a backend logs everyone out once, which is expected.

---

## 5. Known pitfalls (learned the hard way)

| Symptom | Cause | Fix |
|---|---|---|
| Vercel log: `Cannot find module '@config/env.js'` | Vercel's Express preset compiles `src/app.ts` itself and doesn't resolve tsconfig path aliases | Backend uses **relative imports only**. `tsconfig.json` has no `paths`, so `pnpm type-check` fails on any alias. Don't reintroduce `@config/…` etc. |
| `ERR_REQUIRE_ESM` | ESM-only package in a CommonJS build | Use CJS-compatible versions (`jose@5`, `nanoid@3`). Test: `pnpm build && node --no-experimental-require-module -e "require('./dist/app')"` |
| Dev site showed prod data | Dev Vercel backend still had the env vars pasted from the old prod `.env` | Fixed 2026-11-20 by switching to `.env.dev` values. Re-check after any env edit (§4). |
| Frontend called a dead URL after renaming the backend domain | `NEXT_PUBLIC_API_URL` is baked at build time | Update the variable, then redeploy without cache |
| `make: No rule to make target` | Ran `make` inside `frontend/` or `backend/` | Run from the repo root |
| A file holding prod secrets was nearly committable | `backend/.gitignore` only listed `.env` and `.env.dev` | Now `.env.*` with `!.env.example`. Check with `git check-ignore -v backend/.env.*` |

---

## 6. Open items / risks

- **Prod uses the UAT LOS server.** `LOS_JWKS_URI` is `api-uat.los.delightech.asia` in all three env files, production included. If prod customer tokens come from the production LOS, verification fails and customer endpoints return 401. Confirm with the LOS team. The code default (`src/config/env.ts`) is the non-UAT `api.los.delightech.asia`.
- **Prod frontend domain and the prod Vercel project/account aren't recorded here yet.** Fill in §1.
- **Dev credentials were shared in chat** (dev DB password, dev S3 keys) on 2026-11-20. Rotate them in Neon when convenient.
- **Prod storage vs prod branch is unverified.** The prod storage endpoint ID (`br-divine-darkness-b371vhaf`) differs from the prod `NEON_BRANCH_ID` (`br-little-meadow-b3yivmcl`). Compare with **Connect** on the production branch in Neon.
- **Confirm whether dev and prod are in the same Neon project.**
- `deploy/stage` branch exists, but no staging env has been built.
- Railway files (`backend/Dockerfile`, `backend/railway.toml`) are from the earlier Railway setup and are **not used** by the Vercel deploys.
- `backend/` still depends on `tsc-alias` / `tsconfig-paths`, but they are no-ops now and could be removed.
