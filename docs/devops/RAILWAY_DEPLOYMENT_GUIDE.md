# Railway Deployment Guide for MDV Monorepo

## Problem Resolution Summary

The "Nixpacks was unable to generate a build plan" error occurs because Railway's automatic build detection (Nixpacks) cannot identify how to build a monorepo with multiple services. The solution is to explicitly configure Railway to use Docker builds for each service.

## Changes Made

1. **Created `nixpacks.toml`** in the root directory to disable auto-detection
2. **Updated `railway.json`** with explicit Docker build configurations for each service
3. **Configured services** to use specific Dockerfiles

## Railway UI Configuration Steps

### Step 1: Create a New Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository (mdv)
5. **IMPORTANT**: Do NOT deploy immediately. Cancel the auto-deployment.

### Step 2: Configure Services

You need to create 5 services in your Railway project:

#### A. mdv-api (Backend API Service)

1. Click "New Service" → "GitHub Repo"
2. Select your repository
3. Configure the service:
   - **Service Name**: `mdv-api`
   - **Root Directory**: `/` (leave empty or set to root)
   - **Build Command**: (leave empty - Dockerfile handles it)
   - **Start Command**: (leave empty - Dockerfile handles it)
   - **Dockerfile Path**: `Dockerfile.backend`
   - **Watch Paths**: `backend/**`, `Dockerfile.backend`

4. Set Environment Variables:
   ```
   ENV=production
   APP_URL=https://your-web-domain.railway.app
   DATABASE_URL=${{mdv-postgres.DATABASE_URL}}  # Reference to Postgres service
   REDIS_URL=${{mdv-redis.REDIS_URL}}           # Reference to Redis service
   PAYSTACK_PUBLIC_KEY=your_paystack_public_key
   PAYSTACK_SECRET_KEY=your_paystack_secret_key
   RESEND_API_KEY=your_resend_api_key
   CLOUDINARY_URL=your_cloudinary_url
   JWT_SECRET=your_jwt_secret_key
   OTEL_EXPORTER_OTLP_ENDPOINT=optional_otel_endpoint
   SENTRY_DSN=optional_sentry_dsn
   ```

#### B. mdv-web (Frontend Service)

1. Click "New Service" → "GitHub Repo"
2. Select your repository
3. Configure the service:
   - **Service Name**: `mdv-web`
   - **Root Directory**: `/` (leave empty or set to root)
   - **Build Command**: (leave empty - Dockerfile handles it)
   - **Start Command**: (leave empty - Dockerfile handles it)
   - **Dockerfile Path**: `Dockerfile.web`
   - **Watch Paths**: `web/**`, `Dockerfile.web`

4. Set Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-api-domain.railway.app
   NEXT_PUBLIC_APP_URL=https://your-web-domain.railway.app
   ALLOW_MOCKS=false
   NEXT_PUBLIC_ALLOW_MOCKS=false
   ```

#### C. mdv-worker (Background Worker Service)

1. Click "New Service" → "GitHub Repo"
2. Select your repository
3. Configure the service:
   - **Service Name**: `mdv-worker`
   - **Root Directory**: `/` (leave empty or set to root)
   - **Build Command**: (leave empty - Dockerfile handles it)
   - **Start Command**: `arq backend.worker.main.WorkerSettings`
   - **Dockerfile Path**: `Dockerfile.backend`
   - **Watch Paths**: `backend/**`, `Dockerfile.backend`

4. Set Environment Variables:
   ```
   ENV=production
   DATABASE_URL=${{mdv-postgres.DATABASE_URL}}
   REDIS_URL=${{mdv-redis.REDIS_URL}}
   RESEND_API_KEY=your_resend_api_key
   OTEL_EXPORTER_OTLP_ENDPOINT=optional_otel_endpoint
   SENTRY_DSN=optional_sentry_dsn
   ```

#### D. mdv-postgres (Database Service)

1. Click "New Service" → "Database" → "Add PostgreSQL"
2. Railway will automatically provision a PostgreSQL database
3. Note the connection string variable name (usually `DATABASE_URL`)

#### E. mdv-redis (Cache Service)

1. Click "New Service" → "Database" → "Add Redis"
2. Railway will automatically provision a Redis instance
3. Note the connection string variable name (usually `REDIS_URL`)

### Step 3: Important Configuration Notes

1. **Database URL Format**: Ensure the `DATABASE_URL` for the API service uses the async driver format:
   ```
   postgresql+asyncpg://user:password@host:port/database
   ```
   If Railway provides a standard `postgresql://` URL, you need to replace `postgresql://` with `postgresql+asyncpg://`

2. **Service Dependencies**: Deploy in this order:
   1. mdv-postgres (first)
   2. mdv-redis (second)
   3. mdv-api (third - needs DB and Redis)
   4. mdv-worker (fourth - needs DB and Redis)
   5. mdv-web (last - needs API)

3. **Domain Configuration**:
   - Each service will get a Railway-provided domain
   - Configure custom domains in Settings → Domains for production

### Step 4: Deployment Verification

After deployment, verify each service:

1. **Check Build Logs**: Ensure Docker is being used (not Nixpacks)
   - Look for "Building with Dockerfile" in logs

2. **Check Service Health**:
   - API: `https://your-api-domain.railway.app/health`
   - API Docs: `https://your-api-domain.railway.app/docs`
   - Web: `https://your-web-domain.railway.app/`

3. **Database Migration**: 
   - Migrations run automatically on API startup (see Dockerfile.backend)
   - To seed data, use Railway's run command:
     ```bash
     railway run python -m backend.scripts.seed_dev
     ```

### Step 5: Troubleshooting

If you still see "Nixpacks unable to generate build plan":

1. **Ensure files are committed and pushed**:
   ```bash
   git add nixpacks.toml railway.json
   git commit -m "Configure Railway deployment with Docker"
   git push origin main
   ```

2. **In Railway UI, for each service**:
   - Go to Settings → Build
   - Ensure "Builder" is set to "Dockerfile"
   - Ensure "Dockerfile Path" is correctly set

3. **Check Railway Variables**:
   - Go to Variables tab for each service
   - Ensure all required environment variables are set
   - Use Railway's reference syntax for cross-service variables: `${{service-name.VARIABLE_NAME}}`

4. **Common Issues**:
   - **Port Binding**: Railway automatically sets `$PORT`. Dockerfiles use this variable.
   - **Database Connection**: If "connection refused", check DATABASE_URL format and ensure Postgres is running
   - **CORS Issues**: Verify `APP_URL` in API service matches your web domain

### Step 6: Production Checklist

- [ ] All environment variables set with production values
- [ ] Paystack configured with production keys (not test keys)
- [ ] Database backups configured in Railway
- [ ] Custom domains configured
- [ ] SSL certificates active (Railway handles this automatically)
- [ ] Monitoring/logging configured (Sentry, OpenTelemetry)
- [ ] Database seeded with initial data if needed

## Alternative: Using Railway CLI

If you prefer command-line deployment:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Deploy each service
railway up --service mdv-api
railway up --service mdv-web
railway up --service mdv-worker
```

## Summary

The key to resolving the Nixpacks error is:
1. Explicitly tell Railway to use Docker (via nixpacks.toml and railway.json)
2. Configure each service with the correct Dockerfile path
3. Ensure all environment variables are properly set
4. Deploy services in the correct order (databases first)

With these configurations in place, Railway will use your Dockerfiles instead of trying to auto-detect the build system, resolving the deployment error.
