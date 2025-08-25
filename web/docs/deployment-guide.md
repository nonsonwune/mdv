# Railway Deployment Guide for MDV Web (Next.js)

This guide describes deploying the web app to Railway.

## Prerequisites
- Railway project created
- Docker or Nixpacks auto-detection (Next.js is supported)

## Build & Run
- Build: `npm run build`
- Start: `npm run start:prod` (binds to `$PORT` provided by Railway)

## Environment Variables (Railway)
- NEXT_PUBLIC_API_URL = https://<backend-on-railway>
- NEXT_PUBLIC_IMAGE_DOMAINS = cdn.example.com[,another.domain]
- ALLOW_MOCKS = false
- NEXT_PUBLIC_ALLOW_MOCKS = false
- PAYSTACK_SECRET_KEY = <your_secret> (only for dev/staging with mock; avoid in prod if not needed)

Optional (staging):
- ALLOW_MOCKS = true
- NEXT_PUBLIC_ALLOW_MOCKS = true

## Health check
- Next.js apps can serve `/` as a health endpoint, or create `/api/health` route if needed.

## Notes
- `next.config.mjs` uses `output: 'standalone'` for smaller runtime image and easier deploys.
- For next/image, ensure `NEXT_PUBLIC_IMAGE_DOMAINS` includes the hostnames of product images.
- Ensure CORS is configured on the backend to allow the web origin.

## CI Tip
- Cache node_modules for faster builds.
- Run `npm run types:api` during CI if you want up-to-date types; it only affects `.d.ts` files.

