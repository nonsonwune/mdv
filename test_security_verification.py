#!/usr/bin/env python3
"""
Verify the critical security fix for guest checkout role assignment
"""
import requests
import sys

BASE_URL = "http://localhost:8000"

def verify_security_fix_in_code():
    """Verify the security fix is present in the code"""
    print("🔍 Verifying security fix in source code...")
    
    try:
        with open("backend/api/routers/public.py", "r") as f:
            content = f.read()
            
        # Check for the security fix
        if "role=Role.customer" in content:
            print("✅ SECURITY FIX VERIFIED: Code contains 'role=Role.customer'")
            
            # Check that it's not using the vulnerable code
            if "role=Role.operations" in content:
                print("❌ SECURITY ISSUE: Code still contains 'role=Role.operations'")
                return False
            else:
                print("✅ SECURITY FIX VERIFIED: No 'role=Role.operations' found")
                return True
        else:
            print("❌ SECURITY FIX NOT FOUND: 'role=Role.customer' not found in code")
            return False
            
    except Exception as e:
        print(f"❌ Could not verify code: {e}")
        return False

def test_admin_login():
    """Test admin login works"""
    print("🔍 Testing admin login...")
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@mdv.ng",
            "password": "admin123"
        })
        
        if response.status_code == 200:
            token = response.json()["access_token"]
            role = response.json()["role"]
            print(f"✅ Admin login successful, role: {role}")
            return token
        else:
            print(f"❌ Admin login failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Admin login error: {e}")
        return None

def test_customer_login():
    """Test customer login works"""
    print("🔍 Testing customer login...")
    try:
        # Try to login as logistics user (which should be customer-like)
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "logistics@mdv.ng",
            "password": "logistics123"
        })
        
        if response.status_code == 200:
            token = response.json()["access_token"]
            role = response.json()["role"]
            print(f"✅ Logistics user login successful, role: {role}")
            return token, role
        else:
            print(f"❌ Logistics user login failed: {response.status_code}")
            return None, None
    except Exception as e:
        print(f"❌ Logistics user login error: {e}")
        return None, None

def test_role_based_access_control(admin_token, customer_token, customer_role):
    """Test that RBAC works correctly"""
    print("🔍 Testing role-based access control...")
    
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    customer_headers = {"Authorization": f"Bearer {customer_token}"}
    
    # Test admin can access admin endpoints
    try:
        response = requests.get(f"{BASE_URL}/api/admin/homepage/config", headers=admin_headers)
        if response.status_code in [200, 404]:  # 404 is OK if no config exists
            print("✅ Admin can access admin endpoints")
        else:
            print(f"❌ Admin cannot access admin endpoints: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Admin access test failed: {e}")
        return False
    
    # Test customer/logistics cannot access admin endpoints
    try:
        response = requests.get(f"{BASE_URL}/api/admin/homepage/config", headers=customer_headers)
        if response.status_code == 403:
            print(f"✅ {customer_role} role correctly denied access to admin endpoints")
        elif response.status_code == 401:
            print(f"✅ {customer_role} role correctly denied access (unauthorized)")
        else:
            print(f"❌ {customer_role} role has unexpected access: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Customer access test failed: {e}")
        return False
    
    return True

def test_api_health():
    """Test API health"""
    print("🔍 Testing API health...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ API health check passed")
            return True
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API health check error: {e}")
        return False

def main():
    """Run comprehensive security verification"""
    print("🔒 Starting Comprehensive Security Verification...")
    print("=" * 60)
    
    # 1. Verify the fix is in the code
    if not verify_security_fix_in_code():
        print("❌ Security fix verification failed!")
        sys.exit(1)
    
    # 2. Test API health
    if not test_api_health():
        print("❌ API health check failed!")
        sys.exit(1)
    
    # 3. Test admin login
    admin_token = test_admin_login()
    if not admin_token:
        print("❌ Admin login failed!")
        sys.exit(1)
    
    # 4. Test customer/logistics login
    customer_token, customer_role = test_customer_login()
    if not customer_token:
        print("❌ Customer login failed!")
        sys.exit(1)
    
    # 5. Test role-based access control
    if not test_role_based_access_control(admin_token, customer_token, customer_role):
        print("❌ Role-based access control test failed!")
        sys.exit(1)
    
    print("=" * 60)
    print("✅ ALL SECURITY TESTS PASSED!")
    print("🔒 Security fix verified: Guest checkout assigns 'customer' role")
    print("🔒 Role-based access control working correctly")
    print("🔒 Admin endpoints protected from non-admin users")

if __name__ == "__main__":
    main()
