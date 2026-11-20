# Deploying to Vercel

This repo is deployed to Vercel as **two separate projects** from the same Git repo:

| Project | Root Directory | Preset | Depends on |
|---|---|---|---|
| Backend (Express API) | `backend` | Express | Postgres database (Neon) |
| Frontend (Next.js admin) | `frontend` | Next.js | Backend URL |

Deploy the **backend first**, because the frontend needs the backend URL at build time.

> Do **not** import the repo as one project using the **Services** preset. Use **Import single project** for each app.

---

## Before you start

- A Postgres database (Neon) with its connection string (`postgresql://...?sslmode=require`).
- Access to the company Vercel team and the GitHub repo.
- Locally: Node.js and pnpm, to run migrations and the seed.

---

## 1. Backend project

### 1.1 Import

1. Vercel → **Add New… → Project**.
2. Pick the repo and click **Import**.
3. On the "Multiple applications detected" screen, click **Import single project** on the **backend** row.

### 1.2 Settings: choose exactly these

| Field | Value |
|---|---|
| Vercel Team | The company team |
| Project Name | e.g. `marketing-backend` |
| Root Directory | `backend` |
| Application Preset | **Express** |
| Build and Output Settings | **Leave default; don't override anything.** The build command comes from `backend/vercel.json` (`pnpm build`). |

### 1.3 Environment variables

The backend environment variables have **already been shared with you via personal message**. Don't commit them to the repo or post them in shared channels.

1. Open **Environment Variables**.
2. Paste the whole block you received into the first **Key** field. Vercel splits it into rows automatically.
3. Leave the environment as **Production and Preview** for every row.

If anything is missing, ask for it via personal message.

### 1.4 Deploy

Click **Deploy**. The build runs `prisma generate && tsc && tsc-alias`.

### 1.5 After the first deploy

1. Copy the production domain from the project **Overview** (e.g. `https://marketing-backend.vercel.app`).
2. **Settings → Environment Variables**: set `APP_URL` to that domain.
3. **Deployments → latest → ⋯ → Redeploy.** Environment variable changes only apply after a redeploy.

### 1.6 Database: migrate and seed (once per new database)

Run these from your machine, with `backend/.env` pointing at the **same** `DATABASE_URL` as Vercel:

```bash
cd backend
pnpm install
pnpm db:migrate:prod   # prisma migrate deploy
pnpm db:seed:prod      # creates the admin user + LOS client
```

The seed uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env`.

### 1.7 Verify

```bash
curl https://<backend-domain>/health
# → {"status":"ok"}  HTTP 200

curl -X POST https://<backend-domain>/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"nobody@example.com","password":"WrongPass123!"}'
# → {"status":"error","error":"Invalid email or password"}  HTTP 401
#   (a 401 here means the API reached the database; a 500 means it didn't)
```

`GET /` returning `{"status":"error","error":"Not found"}` (404) is expected, because there's no root route.

---

## 2. Frontend project

### 2.1 Import

1. Vercel → **Add New… → Project** → same repo → **Import**.
2. Click **Import single project** on the **frontend** row.

### 2.2 Settings: choose exactly these

| Field | Value |
|---|---|
| Vercel Team | The company team |
| Project Name | e.g. `marketing-frontend` |
| Root Directory | `frontend` |
| Application Preset | **Next.js** |
| Build and Output Settings | **Leave default.** |

### 2.3 Environment variables

| Key | Value | Environment |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<backend-domain>/api/v1` | Production and Preview |

- The value **must end with `/api/v1`**.
- Don't import `frontend/.env.local`: it points at `localhost`.
- `NEXT_PUBLIC_*` values are baked in at build time. **If you change this, redeploy the frontend.**

### 2.4 Deploy and verify

1. Click **Deploy**.
2. Open `https://<frontend-domain>/login` and sign in with the seeded admin account.

---

## Branches

- Production deploys come from the repo's default branch (`master`). Other branches get Preview deployments.
- To check which code a deployment runs, open it and look at **Source** (branch and commit hash).
- **Redeploy** rebuilds the **same commit**. To deploy new code, push to the branch.

## Troubleshooting

| Symptom (Vercel runtime logs) | Cause / fix |
|---|---|
| `Cannot find module '@config/...'` (or `@shared`, `@lib`, `@modules`) | Someone added a path-alias import. The backend must use **relative imports only**: Vercel compiles `src/` itself and does not resolve aliases. `pnpm type-check` fails locally on alias imports. |
| `ERR_REQUIRE_ESM` | An ESM-only package was added. The backend compiles to CommonJS. Use a version with CommonJS support (e.g. `jose@5`, `nanoid@3`). Test locally with `pnpm build && node --no-experimental-require-module -e "require('./dist/app')"`. |
| `Invalid environment variables: ...` | A required env var is missing or too short (JWT secrets need 32+ characters). Fix it in Settings and redeploy. |
| Frontend calls `localhost` | `NEXT_PUBLIC_API_URL` was missing at build time. Set it and redeploy. |
| Login returns 401 for the real admin | The database isn't seeded. Run step 1.6. |
| Uploaded files have wrong URLs | `APP_URL` isn't set to the backend domain. Fix it and redeploy. |
