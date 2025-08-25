# Paystack Configuration Summary

## Overview
This document summarizes the Paystack API test credentials configuration across the MDV E-commerce platform codebase.

## Test Credentials
The following Paystack test credentials have been configured:

- **Test Public Key**: `pk_test_e9d154ef5d6f2907b86b407f2f68dcd33fa19921`
- **Test Secret Key**: `sk_test_6f984887d1d8089c5212cf5c6e4ce2c43d1b8bb1`

## Configuration Locations

### Backend Services
The backend services use both public and secret keys for API operations and webhook signature verification.

#### 1. Root `.env` file
- **Path**: `/Users/mac/Repository/mdv/.env`
- **Variables**: 
  - `PAYSTACK_PUBLIC_KEY` - For API operations
  - `PAYSTACK_SECRET_KEY` - For webhook signature verification

#### 2. Backend `.env` file  
- **Path**: `/Users/mac/Repository/mdv/backend/.env`
- **Variables**:
  - `PAYSTACK_PUBLIC_KEY` - For API operations
  - `PAYSTACK_SECRET_KEY` - For webhook signature verification

### Frontend Service
The frontend uses the public key for client-side payment initialization and secret key only for the mock webhook route.

#### 3. Web `.env.local` file
- **Path**: `/Users/mac/Repository/mdv/web/.env.local`
- **Variables**:
  - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` - For client-side Paystack SDK
  - `PAYSTACK_SECRET_KEY` - For mock webhook route (server-side only)

### Example Files
The following example files have been updated with the test credentials for developer reference:

- `/Users/mac/Repository/mdv/.env.example`
- `/Users/mac/Repository/mdv/web/.env.local.example`

### Railway Deployment Configuration

#### railway.json
- **Path**: `/Users/mac/Repository/mdv/railway.json`
- **Updates**: Added `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` to the mdv-web service environment variables list

#### Railway Environment Documentation
- **Path**: `/Users/mac/Repository/mdv/docs/RAILWAY_ENVS.md`
- **Updates**: Documented the required Paystack environment variables for both backend and frontend services

## Integration Points

### Backend Integration
1. **Webhook Handler** (`backend/mdv/paystack.py`)
   - Uses `PAYSTACK_SECRET_KEY` for HMAC-SHA512 signature verification
   - Handles payment success/failure events

2. **Payment API** (`backend/api/routers/payments.py`)
   - Uses `PAYSTACK_PUBLIC_KEY` and `PAYSTACK_SECRET_KEY` for API operations

3. **Configuration** (`backend/mdv/config.py`)
   - Loads Paystack keys from environment variables

### Frontend Integration
1. **Checkout Page** (`web/app/checkout/page.tsx`)
   - Initiates payment flow
   - Redirects to Paystack or mock payment page

2. **Mock Webhook Route** (`web/app/api/paystack/mock/route.ts`)
   - Uses `PAYSTACK_SECRET_KEY` for test webhook signature generation
   - Only active when `ALLOW_MOCKS=true`

3. **Mock Payment Page** (`web/app/paystack-mock/page.tsx`)
   - Simulates Paystack payment flow for testing
   - Only accessible when `NEXT_PUBLIC_ALLOW_MOCKS=true`

## Testing Instructions

### Test Card Details
Use these test card details when testing payment flow:

- **Card Number**: 4084084084084081
- **CVV**: 408
- **Expiry**: Any future date (e.g., 12/25)
- **PIN**: 0000 (if requested)

### Testing Steps
1. Start the backend service: `cd backend && uvicorn api.main:app --reload`
2. Start the frontend service: `cd web && npm run dev`
3. Add items to cart
4. Navigate to checkout page
5. Fill in checkout form with test data
6. Click "Pay with Paystack"
7. If mock mode is enabled, you'll be redirected to `/paystack-mock`
8. Complete the mock payment flow
9. Verify order status is updated to "paid"

### Mock Mode
To enable mock payment flow (for local development):
- Set `NEXT_PUBLIC_ALLOW_MOCKS=true` in `web/.env.local`
- Set `ALLOW_MOCKS=true` in `web/.env.local`

## Security Notes

1. **Never commit production keys** - The configured keys are test-only credentials
2. **Secret key protection** - The secret key is never exposed to the client-side
3. **Environment-specific keys** - Use different keys for development, staging, and production
4. **Railway deployments** - Update Railway environment variables through the Railway dashboard, not in code

## Migration to Production

When ready to use live Paystack credentials:

1. Obtain production keys from Paystack dashboard
2. Update Railway environment variables:
   - `PAYSTACK_PUBLIC_KEY=pk_live_xxx`
   - `PAYSTACK_SECRET_KEY=sk_live_xxx`
   - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxx`
3. Set `ENV=prod` in backend services
4. Disable mock modes:
   - `ALLOW_MOCKS=false`
   - `NEXT_PUBLIC_ALLOW_MOCKS=false`

## References

- [Paystack Documentation](https://paystack.com/docs)
- [Paystack Test Cards](https://paystack.com/docs/payments/test-payments)
- [Webhook Signature Verification](https://paystack.com/docs/api/webhooks)
