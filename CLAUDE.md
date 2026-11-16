# CLAUDE.md

## Repository layout

Two independent packages — no shared root `package.json` or `pnpm-workspace.yaml`. Run commands from each package's directory.

- `frontend/` — Next.js 16 + Tailwind CSS + shadcn/ui admin dashboard. No CLAUDE.md yet; see `frontend/README.md` and `docs/frontend/agent_tips.md`.
- `backend/` — Express 5 + Prisma 7 (PostgreSQL) REST API. See `docs/backend/backend_project_guidelines.md` for conventions.
- `docs/` — shared docs:
  - `docs/backend/` — backend guidelines (`backend_project_guidelines.md`), API handoff (`api-handoff.md`), feature designs (`features/`). `architecture.md` describes the **LOS backend** reference architecture, not this repo directly.
  - `docs/frontend/` — frontend agent tips (`agent_tips.md`).
  - `docs/mobile/` — the Flutter customer app (another repo); reference only.

## Frontend (`frontend/`)

```
pnpm dev       # Next.js dev server
pnpm build     # production build
pnpm lint      # ESLint
```

Source layout: `src/app/` (App Router), `src/components/`, `src/features/`, `src/lib/`.

## Backend (`backend/`)

```
pnpm dev           # nodemon + tsx watch
pnpm build         # tsc + tsc-alias
pnpm type-check    # tsc --noEmit (run this to verify backend changes)
pnpm db:generate   # prisma generate
pnpm db:migrate    # prisma migrate dev
pnpm db:seed       # prisma db seed
pnpm db:studio     # prisma studio
```
