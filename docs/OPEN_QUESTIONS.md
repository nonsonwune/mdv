# Open Questions & Decisions

Decisions already provided
- Backend/worker code lives in this repo – confirmed.
- MVP scope: full checkout with Paystack – confirmed.
- Paystack mock: keep in repo; determine best environment gating – requested (recommended: dev and CI only via ALLOW_MOCKS=true).
- Deployment: both backend and frontend on Railway; avoid Vercel – confirmed.
- API contracts: not previously defined – requested and now documented in docs/API_CONTRACTS.md.

Open questions
1) Callback UX and verification
- Do we want a backend verify endpoint (Paystack verify) to be called by the callback page once, or rely purely on webhook + polling? Recommendation: rely on webhook + polling with optional verify for faster feedback.

2) Email receipts
- Should we send email confirmation upon Paid? We can enqueue worker.send_email (and integrate mdv.emailer) on order Paid.

3) JWT lifetime and admin usage
- Current admin token script issues 30–60 minute tokens; is that sufficient for operations? Any plan for a proper auth UI?

4) Mock gating details
- Env key names: ALLOW_MOCKS=true (dev/CI). Confirm acceptable. Production default is false.

5) Reservation expiry SLA
- Current expiry = 15 minutes in checkout_init; confirm acceptable for Nigeria-only checkout and inventory strategy.

6) Payment reference format
- Format "MDV-{order.id}-{timestamp}" – confirm this meets reporting and reconciliation needs.

7) Shipping zones and fees
- Current seed adds 3 zones (Lagos/North/Other); do we need more granular mappings now or post-MVP?

Please comment in this file or in PRs to resolve these.

