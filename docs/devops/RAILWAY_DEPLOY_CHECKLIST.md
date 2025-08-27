# Railway Deployment Checklist

## ✅ Pre-Deployment Verification

The following configurations are now in place:
- ✅ `nixpacks.toml` - Forces Docker usage
- ✅ `railway.json` - Service configurations
- ✅ `Dockerfile.backend` - API container
- ✅ `Dockerfile.web` - Frontend container
- ✅ GitHub Actions workflows

## 🚀 Deploy Now on Railway

### Step 1: Create Services in Railway

Go to your Railway project and create these services:

#### 1. Database Services (Create First)
- [ ] **PostgreSQL**: Click "New" → "Database" → "PostgreSQL"
- [ ] **Redis**: Click "New" → "Database" → "Redis"

#### 2. Application Services
- [ ] **mdv-api**: Click "New" → "GitHub Repo" → Select your repo
- [ ] **mdv-web**: Click "New" → "GitHub Repo" → Select your repo
- [ ] **mdv-worker**: Click "New" → "GitHub Repo" → Select your repo

### Step 2: Configure Each Service

#### **mdv-api Configuration:**
```
Service Settings:
- Root Directory: / (or leave empty)
- Build Command: (leave empty - Dockerfile handles it)
- Start Command: (leave empty - Dockerfile handles it)

Environment Variables (CRITICAL - Add this FIRST):
RAILWAY_DOCKERFILE_PATH=Dockerfile.backend
ENV=production
APP_URL=https://{{mdv-web production URL}}
DATABASE_URL={{PostgreSQL URL - CHANGE postgresql:// to postgresql+asyncpg://}}
REDIS_URL={{Redis URL from Redis service}}
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx (or production key)
PAYSTACK_SECRET_KEY=sk_test_xxxxx (or production key)
JWT_SECRET=your-secret-key-here
RESEND_API_KEY=optional
CLOUDINARY_URL=optional
SENTRY_DSN=optional
```

#### **mdv-web Configuration:**
```
Service Settings:
- Root Directory: / (or leave empty)
- Build Command: (leave empty - Dockerfile handles it)
- Start Command: (leave empty - Dockerfile handles it)

Environment Variables (CRITICAL - Add this FIRST):
RAILWAY_DOCKERFILE_PATH=Dockerfile.web
NEXT_PUBLIC_API_URL=https://{{mdv-api production URL}}
NEXT_PUBLIC_APP_URL=https://{{mdv-web production URL}}
ALLOW_MOCKS=false
NEXT_PUBLIC_ALLOW_MOCKS=false
```

#### **mdv-worker Configuration:**
```
Service Settings:
- Root Directory: / (or leave empty)
- Build Command: (leave empty - Dockerfile handles it)
- Start Command: arq backend.worker.main.WorkerSettings

Environment Variables (CRITICAL - Add this FIRST):
RAILWAY_DOCKERFILE_PATH=Dockerfile.backend
ENV=production
DATABASE_URL={{PostgreSQL URL - CHANGE postgresql:// to postgresql+asyncpg://}}
REDIS_URL={{Redis URL from Redis service}}
RESEND_API_KEY=optional
SENTRY_DSN=optional
```

### Step 3: Deploy Order

Deploy in this sequence:
1. [ ] PostgreSQL (wait for it to be ready)
2. [ ] Redis (wait for it to be ready)
3. [ ] mdv-api (needs DB and Redis)
4. [ ] mdv-worker (needs DB and Redis)
5. [ ] mdv-web (needs API URL)

### Step 4: Critical Database URL Fix

⚠️ **IMPORTANT**: Railway provides PostgreSQL URLs in this format:
```
postgresql://user:password@host:port/database
```

You MUST change it to:
```
postgresql+asyncpg://user:password@host:port/database
```

For the `mdv-api` and `mdv-worker` services ONLY (not for migrations).

### Step 5: Verify Deployment

After deployment, check:

1. [ ] **API Health**: Visit `https://your-api-url.railway.app/health`
2. [ ] **API Docs**: Visit `https://your-api-url.railway.app/docs`
3. [ ] **Web App**: Visit `https://your-web-url.railway.app`
4. [ ] **Check Logs**: Look for any errors in Railway logs

### Step 6: Post-Deployment

1. [ ] Run database seed (optional):
   ```bash
   railway run --service mdv-api python -m backend.scripts.seed_dev
   ```

2. [ ] Test the checkout flow:
   - Add items to cart
   - Go to checkout
   - Complete payment with Paystack test cards

### Common Issues & Solutions

**Issue: "Nixpacks unable to generate build plan"**
- ✅ Already fixed with our configuration

**Issue: "Database connection failed"**
- Check DATABASE_URL uses `postgresql+asyncpg://`
- Ensure PostgreSQL service is running
- Check credentials are correct

**Issue: "CORS error on frontend"**
- Verify APP_URL in mdv-api matches your web URL
- Check NEXT_PUBLIC_API_URL in mdv-web is correct

**Issue: "Port binding error"**
- Railway sets $PORT automatically
- Our Dockerfiles already use $PORT variable

### Quick CLI Deployment (Alternative)

If you prefer CLI:
```bash
# Login to Railway
railway login

# Link your project (you'll need project ID)
railway link

# Deploy each service
railway up --service mdv-api
railway up --service mdv-web
railway up --service mdv-worker
```

## 🎉 Success Indicators

You'll know deployment is successful when:
- ✅ All services show "Active" in Railway
- ✅ No error logs in deployment
- ✅ API health endpoint returns 200
- ✅ Web app loads without errors
- ✅ Database migrations completed (check logs)

## Need Help?

- Check `/docs/RAILWAY_DEPLOYMENT_GUIDE.md` for detailed instructions
- Review Railway logs for specific errors
- Ensure all environment variables are set correctly
