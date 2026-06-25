PROJECT := $(shell basename $(CURDIR))
DC := $(shell command -v docker-compose 2>/dev/null | grep -q . && echo "docker-compose" || echo "docker compose")
SUDO ?=

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
	$(SUDO) $(DC) up -d --build
	@echo "==> Waiting for PostgreSQL..."
	@until $(SUDO) $(DC) exec -T postgres pg_isready -U crm_user -d fc_crm > /dev/null 2>&1; do sleep 1; done
	@echo "    PostgreSQL ready."
	@echo "==> Running migrations..."
	$(SUDO) $(DC) exec backend alembic upgrade head
	@echo "==> Seeding admin account..."
	$(SUDO) $(DC) exec backend python -m app.seeds.seed_admin
	@echo "==> Seeding employees and organizations..."
	$(SUDO) $(DC) exec backend python -m app.seeds.seed_employees
	@echo ""
	@echo "Done! Open http://localhost"
	@echo "Login: admin@fc-crm.local / Admin1234!"
	@echo "WhatsApp QR: make logs-wa"

# ── Lifecycle ──────────────────────────────────────────────────────────────────

up:
	$(SUDO) $(DC) up -d

down:
	$(SUDO) $(DC) down

build:
	$(SUDO) $(DC) build

rebuild:
	$(SUDO) $(DC) build --no-cache

ps:
	$(SUDO) $(DC) ps

# ── Per-service build & restart ───────────────────────────────────────────────

build-backend:
	$(SUDO) $(DC) build backend && $(SUDO) $(DC) rm -f backend && $(SUDO) $(DC) up -d backend

build-frontend:
	$(SUDO) $(DC) build frontend && $(SUDO) $(DC) rm -f frontend && $(SUDO) $(DC) up -d frontend

rebuild-backend:
	$(SUDO) $(DC) build --no-cache backend && $(SUDO) $(DC) rm -f backend && $(SUDO) $(DC) up -d backend

rebuild-frontend:
	$(SUDO) $(DC) build --no-cache frontend && $(SUDO) $(DC) rm -f frontend && $(SUDO) $(DC) up -d frontend

# ── Logs ──────────────────────────────────────────────────────────────────────

logs:
	$(SUDO) $(DC) logs -f

logs-backend:
	$(SUDO) $(DC) logs -f backend

logs-frontend:
	$(SUDO) $(DC) logs -f frontend

logs-db:
	$(SUDO) $(DC) logs -f postgres

logs-wa:
	$(SUDO) $(DC) logs -f wa-bridge

# ── Shells ────────────────────────────────────────────────────────────────────

shell-backend:
	$(SUDO) $(DC) exec backend sh

shell-db:
	$(SUDO) $(DC) exec postgres psql -U crm_user -d fc_crm

# ── Database ──────────────────────────────────────────────────────────────────

migrate:
	$(SUDO) $(DC) exec backend alembic upgrade head

seed:
	$(SUDO) $(DC) exec backend python -m app.seeds.seed_admin
	$(SUDO) $(DC) exec backend python -m app.seeds.seed_employees

clear-db:
	$(SUDO) $(DC) exec backend python -m app.seeds.clear_db

reset-wa:
	$(SUDO) $(DC) rm -sf wa-bridge
	docker volume rm $(PROJECT)_wa_session || true
	$(SUDO) $(DC) up -d wa-bridge
	@echo "==> Scan QR: make logs-wa"
