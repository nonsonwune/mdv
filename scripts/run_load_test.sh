#!/bin/bash

# Database Connection Pool Load Test Runner
# This script runs the database load test to verify connection pool optimization

set -e

echo "🔧 Database Connection Pool Load Test"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "backend/scripts/load_test_db.py" ]; then
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

# Check if database is running
echo "🔍 Checking database connection..."
if ! python -c "
import asyncio
import sys
sys.path.insert(0, 'backend')
from mdv.db import get_database_health

async def check():
    try:
        health = get_database_health()
        if health.get('healthy', False):
            print('✅ Database is healthy')
            return True
        else:
            print('❌ Database is not healthy:', health)
            return False
    except Exception as e:
        print('❌ Database connection failed:', e)
        return False

result = asyncio.run(check())
exit(0 if result else 1)
"; then
    echo "❌ Database is not available. Please start the database first:"
    echo "   docker compose up -d postgres redis"
    exit 1
fi

echo ""
echo "🚀 Starting load test..."
echo "This will test the database connection pool with increasing concurrent users."
echo "The test will verify that the system can handle 200+ concurrent users."
echo ""

# Run the load test
python backend/scripts/load_test_db.py

echo ""
echo "✅ Load test completed!"
echo ""
echo "📊 Results Summary:"
echo "- Check the output above for detailed performance metrics"
echo "- The system should handle 200+ concurrent users with <5% error rate"
echo "- Average response times should be under 100ms for good performance"
echo ""
echo "🔧 If the test fails:"
echo "1. Check database connection pool settings in backend/mdv/db.py"
echo "2. Verify Railway resource limits are sufficient"
echo "3. Monitor connection pool metrics during high load"
