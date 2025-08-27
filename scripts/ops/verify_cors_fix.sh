#!/bin/bash

echo "=========================================="
echo "CORS Configuration Verification"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="https://mdv-api-production.up.railway.app"
FRONTEND_URL="https://mdv-web-production.up.railway.app"

echo "Testing CORS configuration..."
echo "Frontend URL: $FRONTEND_URL"
echo "API URL: $API_URL"
echo ""

# Test 1: OPTIONS Preflight Request
echo "Test 1: OPTIONS Preflight Request"
echo "---------------------------------"
response=$(curl -X OPTIONS \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: content-type" \
  -w "\nHTTP_CODE:%{http_code}" \
  -s "$API_URL/api/products" 2>/dev/null)

http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d':' -f2)
if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Preflight request successful (HTTP 200)${NC}"
else
    echo -e "${RED}✗ Preflight request failed (HTTP $http_code)${NC}"
fi

# Check for CORS headers
if echo "$response" | grep -q "access-control-allow-origin:"; then
    origin=$(echo "$response" | grep "access-control-allow-origin:" | cut -d' ' -f2)
    echo -e "${GREEN}✓ CORS origin header present: $origin${NC}"
else
    echo -e "${RED}✗ CORS origin header missing${NC}"
fi

echo ""

# Test 2: GET Request with Origin
echo "Test 2: GET Request with Origin Header"
echo "--------------------------------------"
response=$(curl -H "Origin: $FRONTEND_URL" \
  -H "Accept: application/json" \
  -w "\nHTTP_CODE:%{http_code}" \
  -s "$API_URL/health" 2>/dev/null)

http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d':' -f2)
if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ GET request successful (HTTP 200)${NC}"
else
    echo -e "${RED}✗ GET request failed (HTTP $http_code)${NC}"
fi

# Check for CORS headers in response
if echo "$response" | grep -q "access-control-allow-origin"; then
    echo -e "${GREEN}✓ CORS headers present in response${NC}"
else
    echo -e "${RED}✗ CORS headers missing in response${NC}"
fi

echo ""

# Test 3: Check Debug Endpoint
echo "Test 3: CORS Debug Endpoint"
echo "---------------------------"
debug_response=$(curl -s "$API_URL/debug/cors" 2>/dev/null)
if echo "$debug_response" | grep -q "$FRONTEND_URL"; then
    echo -e "${GREEN}✓ Frontend URL is in allowed origins${NC}"
    echo "Debug response:"
    echo "$debug_response" | python3 -m json.tool 2>/dev/null || echo "$debug_response"
else
    echo -e "${RED}✗ Frontend URL not found in allowed origins${NC}"
    echo "$debug_response"
fi

echo ""

# Test 4: Test from browser perspective
echo "Test 4: Browser Simulation"
echo "--------------------------"
echo "Testing fetch from browser console..."
echo ""
echo "To test from your browser, open the frontend site and run this in console:"
echo -e "${YELLOW}"
echo "fetch('$API_URL/health')"
echo "  .then(r => r.json())"
echo "  .then(data => console.log('Success:', data))"
echo "  .catch(err => console.error('Error:', err));"
echo -e "${NC}"

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="

if [ "$http_code" = "200" ] && echo "$response" | grep -q "access-control-allow-origin"; then
    echo -e "${GREEN}✓ CORS is properly configured!${NC}"
    echo ""
    echo "The API is now accepting requests from your frontend."
    echo "If you're still seeing CORS errors in the browser:"
    echo "1. Clear browser cache and cookies"
    echo "2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)"
    echo "3. Check browser console for any other errors"
else
    echo -e "${YELLOW}⚠ CORS may need additional configuration${NC}"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check Railway logs: railway logs --service mdv-api"
    echo "2. Ensure the deployment completed: railway status --service mdv-api"
    echo "3. Verify environment variables: railway variables --service mdv-api | grep APP_URL"
fi

echo ""
echo "=========================================="
