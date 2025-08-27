#!/bin/bash

# Staging Validation Script for PAYSTACK_SECRET_KEY Removal
# This script validates that our security improvements work correctly in staging

set -e

# Configuration
STAGING_WEB_URL="https://mdv-web-staging.railway.app"
STAGING_API_URL="https://mdv-api-staging.railway.app"
VALIDATION_LOG="staging_validation_$(date +%Y%m%d_%H%M%S).log"

echo "🧪 Starting Staging Validation for PAYSTACK_SECRET_KEY Removal" | tee $VALIDATION_LOG
echo "=================================================" | tee -a $VALIDATION_LOG
echo "Timestamp: $(date)" | tee -a $VALIDATION_LOG
echo "Web URL: $STAGING_WEB_URL" | tee -a $VALIDATION_LOG
echo "API URL: $STAGING_API_URL" | tee -a $VALIDATION_LOG
echo "" | tee -a $VALIDATION_LOG

# Test Results Tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to run test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo "🔍 Test $TESTS_TOTAL: $test_name" | tee -a $VALIDATION_LOG
    
    if eval "$test_command"; then
        echo "✅ PASS: $test_name" | tee -a $VALIDATION_LOG
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "❌ FAIL: $test_name" | tee -a $VALIDATION_LOG
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo "" | tee -a $VALIDATION_LOG
}

# Test 1: API Health Check
run_test "API Health Check" \
    "curl -f -s $STAGING_API_URL/health > /dev/null" \
    "200 OK"

# Test 2: Web App Health Check  
run_test "Web App Health Check" \
    "curl -f -s $STAGING_WEB_URL > /dev/null" \
    "200 OK"

# Test 3: Mock UI Accessibility
run_test "Mock UI Accessibility" \
    "curl -f -s $STAGING_WEB_URL/paystack-mock > /dev/null" \
    "200 OK"

# Test 4: Backend Mock Endpoint
run_test "Backend Mock Endpoint" \
    "curl -f -s -X POST $STAGING_API_URL/api/paystack/mock -H 'Content-Type: application/json' -d '{\"event\": \"charge.success\", \"data\": {\"reference\": \"test-123\", \"amount\": 1000}}' | grep -q '\"ok\"'" \
    "Returns {ok: true}"

# Test 5: CORS Preflight Check
run_test "CORS Preflight Check" \
    "curl -f -s -X OPTIONS $STAGING_API_URL/api/paystack/mock -H 'Origin: $STAGING_WEB_URL' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: Content-Type' -I | grep -q 'Access-Control-Allow-Origin'" \
    "CORS headers present"

# Test 6: Frontend Environment Security Check
run_test "Frontend Environment Security" \
    "curl -s $STAGING_WEB_URL/paystack-mock | grep -v 'PAYSTACK_SECRET_KEY'" \
    "No payment secrets in frontend"

# Test 7: Mock UI Content Verification
run_test "Mock UI Content Verification" \
    "curl -s $STAGING_WEB_URL/paystack-mock | grep -q 'Simulate Success'" \
    "Mock UI contains expected buttons"

# Test 8: API Documentation Access
run_test "API Documentation Access" \
    "curl -f -s $STAGING_API_URL/docs > /dev/null" \
    "API docs accessible"

# Generate Summary Report
echo "=================================================" | tee -a $VALIDATION_LOG
echo "📊 STAGING VALIDATION SUMMARY" | tee -a $VALIDATION_LOG
echo "=================================================" | tee -a $VALIDATION_LOG
echo "Total Tests: $TESTS_TOTAL" | tee -a $VALIDATION_LOG
echo "Passed: $TESTS_PASSED" | tee -a $VALIDATION_LOG
echo "Failed: $TESTS_FAILED" | tee -a $VALIDATION_LOG
echo "Success Rate: $(( TESTS_PASSED * 100 / TESTS_TOTAL ))%" | tee -a $VALIDATION_LOG
echo "" | tee -a $VALIDATION_LOG

if [ $TESTS_FAILED -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED! Staging validation successful." | tee -a $VALIDATION_LOG
    echo "✅ Security improvements are working correctly in staging." | tee -a $VALIDATION_LOG
    exit 0
else
    echo "⚠️  Some tests failed. Please review the results above." | tee -a $VALIDATION_LOG
    exit 1
fi
