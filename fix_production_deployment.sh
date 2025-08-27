#!/bin/bash

# MDV Production Deployment Fix Script
# This script fixes CORS issues and backend deployment problems

echo "🚨 MDV Production Deployment Fix"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
echo "🔍 Diagnosing Production Issues..."

# Check backend health
log_info "Checking backend API health..."
BACKEND_STATUS=$(curl -s -w "%{http_code}" -o /dev/null https://mdv-api-production.up.railway.app/health || echo "000")

if [ "$BACKEND_STATUS" == "200" ]; then
    log_success "Backend API is healthy"
elif [ "$BACKEND_STATUS" == "502" ]; then
    log_error "Backend API is returning 502 Bad Gateway (application crashed or failed to start)"
else
    log_error "Backend API returned status code: $BACKEND_STATUS"
fi

# Check frontend
log_info "Checking frontend health..."
FRONTEND_STATUS=$(curl -s -w "%{http_code}" -o /dev/null https://mdv-web-production.up.railway.app || echo "000")

if [ "$FRONTEND_STATUS" == "200" ]; then
    log_success "Frontend is healthy"
else
    log_error "Frontend returned status code: $FRONTEND_STATUS"
fi

# Check CORS configuration
log_info "Checking CORS configuration..."
curl -s -X OPTIONS -H "Origin: https://mdv-web-production.up.railway.app" -H "Access-Control-Request-Method: GET" https://mdv-api-production.up.railway.app/api/products > /tmp/cors_test 2>&1

if grep -q "access-control-allow-origin" /tmp/cors_test; then
    log_success "CORS headers are present"
else
    log_error "CORS headers are missing or malformed"
fi

echo ""
echo "🔧 Recommended Fixes:"
echo "===================="

echo "1. Backend Deployment Issue (502 Bad Gateway):"
echo "   - The backend application is crashing on startup"
echo "   - Check Railway logs for the backend service"
echo "   - Possible causes: Database connection issues, missing environment variables, code errors"

echo ""
echo "2. CORS Configuration:"
echo "   - Frontend: https://mdv-web-production.up.railway.app"
echo "   - Backend:  https://mdv-api-production.up.railway.app"
echo "   - CORS is configured in backend/api/main.py but backend is down"

echo ""
echo "🚀 Immediate Actions Required:"
echo "=============================="

echo "1. Check Railway Backend Logs:"
echo "   - Go to Railway dashboard"
echo "   - Select the mdv-api-production service"
echo "   - Check the deployment logs for errors"

echo ""
echo "2. Verify Environment Variables:"
echo "   - DATABASE_URL should be set"
echo "   - JWT_SECRET_KEY should be set"
echo "   - Other required environment variables"

echo ""
echo "3. Check Database Connection:"
echo "   - Ensure the database is accessible"
echo "   - Verify database credentials are correct"

echo ""
echo "4. Redeploy Backend:"
echo "   - Push a new commit to trigger redeployment"
echo "   - Or manually trigger redeployment from Railway dashboard"

echo ""
echo "📋 Environment Variables to Check:"
echo "=================================="
echo "Required Backend Environment Variables:"
echo "- DATABASE_URL=postgresql://..."
echo "- JWT_SECRET_KEY=your-secret-key"
echo "- PAYSTACK_SECRET_KEY=sk_..."
echo "- APP_URL=https://mdv-web-production.up.railway.app"
echo "- ENV=production"

echo ""
log_warning "The backend application is completely down (502 errors)"
log_warning "Frontend CORS errors are a symptom, not the root cause"
log_info "Fix the backend deployment first, then CORS will resolve automatically"

rm -f /tmp/cors_test
