#!/usr/bin/env python3
"""
List all users in the database to check what exists after reset.

Usage:
    python scripts/list_all_users.py
"""

import asyncio
import sys
import os
from sqlalchemy import select, text

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User, Role


async def list_all_users():
    """List all users in the database."""
    
    async with SessionLocal() as db:
        print("\n🔍 CHECKING ALL USERS IN DATABASE")
        print("=" * 60)
        
        try:
            # Get all users
            result = await db.execute(select(User).order_by(User.email))
            users = result.scalars().all()
            
            if not users:
                print("❌ No users found in database")
                return
            
            print(f"✅ Found {len(users)} users:")
            print("-" * 60)
            print(f"{'ID':>3} {'Email':35} {'Name':25} {'Role':12} {'Active':6}")
            print("-" * 60)
            
            for user in users:
                status = "Yes" if user.active else "No"
                print(f"{user.id:>3} {user.email:35} {user.name:25} {user.role.value:12} {status:6}")
            
            print("-" * 60)
            print(f"Total: {len(users)} users")
            
            # Check for specific problematic emails
            problematic_emails = ["admin@mdv.ng", "customer@mdv.ng", "ify@mo.men"]
            print(f"\n🔍 CHECKING SPECIFIC EMAILS:")
            print("-" * 40)
            
            for email in problematic_emails:
                user_result = await db.execute(select(User).where(User.email == email))
                user = user_result.scalar_one_or_none()
                if user:
                    print(f"✅ {email:25} - EXISTS (ID: {user.id}, Role: {user.role.value})")
                else:
                    print(f"❌ {email:25} - NOT FOUND")
            
        except Exception as e:
            print(f"❌ Error querying database: {e}")
            import traceback
            traceback.print_exc()


async def main():
    try:
        await list_all_users()
        print("\n✅ User listing completed!")
    except Exception as e:
        print(f"❌ Failed to list users: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
