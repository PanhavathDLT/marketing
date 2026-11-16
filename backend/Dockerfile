# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate && pnpm build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# Copy node_modules (includes prisma CLI needed for migrate deploy)
COPY --from=builder /app/node_modules ./node_modules
# Copy compiled output
COPY --from=builder /app/dist ./dist
# Copy prisma schema + migrations (needed for migrate deploy at runtime)
COPY prisma ./prisma/
# Copy prisma config (needed for prisma migrate deploy to find DATABASE_URL)
COPY prisma.config.ts ./
COPY package.json ./

EXPOSE 4000

# Run pending migrations then start the server
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/index.js"]
