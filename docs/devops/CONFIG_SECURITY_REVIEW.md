# Configuration & Security Review

Summary
- Config surfaces are sound: FastAPI CORS is constrained by APP_URL; secrets and feature flags are read from env.
- Security improvement: Frontend mock route (web/app/api/paystack/mock/route.ts) has been removed. Mock functionality is now handled by backend endpoints only.
- Payment secrets (PAYSTACK_SECRET_KEY) are isolated to backend services, improving security posture.
- .env.example is missing some keys that exist in backend/mdv/config.py – update recommended.

Findings
- Backend config (backend/mdv/config.py)
  - Required: DATABASE_URL, REDIS_URL, PAYSTACK_PUBLIC_KEY, PAYSTACK_SECRET_KEY, JWT_SECRET, APP_URL
  - Optional: RESEND_API_KEY, RESEND_FROM, EMAIL_FROM_DOMAIN, CLOUDINARY_URL, OTEL_EXPORTER_OTLP_ENDPOINT, SENTRY_DSN
  - Feature flags: ENABLE_* (reservations, SMS, same-day), COUPON_APPLIES_TO_DISCOUNTED, FREE_SHIPPING_THRESHOLD_LAGOS, DEFAULT_REFUND_METHOD
- Web config
  - NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_URL – present in web/.env.local.example
- Security items
  - Payment secrets are isolated to backend services only (PAYSTACK_SECRET_KEY removed from frontend).
  - Mock functionality handled by backend endpoints, eliminating frontend security risks.
  - JWT secret must not be logged or echoed. Scripts correctly avoid printing secrets.
  - CORS depends on APP_URL – ensure correct domain in Railway.
  - Webhook endpoint strictly validates HMAC-SHA512 – correct.
- Script portability
  - Ensure all dev scripts use repo-root relative paths (bootstrap.sh currently uses absolute cd; update later).

Recommendations
- Add missing keys to .env.example: ENABLE_SAME_DAY_LAGOS, COUPON_APPLIES_TO_DISCOUNTED, FREE_SHIPPING_THRESHOLD_LAGOS, DEFAULT_REFUND_METHOD, RESEND_FROM, EMAIL_FROM_DOMAIN.
- Implement mock gating immediately when working on P0 tasks.
- Confirm production domain values and set CORS accordingly (APP_URL).

