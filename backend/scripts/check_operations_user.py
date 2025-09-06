#!/usr/bin/env python3
"""
Script to check the operations@mdv.ng user in production database.
"""
import asyncio
import os
import sys
from sqlalchemy import select

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from mdv.db import session_scope
from mdv.models import User


async def check_operations_user():
    """Check the operations@mdv.ng user details."""
    async with session_scope() as db:
        # Find the operations@mdv.ng user
        result = await db.execute(
            select(User).where(User.email == "operations@mdv.ng")
        )
        user = result.scalar_one_or_none()
        
        if user:
            print(f"✓ Found operations@mdv.ng user:")
            print(f"  ID: {user.id}")
            print(f"  Name: {user.name}")
            print(f"  Email: {user.email}")
            print(f"  Role: {user.role.value}")
            print(f"  Active: {user.active}")
            print(f"  Has Password: {user.password_hash is not None}")
            print(f"  Password Hash: {user.password_hash[:20] + '...' if user.password_hash else 'None'}")
            print(f"  Force Password Change: {user.force_password_change}")
            print(f"  Created At: {user.created_at}")
        else:
            print("✗ operations@mdv.ng user not found")
        
        # Also check all operations role users
        print("\n" + "="*50)
        print("All users with operations role:")
        print("="*50)
        
        result = await db.execute(
            select(User).where(User.role == "operations").order_by(User.email)
        )
        operations_users = result.scalars().all()
        
        for user in operations_users:
            print(f"  {user.email:30} | {user.name:20} | Has Password: {user.password_hash is not None} | Active: {user.active}")


if __name__ == "__main__":
    asyncio.run(check_operations_user())
