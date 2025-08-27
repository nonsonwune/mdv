#!/bin/bash

# Deployment diagnosis script for MDV Backend on Railway
# This script helps diagnose production deployment issues

set -e

echo "=== MDV Backend Deployment Diagnosis ==="
echo "Timestamp: $(date)"
echo ""

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

# Function to check API endpoint
check_endpoint() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}
    
    log_info "Checking $name endpoint: $url"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        log_success "$name endpoint: HTTP $response (✓)"
        return 0
    else
        log_error "$name endpoint: HTTP $response (✗)"
        if [ "$response" = "000" ]; then
            log_error "  → Connection failed (DNS, network, or service down)"
        elif [ "$response" = "502" ]; then
            log_error "  → Bad Gateway (backend service not responding)"
        elif [ "$response" = "503" ]; then
            log_error "  → Service Unavailable (backend overloaded or down)"
        elif [ "$response" = "404" ]; then
            log_error "  → Not Found (endpoint doesn't exist or routing issue)"
        fi
        return 1
    fi
}

# Function to check API with detailed response
check_endpoint_detailed() {
    local url=$1
    local name=$2
    
    log_info "Testing $name endpoint with detailed response: $url"
    
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}s" "$url" || echo -e "\nERROR: Connection failed")
    
    if echo "$response" | grep -q "ERROR: Connection failed"; then
        log_error "$name endpoint: Connection failed"
        return 1
    fi
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    time_total=$(echo "$response" | grep "TIME:" | cut -d: -f2)
    response_body=$(echo "$response" | grep -v "HTTP_CODE:\|TIME:")
    
    log_info "  HTTP Code: $http_code"
    log_info "  Response Time: $time_total"
    
    if [ "$http_code" = "200" ]; then
        log_success "$name endpoint: Working correctly"
        log_info "  Response: $response_body"
        return 0
    else
        log_error "$name endpoint: HTTP $http_code"
        log_error "  Response: $response_body"
        return 1
    fi
}

# Function to check CORS headers
check_cors() {
    local url=$1
    local origin=${2:-"https://mdv-web-production.up.railway.app"}
    
    log_info "Checking CORS configuration for $url with origin $origin"
    
    # Check preflight request
    cors_response=$(curl -s -I -X OPTIONS \
        -H "Origin: $origin" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type,Authorization" \
        "$url" || echo "ERROR")
    
    if [ "$cors_response" = "ERROR" ]; then
        log_error "CORS preflight request failed"
        return 1
    fi
    
    # Check for CORS headers
    allow_origin=$(echo "$cors_response" | grep -i "access-control-allow-origin" | tr -d '\r')
    allow_methods=$(echo "$cors_response" | grep -i "access-control-allow-methods" | tr -d '\r')
    allow_headers=$(echo "$cors_response" | grep -i "access-control-allow-headers" | tr -d '\r')
    
    if [ -n "$allow_origin" ]; then
        log_success "CORS Allow-Origin: $allow_origin"
    else
        log_error "CORS Allow-Origin header missing"
    fi
    
    if [ -n "$allow_methods" ]; then
        log_success "CORS Allow-Methods: $allow_methods"
    else
        log_error "CORS Allow-Methods header missing"
    fi
    
    if [ -n "$allow_headers" ]; then
        log_success "CORS Allow-Headers: $allow_headers"
    else
        log_error "CORS Allow-Headers header missing"
    fi
}

echo "1. BACKEND API HEALTH CHECKS"
echo "=============================="

# Backend API endpoints
BACKEND_BASE="https://mdv-api-production.up.railway.app"

# Check basic endpoints
check_endpoint "$BACKEND_BASE/health" "Health Check"
check_endpoint "$BACKEND_BASE/" "Root" 
check_endpoint_detailed "$BACKEND_BASE/api/test" "API Test"

echo ""
echo "2. CORS CONFIGURATION"
echo "====================="

# Check CORS with frontend origin
check_cors "$BACKEND_BASE/api/test" "https://mdv-web-production.up.railway.app"

echo ""
echo "3. AUTHENTICATION ENDPOINTS"
echo "============================"

# Check auth endpoints (should return 422 for missing body, not 502/503)
check_endpoint "$BACKEND_BASE/api/auth/login" "Auth Login" 422
check_endpoint "$BACKEND_BASE/api/auth/register" "Auth Register" 422

echo ""
echo "4. FRONTEND CONNECTIVITY"
echo "========================"

FRONTEND_BASE="https://mdv-web-production.up.railway.app"
check_endpoint "$FRONTEND_BASE" "Frontend Health"

echo ""
echo "5. DEPLOYMENT RECOMMENDATIONS"
echo "=============================="

log_info "Based on the test results, here are the next steps:"
echo ""

log_info "If backend health checks are failing (502/503 errors):"
echo "  1. Check Railway backend service logs for startup errors"
echo "  2. Verify environment variables are set correctly:"
echo "     - DATABASE_URL"
echo "     - JWT_SECRET_KEY" 
echo "     - PAYSTACK_SECRET_KEY (optional)"
echo "     - APP_URL (should be frontend URL)"
echo "     - ENV=production"
echo "  3. Check database connectivity"
echo "  4. Redeploy backend service"
echo ""

log_info "If CORS errors are present:"
echo "  1. Verify APP_URL environment variable points to frontend"
echo "  2. Check backend CORS middleware configuration"
echo "  3. Restart backend service after environment changes"
echo ""

log_info "If authentication endpoints fail:"
echo "  1. Check JWT_SECRET_KEY is properly set"
echo "  2. Verify database models and migrations"
echo "  3. Check for import/dependency errors in auth modules"
echo ""

echo "=== Diagnosis Complete ==="
echo ""
echo "Next steps:"
echo "1. Review the test results above"
echo "2. Check Railway backend logs: railway logs --service mdv-api"
echo "3. Verify environment variables: railway variables --service mdv-api"
echo "4. If needed, redeploy: railway up --service mdv-api"
