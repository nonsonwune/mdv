# Railway ENV Matrix (MVP)

Service: mdv-api (backend)
- ENV=prod
- APP_URL=https://<web-domain>
- DATABASE_URL={{railway.postgres.DATABASE_URL}} (ensure it uses postgresql+asyncpg://)
- REDIS_URL={{railway.redis.URL}}
- PAYSTACK_PUBLIC_KEY=pk_test_e9d154ef5d6f2907b86b407f2f68dcd33fa19921 (staging) / pk_live_xxx (prod)
- PAYSTACK_SECRET_KEY=sk_test_6f984887d1d8089c5212cf5c6e4ce2c43d1b8bb1 (staging) / sk_live_xxx (prod)
- JWT_SECRET={{random_32}}
- Optional: RESEND_API_KEY, RESEND_FROM, EMAIL_FROM_DOMAIN, CLOUDINARY_URL, OTEL_EXPORTER_OTLP_ENDPOINT, SENTRY_DSN

Service: mdv-web (frontend)
- NEXT_PUBLIC_API_URL=https://<api-domain>
- NEXT_PUBLIC_APP_URL=https://<web-domain>
- ALLOW_MOCKS=false
- NEXT_PUBLIC_ALLOW_MOCKS=false
- NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_e9d154ef5d6f2907b86b407f2f68dcd33fa19921 (staging) / pk_live_xxx (prod)

Notes
- Do not set any Paystack secret keys on mdv-web.
- Set ALLOW_MOCKS/NEXT_PUBLIC_ALLOW_MOCKS=true only for local dev or CI.
- Ensure APP_URL matches mdv-web domain for CORS and Paystack callback.

