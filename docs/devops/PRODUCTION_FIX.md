# Production Deployment Fix Guide

## Issue Summary
The MDV backend API is returning 502 Bad Gateway errors, indicating the service is not starting properly in production. This prevents the frontend from accessing the API and causes CORS errors.

## Root Cause Analysis
- **502 Bad Gateway**: Backend service is crashing or failing to start
- **CORS Errors**: Secondary issue caused by backend being down
- **Frontend OK**: Frontend service is healthy and properly deployed

## Diagnosis Results
```bash
$ ./diagnose_deployment.sh
=== MDV Backend Deployment Diagnosis ===
[ERROR] Health Check endpoint: HTTP 502 (✗)
[ERROR]   → Bad Gateway (backend service not responding)
```

## Solution Steps

### 1. Updated Production Startup Script
Created `start_production.py` with comprehensive health checks:

**Key Features:**
- Environment variable validation
- Database connectivity testing  
- Module import verification
- Enhanced error logging with timestamps
- Graceful failure handling

**Usage:**
```bash
python start_production.py
```

### 2. Deployment Configuration Files

**Procfile** (for Railway/Heroku):
```
web: python start_production.py
```

**railway.json** (Railway-specific config):
```json
{
  "deploy": {
    "startCommand": "python start_production.py",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### 3. Required Environment Variables

Ensure these are set in Railway dashboard:

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET_KEY`: Secret key for JWT tokens (generate with `openssl rand -hex 32`)

**Optional but recommended:**
- `PAYSTACK_SECRET_KEY`: Payment integration key
- `APP_URL`: Frontend URL (`https://mdv-web-production.up.railway.app`)  
- `ENV`: Set to `production`
- `PORT`: Railway sets this automatically
- `HOST`: Should be `0.0.0.0` (Railway default)

### 4. CORS Configuration
The backend is already configured with proper CORS settings for:
- Production frontend: `https://mdv-web-production.up.railway.app`
- Development: `localhost:3000`, `localhost:8080`

## Immediate Actions Required

### Step 1: Check Railway Environment Variables
```bash
railway variables --service mdv-api
```

Verify all required variables are set. If missing, add them:
```bash
railway variables set DATABASE_URL=<postgres_url> --service mdv-api
railway variables set JWT_SECRET_KEY=<secret_key> --service mdv-api
```

### Step 2: Check Railway Service Logs
```bash
railway logs --service mdv-api
```

Look for:
- Import errors
- Database connection failures  
- Missing environment variables
- Python/dependency errors

### Step 3: Redeploy with New Startup Script
```bash
railway up --service mdv-api
```

The new startup script will:
1. Check all environment variables
2. Test database connectivity
3. Verify module imports
4. Start the server only if all checks pass
5. Provide detailed error messages if anything fails

### Step 4: Monitor Health Check
After deployment, verify the health endpoint:
```bash
curl https://mdv-api-production.up.railway.app/health
```

Should return:
```json
{"status": "healthy", "service": "mdv-api", "version": "0.1.0"}
```

### Step 5: Test API Connectivity
```bash
curl https://mdv-api-production.up.railway.app/api/test
```

Should return:
```json
{
  "status": "ok",
  "service": "mdv-api", 
  "message": "API is responding correctly",
  "timestamp": "2025-01-XX..."
}
```

## Expected Resolution

After implementing these fixes:

1. **Backend Health**: 502 errors → 200 OK responses
2. **CORS Headers**: Properly included in all responses
3. **Frontend API Calls**: Will work correctly
4. **Authentication**: JWT endpoints will respond properly
5. **Database Operations**: All CRUD operations will work

## Monitoring and Maintenance

### Health Check Endpoint
- URL: `https://mdv-api-production.up.railway.app/health`
- Should always return HTTP 200
- No database dependency (can work even if DB is down)

### Diagnostic Script
Run the diagnosis script periodically:
```bash
./diagnose_deployment.sh
```

### Log Monitoring
Check Railway logs regularly:
```bash
railway logs --service mdv-api --follow
```

## Rollback Plan

If the new startup script causes issues:

1. Revert to original start command:
   ```bash
   railway variables set START_COMMAND="uvicorn api.main:app --host 0.0.0.0 --port \$PORT" --service mdv-api
   ```

2. Remove the Procfile temporarily

3. Redeploy with original configuration

## Success Criteria

✅ **Backend health check returns HTTP 200**  
✅ **API test endpoint works correctly**  
✅ **CORS headers present in responses**  
✅ **Frontend can fetch from backend APIs**  
✅ **Authentication endpoints return proper error codes (422, not 502)**  
✅ **Database operations function correctly**  

## Next Steps After Resolution

1. **Test all admin functionality** from the frontend
2. **Verify user authentication flows** work correctly  
3. **Test payment integration** if Paystack is configured
4. **Run comprehensive API tests** to ensure all endpoints work
5. **Monitor application performance** and error rates

---

**Status**: Ready for deployment  
**Estimated Fix Time**: 15-30 minutes  
**Risk Level**: Low (new startup script with fallback options)
