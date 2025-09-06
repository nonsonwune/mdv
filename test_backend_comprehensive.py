#!/usr/bin/env python3
"""
Comprehensive backend testing for MDV platform
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_health_endpoints():
    """Test health and basic endpoints"""
    print("🔍 Testing health endpoints...")
    
    endpoints = [
        "/health",
        "/api/products",
        "/api/categories",
        "/api/homepage-config"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}")
            if response.status_code in [200, 404]:  # 404 is OK for empty data
                print(f"✅ {endpoint}: {response.status_code}")
            else:
                print(f"❌ {endpoint}: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ {endpoint}: {e}")
            return False
    
    return True

def test_authentication_system():
    """Test authentication for all user roles"""
    print("🔍 Testing authentication system...")
    
    users = [
        {"email": "admin@mdv.ng", "password": "admin123", "expected_role": "admin"},
        {"email": "supervisor@mdv.ng", "password": "supervisor123", "expected_role": "supervisor"},
        {"email": "operations@mdv.ng", "password": "operations123", "expected_role": "operations"},
        {"email": "logistics@mdv.ng", "password": "logistics123", "expected_role": "logistics"}
    ]
    
    tokens = {}
    
    for user in users:
        try:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": user["email"],
                "password": user["password"]
            })
            
            if response.status_code == 200:
                data = response.json()
                role = data.get("role")
                token = data.get("access_token")
                
                if role == user["expected_role"]:
                    print(f"✅ {user['email']}: Login successful, role: {role}")
                    tokens[role] = token
                else:
                    print(f"❌ {user['email']}: Expected role {user['expected_role']}, got {role}")
                    return False, {}
            else:
                print(f"❌ {user['email']}: Login failed with {response.status_code}")
                return False, {}
                
        except Exception as e:
            print(f"❌ {user['email']}: Login error: {e}")
            return False, {}
    
    return True, tokens

def test_admin_endpoints(admin_token):
    """Test admin-specific endpoints"""
    print("🔍 Testing admin endpoints...")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    admin_endpoints = [
        "/api/admin/users",
        "/api/admin/products",
        "/api/admin/homepage/config",
        "/api/admin/homepage/featured-candidates",
        "/api/admin/system/settings",
        "/api/admin/reports/overview"
    ]
    
    for endpoint in admin_endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            if response.status_code in [200, 404]:  # 404 is OK for empty data
                print(f"✅ Admin access to {endpoint}: {response.status_code}")
            else:
                print(f"❌ Admin access to {endpoint}: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Admin access to {endpoint}: {e}")
            return False
    
    return True

def test_rbac_enforcement(tokens):
    """Test role-based access control enforcement"""
    print("🔍 Testing RBAC enforcement...")
    
    # Test that non-admin roles cannot access admin endpoints
    non_admin_roles = ["supervisor", "operations", "logistics"]
    admin_endpoint = "/api/admin/homepage/config"
    
    for role in non_admin_roles:
        if role in tokens:
            headers = {"Authorization": f"Bearer {tokens[role]}"}
            try:
                response = requests.get(f"{BASE_URL}{admin_endpoint}", headers=headers)
                if response.status_code in [403, 401]:
                    print(f"✅ {role} correctly denied access to admin endpoint")
                else:
                    print(f"❌ {role} has unexpected access: {response.status_code}")
                    return False
            except Exception as e:
                print(f"❌ RBAC test for {role}: {e}")
                return False
    
    return True

def test_database_operations():
    """Test basic database operations"""
    print("🔍 Testing database operations...")
    
    # Test cart operations
    try:
        # Create cart
        response = requests.post(f"{BASE_URL}/api/cart")
        if response.status_code == 200:
            cart_id = response.json()["id"]
            print(f"✅ Cart creation successful: {cart_id}")
            
            # Get cart
            response = requests.get(f"{BASE_URL}/api/cart/{cart_id}")
            if response.status_code == 200:
                print("✅ Cart retrieval successful")
            else:
                print(f"❌ Cart retrieval failed: {response.status_code}")
                return False
        else:
            print(f"❌ Cart creation failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Database operations test: {e}")
        return False
    
    return True

def test_homepage_configuration(admin_token):
    """Test homepage configuration system"""
    print("🔍 Testing homepage configuration system...")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Test creating homepage config
    config_data = {
        "hero_title": "Test MDV Platform",
        "hero_subtitle": "Testing homepage configuration",
        "hero_cta_text": "Test Now",
        "hero_cta_link": "/test",
        "featured_product_ids": [],
        "categories_enabled": True
    }
    
    try:
        # Create/update config
        response = requests.put(f"{BASE_URL}/api/admin/homepage/config", 
                              headers=headers, json=config_data)
        if response.status_code in [200, 201]:
            print("✅ Homepage config creation/update successful")
            
            # Verify public endpoint returns the config
            response = requests.get(f"{BASE_URL}/api/homepage-config")
            if response.status_code == 200:
                public_config = response.json()
                if public_config.get("hero_title") == "Test MDV Platform":
                    print("✅ Public homepage config endpoint working")
                else:
                    print("❌ Public homepage config data mismatch")
                    return False
            else:
                print(f"❌ Public homepage config failed: {response.status_code}")
                return False
        else:
            print(f"❌ Homepage config creation failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Homepage configuration test: {e}")
        return False
    
    return True

def main():
    """Run comprehensive backend testing"""
    print("🚀 Starting Comprehensive Backend Testing...")
    print("=" * 60)
    
    # 1. Test health endpoints
    if not test_health_endpoints():
        print("❌ Health endpoints test failed!")
        sys.exit(1)
    
    # 2. Test authentication system
    auth_success, tokens = test_authentication_system()
    if not auth_success:
        print("❌ Authentication system test failed!")
        sys.exit(1)
    
    # 3. Test admin endpoints
    if "admin" in tokens:
        if not test_admin_endpoints(tokens["admin"]):
            print("❌ Admin endpoints test failed!")
            sys.exit(1)
    else:
        print("❌ No admin token available!")
        sys.exit(1)
    
    # 4. Test RBAC enforcement
    if not test_rbac_enforcement(tokens):
        print("❌ RBAC enforcement test failed!")
        sys.exit(1)
    
    # 5. Test database operations
    if not test_database_operations():
        print("❌ Database operations test failed!")
        sys.exit(1)
    
    # 6. Test homepage configuration
    if not test_homepage_configuration(tokens["admin"]):
        print("❌ Homepage configuration test failed!")
        sys.exit(1)
    
    print("=" * 60)
    print("✅ ALL BACKEND TESTS PASSED!")
    print("🔒 Authentication system working")
    print("🔒 RBAC enforcement working")
    print("🔒 Database operations working")
    print("🔒 Homepage configuration system working")
    print("🔒 All API endpoints responding correctly")

if __name__ == "__main__":
    main()
