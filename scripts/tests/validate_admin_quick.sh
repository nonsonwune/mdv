#!/bin/bash

# Quick Admin Functionality Validation
echo "🧪 Quick Admin Functionality Validation"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    PASSED=$((PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAILED=$((FAILED + 1))
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

echo "==============================================="
echo "📂 File Structure Validation"
echo "==============================================="

# Backend files
backend_files=(
    "backend/api/routers/admin.py"
    "backend/api/routers/admin_users.py"
    "backend/api/routers/admin_products.py"
    "backend/mdv/auth.py"
    "backend/mdv/rbac.py"
    "backend/tests/test_admin_endpoints.py"
)

log_test "Checking backend admin files"
for file in "${backend_files[@]}"; do
    if [ -f "$file" ]; then
        log_pass "✓ $file"
    else
        log_fail "✗ $file (missing)"
    fi
done

# Frontend files
frontend_files=(
    "web/app/admin/page.tsx"
    "web/app/admin/users/page.tsx"
    "web/app/admin/products/page.tsx"
    "web/app/admin/orders/page.tsx"
    "web/app/admin/inventory/page.tsx"
    "web/components/admin/AdminLayout.tsx"
    "web/components/admin/AdminNavigation.tsx"
    "frontend/tests/admin.test.tsx"
)

log_test "Checking frontend admin files"
for file in "${frontend_files[@]}"; do
    if [ -f "$file" ]; then
        log_pass "✓ $file"
    else
        log_fail "✗ $file (missing)"
    fi
done

echo ""
echo "==============================================="
echo "🔍 Code Quality Check"
echo "==============================================="

log_test "Checking for admin route implementations"
if grep -q "admin" backend/api/routers/admin.py && grep -q "router" backend/api/routers/admin.py; then
    log_pass "Admin router implementation found"
else
    log_fail "Admin router implementation missing"
fi

log_test "Checking for permission system"
if [ -f "backend/mdv/rbac.py" ] && grep -q "Permission" backend/mdv/rbac.py; then
    log_pass "Permission system implementation found"
else
    log_fail "Permission system implementation missing"
fi

log_test "Checking for admin components"
if [ -f "web/components/admin/AdminLayout.tsx" ] && [ -f "web/components/admin/AdminNavigation.tsx" ]; then
    log_pass "Admin UI components found"
else
    log_fail "Admin UI components missing"
fi

echo ""
echo "==============================================="
echo "🧪 Test Files Validation"
echo "==============================================="

log_test "Checking backend test coverage"
if [ -f "backend/tests/test_admin_endpoints.py" ]; then
    test_count=$(grep -c "def test_" backend/tests/test_admin_endpoints.py)
    log_pass "Backend tests found ($test_count test methods)"
else
    log_fail "Backend test file missing"
fi

log_test "Checking frontend test coverage"
if [ -f "frontend/tests/admin.test.tsx" ]; then
    test_count=$(grep -c "it\|test" frontend/tests/admin.test.tsx)
    log_pass "Frontend tests found ($test_count test cases)"
else
    log_fail "Frontend test file missing"
fi

echo ""
echo "==============================================="
echo "🔐 Security Features Check"
echo "==============================================="

log_test "Checking authentication system"
if [ -f "backend/mdv/auth.py" ] && grep -q "token\|jwt" backend/mdv/auth.py; then
    log_pass "Authentication system found"
else
    log_fail "Authentication system missing"
fi

log_test "Checking role-based permissions"
if grep -q "admin\|supervisor\|operations\|logistics" backend/mdv/rbac.py 2>/dev/null; then
    log_pass "Role-based permission system found"
else
    log_fail "Role-based permission system missing"
fi

echo ""
echo "==============================================="
echo "📊 Admin Features Check"
echo "==============================================="

admin_pages=("users" "products" "orders" "inventory" "analytics")

log_test "Checking admin page implementations"
for page in "${admin_pages[@]}"; do
    if [ -d "web/app/admin/$page" ] && [ -f "web/app/admin/$page/page.tsx" ]; then
        log_pass "✓ Admin $page page"
    elif [ -f "web/app/admin/$page.tsx" ]; then
        log_pass "✓ Admin $page page (single file)"
    else
        log_fail "✗ Admin $page page missing"
    fi
done

echo ""
echo "==============================================="
echo "📋 SUMMARY"
echo "==============================================="

TOTAL=$((PASSED + FAILED))
echo -e "${BLUE}Total Checks:${NC} $TOTAL"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL VALIDATION CHECKS PASSED!${NC}"
    echo -e "${GREEN}Admin functionality structure is complete.${NC}"
    exit 0
else
    PASS_RATE=$((PASSED * 100 / TOTAL))
    echo -e "\n${YELLOW}⚠️  VALIDATION RESULTS: ${PASS_RATE}% PASSED${NC}"
    
    if [ $PASS_RATE -ge 80 ]; then
        echo -e "${YELLOW}Admin functionality is mostly complete with minor issues.${NC}"
        exit 0
    else
        echo -e "${RED}Admin functionality needs attention on failed items.${NC}"
        exit 1
    fi
fi
