#!/usr/bin/env python
"""
Test script to verify the FastAPI server can start without import errors.
"""

import sys

try:
    # Import the main FastAPI app
    from api.main import app
    print("✅ FastAPI app imported successfully!")
    
    # Test that all routers are registered
    routes = [route.path for route in app.routes]
    print(f"\n📋 Registered routes count: {len(routes)}")
    
    # Check for our new routers
    expected_prefixes = ['/api/users', '/api/orders', '/api/wishlist', '/api/reviews']
    for prefix in expected_prefixes:
        matching_routes = [r for r in routes if r.startswith(prefix)]
        if matching_routes:
            print(f"✅ Found {len(matching_routes)} routes with prefix: {prefix}")
        else:
            print(f"⚠️  No routes found with prefix: {prefix}")
    
    print("\n✅ Server startup test completed successfully!")
    sys.exit(0)
    
except ImportError as e:
    print(f"❌ Import Error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected Error: {e}")
    sys.exit(1)
