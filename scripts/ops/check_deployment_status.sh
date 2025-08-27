#!/bin/bash

echo "=========================================="
echo "MDV Deployment Status Check"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check service status
check_service() {
    local service_name=$1
    local service_url=$2
    
    echo -n "Checking $service_name... "
    
    if [ -n "$service_url" ] && [ "$service_url" != "null" ]; then
        # Try to connect to the service
        response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "https://$service_url/health" 2>/dev/null || echo "000")
        
        if [ "$response" = "200" ] || [ "$response" = "204" ] || [ "$response" = "404" ]; then
            echo -e "${GREEN}✓ Running${NC} (https://$service_url)"
        elif [ "$response" = "000" ]; then
            echo -e "${YELLOW}⚠ Starting up or no health endpoint${NC} (https://$service_url)"
        else
            echo -e "${RED}✗ Not responding (HTTP $response)${NC}"
        fi
    else
        echo -e "${RED}✗ No URL found${NC}"
    fi
}

# Get service URLs from Railway
echo "Getting service URLs from Railway..."
echo ""

# mdv-api
API_URL=$(railway variables --service mdv-api --json 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('RAILWAY_PUBLIC_DOMAIN', 'null'))" 2>/dev/null || echo "null")
check_service "mdv-api" "$API_URL"

# mdv-worker (no public URL, check if running)
echo -n "Checking mdv-worker... "
WORKER_STATUS=$(railway status --service mdv-worker 2>/dev/null | grep -i "active" > /dev/null && echo "active" || echo "inactive")
if [ "$WORKER_STATUS" = "active" ]; then
    echo -e "${GREEN}✓ Active${NC} (background worker, no public URL)"
else
    echo -e "${YELLOW}⚠ Check Railway dashboard for status${NC}"
fi

# mdv-web
WEB_URL=$(railway variables --service mdv-web --json 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('RAILWAY_PUBLIC_DOMAIN', 'null'))" 2>/dev/null || echo "null")
check_service "mdv-web" "$WEB_URL"

echo ""
echo "Environment Variables Check:"
echo "----------------------------"

# Check if mdv-web has correct environment variables
echo -n "mdv-web NEXT_PUBLIC_API_URL: "
API_VAR=$(railway variables --service mdv-web --json 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); url = data.get('NEXT_PUBLIC_API_URL', 'not set'); print('✓' if 'railway.app' in url else '✗ ' + url)" 2>/dev/null)
echo "$API_VAR"

echo ""
echo "Latest Deployment Logs:"
echo "----------------------"
echo "mdv-api recent logs:"
railway logs --service mdv-api 2>/dev/null | grep -E "Migration|Starting|ERROR" | tail -5 || echo "Unable to fetch logs"

echo ""
echo "=========================================="
echo "Summary:"
if [ -n "$API_URL" ] && [ "$API_URL" != "null" ] && [ -n "$WEB_URL" ] && [ "$WEB_URL" != "null" ]; then
    echo -e "${GREEN}Deployment appears to be running!${NC}"
    echo ""
    echo "Frontend URL: https://$WEB_URL"
    echo "API URL: https://$API_URL"
    echo ""
    echo "If frontend shows 'localhost:8000' errors, the build may still be in progress."
    echo "Wait 2-3 minutes and check again."
else
    echo -e "${YELLOW}Services are still deploying or have issues.${NC}"
    echo "Check Railway dashboard for more details."
fi
echo "=========================================="
