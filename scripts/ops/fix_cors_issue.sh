#!/bin/bash

echo "=========================================="
echo "MDV CORS Issue Fix"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Issue Analysis:${NC}"
echo "1. The APP_URL environment variable is incorrectly set to the API URL"
echo "2. It should be set to the frontend URL for CORS to work properly"
echo "3. The FastAPI CORS middleware needs to be updated to handle this correctly"
echo ""

echo -e "${GREEN}Step 1: Update Railway Environment Variable${NC}"
echo "The APP_URL should point to your frontend, not the API."
echo ""
echo "Run this command to fix it:"
echo -e "${GREEN}railway variables --set APP_URL=https://mdv-web-production.up.railway.app --service mdv-api${NC}"
echo ""
echo "Press Enter to execute this command, or Ctrl+C to cancel..."
read

# Update the APP_URL environment variable
railway variables --set APP_URL=https://mdv-web-production.up.railway.app --service mdv-api

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ APP_URL updated successfully${NC}"
else
    echo -e "${RED}✗ Failed to update APP_URL${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 2: Verify the change${NC}"
railway variables --service mdv-api | grep APP_URL

echo ""
echo -e "${GREEN}Step 3: Redeploy the API service${NC}"
echo "The service needs to be redeployed to pick up the new environment variable."
echo "Press Enter to redeploy, or Ctrl+C to cancel..."
read

railway redeploy --service mdv-api --yes

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ API service redeployed${NC}"
else
    echo -e "${RED}✗ Failed to redeploy API service${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 4: Test CORS${NC}"
echo "Wait about 30 seconds for the service to restart, then test with:"
echo ""
echo "curl -X OPTIONS \\"
echo "  -H 'Origin: https://mdv-web-production.up.railway.app' \\"
echo "  -H 'Access-Control-Request-Method: GET' \\"
echo "  -H 'Access-Control-Request-Headers: content-type' \\"
echo "  -v https://mdv-api-production.up.railway.app/api/products"
echo ""
echo "You should see these headers in the response:"
echo "  < access-control-allow-origin: https://mdv-web-production.up.railway.app"
echo "  < access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS, PATCH"
echo ""

echo -e "${YELLOW}Additional Notes:${NC}"
echo "- The updated main.py file hardcodes the production frontend URL as a fallback"
echo "- This ensures CORS will work even if APP_URL is misconfigured"
echo "- The CORS middleware now properly handles preflight requests"
echo ""
echo -e "${GREEN}✓ CORS fix process complete!${NC}"
