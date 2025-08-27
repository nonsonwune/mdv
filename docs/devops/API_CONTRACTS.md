# MDV API Contracts

Base URL
- Local dev: NEXT_PUBLIC_API_URL=http://localhost:8000
- Production: set to Railway mdv-api URL; web uses NEXT_PUBLIC_API_URL.

Authentication
- Public endpoints require no auth.
- Admin endpoints require Bearer JWT with role claims. Use scripts/dev/admin_token.sh to mint a short-lived admin token in dev.

Types (informal)
- VariantOut: { id: number, sku: string, size?: string, color?: string, price: number }
- ProductOut: { id: number, title: string, slug: string, description?: string, compare_at_price?: number, variants: VariantOut[] }
- CartItemOut: { id: number, variant_id: number, qty: number }
- CartOut: { id: number, items: CartItemOut[] }
- AddressIn: { name: string, phone: string, state: string, city: string, street: string }
- CheckoutInitRequest: { cart_id: number, address: AddressIn, email: string, coupon_code?: string }
- CheckoutInitResponse: { order_id: number, authorization_url: string, reference: string, totals: object }
- OrderStatus: "PendingPayment" | "Paid" | "Cancelled" | "Refunded"

Public endpoints

New/Updated Endpoints (detailed)

1) Update Cart Item Quantity
- Method: PUT /api/cart/{cart_id}/items/{item_id}
- Purpose: Update qty of a specific cart item
- Path params: cart_id (number), item_id (number)
- Request:
```json
{ "qty": 2 }
```
- Response 200:
```json
{ "id": 123, "items": [ { "id": 456, "variant_id": 999, "qty": 2, "title": "Basic Tee - Black / M", "price": 6500, "image_url": "https://cdn.example.com/img/tee.jpg" } ] }
```
- Errors: 400 invalid qty; 404 not found; 409 stock; 500 server
- Example:
```bash
curl -X PUT "{{API_BASE}}/api/cart/123/items/456" -H "Content-Type: application/json" -d '{ "qty": 2 }'
```

2) Remove Cart Item
- Method: DELETE /api/cart/{cart_id}/items/{item_id}
- Purpose: Remove an item from the cart
- Response 200:
```json
{ "id": 123, "items": [] }
```
- Errors: 404 not found; 500 server
- Example:
```bash
curl -X DELETE "{{API_BASE}}/api/cart/123/items/456"
```

3) Shipping Calculation (Preview)
- Method: GET /api/shipping/calculate
- Purpose: Preview shipping fee pre-checkout
- Query: state (required), subtotal? (number), coupon_code? (string)
- Response 200:
```json
{ "shipping_fee": 2500, "free_shipping_eligible": false, "reason": "Base fee for Lagos" }
```
- Errors: 400 invalid/missing state; 422 unsupported; 500 server
- Example:
```bash
curl "{{API_BASE}}/api/shipping/calculate?state=Lagos&subtotal=13000&coupon_code=SAVE10"
```

4) Authentication: Login
- Method: POST /api/auth/login
- Request:
```json
{ "email": "user@example.com", "password": "example-pass" }
```
- Response 200:
```json
{ "access_token": "eyJhbGciOi...", "role": "staff" }
```
- Errors: 400 malformed; 401 invalid credentials; 429 too many attempts; 500 server
- Example:
```bash
curl -X POST "{{API_BASE}}/api/auth/login" -H "Content-Type: application/json" -d '{ "email": "user@example.com", "password": "example-pass" }'
```
- GET /health
  - 200: { status: "ok", service: "mdv-api", version: "0.1.0" }

- GET /api/products
  - Query: q?, page=1 (>=1), page_size=20 (1..100), sort one of: relevance|newest|price_asc|price_desc
  - 200: { items: ProductOut[], total: number, page: number, page_size: number }

- GET /api/products/{id_or_slug}
  - 200: ProductOut
  - 404 if not found

- POST /api/cart
  - Body: none
  - 200: { id: number }

- GET /api/cart/{cart_id}
  - 200: CartOut
  - 404 if not found

- POST /api/cart/{cart_id}/items
  - Body: { variant_id: number, qty: number >=1 }
  - 200: CartOut (after upsert)
  - 404 if cart or variant missing

- POST /api/checkout/init
  - Body: CheckoutInitRequest
  - 200: CheckoutInitResponse
  - 400 if cart empty; 404 if cart missing; 409 on stock reservation conflicts
  - Notes: Backend sets order.payment_ref and returns authorization_url. In production, this will come from Paystack transaction/initialize; in dev without key, a mock URL is returned.

- GET /api/orders/{order_id}/tracking
  - 200: { order_id: number, status: OrderStatus, timeline: { code: string, at: ISODate, message?: string }[] }

Payments
- POST /api/paystack/webhook
  - Headers: x-paystack-signature: <hex HMAC-SHA512 of raw body with PAYSTACK_SECRET_KEY>
  - Body: Paystack event
  - 200: { ok: true }
  - Behavior: On success events (charge.success, transfer.success, paymentrequest.success), sets Order.Paid, creates Fulfillment if needed, decrements inventory, consumes reservations. On failure events, releases active reservations for that cart.

- GET /api/paystack/verify?reference=REF
  - 200: { ok: true, verified: boolean }
  - Behavior: Calls Paystack verify endpoint; if success, idempotently applies charge.success logic.

Admin (JWT Bearer; roles enforced)
- GET /api/admin/orders
  - Query: status?, page=1, page_size=20
  - 200: { items: { id, status, total }[], total }

- POST /api/admin/fulfillments/{fid}/ready
  - 200: { id, status, packed_by, packed_at }
  - 409 if not Processing or order not Paid

- POST /api/admin/shipments
  - Query params: fulfillment_id, courier, tracking_id (note: consider JSON body post-MVP)
  - 200: { id, status, tracking_id }

- POST /api/admin/shipments/{sid}/status
  - Body: status=Dispatched|InTransit|Delivered|Returned (as enum value)
  - 200: { id, status }
  - 409 invalid transition

- POST /api/admin/orders/{oid}/cancel
  - 200: { id, status }
  - 409 if already shipped or not Paid

- POST /api/admin/orders/{oid}/refund
  - Body: { amount: number, reason?: string, method: "paystack"|"manual", manual_ref?: string }
  - 200: { id, refunded: amount, reason?, method }

Paystack integration flow (target)
- 1) Client submits POST /api/checkout/init with email/address/cart.
- 2) Backend computes totals, creates Order, Reservations (optional), generates reference, calls Paystack POST /transaction/initialize with { email, amount(kobo), reference, currency: "NGN", callback_url }.
- 3) Backend returns authorization_url to client; client redirects user to Paystack.
- 4) Paystack redirects to callback_url; client shows success page and polls GET /api/orders/{order_id}/tracking until status=Paid.
- 5) Paystack webhook POSTs event to /api/paystack/webhook; backend verifies signature and updates order/inventory.
- Optional: Client or backend may call Paystack verify (GET /transaction/verify/{reference}) once if desired.

