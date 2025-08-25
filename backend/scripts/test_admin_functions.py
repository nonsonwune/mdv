#!/usr/bin/env python
"""
Script to test admin user management functionality.
This demonstrates all the admin capabilities for managing users.
"""
import asyncio
import httpx
import json
from typing import Optional

# API Configuration
BASE_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@mdv.ng"
ADMIN_PASSWORD = "admin123456"  # Use your actual password


class AdminAPITester:
    def __init__(self):
        self.client = httpx.AsyncClient(base_url=BASE_URL)
        self.token: Optional[str] = None
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def login(self):
        """Login as admin and get token."""
        print(f"\n🔐 Logging in as admin: {ADMIN_EMAIL}")
        response = await self.client.post(
            "/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token") or data.get("token")
            print(f"✅ Login successful! Token: {self.token[:20]}...")
            return True
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    
    @property
    def auth_headers(self):
        """Get authorization headers."""
        return {"Authorization": f"Bearer {self.token}"}
    
    async def test_list_users(self):
        """Test listing all users."""
        print("\n📋 Testing: List All Users")
        print("-" * 50)
        
        response = await self.client.get(
            "/api/admin/users",
            headers=self.auth_headers,
            params={"page": 1, "per_page": 10}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {data['total']} users")
            print("\nUsers:")
            for user in data['items']:
                print(f"  - {user['email']:30} | Role: {user['role']:10} | Active: {user['active']}")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    
    async def test_user_stats(self):
        """Test getting user statistics."""
        print("\n📊 Testing: User Statistics")
        print("-" * 50)
        
        response = await self.client.get(
            "/api/admin/users/stats",
            headers=self.auth_headers
        )
        
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ User Statistics:")
            print(f"  Total Users:     {stats['total_users']}")
            print(f"  Active Users:    {stats['active_users']}")
            print(f"  Inactive Users:  {stats['inactive_users']}")
            print(f"  Recent (30d):    {stats['recent_users']}")
            print(f"\n  By Role:")
            for role, count in stats['by_role'].items():
                print(f"    - {role:12}: {count}")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    
    async def test_create_supervisor(self):
        """Test creating a new supervisor."""
        print("\n➕ Testing: Create New Supervisor")
        print("-" * 50)
        
        supervisor_data = {
            "name": "Test Supervisor",
            "email": f"test_supervisor_{asyncio.get_event_loop().time():.0f}@mdv.ng",
            "password": "supervisor_password123"
        }
        
        print(f"Creating supervisor: {supervisor_data['email']}")
        
        response = await self.client.post(
            "/api/admin/users/supervisor",
            headers=self.auth_headers,
            json=supervisor_data
        )
        
        if response.status_code == 200:
            user = response.json()
            print(f"✅ Supervisor created successfully!")
            print(f"  ID:    {user['id']}")
            print(f"  Email: {user['email']}")
            print(f"  Name:  {user['name']}")
            print(f"  Role:  {user['role']}")
            return user['id']
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return None
    
    async def test_create_user(self):
        """Test creating a regular user."""
        print("\n➕ Testing: Create Regular User")
        print("-" * 50)
        
        user_data = {
            "name": "Test Operations User",
            "email": f"test_ops_{asyncio.get_event_loop().time():.0f}@mdv.ng",
            "role": "operations",
            "password": "ops_password123",
            "active": True
        }
        
        print(f"Creating user: {user_data['email']}")
        
        response = await self.client.post(
            "/api/admin/users",
            headers=self.auth_headers,
            json=user_data
        )
        
        if response.status_code == 200:
            user = response.json()
            print(f"✅ User created successfully!")
            print(f"  ID:    {user['id']}")
            print(f"  Email: {user['email']}")
            print(f"  Name:  {user['name']}")
            print(f"  Role:  {user['role']}")
            return user['id']
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return None
    
    async def test_update_user(self, user_id: int):
        """Test updating a user."""
        print(f"\n✏️ Testing: Update User (ID: {user_id})")
        print("-" * 50)
        
        update_data = {
            "name": "Updated Name",
            "active": False
        }
        
        response = await self.client.put(
            f"/api/admin/users/{user_id}",
            headers=self.auth_headers,
            json=update_data
        )
        
        if response.status_code == 200:
            user = response.json()
            print(f"✅ User updated successfully!")
            print(f"  Name:   {user['name']}")
            print(f"  Active: {user['active']}")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    
    async def test_change_role(self, user_id: int):
        """Test changing a user's role."""
        print(f"\n🔄 Testing: Change User Role (ID: {user_id})")
        print("-" * 50)
        
        response = await self.client.post(
            f"/api/admin/users/{user_id}/change-role",
            headers=self.auth_headers,
            json="logistics"  # Change to logistics role
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Role changed successfully!")
            print(f"  Old Role: {result['old_role']}")
            print(f"  New Role: {result['new_role']}")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    
    async def test_activate_user(self, user_id: int):
        """Test activating a user."""
        print(f"\n✅ Testing: Activate User (ID: {user_id})")
        print("-" * 50)
        
        response = await self.client.post(
            f"/api/admin/users/{user_id}/activate",
            headers=self.auth_headers
        )
        
        if response.status_code == 200:
            print(f"✅ User activated successfully!")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    
    async def test_bulk_create(self):
        """Test creating multiple users at once."""
        print("\n📦 Testing: Bulk User Creation")
        print("-" * 50)
        
        timestamp = asyncio.get_event_loop().time()
        bulk_data = {
            "users": [
                {
                    "name": "Bulk User 1",
                    "email": f"bulk1_{timestamp:.0f}@mdv.ng",
                    "role": "operations",
                    "password": "bulk_password123",
                    "active": True
                },
                {
                    "name": "Bulk User 2",
                    "email": f"bulk2_{timestamp:.0f}@mdv.ng",
                    "role": "logistics",
                    "password": "bulk_password123",
                    "active": True
                }
            ]
        }
        
        response = await self.client.post(
            "/api/admin/users/bulk",
            headers=self.auth_headers,
            json=bulk_data
        )
        
        if response.status_code == 200:
            users = response.json()
            print(f"✅ Created {len(users)} users successfully!")
            for user in users:
                print(f"  - {user['email']} (Role: {user['role']})")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    
    async def test_unauthorized_access(self):
        """Test that non-admin users cannot access admin endpoints."""
        print("\n🚫 Testing: Unauthorized Access Protection")
        print("-" * 50)
        
        # Try without token
        response = await self.client.get("/api/admin/users")
        print(f"Without token: {response.status_code} (Expected: 401)")
        
        # Try with invalid token
        response = await self.client.get(
            "/api/admin/users",
            headers={"Authorization": "Bearer invalid_token"}
        )
        print(f"Invalid token: {response.status_code} (Expected: 401)")


async def main():
    """Run all admin functionality tests."""
    print("=" * 60)
    print(" ADMIN USER MANAGEMENT FUNCTIONALITY TEST")
    print("=" * 60)
    
    async with AdminAPITester() as tester:
        # Login as admin
        if not await tester.login():
            print("\n⚠️  Cannot proceed without admin login")
            print("Please check:")
            print("1. The server is running on http://localhost:8000")
            print("2. Your admin credentials are correct")
            print("3. The admin user exists in the database")
            return
        
        # Test all admin functions
        await tester.test_list_users()
        await tester.test_user_stats()
        
        # Create a supervisor
        supervisor_id = await tester.test_create_supervisor()
        
        # Create a regular user
        user_id = await tester.test_create_user()
        
        if user_id:
            # Test updating the user
            await tester.test_update_user(user_id)
            
            # Test changing role
            await tester.test_change_role(user_id)
            
            # Test activation (after deactivation in update)
            await tester.test_activate_user(user_id)
        
        # Test bulk creation
        await tester.test_bulk_create()
        
        # Test unauthorized access
        await tester.test_unauthorized_access()
    
    print("\n" + "=" * 60)
    print(" TEST COMPLETE")
    print("=" * 60)
    print("\n📝 Summary of Admin Capabilities:")
    print("""
    ✅ User Management:
       - List all users with pagination and filtering
       - Get user statistics
       - Create individual users with any role
       - Create supervisors (simplified endpoint)
       - Bulk create multiple users
       
    ✅ User Updates:
       - Update user details (name, email, active status)
       - Change user roles
       - Activate/deactivate users
       - Reset user passwords
       
    ✅ Security Features:
       - Only admins can access these endpoints
       - Cannot delete/deactivate/demote yourself
       - Audit logging for all actions
       - Password hashing (SHA256, should upgrade to bcrypt)
       
    ✅ API Endpoints Created:
       GET    /api/admin/users           - List users
       GET    /api/admin/users/stats     - User statistics
       GET    /api/admin/users/{id}      - Get specific user
       POST   /api/admin/users           - Create user
       POST   /api/admin/users/supervisor - Create supervisor
       POST   /api/admin/users/bulk      - Bulk create users
       PUT    /api/admin/users/{id}      - Update user
       DELETE /api/admin/users/{id}      - Deactivate user
       POST   /api/admin/users/{id}/activate - Activate user
       POST   /api/admin/users/{id}/change-role - Change role
       POST   /api/admin/users/{id}/reset-password - Reset password
    """)


if __name__ == "__main__":
    print("\n⚠️  Make sure the FastAPI server is running on http://localhost:8000")
    print("⚠️  Update ADMIN_EMAIL and ADMIN_PASSWORD with your actual credentials\n")
    asyncio.run(main())
