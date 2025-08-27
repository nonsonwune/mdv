#!/bin/bash

echo "Verifying MDV Deployment"
echo "========================"

# Check API service
echo "1. Checking API service..."
API_URL=$(railway variables --service mdv-api | grep RAILWAY_PUBLIC_DOMAIN | awk '{print $3}')
if [ -n "$API_URL" ]; then
    curl -s "https://$API_URL/health" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ API service is accessible"
    else
        echo "✗ API service is not responding"
    fi
else
    echo "✗ Could not get API URL"
fi

# Check Worker service
echo "2. Checking Worker service status..."
railway logs --service mdv-worker | tail -5

# Check Web service
echo "3. Checking Web service..."
WEB_URL=$(railway variables --service mdv-web | grep RAILWAY_PUBLIC_DOMAIN | awk '{print $3}')
if [ -n "$WEB_URL" ]; then
    echo "Web URL: https://$WEB_URL"
fi

# Check environment variables
echo "4. Verifying environment variables..."
railway variables --service mdv-web | grep NEXT_PUBLIC

echo ""
echo "Deployment verification complete"
