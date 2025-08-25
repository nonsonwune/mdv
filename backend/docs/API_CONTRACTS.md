# MDV Backend API Contracts

## Overview
This document provides a comprehensive analysis of all backend API endpoints and their contracts to align the web frontend with the backend implementation.

## Base Configuration
- **Base URL**: Configured via environment variables
- **CORS**: Configured for specific origins or wildcard
- **Rate Limiting**: Implemented using SlowAPI
- **Authentication**: JWT tokens with role-based access control (RBAC)

## Authentication & Authorization

### 1. POST `/api/auth/login`
**Purpose**: Authenticate user with email and password
**Rate Limited**: Yes
**Request Body**:
```json
{
  "email": "string (email)",
  "password": "string"
}
```
**Response**:
```json
{
  "access_token": "string",
  "token": "string",  // Duplicate for compatibility
  "token_type": "bearer",
  "role": "string"
}
```
**Notes**: 
- Supports bcrypt and legacy SHA256 hashes
- Auto-rehashes SHA256 to bcrypt on successful login
- MVP mode auto-creates staff users with @mdv.ng emails

### 2. POST `/api/auth/register`
**Purpose**: Register new user account
**Request Body**:
```json
{
  "name": "string (min: 2, max: 120)",
  "email": "string (email)",
  "password": "string (min: 6)",
  "phone": "string (optional)"
}
```
**Response**:
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "role": "string",
  "user_id": "integer"
}
```

### 3. POST `/api/auth/change-password`
**Purpose**: Change authenticated user's password
**Auth Required**: Yes
**Request Body**:
```json
{
  "current_password": "string",
  "new_password": "string (min: 6)"
}
```

### 4. POST `/api/auth/reset-password`
**Purpose**: Request password reset token
**Request Body**:
```json
{
  "email": "string (email)"
}
```

### 5. POST `/api/auth/refresh`
**Purpose**: Refresh authentication token
**Auth Required**: Yes
**Response**:
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "role": "string"
}
```

### 6. POST `/api/auth/logout`
**Purpose**: Logout user (token blacklist not implemented)
**Auth Required**: Yes

## Public Endpoints

### 1. GET `/health`
**Purpose**: Health check
**Response**:
```json
{
  "status": "ok",
  "service": "mdv-api",
  "version": "0.1.0"
}
```

### 2. GET `/api/products`
**Purpose**: List products with pagination and search
**Query Parameters**:
- `q`: Search query (optional)
- `page`: Page number (default: 1)
- `page_size`: Items per page (1-100, default: 20)
- `sort`: Sort order (relevance|newest|price_asc|price_desc)

**Response**:
```json
{
  "items": [
    {
      "id": "integer",
      "title": "string",
      "slug": "string",
      "description": "string",
      "compare_at_price": "float",
      "variants": [
        {
          "id": "integer",
          "sku": "string",
          "size": "string",
          "color": "string",
          "price": "float"
        }
      ],
      "images": [
        {
          "id": "integer",
          "url": "string",
          "alt_text": "string",
          "width": "integer",
          "height": "integer",
          "sort_order": "integer",
          "is_primary": "boolean"
        }
      ]
    }
  ],
  "total": "integer",
  "page": "integer",
  "page_size": "integer"
}
```

### 3. GET `/api/products/{id_or_slug}`
**Purpose**: Get single product by ID or slug
**Response**: Same as product item in list

## Cart Management

### 1. POST `/api/cart`
**Purpose**: Create new cart
**Response**:
```json
{
  "id": "integer"
}
```

### 2. GET `/api/cart/{cart_id}`
**Purpose**: Get cart details
**Response**:
```json
{
  "id": "integer",
  "items": [
    {
      "id": "integer",
      "variant_id": "integer",
      "qty": "integer",
      "title": "string",
      "price": "float",
      "image_url": "string"
    }
  ]
}
```

### 3. POST `/api/cart/{cart_id}/items`
**Purpose**: Add item to cart (upserts if exists)
**Request Body**:
```json
{
  "variant_id": "integer",
  "qty": "integer (min: 1)"
}
```
**Response**: Full cart object

### 4. PUT `/api/cart/{cart_id}/items/{item_id}` ✅ NEW
**Purpose**: Update cart item quantity
**Request Body**:
```json
{
  "qty": "integer (min: 1)"
}
```
**Response**: Full cart object

### 5. DELETE `/api/cart/{cart_id}/items/{item_id}` ✅ NEW
**Purpose**: Remove item from cart
**Response**: Full cart object

### 6. POST `/api/cart/{cart_id}/clear` ✅ NEW
**Purpose**: Clear all items from cart
**Response**: Empty cart object

## Shipping

### 1. GET `/api/shipping/calculate` ✅ NEW
**Purpose**: Calculate shipping cost preview
**Query Parameters**:
- `state`: Shipping state (required)
- `subtotal`: Cart subtotal (optional, for free shipping threshold)
- `coupon_code`: Coupon code (optional)

**Response**:
```json
{
  "shipping_fee": "float",
  "free_shipping_eligible": "boolean",
  "reason": "string (optional)"
}
```
**Notes**: 
- Lagos free shipping threshold: Configurable via settings
- Zone-based pricing (Lagos, North, Other)

## Checkout

### 1. POST `/api/checkout/init`
**Purpose**: Initialize checkout and create order
**Request Body**:
```json
{
  "cart_id": "integer",
  "address": {
    "name": "string",
    "phone": "string",
    "state": "string",
    "city": "string",
    "street": "string"
  },
  "email": "string",
  "coupon_code": "string (optional)"
}
```
**Response**:
```json
{
  "order_id": "integer",
  "authorization_url": "string",
  "reference": "string",
  "totals": {
    "subtotal": "float",
    "subtotal_eligible": "float",
    "discount": "float",
    "shipping_fee": "float",
    "total": "float",
    "state": "string",
    "coupon": "string"
  }
}
```
**Notes**:
- Creates inventory reservations (15-minute expiry)
- Integrates with Paystack or uses mock endpoint for dev

## Payment Processing

### 1. POST `/api/paystack/webhook`
**Purpose**: Paystack webhook handler
**Headers**: `X-Paystack-Signature` required
**Request Body**: Paystack event payload

### 2. POST `/api/paystack/mock`
**Purpose**: Mock Paystack events (dev/testing)
**Request Body**:
```json
{
  "event": "charge.success | charge.failed",
  "data": {
    "reference": "string"
  }
}
```

### 3. GET `/api/paystack/verify`
**Purpose**: Verify payment status
**Query Parameters**:
- `reference`: Payment reference

**Response**:
```json
{
  "ok": true,
  "verified": "boolean",
  "data": "object (optional)"
}
```

## Order Management

### 1. GET `/api/orders`
**Purpose**: Get user's orders
**Auth Required**: Yes
**Query Parameters**:
- `page`: Page number
- `page_size`: Items per page
- `status`: Filter by status

**Response**:
```json
[
  {
    "id": "integer",
    "status": "string",
    "total": "float",
    "item_count": "integer",
    "created_at": "datetime"
  }
]
```

### 2. GET `/api/orders/{order_id}`
**Purpose**: Get order details
**Auth Required**: Yes
**Response**:
```json
{
  "id": "integer",
  "status": "string",
  "totals": "object",
  "created_at": "datetime",
  "items": [
    {
      "id": "integer",
      "variant_id": "integer",
      "product_name": "string",
      "variant_sku": "string",
      "size": "string",
      "color": "string",
      "qty": "integer",
      "unit_price": "float",
      "subtotal": "float",
      "on_sale": "boolean"
    }
  ],
  "shipping_address": {
    "name": "string",
    "phone": "string",
    "state": "string",
    "city": "string",
    "street": "string"
  },
  "tracking_available": "boolean",
  "can_cancel": "boolean",
  "can_return": "boolean"
}
```

### 3. POST `/api/orders/{order_id}/cancel`
**Purpose**: Cancel order (only if pending payment)
**Auth Required**: Yes

### 4. POST `/api/orders/{order_id}/return`
**Purpose**: Request return for order
**Auth Required**: Yes
**Request Body**:
```json
{
  "reason": "string",
  "items": [
    {"order_item_id": "integer", "qty": "integer"}
  ]
}
```

### 5. GET `/api/orders/{order_id}/tracking`
**Purpose**: Get order tracking information
**Auth Required**: Yes (user) or Public with order_id
**Response**:
```json
{
  "order_id": "integer",
  "status": "string",
  "timeline": [
    {
      "code": "string",
      "at": "datetime",
      "message": "string"
    }
  ]
}
```

### 6. POST `/api/orders/reorder`
**Purpose**: Create new cart from previous order
**Auth Required**: Yes
**Request Body**:
```json
{
  "order_id": "integer"
}
```

## User Profile

### 1. GET `/api/users/profile`
**Purpose**: Get current user profile
**Auth Required**: Yes
**Response**:
```json
{
  "id": "integer",
  "name": "string",
  "email": "string",
  "role": "string",
  "active": "boolean",
  "created_at": "datetime",
  "phone": "string (optional)"
}
```

### 2. PUT `/api/users/profile`
**Purpose**: Update user profile
**Auth Required**: Yes
**Request Body**:
```json
{
  "name": "string (optional)",
  "phone": "string (optional)"
}
```

## Address Management (Planned)

### 1. GET `/api/addresses`
**Purpose**: Get user's saved addresses
**Auth Required**: Yes
**Status**: Returns empty array (needs UserAddress model)

### 2. POST `/api/addresses`
**Purpose**: Create new address
**Auth Required**: Yes
**Request Body**:
```json
{
  "name": "string",
  "phone": "string",
  "state": "string",
  "city": "string",
  "street": "string",
  "is_default": "boolean"
}
```

### 3. PUT `/api/addresses/{address_id}`
**Purpose**: Update address
**Auth Required**: Yes

### 4. DELETE `/api/addresses/{address_id}`
**Purpose**: Delete address
**Auth Required**: Yes

## Wishlist

### 1. GET `/api/wishlist`
**Purpose**: Get user's wishlist
**Auth Required**: Yes
**Response**:
```json
{
  "user_id": "integer",
  "items": [
    {
      "id": "integer",
      "product_id": "integer",
      "variant_id": "integer (optional)",
      "product_name": "string",
      "product_slug": "string",
      "price": "float",
      "image_url": "string",
      "added_at": "datetime",
      "in_stock": "boolean"
    }
  ],
  "total_items": "integer",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```
**Note**: Currently using in-memory storage, needs database table

### 2. POST `/api/wishlist/items`
**Purpose**: Add item to wishlist
**Auth Required**: Yes
**Request Body**:
```json
{
  "product_id": "integer",
  "variant_id": "integer (optional)"
}
```

### 3. DELETE `/api/wishlist/items/{item_id}`
**Purpose**: Remove item from wishlist
**Auth Required**: Yes

### 4. POST `/api/wishlist/items/{item_id}/move-to-cart`
**Purpose**: Move item from wishlist to cart
**Auth Required**: Yes
**Request Body**:
```json
{
  "cart_id": "integer (optional)"
}
```

### 5. DELETE `/api/wishlist`
**Purpose**: Clear entire wishlist
**Auth Required**: Yes

## Product Reviews

### 1. GET `/api/reviews/product/{product_id}`
**Purpose**: Get product reviews
**Query Parameters**:
- `page`: Page number
- `per_page`: Items per page (1-50)
- `sort_by`: recent|helpful|rating_high|rating_low
- `rating_filter`: Filter by rating (1-5)
- `verified_only`: Show only verified purchases

**Response**:
```json
{
  "reviews": [
    {
      "id": "integer",
      "product_id": "integer",
      "variant_id": "integer (optional)",
      "user_id": "integer",
      "user_name": "string",
      "rating": "integer (1-5)",
      "title": "string",
      "comment": "string",
      "would_recommend": "boolean",
      "verified_purchase": "boolean",
      "helpful_count": "integer",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ],
  "total": "integer",
  "page": "integer",
  "per_page": "integer",
  "has_next": "boolean"
}
```
**Note**: Currently using in-memory storage, needs database table

### 2. GET `/api/reviews/product/{product_id}/summary`
**Purpose**: Get review statistics for product
**Response**:
```json
{
  "product_id": "integer",
  "average_rating": "float",
  "total_reviews": "integer",
  "rating_distribution": {
    "1": "integer",
    "2": "integer",
    "3": "integer",
    "4": "integer",
    "5": "integer"
  },
  "recommendation_percentage": "float",
  "verified_purchase_count": "integer"
}
```

### 3. POST `/api/reviews`
**Purpose**: Create product review
**Auth Required**: Yes
**Request Body**:
```json
{
  "product_id": "integer",
  "rating": "integer (1-5)",
  "title": "string (max: 200)",
  "comment": "string (max: 2000)",
  "variant_id": "integer (optional)",
  "would_recommend": "boolean"
}
```

### 4. PUT `/api/reviews/{review_id}`
**Purpose**: Update review
**Auth Required**: Yes (owner only)

### 5. DELETE `/api/reviews/{review_id}`
**Purpose**: Delete review
**Auth Required**: Yes (owner or admin)

### 6. POST `/api/reviews/{review_id}/helpful`
**Purpose**: Vote on review helpfulness
**Auth Required**: Yes
**Request Body**:
```json
{
  "helpful": "boolean"
}
```

### 7. GET `/api/reviews/user/me`
**Purpose**: Get current user's reviews
**Auth Required**: Yes

## Admin Endpoints

### 1. GET `/api/admin/orders`
**Purpose**: List all orders
**Auth Required**: Yes (Staff roles)
**Query Parameters**:
- `status`: Filter by status
- `page`: Page number
- `page_size`: Items per page

### 2. POST `/api/admin/fulfillments/{fid}/ready`
**Purpose**: Mark fulfillment as ready to ship
**Auth Required**: Yes (Fulfillment staff)

### 3. POST `/api/admin/shipments`
**Purpose**: Create shipment
**Auth Required**: Yes (Logistics staff)
**Request Body**:
```json
{
  "fulfillment_id": "integer",
  "courier": "string",
  "tracking_id": "string"
}
```

### 4. POST `/api/admin/shipments/{sid}/status`
**Purpose**: Update shipment status
**Auth Required**: Yes (Logistics staff)
**Request Body**:
```json
{
  "status": "dispatched|in_transit|delivered|returned"
}
```

### 5. POST `/api/admin/orders/{oid}/cancel`
**Purpose**: Cancel order
**Auth Required**: Yes (Supervisors)

### 6. POST `/api/admin/orders/{oid}/refund`
**Purpose**: Process refund
**Auth Required**: Yes (Supervisors)
**Request Body**:
```json
{
  "amount": "float",
  "reason": "string (optional)",
  "method": "paystack|manual",
  "manual_ref": "string (optional)"
}
```

## Key Observations & Recommendations

### Missing/Incomplete Features Requiring Implementation:

1. **Product Images**: 
   - ✅ Schema exists (ProductImage model)
   - ✅ Images are returned in product endpoints
   - ⚠️ No admin endpoints for image upload/management

2. **User Addresses**:
   - ⚠️ UserAddress model needed for saved addresses
   - Currently addresses only stored with orders

3. **Wishlist & Reviews**:
   - ⚠️ Using in-memory storage (not persistent)
   - Need proper database tables

4. **Guest Checkout**:
   - ✅ Checkout doesn't require authentication
   - ⚠️ Need to link guest orders to users when they register

5. **Inventory Management**:
   - ✅ Reservation system implemented (15-minute hold)
   - ⚠️ No admin endpoints for inventory updates

### Critical Additions Made:

1. **Cart Management** ✅:
   - PUT endpoint for updating item quantity
   - DELETE endpoint for removing items
   - POST endpoint for clearing cart

2. **Shipping Preview** ✅:
   - GET endpoint for calculating shipping costs
   - Supports coupon codes and free shipping threshold

### Authentication & RBAC:

**Roles Implemented**:
- `admin`: Full access
- `finance`: Financial operations
- `operations`: Order processing
- `logistics`: Shipping management
- `marketing`: Marketing features
- `support`: Customer support

**Role Groups**:
- ALL_STAFF: All roles
- SUPERVISORS: admin, finance
- FULFILLMENT_STAFF: admin, operations
- LOGISTICS_STAFF: admin, logistics, operations

### Paystack Integration:

- ✅ Full checkout flow with Paystack
- ✅ Mock endpoints for development
- ✅ Webhook handling for payment events
- ✅ Payment verification endpoint

### Frontend Integration Requirements:

1. **Authentication Flow**:
   - Store JWT token from login/register
   - Include token in Authorization header: `Bearer {token}`
   - Handle token refresh

2. **Cart Persistence**:
   - Store cart_id in localStorage/sessionStorage
   - Create new cart when needed

3. **Error Handling**:
   - 401: Authentication required/expired
   - 403: Insufficient permissions
   - 404: Resource not found
   - 409: Conflict (e.g., insufficient stock)
   - 429: Rate limit exceeded

4. **Pagination**:
   - Use page and page_size parameters
   - Check total field for pagination controls

5. **Real-time Features Needed**:
   - Order status updates
   - Inventory availability
   - Payment confirmation

## Development vs Production Considerations

1. **Paystack**:
   - Dev: Uses mock endpoint when no secret key
   - Prod: Requires valid Paystack secret key

2. **CORS**:
   - Dev: Can use wildcard (*)
   - Prod: Should specify exact origins

3. **Rate Limiting**:
   - Login endpoint has specific limits
   - Configure based on expected traffic

4. **Database Migrations**:
   - Alembic migrations ready
   - Need migrations for wishlist and review tables

## Next Steps

1. **Database Models**:
   - Create Wishlist model
   - Create Review model
   - Create UserAddress model
   - Add phone field to User model

2. **Admin APIs**:
   - Product image upload/management
   - Inventory management
   - User management
   - Coupon management

3. **Frontend Alignment**:
   - Update frontend to use new cart endpoints
   - Implement shipping preview
   - Add guest checkout flow
   - Integrate product reviews

4. **Testing**:
   - Create API test suite
   - Mock Paystack for testing
   - Load testing for rate limits

5. **Documentation**:
   - OpenAPI/Swagger spec
   - Postman collection
   - Integration guides
