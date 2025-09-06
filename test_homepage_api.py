#!/usr/bin/env python3
"""
Comprehensive API testing for homepage configuration endpoints
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test basic health check"""
    print("🔍 Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        print("✅ Health check passed")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def login_admin():
    """Login as admin user and return token"""
    print("🔍 Logging in as admin...")
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@mdv.ng",
            "password": "admin123"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        print("✅ Admin login successful")
        return token
    except Exception as e:
        print(f"❌ Admin login failed: {e}")
        return None

def test_homepage_config_endpoints(token):
    """Test homepage configuration endpoints"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("🔍 Testing homepage config GET endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/admin/homepage/config", headers=headers)
        print(f"GET /admin/homepage/config: {response.status_code}")
        if response.status_code == 200:
            print("✅ Homepage config GET endpoint working")
        elif response.status_code == 404:
            print("✅ Homepage config GET endpoint working (no config yet)")
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Homepage config GET failed: {e}")
        return False
    
    print("🔍 Testing homepage config PUT endpoint...")
    try:
        config_data = {
            "hero_title": "Welcome to MDV",
            "hero_subtitle": "Premium fashion for everyone",
            "hero_cta_text": "Shop Now",
            "hero_cta_link": "/products",
            "featured_product_ids": [],
            "categories_enabled": True
        }
        response = requests.put(f"{BASE_URL}/api/admin/homepage/config",
                              headers=headers, json=config_data)
        print(f"PUT /admin/homepage/config: {response.status_code}")
        if response.status_code in [200, 201]:
            print("✅ Homepage config PUT endpoint working")
        else:
            print(f"❌ PUT failed with status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Homepage config PUT failed: {e}")
        return False
    
    print("🔍 Testing featured candidates endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/admin/homepage/featured-candidates", headers=headers)
        print(f"GET /admin/homepage/featured-candidates: {response.status_code}")
        if response.status_code == 200:
            print("✅ Featured candidates endpoint working")
        else:
            print(f"❌ Featured candidates failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Featured candidates failed: {e}")
        return False
    
    return True

def test_public_homepage_endpoint():
    """Test public homepage configuration endpoint"""
    print("🔍 Testing public homepage config endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/homepage-config")
        print(f"GET /api/homepage-config: {response.status_code}")
        if response.status_code == 200:
            config = response.json()
            print("✅ Public homepage config endpoint working")
            print(f"Config: {json.dumps(config, indent=2)}")
        else:
            print(f"❌ Public homepage config failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Public homepage config failed: {e}")
        return False
    
    return True

def main():
    """Run all API tests"""
    print("🚀 Starting Homepage API Testing...")
    print("=" * 50)
    
    # Test health check
    if not test_health_check():
        sys.exit(1)
    
    # Login as admin
    token = login_admin()
    if not token:
        sys.exit(1)
    
    # Test admin endpoints
    if not test_homepage_config_endpoints(token):
        sys.exit(1)
    
    # Test public endpoint
    if not test_public_homepage_endpoint():
        sys.exit(1)
    
    print("=" * 50)
    print("✅ All homepage API tests passed!")

if __name__ == "__main__":
    main()
