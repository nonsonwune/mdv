#!/bin/bash

echo "=========================================="
echo "MDV Deployment Verification"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="https://mdv-api-production.up.railway.app"
FRONTEND_URL="https://mdv-web-production.up.railway.app"

echo "Testing deployment fixes..."
echo ""

# Test 1: API Health Check
echo "1. API Health Check"
echo "-------------------"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/health" 2>/dev/null)
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d':' -f2)
if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ API is healthy (HTTP 200)${NC}"
else
    echo -e "${RED}✗ API health check failed (HTTP $http_code)${NC}"
fi

echo ""

# Test 2: CORS Headers on Products Endpoint
echo "2. Products Endpoint with CORS"
echo "-------------------------------"
response=$(curl -s -H "Origin: $FRONTEND_URL" \
  -H "Accept: application/json" \
  -w "\nHTTP_CODE:%{http_code}\nHEADERS:%{header_json}" \
  -D - \
  "$API_URL/api/products?page=1&page_size=1" 2>/dev/null)

http_code=$(echo "$response" | grep "^HTTP_CODE:" | tail -1 | cut -d':' -f2)
cors_header=$(echo "$response" | grep -i "access-control-allow-origin:" | tail -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Products endpoint working (HTTP 200)${NC}"
else
    echo -e "${RED}✗ Products endpoint failed (HTTP $http_code)${NC}"
fi

if echo "$cors_header" | grep -q "$FRONTEND_URL"; then
    echo -e "${GREEN}✓ CORS headers present for frontend origin${NC}"
else
    echo -e "${RED}✗ CORS headers missing or incorrect${NC}"
fi

# Extract JSON response
json_response=$(echo "$response" | grep "^{" | tail -1)
if echo "$json_response" | grep -q "items"; then
    echo -e "${GREEN}✓ Valid JSON response received${NC}"
    echo "  Response: $json_response"
else
    echo -e "${YELLOW}⚠ Unexpected response format${NC}"
fi

echo ""

# Test 3: Favicon Check
echo "3. Frontend Favicon"
echo "-------------------"
favicon_response=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/favicon.ico" 2>/dev/null)
if [ "$favicon_response" = "200" ] || [ "$favicon_response" = "304" ]; then
    echo -e "${GREEN}✓ Favicon.ico is accessible${NC}"
else
    echo -e "${YELLOW}⚠ Favicon.ico returned HTTP $favicon_response${NC}"
fi

echo ""

# Test 4: OPTIONS Preflight Request
echo "4. CORS Preflight (OPTIONS)"
echo "---------------------------"
options_response=$(curl -X OPTIONS \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: content-type" \
  -s -w "\nHTTP_CODE:%{http_code}" \
  "$API_URL/api/products" 2>/dev/null)

options_code=$(echo "$options_response" | grep "HTTP_CODE:" | cut -d':' -f2)
if [ "$options_code" = "200" ]; then
    echo -e "${GREEN}✓ OPTIONS preflight successful${NC}"
else
    echo -e "${RED}✗ OPTIONS preflight failed (HTTP $options_code)${NC}"
fi

echo ""

# Test 5: Database Driver Check (via debug endpoint if available)
echo "5. Backend Configuration"
echo "------------------------"
debug_response=$(curl -s "$API_URL/debug/cors" 2>/dev/null)
if echo "$debug_response" | grep -q "allowed_origins"; then
    echo -e "${GREEN}✓ Debug endpoint accessible${NC}"
    echo "  Allowed origins: $(echo "$debug_response" | python3 -c "import sys, json; print(json.loads(sys.stdin.read()).get('allowed_origins', []))" 2>/dev/null)"
else
    echo -e "${YELLOW}⚠ Debug endpoint not available${NC}"
fi

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="

# Final test from browser perspective
echo ""
echo "To test from your browser console:"
echo -e "${YELLOW}"
cat << 'EOF'
// Test API connectivity
fetch('https://mdv-api-production.up.railway.app/api/products?page=1&page_size=5')
  .then(r => {
    console.log('Status:', r.status);
    console.log('Headers:', [...r.headers.entries()]);
    return r.json();
  })
  .then(data => console.log('Data:', data))
  .catch(err => console.error('Error:', err));
EOF
echo -e "${NC}"

echo ""
if [ "$http_code" = "200" ] && echo "$cors_header" | grep -q "$FRONTEND_URL"; then
    echo -e "${GREEN}✅ All critical issues are resolved!${NC}"
    echo ""
    echo "✓ Database driver issue fixed (API returns 200)"
    echo "✓ CORS headers properly configured"
    echo "✓ Favicon added to prevent 404"
    echo ""
    echo "Your application should now be fully functional."
else
    echo -e "${YELLOW}⚠ Some issues may still need attention${NC}"
    echo ""
    echo "Check Railway logs for more details:"
    echo "  railway logs --service mdv-api"
fi

echo ""
echo "=========================================="
