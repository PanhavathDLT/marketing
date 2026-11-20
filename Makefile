# Environment-aware tasks for backend + frontend.
#
#   make <target> ENV=local|dev|prod      (default: local)
#
#   ENV    backend file            frontend file           database / storage
#   local  backend/.env.local      frontend/.env.local     local Postgres  / Cloudinary
#   dev    backend/.env.dev        frontend/.env.dev       Neon dev branch / Neon dev S3
#   prod   backend/.env.production frontend/.env.production Neon prod      / Neon prod S3
#
# Run `make help` for the list of targets.

ENV ?= local

ifeq ($(ENV),local)
  ENV_SUFFIX := local
else ifeq ($(ENV),dev)
  ENV_SUFFIX := dev
else ifeq ($(ENV),prod)
  ENV_SUFFIX := production
else
  $(error ENV must be one of: local, dev, prod (got "$(ENV)"))
endif

BACKEND_ENV  := backend/.env.$(ENV_SUFFIX)
FRONTEND_ENV := frontend/.env.$(ENV_SUFFIX)

# dotenv-cli from the backend's devDependencies. --override makes the chosen file win
# over anything already exported in your shell (e.g. a stray DATABASE_URL).
DOTENV := $(CURDIR)/backend/node_modules/.bin/dotenv
RUN_BE := cd backend && $(DOTENV) run --override -f .env.$(ENV_SUFFIX) --
RUN_FE := cd frontend && $(DOTENV) run --override -f .env.$(ENV_SUFFIX) --

.DEFAULT_GOAL := help
.PHONY: help check-env confirm-prod local-only \
        migrate migrate-new migrate-status migrate-reset seed setup studio generate \
        backend frontend \
        run-back-local run-back-dev run-back-prod run-front-local run-front-dev run-front-prod

help: ## Show this help
	@echo "Usage: make <target> ENV=local|dev|prod   (default ENV=local)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Examples:"
	@echo "  make run-back-dev                           # API on localhost:4000 using dev DB + storage"
	@echo "  make run-front-dev                          # Next.js on localhost:3000 calling the dev backend"
	@echo "  make migrate-new NAME=add_referral_bonus   # create a migration on local"
	@echo "  make migrate ENV=dev                        # apply migrations to dev"
	@echo "  make seed ENV=prod                          # seed prod (asks to confirm)"

# ─── Guards ─────────────────────────────────────────────────────────────────────

check-env:
	@test -f $(BACKEND_ENV) || { echo "Missing $(BACKEND_ENV)"; exit 1; }
	@test -x $(DOTENV) || { echo "Run 'pnpm install' in backend/ first"; exit 1; }
	@echo "→ ENV=$(ENV) using $(BACKEND_ENV)"

confirm-prod:
ifeq ($(ENV),prod)
	@printf "\033[31mYou are about to run '$(MAKECMDGOALS)' against PRODUCTION.\033[0m Type 'prod' to continue: "; \
	read ans; [ "$$ans" = "prod" ] || { echo "Aborted."; exit 1; }
endif

local-only:
ifneq ($(ENV),local)
	$(error This target only runs with ENV=local)
endif

# ─── Database ───────────────────────────────────────────────────────────────────

migrate: check-env confirm-prod ## Apply pending migrations (local: migrate dev, dev/prod: migrate deploy)
ifeq ($(ENV),local)
	$(RUN_BE) pnpm prisma migrate dev
else
	$(RUN_BE) pnpm prisma migrate deploy
endif

migrate-new: local-only check-env ## Create a new migration from schema changes (local only): NAME=...
	@test -n "$(NAME)" || { echo "Usage: make migrate-new NAME=short_description"; exit 1; }
	$(RUN_BE) pnpm prisma migrate dev --name $(NAME)

migrate-status: check-env ## Show which migrations are applied
	$(RUN_BE) pnpm prisma migrate status

migrate-reset: local-only check-env ## Drop + recreate the local database, re-run migrations and seed (local only)
	$(RUN_BE) pnpm prisma migrate reset

seed: check-env confirm-prod ## Run prisma/seed.ts
	$(RUN_BE) pnpm tsx prisma/seed.ts

setup: migrate seed ## Migrate then seed (first-time setup of a database)

studio: check-env confirm-prod ## Open Prisma Studio
	$(RUN_BE) pnpm prisma studio

generate: ## Regenerate the Prisma client
	cd backend && pnpm prisma generate

# ─── Run apps locally against an environment ────────────────────────────────────

backend: check-env confirm-prod ## Run the API locally (watch mode) with ENV's config
	$(RUN_BE) pnpm tsx watch src/index.ts

frontend: ## Run the Next.js app locally pointed at ENV's backend
	@test -f $(FRONTEND_ENV) || { echo "Missing $(FRONTEND_ENV)"; exit 1; }
	@echo "→ ENV=$(ENV) using $(FRONTEND_ENV)"
	$(RUN_FE) pnpm dev

# ─── Shortcuts (no ENV= needed) ─────────────────────────────────────────────────

run-back-local: ## Backend  → local DB + Cloudinary      (backend/.env.local)
	@$(MAKE) --no-print-directory backend ENV=local

run-back-dev: ## Backend  → Neon dev DB + dev S3        (backend/.env.dev)
	@$(MAKE) --no-print-directory backend ENV=dev

run-back-prod: ## Backend  → PRODUCTION DB (asks to confirm) (backend/.env.production)
	@$(MAKE) --no-print-directory backend ENV=prod

run-front-local: ## Frontend → http://localhost:4000 backend (run-back-* first)
	@$(MAKE) --no-print-directory frontend ENV=local

run-front-dev: ## Frontend → marketing-dev-backend.vercel.app
	@$(MAKE) --no-print-directory frontend ENV=dev

run-front-prod: ## Frontend → marketing-portal-zeta.vercel.app (prod backend)
	@$(MAKE) --no-print-directory frontend ENV=prod
