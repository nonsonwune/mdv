# Makefile for MDV local dev

.PHONY: help db-up db-down venv deps migrate seed api worker web admin-token paystack-success paystack-fail expire

help:
	@grep -E '^[a-zA-Z_-]+:.*?## ' Makefile | sed 's/:.*## /\t- /'

# Containers
DB_SERVICES = postgres redis

db-up: ## start Postgres & Redis
	docker compose up -d $(DB_SERVICES)
	docker compose ps

db-down: ## stop Postgres & Redis
	docker compose down

# Python env
venv:
	python3 -m venv .venv

deps: venv ## install backend deps
	. .venv/bin/activate && pip install -r backend/requirements.txt

migrate: ## run Alembic migrations
	. .venv/bin/activate && alembic -c backend/alembic.ini upgrade head

seed: ## seed dev data
	. .venv/bin/activate && python -m backend.scripts.seed_dev

api: ## run FastAPI with reload
	. .venv/bin/activate && uvicorn backend.api.main:app --reload --port 8000

worker: ## run background worker
	. .venv/bin/activate && arq backend.worker.settings.WorkerSettings

web: ## run Next.js dev server
	cd web && npm install && npm run dev

# Helpers
admin-token: ## print an admin JWT
	./scripts/dev/admin_token.sh

paystack-success: ## simulate a successful paystack webhook (REF=..., AMOUNT_KOBO=...)
	./scripts/dev/paystack_webhook.sh success

paystack-fail: ## simulate a failed paystack webhook (REF=..., AMOUNT_KOBO=...)
	./scripts/dev/paystack_webhook.sh fail

expire: ## expire old reservations once
	./scripts/dev/expire_reservations.sh

