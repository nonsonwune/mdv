#!/bin/bash

# CORS Configuration Testing Script
# Tests CORS settings across different environments

set -e

echo "🌐 CORS Configuration Testing"
echo "============================"

# Check if we're in the right directory
if [ ! -f "backend/scripts/test_cors.py" ]; then
    echo "❌ Error: Must be run from the project root directory"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Error: Virtual environment not found. Please run 'make setup' first."
    exit 1
fi

# Activate virtual environment
source .venv/bin/activate

# Install required dependencies if not present
pip install aiohttp > /dev/null 2>&1 || echo "aiohttp already installed"

# Determine the API URL to test
API_URL=${1:-"http://localhost:8000"}

echo "🔍 Testing CORS configuration against: $API_URL"
echo ""

# Check if API is running
echo "⏳ Checking if API is accessible..."
if curl -s --max-time 5 "$API_URL/health" > /dev/null; then
    echo "✅ API is accessible"
else
    echo "❌ API is not accessible at $API_URL"
    echo "   Please ensure the API is running:"
    echo "   - For local: make dev-api"
    echo "   - For production: check Railway deployment"
    exit 1
fi

echo ""
echo "🚀 Running CORS tests..."
echo "This will test various origin scenarios and request types."
echo ""

# Run the CORS tests
python backend/scripts/test_cors.py "$API_URL"

echo ""
echo "📋 Test completed!"
echo ""
echo "🔧 If tests fail:"
echo "1. Check CORS configuration in backend/api/main.py"
echo "2. Verify allowed origins include your frontend URLs"
echo "3. Ensure preflight requests are handled correctly"
echo "4. Check that error responses include CORS headers"
echo ""
echo "💡 For production testing:"
echo "   ./scripts/test_cors.sh https://mdv-api-production.up.railway.app"
