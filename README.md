# Maison De Valeur (MDV)

Monorepo for:
- API: FastAPI (Python 3.12)
- Worker: Arq (Redis-based async jobs)
- Web: Next.js (App Router) + Tailwind

Services (dev): Postgres + Redis via docker-compose.

## Quick start (local)

Prereqs:
- Docker (for Postgres/Redis)
- Python 3.12
- Node 18+ (or 20+)

### 1) Boot DB and cache

```bash
docker compose up -d
```

### 2) Backend setup

```bash
# Copy envs
cp .env.example .env

# Create venv and install deps
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Run API
uvicorn backend.api.main:app --reload --port 8000

# In another shell, run worker
arq backend.worker.settings.WorkerSettings
```

### 3) Web setup

```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev
```

Visit Web: http://localhost:3000
API Docs: http://localhost:8000/docs

## Environment variables

See `.env.example` and `web/.env.local.example`. Required keys (API/Worker):
- DATABASE_URL, REDIS_URL
- PAYSTACK_PUBLIC_KEY, PAYSTACK_SECRET_KEY
- RESEND_API_KEY (optional for emails)
- CLOUDINARY_URL
- APP_URL, JWT_SECRET
- OTEL_EXPORTER_OTLP_ENDPOINT (optional), SENTRY_DSN (optional)

Additional flags used by backend (see docs/CONFIG_SECURITY_REVIEW.md):
- ENABLE_SAME_DAY_LAGOS, COUPON_APPLIES_TO_DISCOUNTED, FREE_SHIPPING_THRESHOLD_LAGOS, DEFAULT_REFUND_METHOD
- RESEND_FROM, EMAIL_FROM_DOMAIN

Web envs:
- NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_URL
- NEXT_PUBLIC_ALLOW_MOCKS (dev/CI only; gates client-side /paystack-mock UI)

## Migrations

```bash
# generate migration (after editing models)
alembic -c backend/alembic.ini revision -m "init" --autogenerate
# apply
alembic -c backend/alembic.ini upgrade head
```

## Repo layout

- backend/
  - mdv/ (shared python package: models, config, utils)
  - api/ (FastAPI app)
  - worker/ (Arq background jobs)
  - alembic/ (migrations)
- web/ (Next.js app)

## Notes
- CORS is restricted via APP_URL in env.
- Web uses NEXT_PUBLIC_API_URL to call the API.
- Paystack webhook requires correct signature header (HMAC-SHA512).

