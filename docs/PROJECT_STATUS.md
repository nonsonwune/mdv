# Maison De Valeur – Project Status Report

Last updated: 2025-08-24

Executive summary
- The repository contains a complete backend (FastAPI + SQLAlchemy + Alembic), worker (Arq), and a minimal Next.js web app.
- Core catalog, cart, checkout-init, webhook processing, admin flows, and reservation logic exist in the backend; frontend lacks checkout/cart/product-detail UX.
- To reach MVP (full Paystack checkout): implement Paystack transaction initialization in backend, add web flows (product detail, cart, checkout, callback with polling), gate dev-only mocks, and add deployment artifacts for Railway.
- Recommended: Allow Paystack mock only in local and CI via ALLOW_MOCKS=true; disable in production.

1) Codebase analysis
- Backend (FastAPI)
  - Entrypoint: backend/api/main.py – CORS to APP_URL; observability hooks; auto-seeds Zones/StateZone on startup.
  - Public API (backend/api/routers/public.py):
    - GET /health
    - GET /api/products (search/sort/paginated) and GET /api/products/{id_or_slug}
    - POST /api/cart, GET /api/cart/{cart_id}, POST /api/cart/{cart_id}/items
    - POST /api/checkout/init (builds order, computes totals, reserves inventory; currently returns mock authorization_url)
    - GET /api/orders/{order_id}/tracking (order/fulfillment/shipment timeline)
  - Payments (backend/api/routers/payments.py):
    - POST /api/paystack/webhook – verifies HMAC-SHA512; updates order to Paid, adjusts inventory, consumes reservations; releases reservations on failure events.
  - Admin (backend/api/routers/admin.py): list orders, readiness, shipments create/status, order cancel, order refund (JWT/RBAC).
  - Data model: products, variants, inventory, carts, reservations, orders/items, address, fulfillment, shipments/events, coupons, zones/state mapping, returns/refunds, audit logs, users; rich enums.
  - Config (backend/mdv/config.py): DATABASE_URL, REDIS_URL, PAYSTACK_PUBLIC/SECRET, JWT_SECRET, APP_URL, feature flags (reservations, coupons on discounted items, Lagos free shipping threshold, etc.), Sentry/OTEL.
  - Migrations (backend/alembic): comprehensive schema; latest adds refund_method/manual_ref and app_settings table.
- Worker (Arq)
  - expire_reservations job; stub send_email (TODO integrate mdv.emailer).
- Web (Next.js 14, App Router)
  - Implemented: layout, home catalog fetching /api/products; Tailwind theme.
  - Dev-only webhook mock forwarder: app/api/paystack/mock/route.ts (must be gated by env).
  - Missing: product detail, cart, checkout, callback/success pages; tests; ESLint config.
- Scripts & Makefile
  - Targets: db-up/down, deps, migrate, seed, api, worker, web; dev scripts for admin token, webhook simulation, reservation expiry.
- Infra
  - docker-compose: Postgres + Redis only; Railway service env declarations present; Dockerfiles and CI are missing.

2) Documentation review
- README.md: Accurate high-level overview; quick-start works with present backend; lacks API contracts, Railway deployment steps, Docker usage, and test instructions.
- .env.example: Missing keys present in config (e.g., ENABLE_SAME_DAY_LAGOS, COUPON_APPLIES_TO_DISCOUNTED, FREE_SHIPPING_THRESHOLD_LAGOS, DEFAULT_REFUND_METHOD, RESEND_FROM, EMAIL_FROM_DOMAIN).
- No dedicated API spec file; FastAPI auto-OpenAPI exists at /docs during runtime.

3) Project status assessment
- Completed
  - Backend: catalog, cart, checkout-init (mock auth URL), webhook handling, admin operations, reservations, coupons/zones.
  - Worker: reservation expiry.
  - Migrations: full schema; dev scripts.
- Remaining for MVP
  - Backend: call Paystack transaction initialize; optional verify endpoint; finalize callback usage.
  - Frontend: product detail, cart, checkout, callback with polling, basic error states.
  - Security: gate Paystack mock in web app by env (dev/CI only).
  - Deployment: Dockerfiles, Railway config; env wiring for domains/ports.
  - Testing: API, worker, web e2e.
- Potential issues
  - Dev webhook forwarder exposed if not gated; portability of one script; admin endpoints could standardize JSON bodies (post-MVP).
- Fit to goals
  - Not yet end-to-end; with the P0 items done, MVP will be met.

4) Action plan (prioritized)
- P0 – MVP blockers
  - Backend: Implement Paystack transaction initialization (and optional verify endpoint).
  - Web: Implement /product/[slug], /cart, /checkout, /checkout/callback with polling.
  - Security: Gate Paystack mock by NODE_ENV or ALLOW_MOCKS=true; 404 otherwise.
  - Docs: Update .env.example with missing keys.
- P1 – Deployment & DX
  - Dockerfiles (API, Web), Railway service setup (managed Postgres/Redis), local compose or Procfiles.
  - ESLint config, typed API client, initial tests.
- P2 – Hardening & docs
  - Admin refinements, observability wiring, broader test coverage; deployment runbooks.

References
- See docs/API_CONTRACTS.md for endpoint details.
- See docs/BACKLOG.md for task breakdown and timeline.
- See docs/CONFIG_SECURITY_REVIEW.md and docs/DEVOPS_DEPLOYMENT_CHECK.md for reviews.
- See docs/AGENT_STATUS_LOG.md for ongoing status updates.

