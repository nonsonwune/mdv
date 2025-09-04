#!/usr/bin/env python3
"""
Database migration to add 'customer' role to the Role enum.

This migration:
1. Adds 'customer' to the role enum
2. Updates existing users with role 'operations' who should be customers
3. Ensures proper role assignment for future registrations

Run this script after deploying the backend code changes.
"""

import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

# Add the backend directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mdv.db import get_db_url


async def migrate_add_customer_role():
    """Add customer role to the database enum and migrate existing users."""
    
    # Create database connection
    db_url = get_db_url()
    engine = create_async_engine(db_url)
    
    try:
        async with engine.begin() as conn:
            print("Starting migration: Add customer role...")
            
            # Step 1: Add 'customer' to the role enum
            print("1. Adding 'customer' to role enum...")
            await conn.execute(text("""
                ALTER TYPE role ADD VALUE IF NOT EXISTS 'customer';
            """))
            print("   ✓ Customer role added to enum")
            
            # Step 2: Identify users who should be customers
            # These are users with 'operations' role who don't have admin dashboard access
            # For now, we'll identify them by checking if they have password_hash (customer registrations)
            # and were created through public registration (not admin-created)
            print("2. Identifying users who should be customers...")
            
            result = await conn.execute(text("""
                SELECT id, name, email, role, password_hash, created_at 
                FROM users 
                WHERE role = 'operations' 
                AND password_hash IS NOT NULL
                ORDER BY created_at DESC;
            """))
            
            operations_users = result.fetchall()
            print(f"   Found {len(operations_users)} operations users with passwords")
            
            # Step 3: For safety, we'll only auto-migrate users created in the last 7 days
            # Older users should be manually reviewed
            print("3. Migrating recent operations users to customer role...")
            
            recent_customers = await conn.execute(text("""
                UPDATE users 
                SET role = 'customer' 
                WHERE role = 'operations' 
                AND password_hash IS NOT NULL 
                AND created_at > NOW() - INTERVAL '7 days'
                RETURNING id, name, email;
            """))
            
            migrated_users = recent_customers.fetchall()
            print(f"   ✓ Migrated {len(migrated_users)} recent users to customer role:")
            for user in migrated_users:
                print(f"     - {user.name} ({user.email}) [ID: {user.id}]")
            
            # Step 4: Report on remaining operations users that need manual review
            remaining_ops = await conn.execute(text("""
                SELECT id, name, email, created_at 
                FROM users 
                WHERE role = 'operations' 
                AND password_hash IS NOT NULL
                ORDER BY created_at DESC;
            """))
            
            remaining_users = remaining_ops.fetchall()
            if remaining_users:
                print(f"\n⚠️  {len(remaining_users)} operations users need manual review:")
                for user in remaining_users:
                    print(f"     - {user.name} ({user.email}) [ID: {user.id}] - Created: {user.created_at}")
                print("\n   These users were created more than 7 days ago and should be manually")
                print("   reviewed to determine if they should be customers or remain as operations staff.")
            
            print("\n✅ Migration completed successfully!")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        await engine.dispose()


async def rollback_customer_role():
    """Rollback the customer role migration (for emergency use only)."""
    
    db_url = get_db_url()
    engine = create_async_engine(db_url)
    
    try:
        async with engine.begin() as conn:
            print("Starting rollback: Remove customer role...")
            
            # Step 1: Move all customer users back to operations
            print("1. Moving customer users back to operations role...")
            result = await conn.execute(text("""
                UPDATE users 
                SET role = 'operations' 
                WHERE role = 'customer'
                RETURNING id, name, email;
            """))
            
            moved_users = result.fetchall()
            print(f"   ✓ Moved {len(moved_users)} users back to operations role")
            
            # Note: We cannot remove the enum value once added to PostgreSQL
            # The 'customer' value will remain in the enum but won't be used
            print("2. Note: Cannot remove 'customer' from enum (PostgreSQL limitation)")
            print("   The enum value will remain but won't be used.")
            
            print("\n✅ Rollback completed!")
            
    except Exception as e:
        print(f"❌ Rollback failed: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate database to add customer role")
    parser.add_argument("--rollback", action="store_true", help="Rollback the migration")
    args = parser.parse_args()
    
    if args.rollback:
        asyncio.run(rollback_customer_role())
    else:
        asyncio.run(migrate_add_customer_role())
