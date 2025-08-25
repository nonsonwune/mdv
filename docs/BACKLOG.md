# MDV Backlog & Timeline

Status key: [ ] pending, [x] done, [~] in-progress

P0 – MVP (Full Paystack checkout)
- Backend
  - [ ] Implement Paystack transaction initialization in POST /api/checkout/init (httpx, Authorization header, callback_url)
  - [ ] Optional: Add GET /api/payments/paystack/verify?reference=... for on-demand verification
- Web
  - [ ] /product/[slug] page: render product + variants; add to cart
  - [ ] /cart page: fetch cart, qty updates, proceed to checkout
  - [ ] /checkout page: form (address, email, coupon); POST /api/checkout/init; redirect to authorization_url
  - [ ] /checkout/callback page: read order_id/ref; poll GET /api/orders/{order_id}/tracking until Paid or timeout; UX for failure/retry
  - [ ] Gate app/api/paystack/mock/route.ts with NODE_ENV or ALLOW_MOCKS=true (404 otherwise)
- Repository hygiene
  - [ ] Update .env.example with missing keys (ENABLE_SAME_DAY_LAGOS, COUPON_APPLIES_TO_DISCOUNTED, FREE_SHIPPING_THRESHOLD_LAGOS, DEFAULT_REFUND_METHOD, RESEND_FROM, EMAIL_FROM_DOMAIN)

P1 – Deployment & DX
- DevOps
  - [ ] Dockerfile (backend): uvicorn backend.api.main:app binding $PORT
  - [ ] Dockerfile (web): next build/start binding $PORT (standalone)
  - [ ] Railway: configure mdv-api, mdv-web, managed Postgres/Redis; set APP_URL and NEXT_PUBLIC_API_URL appropriately
  - [ ] Optional: docker-compose services for api and web for one-command local stack
- Developer experience
  - [ ] ESLint config for web; CI lint job
  - [ ] Type-safe API client generated from FastAPI OpenAPI (openapi-typescript)
  - [ ] Initial tests: backend API + webhook; web e2e (add-to-cart → checkout → webhook → success)

P2 – Hardening & docs
- [ ] Admin request body standardization & stricter validation
- [ ] Observability (Sentry/OTEL) tuned and verified in Railway
- [ ] Extended docs (deployment runbooks, operations playbooks, refund/return flows)
- [ ] Broader test coverage and performance checks

Rough timeline
- P0: ~3–5 days
- P1: ~2–3 days
- P2: ~2–4 days

Notes
- See docs/PROJECT_STATUS.md for current assessment.
- See docs/API_CONTRACTS.md for contracts; keep web in sync.

