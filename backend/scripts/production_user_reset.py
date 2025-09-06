#!/usr/bin/env python3
"""
Complete user reset for production - clears all users and recreates admin.

This script will:
1. Delete ALL users from the database
2. Recreate the admin user with standard credentials
3. Provide a clean slate for adding new users

Usage:
    python scripts/production_user_reset.py
"""

import asyncio
import sys
import os
from sqlalchemy import select, delete, text

# Add the backend directory to the path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from mdv.db import get_session_factory
from mdv.models import User, Role
from mdv.password import hash_password


async def production_user_reset():
    """Complete user reset for production."""
    
    print("\n🔄 PRODUCTION USER RESET")
    print("=" * 50)
    print("This will:")
    print("1. Delete ALL existing users")
    print("2. Recreate admin user (admin@mdv.ng / admin123)")
    print("3. Provide clean slate for new user creation")
    print("=" * 50)
    
    # Confirmation
    confirm = input("\n⚠️  Are you sure you want to proceed? (type 'YES' to confirm): ").strip()
    if confirm != "YES":
        print("❌ Operation cancelled")
        return
    
    Session = get_session_factory()
    async with Session() as db:
        try:
            # Step 1: Count existing users
            print("\n📊 Checking existing users...")
            result = await db.execute(select(User))
            existing_users = result.scalars().all()
            user_count = len(existing_users)
            
            if user_count > 0:
                print(f"Found {user_count} existing users:")
                for user in existing_users:
                    print(f"   - {user.email} ({user.role.value})")
                
                # Step 2: Delete all users
                print(f"\n🗑️  Deleting all {user_count} users...")
                await db.execute(delete(User))
                await db.commit()
                print(f"✅ Successfully deleted {user_count} users")
            else:
                print("ℹ️  No existing users found")
            
            # Step 3: Recreate admin user
            print(f"\n👤 Creating admin user...")
            admin_user = User(
                name="Admin User",
                email="admin@mdv.ng",
                role=Role.admin,
                active=True,
                password_hash=hash_password("admin123")
            )
            
            db.add(admin_user)
            await db.commit()
            
            print(f"✅ Admin user created successfully!")
            print(f"   Email: admin@mdv.ng")
            print(f"   Password: admin123")
            print(f"   Role: admin")
            
            # Step 4: Verify the reset
            print(f"\n🔍 Verifying reset...")
            verify_result = await db.execute(select(User))
            final_users = verify_result.scalars().all()
            
            print(f"✅ Reset complete! Database now contains {len(final_users)} user(s):")
            for user in final_users:
                print(f"   - {user.email} ({user.role.value})")
            
            print(f"\n🎉 Production user reset completed successfully!")
            print(f"You can now:")
            print(f"1. Log in with admin@mdv.ng / admin123")
            print(f"2. Create new users through the admin interface")
            print(f"3. Use any email addresses you want (they're all available now)")
            
        except Exception as e:
            print(f"❌ Error during reset: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()
            raise


async def main():
    try:
        await production_user_reset()
    except Exception as e:
        print(f"❌ Reset failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
