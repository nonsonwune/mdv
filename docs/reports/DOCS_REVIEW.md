# Documentation Review

What exists
- README.md: Overview, local quick-start for DB, backend, and web; environment variables overview; migration commands; repo layout and notes (CORS, NEXT_PUBLIC_API_URL, webhook signature).
- .env.example and web/.env.local.example templates.

Gaps / updates needed
- README
  - Add link to API contracts (docs/API_CONTRACTS.md)
  - Add Railway deployment guide and Dockerfile usage (after Dockerfiles are added)
  - Add testing section (API + web e2e) after initial suite lands
  - Mention dev-only Paystack mock and gating
- .env.example
  - Add: ENABLE_SAME_DAY_LAGOS, COUPON_APPLIES_TO_DISCOUNTED, FREE_SHIPPING_THRESHOLD_LAGOS, DEFAULT_REFUND_METHOD, RESEND_FROM, EMAIL_FROM_DOMAIN
- New docs (added)
  - docs/PROJECT_STATUS.md: status and action plan
  - docs/API_CONTRACTS.md: endpoints and payloads
  - docs/BACKLOG.md: prioritized backlog and timeline
  - docs/CONFIG_SECURITY_REVIEW.md and docs/DEVOPS_DEPLOYMENT_CHECK.md
  - docs/OPEN_QUESTIONS.md

Next steps
- Update README once Dockerfiles and Railway steps are implemented.
- Keep docs synchronized with changes (contracts/backlog/status).

