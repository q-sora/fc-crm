PROJECT := $(shell basename $(CURDIR))
DC = docker compose

.PHONY: up down build rebuild logs ps \
        init setup \
        build-backend build-frontend \
        rebuild-backend rebuild-frontend \
        logs-backend logs-frontend logs-db \
        shell-backend shell-db \
        migrate seed clear-db reset-wa

# ── First-time setup ───────────────────────────────────────────────────────────

init:
	@echo "==> Building all images..."
	$(DC) up -d --build
	@echo "==> Waiting for PostgreSQL..."
	@until $(DC) exec -T postgres pg_isready -U crm_user -d fc_crm > /dev/null 2>&1; do sleep 1; done
	@echo "    PostgreSQL ready."
	@echo "==> Running migrations..."
	$(DC) exec backend alembic upgrade head
	@echo "==> Seeding admin account..."
	$(DC) exec backend python -m app.seeds.seed_admin
	@echo "==> Seeding employees and organizations..."
	$(DC) exec backend python -m app.seeds.seed_employees
	@echo ""
	@echo "Done! Open http://localhost"
	@echo "Login: admin@fc-crm.local / Admin1234!"
	@echo "WhatsApp QR: make logs-wa"

# ── Lifecycle ──────────────────────────────────────────────────────────────────

up:
	$(DC) up -d

down:
	$(DC) down

build:
	$(DC) build

rebuild:
	$(DC) build --no-cache

ps:
	$(DC) ps

# ── Per-service build & restart ───────────────────────────────────────────────

build-backend:
	$(DC) build backend && $(DC) up -d backend

build-frontend:
	$(DC) build frontend && $(DC) up -d frontend

rebuild-backend:
	$(DC) build --no-cache backend && $(DC) up -d backend

rebuild-frontend:
	$(DC) build --no-cache frontend && $(DC) up -d frontend

# ── Logs ──────────────────────────────────────────────────────────────────────

logs:
	$(DC) logs -f

logs-backend:
	$(DC) logs -f backend

logs-frontend:
	$(DC) logs -f frontend

logs-db:
	$(DC) logs -f postgres

logs-wa:
	$(DC) logs -f wa-bridge

# ── Shells ────────────────────────────────────────────────────────────────────

shell-backend:
	$(DC) exec backend sh

shell-db:
	$(DC) exec postgres psql -U crm_user -d fc_crm

# ── Database ──────────────────────────────────────────────────────────────────

migrate:
	$(DC) exec backend alembic upgrade head

seed:
	$(DC) exec backend python -m app.seeds.seed_admin
	$(DC) exec backend python -m app.seeds.seed_employees

clear-db:
	$(DC) exec backend python -m app.seeds.clear_db

reset-wa:
	$(DC) rm -sf wa-bridge
	docker volume rm $(PROJECT)_wa_session || true
	$(DC) up -d wa-bridge
	@echo "==> Scan QR: make logs-wa"
