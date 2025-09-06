#!/usr/bin/env python3
"""
Test script to verify the user role assignment fix.
"""
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from mdv.models import Role

def test_role_assignment():
    """Test that we're using the correct role for customers."""
    print("🧪 Testing Role Assignment Fix")
    print("=" * 40)
    
    # Test 1: Verify Role enum values
    print(f"✅ Role.customer = '{Role.customer.value}'")
    print(f"✅ Role.operations = '{Role.operations.value}'")
    
    # Test 2: Verify the fix is in place
    with open("backend/api/routers/public.py", "r") as f:
        content = f.read()
        
    if "role=Role.customer,  # Customer role" in content:
        print("✅ Fix is in place: Guest checkout assigns Role.customer")
    else:
        print("❌ Fix not found: Guest checkout may still assign wrong role")
        return False
    
    if "role=Role.operations,  # Customer role" in content:
        print("❌ Bug still present: Found Role.operations assignment")
        return False
    else:
        print("✅ Bug fixed: No Role.operations assignment found")
    
    print("\n🎉 All tests passed! The role assignment bug has been fixed.")
    return True

if __name__ == "__main__":
    success = test_role_assignment()
    sys.exit(0 if success else 1)
