#!/usr/bin/env python3
"""
Run database migration to remove featured_product_ids column
"""
import requests
import os

def run_migration():
    """Run the database migration in production"""
    print("🚀 Running database migration...")
    print("=" * 60)
    
    # Get admin token
    API_BASE_URL = "https://mdv-api-production.up.railway.app"
    
    # Login as admin
    print("🔐 Logging in as admin...")
    login_response = requests.post(f"{API_BASE_URL}/api/auth/login", json={
        "email": "admin@mdv.com",
        "password": "admin123"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Run migration by calling the migration endpoint
    print("🔧 Running migration to remove featured_product_ids column...")

    try:
        # Call the migration endpoint
        response = requests.post(f"{API_BASE_URL}/api/admin/homepage/migrate-remove-featured-products",
                               headers=headers, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print(f"✅ {result.get('message')}")

                # Verify the migration by checking the config
                config_response = requests.get(f"{API_BASE_URL}/api/homepage-config")
                if config_response.status_code == 200:
                    config_data = config_response.json()
                    if "featured_product_ids" not in config_data:
                        print("✅ Verification successful: featured_product_ids column removed")
                        return True
                    else:
                        print("⚠️  Column still exists in API response")
                        return False
                else:
                    print(f"❌ Could not verify migration: {config_response.status_code}")
                    return False
            else:
                print(f"❌ Migration failed: {result.get('message')}")
                return False
        else:
            print(f"❌ Migration request failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Migration error: {e}")
        return False

def main():
    """Main function"""
    print("🗄️  Database Migration: Remove featured_product_ids")
    print("=" * 60)
    
    if run_migration():
        print("=" * 60)
        print("✅ SUCCESS: Database migration completed!")
        print("🎉 Homepage configuration system updated")
        return 0
    else:
        print("=" * 60)
        print("❌ FAILED: Migration encountered issues")
        return 1

if __name__ == "__main__":
    import sys
    result = main()
    sys.exit(result)
