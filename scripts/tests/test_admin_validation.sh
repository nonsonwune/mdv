#!/bin/bash

# Admin Functionality Validation Script
# This script comprehensively tests admin functionality including API endpoints,
# UI components, permissions, and error handling

set -e

echo "🧪 Starting comprehensive admin functionality validation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Function to check if a service is running
check_service() {
    local service=$1
    local port=$2
    if lsof -i :$port &> /dev/null; then
        log_pass "$service is running on port $port"
        return 0
    else
        log_fail "$service is not running on port $port"
        return 1
    fi
}

# Function to test API endpoint
test_api_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local headers=${4:-}
    local data=${5:-}
    
    log_test "Testing $method $endpoint"
    
    local curl_cmd="curl -s -w '%{http_code}' -X $method"
    
    if [ ! -z "$headers" ]; then
        curl_cmd="$curl_cmd -H '$headers'"
    fi
    
    if [ ! -z "$data" ] && [ "$method" != "GET" ]; then
        curl_cmd="$curl_cmd -d '$data' -H 'Content-Type: application/json'"
    fi
    
    curl_cmd="$curl_cmd $endpoint"
    
    local response=$(eval $curl_cmd)
    local status_code=${response: -3}
    
    if [ "$status_code" = "$expected_status" ]; then
        log_pass "$method $endpoint returned expected status $expected_status"
        return 0
    else
        log_fail "$method $endpoint returned $status_code, expected $expected_status"
        return 1
    fi
}

# Function to test frontend components
test_frontend_component() {
    local component=$1
    log_test "Checking if $component exists"
    
    if [ -f "frontend/app/admin/$component" ] || [ -f "frontend/components/$component" ]; then
        log_pass "$component exists"
        return 0
    else
        log_fail "$component does not exist"
        return 1
    fi
}

echo "=============================================="
echo "🔍 Phase 1: Environment and Service Checks"
echo "=============================================="

# Check if backend is running (assuming Railway deployment)
log_info "Checking backend deployment status..."

# Check if frontend development server might be running
log_test "Checking if frontend dev server is running"
if check_service "Frontend" 3000; then
    FRONTEND_RUNNING=true
else
    FRONTEND_RUNNING=false
fi

# Check if backend is accessible (adjust URL as needed)
BACKEND_URL="https://mdv-backend.railway.app"  # Replace with actual Railway URL
log_test "Checking backend connectivity"

if curl -s --head "$BACKEND_URL/health" | head -n 1 | grep -q "200 OK"; then
    log_pass "Backend is accessible at $BACKEND_URL"
    BACKEND_RUNNING=true
else
    log_fail "Backend is not accessible at $BACKEND_URL"
    BACKEND_RUNNING=false
fi

echo ""
echo "=============================================="
echo "🔐 Phase 2: Authentication and Permission Tests"
echo "=============================================="

# Test authentication endpoints
if [ "$BACKEND_RUNNING" = true ]; then
    # Test unauthenticated access (should return 401)
    test_api_endpoint "GET" "$BACKEND_URL/api/admin/users" "401"
    
    # Test with invalid token (should return 401)
    test_api_endpoint "GET" "$BACKEND_URL/api/admin/users" "401" "Authorization: Bearer invalid_token"
    
    log_info "Note: Valid token tests require actual user authentication"
else
    log_info "Skipping API tests - backend not accessible"
fi

echo ""
echo "=============================================="
echo "🗂️ Phase 3: File Structure Validation"
echo "=============================================="

# Check backend files
log_test "Checking backend admin route files"
backend_files=(
    "backend/api/routers/admin.py"
    "backend/api/routers/admin_users.py"
    "backend/api/routers/admin_products.py"
    "backend/mdv/auth.py"
    "backend/mdv/permissions.py"
)

for file in "${backend_files[@]}"; do
    if [ -f "$file" ]; then
        log_pass "Backend file exists: $file"
    else
        log_fail "Backend file missing: $file"
    fi
done

# Check frontend files
log_test "Checking frontend admin component files"
frontend_files=(
    "web/app/admin/page.tsx"
    "web/app/admin/users/page.tsx"
    "web/app/admin/products/page.tsx"
    "web/app/admin/orders/page.tsx"
    "web/app/admin/inventory/page.tsx"
    "web/components/admin/AdminLayout.tsx"
    "web/components/admin/AdminNavigation.tsx"
)

for file in "${frontend_files[@]}"; do
    if [ -f "$file" ]; then
        log_pass "Frontend file exists: $file"
    else
        log_fail "Frontend file missing: $file"
    fi
done

echo ""
echo "=============================================="
echo "🧪 Phase 4: Backend Unit Tests"
echo "=============================================="

log_test "Running backend admin endpoint tests"
cd backend

if [ -f "tests/test_admin_endpoints.py" ]; then
    log_info "Running backend tests with pytest..."
    
    # Install test dependencies if not already installed
    if ! pip list | grep -q pytest; then
        log_info "Installing pytest..."
        pip install pytest pytest-asyncio httpx
    fi
    
    # Run tests
    if python -m pytest tests/test_admin_endpoints.py -v; then
        log_pass "Backend tests completed successfully"
    else
        log_fail "Backend tests failed"
    fi
else
    log_fail "Backend test file not found"
fi

cd ..

echo ""
echo "=============================================="
echo "🎨 Phase 5: Frontend Unit Tests"
echo "=============================================="

log_test "Running frontend admin component tests"
cd web

if [ -f "../frontend/tests/admin.test.tsx" ]; then
    log_info "Checking if Node.js dependencies are installed..."
    
    if [ ! -d "node_modules" ]; then
        log_info "Installing frontend dependencies..."
        npm install
    fi
    
    # Check if testing libraries are installed
    if ! npm list @testing-library/react &> /dev/null; then
        log_info "Installing testing dependencies..."
        npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom
    fi
    
    log_info "Running frontend tests with Jest..."
    if npm test -- --testPathPattern=admin.test.tsx --watchAll=false; then
        log_pass "Frontend tests completed successfully"
    else
        log_fail "Frontend tests failed"
    fi
else
    log_fail "Frontend test file not found"
fi

cd ..

echo ""
echo "=============================================="
echo "🔍 Phase 6: Code Quality Checks"
echo "=============================================="

# Check Python code quality
log_test "Checking Python code quality"
cd backend

if command -v flake8 &> /dev/null; then
    if flake8 mdv/routers/admin*.py mdv/permissions.py --max-line-length=100 --ignore=E501,W503; then
        log_pass "Python code quality check passed"
    else
        log_fail "Python code quality issues found"
    fi
else
    log_info "flake8 not installed, skipping Python quality check"
fi

cd ..

# Check TypeScript/JavaScript code quality
log_test "Checking TypeScript code quality"
cd web

if command -v eslint &> /dev/null; then
    if npx eslint app/admin/**/*.tsx components/admin/*.tsx --ext .tsx,.ts; then
        log_pass "TypeScript code quality check passed"
    else
        log_fail "TypeScript code quality issues found"
    fi
else
    log_info "ESLint not found, skipping TypeScript quality check"
fi

cd ..

echo ""
echo "=============================================="
echo "🛡️ Phase 7: Security Validation"
echo "=============================================="

# Check for potential security issues
log_test "Checking for hardcoded secrets"

# Search for potential hardcoded secrets
if grep -r -i "password\|secret\|key\|token" --include="*.py" --include="*.tsx" --include="*.ts" backend/ frontend/ | grep -v "\.env" | grep -v "test" | grep -v "example"; then
    log_fail "Potential hardcoded secrets found"
else
    log_pass "No hardcoded secrets detected"
fi

log_test "Checking permission definitions"
if grep -q "Permission" backend/mdv/permissions.py && grep -q "ROLE_PERMISSIONS" backend/mdv/permissions.py; then
    log_pass "Permission system properly defined"
else
    log_fail "Permission system incomplete"
fi

echo ""
echo "=============================================="
echo "📱 Phase 8: Frontend Build Test"
echo "=============================================="

log_test "Testing frontend build process"
cd web

log_info "Building frontend for production..."
if npm run build; then
    log_pass "Frontend builds successfully"
    
    # Check if build artifacts exist
    if [ -d ".next" ] || [ -d "build" ] || [ -d "dist" ]; then
        log_pass "Build artifacts generated"
    else
        log_fail "Build artifacts not found"
    fi
else
    log_fail "Frontend build failed"
fi

cd ..

echo ""
echo "=============================================="
echo "📊 Phase 9: API Contract Validation"
echo "=============================================="

# Check API endpoint consistency
log_test "Validating API contracts"

# Check if backend endpoints match frontend API calls
if grep -r "api/admin" web/app/admin/ | head -10; then
    log_info "Frontend makes admin API calls"
    
    # Check if corresponding backend routes exist
    if grep -r "/api/admin" backend/api/routers/; then
        log_pass "Backend admin routes exist"
    else
        log_fail "Backend admin routes missing"
    fi
else
    log_fail "No admin API calls found in frontend"
fi

echo ""
echo "=============================================="
echo "📋 FINAL REPORT"
echo "=============================================="

echo -e "${BLUE}Total Tests:${NC} $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
echo -e "${RED}Failed:${NC} $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}Admin functionality is ready for production.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ SOME TESTS FAILED${NC}"
    echo -e "${RED}Please address the failed tests before deployment.${NC}"
    exit 1
fi
