# Neon DB Setup

## Project Details

| Field | Value |
|---|---|
| Project Name | my-first-project |
| Project ID | still-dew-06896370 |
| Organization ID | org-solitary-rain-68037257 |
| Branch | production |
| Branch ID | br-bitter-bar-b3ax12os |
| Region | AWS Asia Pacific (Singapore) — `ap-southeast-1` |

## Connection Strings

Both strings are for the same database. Use pooled for the app, unpooled for migrations.

**Pooled** (use for `DATABASE_URL` in the app — PgBouncer connection pooler):
```
postgresql://neondb_owner:npg_AE0o5vHbpqhV@ep-green-brook-b3xvaudf-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
```

**Unpooled / Direct** (use for `DATABASE_URL_UNPOOLED` — direct TCP, needed for migrations):
```
postgresql://neondb_owner:npg_AE0o5vHbpqhV@ep-green-brook-b3xvaudf.c-4.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
```

> Both strings require `sslmode=require` — Neon enforces SSL on all connections.

## Railway Deployment Environment Variables

Set these in Railway → your service → Variables tab:

```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_AE0o5vHbpqhV@ep-green-brook-b3xvaudf-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_AE0o5vHbpqhV@ep-green-brook-b3xvaudf.c-4.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require

# App
NODE_ENV=production
PORT=4000
APP_URL=https://<your-railway-domain>.up.railway.app

# Storage (images stored in Neon DB)
STORAGE_DRIVER=db

# Auth
JWT_SECRET=<min 32 chars — use: openssl rand -hex 32>
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=<min 32 chars — use: openssl rand -hex 32>
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# Admin seed account
ADMIN_EMAIL=<your admin email>
ADMIN_PASSWORD=<strong password>

# LOS integration (mobile)
LOS_JWKS_URI=https://api-uat.los.delightech.asia/api/v1/guest/.well-known/jwks.json
LOS_ISSUER=los-backend
LOS_CUSTOMER_AUDIENCE=luyleun

# LOS integration (server-to-server)
LOS_CLIENT_ID=los-backend
LOS_CLIENT_SECRET=<use: openssl rand -hex 32>
```

## Notes

- **Do not set `CLOUDINARY_*` vars** when `STORAGE_DRIVER=db`. Images are stored as binary blobs in the `StoredFile` table on Neon and served at `APP_URL/files/<id>`.
- **Migrations must be run before first deploy.** They have already been applied to the production branch from local dev. For future schema changes run: `pnpm db:migrate` with `DATABASE_URL` pointing to Neon.
- **Seeding.** The production branch has already been seeded (admin user, 5 tiers, 21 permissions, LOS machine client). Do not re-run `pnpm db:seed` in production unless resetting.
- **Railway start command** should be: `node dist/server.js` (or whatever your `pnpm start` resolves to). Ensure `pnpm build` runs first in the Railway build step.
