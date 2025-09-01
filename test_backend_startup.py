#!/usr/bin/env python
"""
Quick test to see if the backend can import and start without errors
"""
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

def test_imports():
    """Test if all backend modules can be imported"""
    try:
        print("Testing backend imports...")
        
        # Test basic imports
        from mdv.config import settings
        print("✓ mdv.config imported")
        
        from mdv.models import User, Order, Product
        print("✓ mdv.models imported")
        
        from mdv.auth import create_access_token
        print("✓ mdv.auth imported")
        
        from mdv.size_system import SizeSystem
        print("✓ mdv.size_system imported")
        
        # Test API imports
        from backend.api.main import app
        print("✓ backend.api.main imported")
        
        print("All imports successful!")
        return True
        
    except Exception as e:
        print(f"✗ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_app_creation():
    """Test if the FastAPI app can be created"""
    try:
        from backend.api.main import app
        print(f"✓ FastAPI app created: {app}")
        print(f"✓ App routes: {len(app.routes)} routes registered")
        return True
    except Exception as e:
        print(f"✗ App creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Backend Startup Test")
    print("=" * 50)
    
    # Set minimal environment variables
    os.environ.setdefault('DATABASE_URL', 'sqlite+aiosqlite:///./test.db')
    os.environ.setdefault('JWT_SECRET', 'test-secret')
    os.environ.setdefault('ENV', 'development')
    
    success = True
    
    if not test_imports():
        success = False
    
    if not test_app_creation():
        success = False
    
    if success:
        print("✓ Backend startup test passed!")
        sys.exit(0)
    else:
        print("✗ Backend startup test failed!")
        sys.exit(1)
