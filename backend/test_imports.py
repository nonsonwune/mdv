#!/usr/bin/env python
"""
Test script to verify imports and schema definitions
"""
import sys
import os

# Add backend to path
sys.path.insert(0, '/Users/mac/Repository/mdv/backend')
sys.path.insert(0, '/Users/mac/Repository/mdv')

def test_imports():
    print("Testing imports...")
    
    try:
        print("1. Importing schemas module...")
        from backend.mdv import schemas
        print("   ✓ schemas module imported")
        
        print("2. Checking AuthLoginRequest...")
        if hasattr(schemas, 'AuthLoginRequest'):
            print(f"   ✓ AuthLoginRequest found: {schemas.AuthLoginRequest}")
        else:
            print("   ✗ AuthLoginRequest not found in schemas")
            
        print("3. Checking AuthLoginResponse...")
        if hasattr(schemas, 'AuthLoginResponse'):
            print(f"   ✓ AuthLoginResponse found: {schemas.AuthLoginResponse}")
        else:
            print("   ✗ AuthLoginResponse not found in schemas")
            
        print("4. Testing direct import...")
        from backend.mdv.schemas import AuthLoginRequest, AuthLoginResponse
        print("   ✓ Direct import successful")
        
        print("5. Creating instances...")
        req = AuthLoginRequest(email="test@example.com", password="test123")
        print(f"   ✓ AuthLoginRequest instance created: {req}")
        
        resp = AuthLoginResponse(
            access_token="test_token",
            token="test_token",
            role="admin",
            token_type="bearer"
        )
        print(f"   ✓ AuthLoginResponse instance created: {resp}")
        
        print("\n6. Testing auth router import...")
        from backend.api.routers import auth
        print("   ✓ Auth router imported successfully")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_imports()
