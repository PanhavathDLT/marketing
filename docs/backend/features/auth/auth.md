# Authentication — How It Works

> **Updated:** 2026-11-17  
> Covers all three consumer auth flows for the marketing backend.

---

## Overview

The marketing backend serves three distinct consumers, each with its own auth mechanism:

| Consumer | Method | Entry point |
|---|---|---|
| **Mobile customer** (Flutter) | Exchange LOS JWT → marketing JWT | `POST /auth/session` |
| **Admin dashboard** (web) | Email + password → marketing JWT | `POST /auth/login` |
| **LOS backend** (server-to-server) | `X-Client-Id` + `X-Client-Secret` headers | Every `/los/*` request |

---

## 1. Mobile Customer — LOS JWT Exchange

### Why this flow exists

The mobile app already holds a JWT issued by the LOS (loan origination system) after the customer logs in there. The marketing backend trusts this token — it verifies it using the LOS's public keys instead of asking the customer to register or log in again.

### Flow

```
Mobile App                      LOS System                  Marketing Backend
    │                               │                               │
    │  Customer opens Reward screen │                               │
    │                               │                               │
    │── POST /auth/session ─────────────────────────────────────────▶│
    │   { "losToken": "<LOS JWT>" }                                 │
    │                               │                               │
    │                               │◀── GET JWKS (public keys) ───│
    │                               │─── JWKS response ────────────▶│
    │                               │    verify signature           │
    │                               │    check issuer = "los-backend"│
    │                               │    check audience = "luyleun" │
    │                               │                               │
    │                               │        extract losUserId      │
    │                               │        find or create         │
    │                               │        CustomerProfile        │
    │                               │                               │
    │◀── { accessToken, refreshToken } ────────────────────────────│
    │                               │                               │
    │── GET /customer/reward/... ───────────────────────────────────▶│
    │   Authorization: Bearer <accessToken>                         │
```

### JWT verification steps

The marketing backend performs three checks on the LOS token:

1. **Signature** — verified using the LOS's public JWKS endpoint (`LOS_JWKS_URI`)
2. **Issuer** — `iss` claim must equal `LOS_ISSUER` (default: `los-backend`)
3. **Audience** — `aud` claim must equal `LOS_CUSTOMER_AUDIENCE` (default: `luyleun`)

If any check fails → `401 Invalid LOS token`.

### CustomerProfile auto-creation

When the LOS token is valid but no `CustomerProfile` exists yet for that `losUserId`, the marketing backend **auto-creates one** — the mobile customer never has a separate registration step.

The LOS backend may have already created the profile earlier (if it fired a mission event before the customer opened the reward screen). In that case `POST /auth/session` finds the existing profile and links it, so no progress is lost.

### Token pair

On success the marketing backend issues its own short-lived token pair:

| Token | Lifetime | Use |
|---|---|---|
| `accessToken` | 1 hour (`JWT_EXPIRES_IN`) | `Authorization: Bearer <token>` on every request |
| `refreshToken` | 7 days (`JWT_REFRESH_EXPIRES_IN`) | Body of `POST /auth/refresh` |

Both are HS256, signed with `JWT_SECRET` / `JWT_REFRESH_SECRET`.

### Refresh flow

```
1. Request fails → 401
2. POST /auth/refresh  { "refreshToken": "eyJ..." }
3. Store new accessToken + refreshToken
4. Retry original request
```

Refresh tokens are stored **hashed** in the `RefreshToken` table (`tokenHash`, `expiresAt`, `revokedAt`). On refresh, the backend hashes the incoming token and looks it up — this means a stolen refresh token cannot be used after it's been rotated.

---

## 2. Admin Dashboard — Email + Password

### Flow

```
Admin Web App                                       Marketing Backend
    │                                                       │
    │── POST /auth/login ───────────────────────────────────▶│
    │   { "email": "...", "password": "..." }               │
    │                               bcrypt.compare(password, StaffProfile.password)
    │◀── { accessToken, refreshToken, user } ───────────────│
    │                                                       │
    │── GET /admin/campaigns ───────────────────────────────▶│
    │   Authorization: Bearer <accessToken>                 │
    │                               authenticate middleware  │
    │                               requireRole('ADMIN')    │
    │                               requirePermission(...)  │
```

### Permission model

Admin users have two tiers:

| Type | Condition | Access |
|---|---|---|
| **Super admin** | `StaffProfile.staffRoleId = null` | All admin endpoints, no permission checks |
| **Scoped admin** | `staffRoleId` assigned | Only endpoints whose `(module, action)` is in their role's permission set |

The `requirePermission(module, action)` middleware (in `permission.middleware.ts`) reads the user's `StaffRole → permissions` and returns `403` if the required permission is missing.

Fetch `GET /admin/user-management/permissions` to get the full permission catalogue for building the UI.

### Password storage

Passwords are bcrypt-hashed (`BCRYPT_SALT_ROUNDS`, default `12`) and stored in `StaffProfile.password`. The plaintext is never stored.

---

## 3. LOS Backend — Server-to-Server (MachineClient)

### Why not JWT here

JWT is designed for user identity. For machine-to-machine calls there is no user to authenticate — there is a service. The `MachineClient` pattern uses a named `clientId` (identity) and a `clientSecret` (proof) instead.

### Flow

```
LOS Backend                                         Marketing Backend
    │                                                       │
    │── POST /los/missions/complete ───────────────────────▶│
    │   X-Client-Id:     los-backend                        │
    │   X-Client-Secret: <plaintext secret>                 │
    │                                                       │
    │                       1. look up MachineClient        │
    │                          WHERE clientId = 'los-backend'│
    │                       2. bcrypt.compare(              │
    │                            secret,                    │
    │                            MachineClient.clientSecret │
    │                          )                            │
    │                       3. if valid → next()            │
    │                          else → 401                   │
    │                                                       │
    │◀── 200 { triggered: true } ──────────────────────────│
```

### Credential setup

Credentials are provisioned once by the marketing backend team:

1. Add `LOS_CLIENT_ID` and `LOS_CLIENT_SECRET` to `.env`
2. Run `pnpm db:seed` — this bcrypt-hashes the secret and upserts a `MachineClient` row
3. Share `LOS_CLIENT_ID` and `LOS_CLIENT_SECRET` (plaintext) with the LOS backend team **via a secure channel** (not email or chat)
4. LOS backend sets these as environment variables and sends them as headers on every `/los/*` request

The marketing backend stores only the **bcrypt hash** — the plaintext is never persisted anywhere.

### Adding more machine clients

To onboard a second external system (e.g. a notification service):

1. Add a new row directly to the `MachineClient` table via Prisma Studio, or extend `seed.ts`
2. Share the plaintext `clientId` + `clientSecret` with the new system

Each `clientId` is unique — the backend can distinguish callers and apply different logic per client in the future.

### Security notes

- Both `X-Client-Id` and `X-Client-Secret` must be present — missing either returns `401`
- The bcrypt comparison adds ~100 ms intentional delay — this is expected and prevents timing attacks
- Rotate the secret by updating `LOS_CLIENT_SECRET` in `.env`, re-running `pnpm db:seed`, and sharing the new value with the LOS team

---

## Environment Variables Reference

| Variable | Used by | Notes |
|---|---|---|
| `JWT_SECRET` | Admin + Mobile | Access token signing key (min 32 chars) |
| `JWT_EXPIRES_IN` | Admin + Mobile | Default `1h` |
| `JWT_REFRESH_SECRET` | Admin + Mobile | Refresh token signing key (min 32 chars) |
| `JWT_REFRESH_EXPIRES_IN` | Admin + Mobile | Default `7d` |
| `LOS_JWKS_URI` | Mobile | LOS public key endpoint for JWT verification |
| `LOS_ISSUER` | Mobile | Expected `iss` claim in LOS JWT. Default: `los-backend` |
| `LOS_CUSTOMER_AUDIENCE` | Mobile | Expected `aud` claim in LOS JWT. Default: `luyleun` |
| `LOS_CLIENT_ID` | LOS backend | Machine client identity. Default: `los-backend` |
| `LOS_CLIENT_SECRET` | LOS backend | Machine client secret (plaintext in env, hashed in DB) |
| `BCRYPT_SALT_ROUNDS` | All | Default `12` |

---

## Middleware Reference

| File | What it does |
|---|---|
| `auth.middleware.ts` | `authenticate` — verifies marketing JWT via Passport; `requireRole()` — checks `CUSTOMER` or `ADMIN` |
| `permission.middleware.ts` | `requirePermission(module, action)` — checks scoped admin's StaffRole permissions |
| `external-server.middleware.ts` | `requireExternalServerClient()` — verifies `X-Client-Id` + `X-Client-Secret` against `MachineClient` table |
