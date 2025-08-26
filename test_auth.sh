#!/bin/bash

echo "=========================================="
echo "MDV Authentication Test & Setup"
echo "=========================================="
echo ""

API_URL="https://mdv-api-production.up.railway.app"
FRONTEND_URL="https://mdv-web-production.up.railway.app"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Testing authentication with admin@mdv.ng..."
echo ""

# Test login with admin account
echo "1. Testing admin login..."
echo "----------------------------"

response=$(curl -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mdv.ng","password":"admin123"}' \
  -s -w "\nHTTP_CODE:%{http_code}" 2>/dev/null)

http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d':' -f2)
body=$(echo "$response" | grep -v "HTTP_CODE:")

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Admin login successful${NC}"
    
    # Extract token
    token=$(echo "$body" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', 'No token'))" 2>/dev/null || echo "")
    
    if [ -n "$token" ] && [ "$token" != "No token" ]; then
        echo "Token received: ${token:0:50}..."
        
        # Test authenticated endpoint
        echo ""
        echo "2. Testing authenticated endpoint..."
        echo "------------------------------------"
        
        profile_response=$(curl -s -H "Authorization: Bearer $token" \
          -w "\nHTTP_CODE:%{http_code}" \
          "$API_URL/api/users/profile" 2>/dev/null)
        
        profile_code=$(echo "$profile_response" | grep "HTTP_CODE:" | cut -d':' -f2)
        profile_body=$(echo "$profile_response" | grep -v "HTTP_CODE:")
        
        if [ "$profile_code" = "200" ]; then
            echo -e "${GREEN}✓ Profile endpoint accessible${NC}"
            echo "User data:"
            echo "$profile_body" | python3 -m json.tool 2>/dev/null | head -10 || echo "$profile_body"
        else
            echo -e "${YELLOW}⚠ Profile endpoint returned $profile_code${NC}"
            echo "Response: $profile_body"
        fi
    else
        echo -e "${YELLOW}⚠ No token in response${NC}"
        echo "Response: $body"
    fi
elif [ "$http_code" = "401" ]; then
    echo -e "${YELLOW}⚠ Login failed - user might not exist or wrong password${NC}"
    echo "The backend will auto-create admin@mdv.ng on first login attempt (MVP mode)"
    echo "Try logging in through the web interface first."
else
    echo -e "${RED}✗ Login failed with HTTP $http_code${NC}"
    echo "Response: $body"
fi

echo ""
echo "3. Testing other test accounts..."
echo "----------------------------------"

test_accounts=(
    "supervisor@mdv.ng:supervisor123"
    "operations@mdv.ng:operations123"
    "staff@mdv.ng:staff123"
)

for account in "${test_accounts[@]}"; do
    email="${account%%:*}"
    password="${account##*:}"
    
    echo -n "Testing $email... "
    
    login_response=$(curl -X POST "$API_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
      -s -w "\nHTTP_CODE:%{http_code}" 2>/dev/null)
    
    login_code=$(echo "$login_response" | grep "HTTP_CODE:" | cut -d':' -f2)
    
    if [ "$login_code" = "200" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}✗ (HTTP $login_code)${NC}"
    fi
done

echo ""
echo "=========================================="
echo "How to login via web interface:"
echo "=========================================="
echo ""
echo "1. Open: $FRONTEND_URL/login"
echo "2. Use credentials:"
echo "   Email: admin@mdv.ng"
echo "   Password: admin123"
echo ""
echo "3. After login, visit:"
echo "   $FRONTEND_URL/account - User account page"
echo "   $FRONTEND_URL/admin - Admin dashboard"
echo ""
echo "=========================================="
echo ""
echo -e "${YELLOW}Note:${NC} The backend auto-creates MDV staff accounts on first login"
echo "in MVP mode. This should be disabled in production."
echo ""

# Test CORS for login endpoint
echo "4. Testing CORS on login endpoint..."
echo "------------------------------------"

cors_response=$(curl -X OPTIONS "$API_URL/api/auth/login" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -s -w "\nHTTP_CODE:%{http_code}" \
  -D - 2>/dev/null)

cors_code=$(echo "$cors_response" | grep "^HTTP_CODE:" | tail -1 | cut -d':' -f2)

if [ "$cors_code" = "200" ]; then
    echo -e "${GREEN}✓ CORS preflight successful${NC}"
    
    if echo "$cors_response" | grep -q "access-control-allow-origin:.*$FRONTEND_URL"; then
        echo -e "${GREEN}✓ CORS headers correct${NC}"
    else
        echo -e "${YELLOW}⚠ CORS headers might be missing${NC}"
    fi
else
    echo -e "${RED}✗ CORS preflight failed (HTTP $cors_code)${NC}"
fi

echo ""
echo "=========================================="
