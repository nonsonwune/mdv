#!/usr/bin/env python3
"""
Check if a specific user exists in the database and verify their details.

Usage:
    python scripts/check_user.py --email ify@mo.men
"""

import asyncio
import argparse
import sys
import os
from sqlalchemy import select

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User, Role
from password import verify_password


async def check_user(email: str, test_password: str = None):
    """Check if a user exists and optionally test password."""
    
    async with SessionLocal() as db:
        print(f"\n🔍 Checking user: {email}")
        print("-" * 50)
        
        # Find the user
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ User not found: {email}")
            return False
        
        # Display user details
        print(f"✅ User found!")
        print(f"   ID: {user.id}")
        print(f"   Name: {user.name}")
        print(f"   Email: {user.email}")
        print(f"   Role: {user.role.value}")
        print(f"   Active: {user.active}")
        print(f"   Created: {user.created_at}")
        print(f"   Password Hash Length: {len(user.password_hash) if user.password_hash else 0}")
        print(f"   Password Hash Preview: {user.password_hash[:20] if user.password_hash else 'None'}...")
        
        # Test password if provided
        if test_password:
            print(f"\n🔐 Testing password...")
            try:
                is_valid = verify_password(test_password, user.password_hash)
                if is_valid:
                    print(f"✅ Password is VALID for {email}")
                else:
                    print(f"❌ Password is INVALID for {email}")
                    
                # Also test with bcrypt directly for debugging
                import bcrypt
                try:
                    bcrypt_valid = bcrypt.checkpw(test_password.encode('utf-8'), user.password_hash.encode('utf-8'))
                    print(f"   Direct bcrypt check: {'✅ VALID' if bcrypt_valid else '❌ INVALID'}")
                except Exception as e:
                    print(f"   Direct bcrypt check failed: {e}")
                    
            except Exception as e:
                print(f"❌ Password verification failed: {e}")
                import traceback
                traceback.print_exc()
        
        return True


async def main():
    parser = argparse.ArgumentParser(description="Check if a user exists in the database")
    parser.add_argument("--email", required=True, help="Email address to check")
    parser.add_argument("--password", help="Password to test (optional)")
    
    args = parser.parse_args()
    
    try:
        exists = await check_user(args.email, args.password)
        if exists:
            print(f"\n✅ User check completed successfully!")
        else:
            print(f"\n❌ User not found!")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Failed to check user: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
