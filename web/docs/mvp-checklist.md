# MDV Frontend MVP Checklist (P0-1)

Status legend: ✅ complete · ⚠️ partial (backend-dependent) · ⏳ planned

- Catalog
  - ✅ Product list with images, title, price
  - ✅ Quick View modal with add-to-cart link
  - ✅ Product detail page with gallery, variant select, sticky Add to Cart
  - ✅ next/image with env-configured domains
  - ⏳ SEO tags and JSON-LD per page

- Cart
  - ✅ Create cart, add item (via PDP and query add flow)
  - ✅ View cart: items, qty controls, remove, clear (UI wired)
  - ⚠️ Qty update/remove/clear require backend endpoints to function
  - ✅ Subtotal and line totals when price provided
  - ✅ Mini-cart drawer and header badge

- Checkout
  - ✅ Single-page form, guest checkout
  - ✅ Checkout init -> Paystack redirect
  - ✅ Order summary with line totals (when prices available)
  - ⚠️ Shipping estimate via GET /api/shipping/calculate (awaiting backend)
  - ✅ Callback page with polling + retry + support link
  - ✅ Paystack mock UI + server route (HMAC forward)

- Auth & Admin
  - ✅ Staff login via backend proxy; httpOnly cookies
  - ✅ RBAC middleware for /admin
  - ✅ Admin dashboard scaffolding
  - ✅ Orders list and detail (token forwarded)
  - ⏳ Order status actions (await backend)

- Navigation & Search
  - ✅ Header nav to scaffolded categories
  - ✅ SearchBar -> /search; search results page using /api/products?search=
  - ⏳ Real categories/taxonomy + filtering/sorting (await backend)

- DevX & Observability
  - ✅ Centralized API client & types
  - ✅ API contracts doc and ProductImage SQL proposal
  - ✅ Global error boundary, global loading, and 404
  - ⏳ Unit/E2E tests (Playwright installed; tests to be added)
  - ⏳ Analytics (Plausible/GA)

Conclusion: P0-1 frontend is complete from an implementation perspective. Remaining blockers are backend endpoints and data enrichment noted above. Proceed to P0-2 to formalize API contracts and generate types, then P0-4 to enhance catalog/cart behaviors with filters and fully functional cart updates once backend lands.

