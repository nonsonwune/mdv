# MDV Frontend Gaps Analysis (P0-1)

Last updated: {{DATE}}

This document captures the current status of the MDV web frontend (Next.js 14, App Router) and identifies gaps relative to MVP requirements. It also lists backend dependencies that block specific UI behaviors.

## Summary
- Frontend is feature-complete for MVP user flow with graceful fallbacks where backend endpoints are not yet available.
- Staff RBAC is implemented (login/logout, middleware-protected /admin).
- Full checkout with Paystack is implemented (init + redirect + callback polling + local mock webhook testing).
- Product images: schema proposed; UI supports images when backend returns `images[]`.
- Cart update/remove/clear and shipping preview are implemented in the UI and will work once backend endpoints ship.

## Implemented (Frontend)
- Architecture: Next.js App Router, TS strict, Tailwind, output: standalone (Railway-friendly)
- Pages and features:
  - Home catalog grid with ProductCard, Quick View modal, next/image
  - Product detail page (PDP) with gallery, variant selection, sticky Add to Cart
  - Cart page: qty +/-/remove/clear UI, line totals/subtotal when prices available
  - Checkout page: order summary with line totals, shipping estimate (calls preview endpoint), coupon note
  - Checkout callback: polling + Retry Now + Contact support
  - Mini-cart drawer + live cart count
  - Search: header search bar and /search page (uses `?search=`)
  - Admin: RBAC-protected /admin, /admin/orders, /admin/orders/[id] (token forwarded)
  - Paystack mock: server route with HMAC forward + mock UI gated by env
  - Error/Loading: global error boundary, global loading fallback, global 404
- DX/Infra:
  - Centralized api client and shared types
  - API contracts documentation (docs/api-contracts.md)
  - Product images SQL proposal (docs/sql/product_images.sql)
  - next/image remote domain config via `NEXT_PUBLIC_IMAGE_DOMAINS`

## Backend Dependencies (Blocking or Enabling)
- Cart Management
  - PUT /api/cart/{cart_id}/items/{item_id} (update qty)
  - DELETE /api/cart/{cart_id}/items/{item_id} (remove)
  - POST /api/cart/{cart_id}/clear (clear)
- Shipping Preview
  - GET /api/shipping/calculate?state[&subtotal][&coupon_code]
- Product Images
  - Include `images: ProductImage[]` in product responses
- Authentication
  - POST /api/auth/login should return token and role
- Search
  - Support `GET /api/products?search=query`
- Optional enrichments (improve UI fidelity)
  - Include title/price/image_url on `Cart.items[]` to avoid extra fetches

## Gaps (Frontend, Non-blocking for MVP)
- SEO/Analytics: richer metadata, JSON-LD, analytics provider
- A11y: full audit (ARIA roles, focus management for modals)
- Tests: unit + e2e coverage (Playwright is installed)
- Category filtering/sorting/pagination: scaffolds exist; awaiting backend taxonomy
- Admin actions: change order status once endpoints exist
- Toast notifications: replace alerts with toasts for consistent UX

## Recommendations
1) Ship the missing backend endpoints (cart management, shipping preview, images in product responses).
2) Confirm image CDN domain(s) in `NEXT_PUBLIC_IMAGE_DOMAINS` for next/image.
3) Proceed with API contract formalization (OpenAPI YAML) and generating TS types from it (P0-2).
4) Add tests for core flows (browse → PDP → add to cart → checkout → callback).

## Endpoint Inventory (Used by Frontend)
- GET /api/products
- GET /api/products/{slug}
- POST /api/cart
- POST /api/cart/{id}/items
- GET /api/cart/{id}
- PUT /api/cart/{id}/items/{item_id} (UI wired; pending backend)
- DELETE /api/cart/{id}/items/{item_id} (UI wired; pending backend)
- POST /api/cart/{id}/clear (UI wired; pending backend)
- GET /api/shipping/calculate (UI wired; pending backend)
- POST /api/checkout/init
- GET /api/orders/{id}/tracking
- POST /api/paystack/webhook (via Next server route /api/paystack/mock)
- POST /api/auth/login (proxied via Next /api/auth/login)


