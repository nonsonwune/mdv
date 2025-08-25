# Deploying MDV to Railway

Overview
- Services: mdv-api (backend), mdv-web (frontend), mdv-postgres (managed), mdv-redis (managed)
- Build: Dockerfile.backend for API, Dockerfile.web for Web

Prerequisites
- Ensure .env variables exist in Railway for each service (see .env.example). Never commit real secrets.

API service (mdv-api)
- Repository: this monorepo
- Build: Dockerfile path = Dockerfile.backend
- Start command: (Dockerfile CMD already runs Alembic migration then Uvicorn)
- Ports: Railway will map $PORT; the image listens on 8000 (OK)
- Env vars:
  - ENV=prod
  - APP_URL=https://<your-web-domain>
-  - DATABASE_URL=postgresql+asyncpg://user:pass@host:port/db (async driver for SQLAlchemy AsyncEngine)
  - REDIS_URL=redis://host:port/0 (from managed Redis)
  - PAYSTACK_PUBLIC_KEY, PAYSTACK_SECRET_KEY
  - JWT_SECRET
  - Optional: OTEL_EXPORTER_OTLP_ENDPOINT, SENTRY_DSN, RESEND_API_KEY, RESEND_FROM, EMAIL_FROM_DOMAIN, CLOUDINARY_URL

Web service (mdv-web)
- Repository: this monorepo
- Build: Dockerfile path = Dockerfile.web
- Start command: (Dockerfile CMD already runs Next standalone on 3000)
- Ports: Railway will map $PORT; the image listens on 3000 (OK)
- Env vars:
  - NEXT_PUBLIC_API_URL=https://<your-api-domain>
  - NEXT_PUBLIC_APP_URL=https://<your-web-domain>
  - ALLOW_MOCKS=false (default)
  - NEXT_PUBLIC_ALLOW_MOCKS=false (default)

Managed services
- Add mdv-postgres and mdv-redis in Railway; connect their URLs to mdv-api envs.

CORS and callback
- APP_URL must be set to the web domain so FastAPI CORS allows it.
- Paystack callback_url is set to `${APP_URL}/checkout/callback?order_id=...&ref=...`.

Smoke test
- After deploy, seed the DB locally or via a one-off task:
  - In a shell, run: `alembic -c backend/alembic.ini upgrade head` (runs automatically on container start) and `python -m backend.scripts.seed_dev` (or create a job/task in Railway).
- Visit web home, add to cart, checkout, confirm on Paystack (test or live keys), observe webhook updating order to Paid, callback page shows success.

Troubleshooting
- Check API logs if Paystack init fails (502 errors). Ensure keys are correct and Paystack allows your domain.
- Verify webhook secret, and that the webhook URL is reachable from Paystack (public domain).

