# Static Code Scan Summary (first-party)

Scope
- Web: web/app, web/configs
- Backend: backend/mdv/*, backend/api/*, backend/worker/*, migrations
- Scripts: scripts/dev/*, Makefile

Findings
- TODOs
  - backend/worker/worker.py: send_email TODO to integrate with mdv.emailer
- Next.js routes
  - Implemented: / (home catalog)
  - Present API route: /api/paystack/mock (dev helper; must be gated)
  - Missing: /product/[slug], /cart, /checkout, /checkout/callback
- Backend endpoints
  - Public: health, products (list/get), cart (create/get/add), checkout/init, order tracking
  - Payments: paystack webhook (HMAC verification)
  - Admin: orders list, fulfillment ready, shipments create/status, cancel, refund
- Env usages
  - Backend reads from .env via pydantic-settings; Web reads NEXT_PUBLIC_* and PAYSTACK_SECRET_KEY in app/api/paystack/mock
- Code quality
  - Python: async SQLAlchemy patterns and migrations are consistent; observability is optional via envs
  - Web: Tailwind config present; no ESLint config; TypeScript strict
- Security
  - Paystack mock forwarder requires env gating (dev/CI only)
- Tests
  - No unit/integration/e2e tests yet

