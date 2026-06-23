#!/bin/bash
# First-time server setup: build, migrate, seed.
# Usage: bash init.sh

set -e

echo "==> Building and starting services..."
docker compose up -d --build

echo "==> Waiting for PostgreSQL to be ready..."
until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done
echo "    PostgreSQL is ready."

echo "==> Running database migrations..."
docker compose exec backend alembic upgrade head

echo "==> Creating admin account..."
docker compose exec backend python -m app.seeds.seed_admin

if [ -f backend/app/seeds/seed_employees.py ]; then
  echo "==> Seeding employees and organizations..."
  docker compose exec backend python -m app.seeds.seed_employees
else
  echo "    seed_employees.py not found, skipping. Add it manually if needed."
fi

echo ""
echo "Done! Open http://localhost"
echo "Login: admin@fc-crm.local / Admin1234!"
echo ""
echo "Don't forget to scan the WhatsApp QR:"
echo "  docker compose logs -f wa-bridge"
