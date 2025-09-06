#!/usr/bin/env python3
"""
Clear all users from the database and optionally recreate admin users.

Usage:
    python scripts/clear_users.py [--recreate-admin]
"""

import asyncio
import argparse
import sys
import os
from sqlalchemy import select, delete

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User, Role
from password import hash_password


async def clear_all_users(recreate_admin: bool = False):
    """Clear all users from the database."""
    
    async with SessionLocal() as db:
        print("\n🗑️  CLEARING ALL USERS FROM DATABASE")
        print("=" * 50)
        
        try:
            # Count existing users
            count_result = await db.execute(select(User))
            existing_users = count_result.scalars().all()
            user_count = len(existing_users)
            
            if user_count == 0:
                print("ℹ️  Database is already empty (no users found)")
            else:
                print(f"📊 Found {user_count} existing users:")
                for user in existing_users:
                    print(f"   - {user.email} ({user.role.value})")
                
                # Delete all users
                print(f"\n🗑️  Deleting all {user_count} users...")
                await db.execute(delete(User))
                await db.commit()
                print(f"✅ Successfully deleted {user_count} users")
            
            # Recreate admin user if requested
            if recreate_admin:
                print(f"\n👤 RECREATING ADMIN USER")
                print("-" * 30)
                
                admin_user = User(
                    name="Admin User",
                    email="admin@mdv.ng",
                    role=Role.admin,
                    active=True,
                    password_hash=hash_password("admin123")
                )
                
                db.add(admin_user)
                await db.commit()
                
                print(f"✅ Created admin user:")
                print(f"   Email: admin@mdv.ng")
                print(f"   Password: admin123")
                print(f"   Role: admin")
            
            print(f"\n✅ User clearing completed successfully!")
            
        except Exception as e:
            print(f"❌ Error clearing users: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()
            raise


async def main():
    parser = argparse.ArgumentParser(description="Clear all users from the database")
    parser.add_argument("--recreate-admin", action="store_true", 
                       help="Recreate admin user after clearing")
    
    args = parser.parse_args()
    
    # Confirmation prompt
    if args.recreate_admin:
        action = "clear all users and recreate admin user"
    else:
        action = "clear all users"
    
    print(f"\n⚠️  WARNING: This will {action} in the database!")
    confirm = input("Are you sure you want to continue? (yes/no): ").lower().strip()
    
    if confirm != "yes":
        print("❌ Operation cancelled")
        sys.exit(0)
    
    try:
        await clear_all_users(args.recreate_admin)
        print("\n🎉 User clearing completed successfully!")
    except Exception as e:
        print(f"❌ Failed to clear users: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
