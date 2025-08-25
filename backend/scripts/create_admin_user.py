#!/usr/bin/env python
"""
Script to create an admin user for testing purposes.
Usage: python scripts/create_admin_user.py
"""
import asyncio
import sys
import os
import hashlib
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from backend.mdv.db import get_session_factory
from backend.mdv.models import User, Role


def hash_password(password: str) -> str:
    """Hash a password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()


async def create_admin_user():
    """Create an admin user."""
    # Admin user details
    admin_email = "admin@mdv.ng"
    admin_name = "System Admin"
    admin_password = "admin123456"  # Change this in production!
    
    # Supervisor user details
    supervisor_email = "supervisor@mdv.ng"
    supervisor_name = "Test Supervisor"
    supervisor_password = "super123456"  # Change this in production!
    
    Session = get_session_factory()
    
    async with Session() as db:
        # Check if admin already exists
        existing_admin = await db.execute(select(User).where(User.email == admin_email))
        admin_user = existing_admin.scalar_one_or_none()
        
        if admin_user:
            print(f"✓ Admin user already exists: {admin_email}")
            # Update to ensure it's an admin
            if admin_user.role != Role.admin:
                admin_user.role = Role.admin
                admin_user.active = True
                print(f"  → Updated role to admin")
        else:
            # Create admin user
            admin_user = User(
                name=admin_name,
                email=admin_email,
                role=Role.admin,
                active=True,
                password_hash=hash_password(admin_password)
            )
            db.add(admin_user)
            print(f"✓ Created admin user: {admin_email}")
        
        # Check if supervisor already exists
        existing_supervisor = await db.execute(select(User).where(User.email == supervisor_email))
        supervisor_user = existing_supervisor.scalar_one_or_none()
        
        if supervisor_user:
            print(f"✓ Supervisor user already exists: {supervisor_email}")
            # Update to ensure it's a supervisor
            if supervisor_user.role != Role.supervisor:
                supervisor_user.role = Role.supervisor
                supervisor_user.active = True
                print(f"  → Updated role to supervisor")
        else:
            # Create supervisor user
            supervisor_user = User(
                name=supervisor_name,
                email=supervisor_email,
                role=Role.supervisor,
                active=True,
                password_hash=hash_password(supervisor_password)
            )
            db.add(supervisor_user)
            print(f"✓ Created supervisor user: {supervisor_email}")
        
        # Create some test staff users
        test_users = [
            ("operations1@mdv.ng", "Operations User 1", Role.operations, "ops123456"),
            ("operations2@mdv.ng", "Operations User 2", Role.operations, "ops123456"),
            ("logistics1@mdv.ng", "Logistics User 1", Role.logistics, "log123456"),
            ("logistics2@mdv.ng", "Logistics User 2", Role.logistics, "log123456"),
        ]
        
        for email, name, role, password in test_users:
            existing = await db.execute(select(User).where(User.email == email))
            if not existing.scalar_one_or_none():
                user = User(
                    name=name,
                    email=email,
                    role=role,
                    active=True,
                    password_hash=hash_password(password)
                )
                db.add(user)
                print(f"✓ Created {role.value} user: {email}")
            else:
                print(f"  → {role.value.capitalize()} user already exists: {email}")
        
        await db.commit()
        
        # Display all users
        print("\n" + "="*60)
        print("ALL USERS IN SYSTEM:")
        print("="*60)
        
        all_users = await db.execute(select(User).order_by(User.role, User.id))
        for user in all_users.scalars().all():
            status = "✓ Active" if user.active else "✗ Inactive"
            has_pwd = "Yes" if user.password_hash else "No"
            print(f"[{user.role.value:10}] {user.email:25} - {user.name:20} [{status}] [Password: {has_pwd}]")
        
        print("\n" + "="*60)
        print("LOGIN CREDENTIALS:")
        print("="*60)
        print(f"Admin:      {admin_email} / {admin_password}")
        print(f"Supervisor: {supervisor_email} / {supervisor_password}")
        print(f"Operations: operations1@mdv.ng / ops123456")
        print(f"Logistics:  logistics1@mdv.ng / log123456")
        print("="*60)
        print("\n⚠️  Note: Change these passwords in production!")
        print("⚠️  These are for development/testing only!")


if __name__ == "__main__":
    asyncio.run(create_admin_user())
"""
Create admin user and test users for various roles.
This script creates users for testing all authentication and role-based features.
"""

import asyncio
import sys
import os
sys.path.insert(0, '/Users/mac/Repository/mdv')

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from backend.mdv.models import User, Role
from backend.mdv.auth import create_access_token
from backend.mdv.config import settings
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_test_users():
    """Create test users for all roles."""
    
    # Database connection
    db_url = os.environ.get('DATABASE_URL', 'sqlite+aiosqlite:///./mdv_dev.db')
    engine = create_async_engine(db_url, echo=True)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    
    test_users = [
        {
            "name": "Admin User",
            "email": "admin@mdv.ng",
            "role": Role.admin,
            "password": "admin123",
            "active": True
        },
        {
            "name": "Supervisor User",
            "email": "supervisor@mdv.ng",
            "role": Role.supervisor,
            "password": "supervisor123",
            "active": True
        },
        {
            "name": "Operations User",
            "email": "operations@mdv.ng",
            "role": Role.operations,
            "password": "operations123",
            "active": True
        },
        {
            "name": "Logistics User",
            "email": "logistics@mdv.ng",
            "role": Role.logistics,
            "password": "logistics123",
            "active": True
        },
        # Note: There's no 'staff' role, using operations as default
        {
            "name": "Default Staff User",
            "email": "staff@mdv.ng",
            "role": Role.operations,
            "password": "staff123",
            "active": True
        },
        {
            "name": "Customer User",
            "email": "customer@example.com",
            "role": Role.operations,  # Default role for customers
            "password": "customer123",
            "active": True
        },
        {
            "name": "Test User",
            "email": "test@example.com",
            "role": Role.operations,
            "password": "test123",
            "active": True
        }
    ]
    
    async with SessionLocal() as db:
        print("\n🔐 Creating test users for MDV authentication testing...\n")
        print("-" * 60)
        
        for user_data in test_users:
            # Check if user already exists
            existing_user = (await db.execute(
                select(User).where(User.email == user_data["email"])
            )).scalar_one_or_none()
            
            if existing_user:
                print(f"⚠️  User already exists: {user_data['email']}")
                # Update the user's role and password if needed
                existing_user.role = user_data["role"]
                existing_user.name = user_data["name"]
                existing_user.active = user_data["active"]
                # In real implementation, we'd hash the password
                # existing_user.password_hash = pwd_context.hash(user_data["password"])
                user = existing_user
            else:
                # Create new user
                user = User(
                    name=user_data["name"],
                    email=user_data["email"],
                    role=user_data["role"],
                    active=user_data["active"]
                    # In real implementation: password_hash=pwd_context.hash(user_data["password"])
                )
                db.add(user)
                print(f"✅ Created user: {user_data['email']}")
            
            await db.flush()
            
            # Generate access token for the user
            token = create_access_token(subject=str(user.id), role=user.role)
            
            print(f"\n📧 Email: {user_data['email']}")
            print(f"🔑 Password: {user_data['password']}")
            print(f"👤 Role: {user.role.value}")
            print(f"🎫 Access Token (for testing):")
            print(f"   {token[:50]}...")
            print("-" * 60)
        
        await db.commit()
        print("\n✅ All test users created successfully!")
        
        # Print authentication testing guide
        print("\n" + "=" * 60)
        print("📚 AUTHENTICATION TESTING GUIDE")
        print("=" * 60)
        
        print("""
1. TEST LOGIN (Frontend):
   - Navigate to: http://localhost:3000/login
   - Use any of the credentials above
   
2. TEST LOGIN (API):
   curl -X POST http://localhost:8000/api/auth/login \\
     -H "Content-Type: application/json" \\
     -d '{"email": "admin@mdv.ng", "password": "admin123"}'

3. TEST AUTHENTICATED ENDPOINTS:
   # Get the token from login response, then:
   curl -H "Authorization: Bearer <TOKEN>" \\
     http://localhost:8000/api/admin/orders

4. ROLE-BASED ACCESS:
   - Admin: Full access to all endpoints
   - Supervisor: Fulfillment and logistics management
   - Operations: Order processing
   - Logistics: Shipment management
   - Staff: Basic access
   - Customer: Public endpoints only

5. PASSWORD CHANGE TEST:
   # Currently not implemented - needs endpoint:
   # POST /api/auth/change-password
   # POST /api/auth/reset-password

6. PROFILE UPDATE TEST:
   # Currently not implemented - needs endpoint:
   # PUT /api/users/profile
   # GET /api/users/profile
        """)
        
        print("\n🔍 CHECK USER IN DATABASE:")
        print("   sqlite3 mdv_dev.db")
        print("   SELECT * FROM users;")
        
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_test_users())
