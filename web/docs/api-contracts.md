# MDV API Contracts (Frontend ↔ Backend)

This document records current and proposed backend endpoints to support the MDV web frontend (Next.js 14). It complements Swagger and should be reflected there.

Base URL: ${NEXT_PUBLIC_API_URL} (e.g., http://localhost:8000)

---
## 1) Products

- GET /api/products
  - Query: optional pagination/filtering when available
  - Response:
    {
      "items": [Product]
    }

- GET /api/products/{id-or-slug}
  - Response: Product

- Schema: Product
  - id: number
  - title: string
  - slug: string
  - description?: string | null
  - compare_at_price?: number | null
  - variants: Variant[]
  - images?: ProductImage[]  ← NEW

- Schema: Variant
  - id: number
  - sku: string
  - size?: string | null
  - color?: string | null
  - price: number

- Schema: ProductImage (NEW)
  - id: number
  - url: string (absolute URL)
  - alt_text?: string | null
  - width?: number | null
  - height?: number | null
  - sort_order?: number (default 0)
  - is_primary?: boolean (default false)

---
## 2) Cart

- POST /api/cart
  - Purpose: create cart
  - Response: { id: number }

- GET /api/cart/{cart_id}
  - Response: Cart

- POST /api/cart/{cart_id}/items
  - Body: { variant_id: number, qty: number }
  - Response: Cart

- PUT /api/cart/{cart_id}/items/{item_id}  ← NEW
  - Body: { qty: number }
  - Response: Cart

- DELETE /api/cart/{cart_id}/items/{item_id}  ← NEW
  - Response: Cart

- POST /api/cart/{cart_id}/clear  ← NEW
  - Response: Cart (empty)

- Schema: Cart
  - id: number
  - items: CartItem[]

- Schema: CartItem
  - id: number
  - variant_id: number
  - qty: number
  - (Optionally enrich)
    - title?: string
    - price?: number
    - image_url?: string

---
## 3) Checkout / Orders / Payments

- POST /api/checkout/init
  - Body:
    {
      "cart_id": number,
      "address": { name, phone, state, city, street },
      "email": string,
      "coupon_code": string | null
    }
  - Response:
    {
      "authorization_url": string,
      "order_id"?: number,
      "reference"?: string
    }

- GET /api/orders/{order_id}/tracking
  - Response: { status: "Paid" | "PendingPayment" | string }

- POST /api/paystack/webhook
  - Headers: x-paystack-signature (HMAC-SHA512)
  - Body: Paystack event payload

---
## 4) Shipping Preview (NEW)

- GET /api/shipping/calculate
  - Query: state (required), subtotal? (optional), coupon_code? (optional)
  - Response: { shipping_fee: number, free_shipping_eligible: boolean, reason?: string | null }

Notes:
- Even if subtotal is omitted, backend should fall back to internal rules or cart-based calculation where possible. Frontend will pass subtotal once line items include price.

---
## 5) Authentication & RBAC (Staff)

- POST /api/auth/login
  - Body: { email: string, password: string }
  - Response:
    {
      "token"?: string,
      "access_token"?: string,
      "role"?: "staff" | "admin" | "customer"
    }

Frontend behavior:
- Stores mdv_token and mdv_role as httpOnly cookies via Next API route /api/auth/login.
- Middleware protects /admin routes for role in { staff, admin }.

---
## Example JSON payloads

ProductImage:
{
  "id": 1,
  "url": "https://cdn.example.com/products/abc.jpg",
  "alt_text": "Front view",
  "width": 1200,
  "height": 1200,
  "sort_order": 0,
  "is_primary": true
}

Shipping estimate:
{
  "shipping_fee": 2500,
  "free_shipping_eligible": false,
  "reason": "Base fee for Lagos"
}

