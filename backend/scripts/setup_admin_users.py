#!/usr/bin/env python
"""
Script to create admin and test users for the MDV system.
Usage: python scripts/setup_admin_users.py
"""
import asyncio
import sys
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


async def setup_admin_users():
    """Create admin and test users."""
    
    # Define users to create
    users_to_create = [
        # Admin users
        {
            "email": "admin@mdv.ng",
            "name": "System Administrator",
            "role": Role.admin,
            "password": "admin123456",
            "description": "Main admin account"
        },
        {
            "email": "admin2@mdv.ng",
            "name": "Backup Admin",
            "role": Role.admin,
            "password": "admin223456",
            "description": "Backup admin account"
        },
        # Supervisors
        {
            "email": "supervisor@mdv.ng",
            "name": "Operations Supervisor",
            "role": Role.supervisor,
            "password": "super123456",
            "description": "Main supervisor account"
        },
        {
            "email": "supervisor2@mdv.ng",
            "name": "Logistics Supervisor",
            "role": Role.supervisor,
            "password": "super223456",
            "description": "Logistics supervisor"
        },
        # Operations staff
        {
            "email": "operations1@mdv.ng",
            "name": "Operations Staff 1",
            "role": Role.operations,
            "password": "ops123456",
            "description": "Operations team member"
        },
        {
            "email": "operations2@mdv.ng",
            "name": "Operations Staff 2",
            "role": Role.operations,
            "password": "ops223456",
            "description": "Operations team member"
        },
        # Logistics staff
        {
            "email": "logistics1@mdv.ng",
            "name": "Logistics Staff 1",
            "role": Role.logistics,
            "password": "log123456",
            "description": "Logistics team member"
        },
        {
            "email": "logistics2@mdv.ng",
            "name": "Logistics Staff 2",
            "role": Role.logistics,
            "password": "log223456",
            "description": "Logistics team member"
        },
    ]
    
    Session = get_session_factory()
    
    async with Session() as db:
        print("\n" + "="*70)
        print(" MDV USER SETUP SCRIPT")
        print("="*70 + "\n")
        
        created_count = 0
        updated_count = 0
        
        for user_data in users_to_create:
            # Check if user already exists
            existing = await db.execute(select(User).where(User.email == user_data["email"]))
            user = existing.scalar_one_or_none()
            
            if user:
                # Update existing user
                original_role = user.role
                user.name = user_data["name"]
                user.role = user_data["role"]
                user.password_hash = hash_password(user_data["password"])
                user.active = True
                
                if original_role != user_data["role"]:
                    print(f"📝 Updated: {user_data['email']:25} | Role: {original_role.value} → {user_data['role'].value}")
                    updated_count += 1
                else:
                    print(f"✓  Exists:  {user_data['email']:25} | Role: {user_data['role'].value:10} | {user_data['description']}")
            else:
                # Create new user
                user = User(
                    name=user_data["name"],
                    email=user_data["email"],
                    role=user_data["role"],
                    active=True,
                    password_hash=hash_password(user_data["password"])
                )
                db.add(user)
                print(f"✅ Created: {user_data['email']:25} | Role: {user_data['role'].value:10} | {user_data['description']}")
                created_count += 1
        
        await db.commit()
        
        # Display summary
        print("\n" + "-"*70)
        print(f"Summary: {created_count} users created, {updated_count} users updated")
        print("-"*70 + "\n")
        
        # Show all users in system
        print("CURRENT SYSTEM USERS:")
        print("-"*70)
        print(f"{'Email':30} {'Name':25} {'Role':12} {'Status':8}")
        print("-"*70)
        
        all_users = await db.execute(select(User).order_by(User.role, User.email))
        for user in all_users.scalars().all():
            status = "Active" if user.active else "Inactive"
            print(f"{user.email:30} {user.name:25} {user.role.value:12} {status:8}")
        
        # Display test credentials
        print("\n" + "="*70)
        print(" TEST CREDENTIALS")
        print("="*70)
        print("\nAdmin Access:")
        print("  Email: admin@mdv.ng")
        print("  Password: admin123456")
        print("\nSupervisor Access:")
        print("  Email: supervisor@mdv.ng")
        print("  Password: super123456")
        print("\nOperations Access:")
        print("  Email: operations1@mdv.ng")
        print("  Password: ops123456")
        print("\nLogistics Access:")
        print("  Email: logistics1@mdv.ng")
        print("  Password: log123456")
        
        print("\n" + "="*70)
        print(" API TESTING EXAMPLES")
        print("="*70)
        print("""
1. Login as Admin:
   curl -X POST http://localhost:8000/api/auth/login \\
     -H "Content-Type: application/json" \\
     -d '{"email": "admin@mdv.ng", "password": "admin123456"}'

2. Create a Supervisor (Admin only):
   curl -X POST http://localhost:8000/api/admin/users/supervisor \\
     -H "Authorization: Bearer <ADMIN_TOKEN>" \\
     -H "Content-Type: application/json" \\
     -d '{
       "name": "New Supervisor",
       "email": "newsupervisor@mdv.ng",
       "password": "secure123456"
     }'

3. List All Users (Admin only):
   curl -X GET http://localhost:8000/api/admin/users \\
     -H "Authorization: Bearer <ADMIN_TOKEN>"

4. Get User Statistics (Admin only):
   curl -X GET http://localhost:8000/api/admin/users/stats \\
     -H "Authorization: Bearer <ADMIN_TOKEN>"

5. Update User Role (Admin only):
   curl -X POST http://localhost:8000/api/admin/users/{user_id}/change-role \\
     -H "Authorization: Bearer <ADMIN_TOKEN>" \\
     -H "Content-Type: application/json" \\
     -d '"supervisor"'
        """)
        
        print("\n⚠️  WARNING: These are development credentials. Use secure passwords in production!")
        print("="*70 + "\n")


if __name__ == "__main__":
    asyncio.run(setup_admin_users())
