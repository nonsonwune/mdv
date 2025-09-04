#!/usr/bin/env python3
"""
Migrate existing customer users from operations role to customer role.

This script should be run AFTER the database migration that adds the customer role.
It identifies users who should be customers (operations role with password_hash)
and migrates them to the proper customer role.

Usage:
    python scripts/migrate_customer_users.py [--dry-run] [--recent-only]
    
Options:
    --dry-run: Show what would be migrated without making changes
    --recent-only: Only migrate users created in the last 30 days
"""

import asyncio
import argparse
import sys
import os
from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mdv.config import settings


async def migrate_customer_users(dry_run: bool = False, recent_only: bool = False):
    """Migrate operations users with passwords to customer role."""
    
    # Create database connection
    db_url = settings.database_url
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    engine = create_async_engine(db_url)
    
    try:
        async with engine.begin() as conn:
            print("🔄 Customer User Migration")
            print("=" * 50)
            
            # Build the query based on options
            base_query = """
                SELECT id, name, email, role, password_hash, created_at 
                FROM users 
                WHERE role = 'operations' 
                AND password_hash IS NOT NULL
            """
            
            if recent_only:
                cutoff_date = datetime.now() - timedelta(days=30)
                query = base_query + " AND created_at > :cutoff_date"
                result = await conn.execute(text(query), {"cutoff_date": cutoff_date})
                print(f"📅 Looking for operations users with passwords created after {cutoff_date.strftime('%Y-%m-%d')}")
            else:
                result = await conn.execute(text(base_query))
                print("📅 Looking for all operations users with passwords")
            
            operations_users = result.fetchall()
            
            if not operations_users:
                print("✅ No operations users with passwords found to migrate")
                return True
            
            print(f"👥 Found {len(operations_users)} operations users with passwords:")
            print()
            
            for user in operations_users:
                created_date = user.created_at.strftime('%Y-%m-%d %H:%M') if user.created_at else 'Unknown'
                print(f"  • {user.name} ({user.email}) - Created: {created_date}")
            
            print()
            
            if dry_run:
                print("🔍 DRY RUN: No changes will be made")
                print(f"Would migrate {len(operations_users)} users from 'operations' to 'customer' role")
                return True
            
            # Confirm migration
            print("⚠️  This will migrate the above users from 'operations' to 'customer' role")
            confirm = input("Continue? (y/N): ").strip().lower()
            
            if confirm != 'y':
                print("❌ Migration cancelled")
                return False
            
            # Perform the migration
            print("🚀 Starting migration...")
            
            if recent_only:
                update_query = """
                    UPDATE users 
                    SET role = 'customer' 
                    WHERE role = 'operations' 
                    AND password_hash IS NOT NULL 
                    AND created_at > :cutoff_date
                    RETURNING id, name, email
                """
                result = await conn.execute(text(update_query), {"cutoff_date": cutoff_date})
            else:
                update_query = """
                    UPDATE users 
                    SET role = 'customer' 
                    WHERE role = 'operations' 
                    AND password_hash IS NOT NULL
                    RETURNING id, name, email
                """
                result = await conn.execute(text(update_query))
            
            migrated_users = result.fetchall()
            
            print(f"✅ Successfully migrated {len(migrated_users)} users to customer role:")
            for user in migrated_users:
                print(f"  ✓ {user.name} ({user.email}) [ID: {user.id}]")
            
            # Check remaining operations users
            remaining_query = """
                SELECT id, name, email, password_hash, created_at 
                FROM users 
                WHERE role = 'operations'
                ORDER BY created_at DESC
            """
            result = await conn.execute(text(remaining_query))
            remaining_users = result.fetchall()
            
            if remaining_users:
                print()
                print(f"📋 {len(remaining_users)} operations users remain (likely staff):")
                for user in remaining_users:
                    has_password = "with password" if user.password_hash else "no password"
                    created_date = user.created_at.strftime('%Y-%m-%d') if user.created_at else 'Unknown'
                    print(f"  • {user.name} ({user.email}) - {has_password} - Created: {created_date}")
                print()
                print("💡 Users without passwords are likely admin-created staff accounts")
            
            print()
            print("🎉 Migration completed successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await engine.dispose()


async def main():
    parser = argparse.ArgumentParser(description="Migrate customer users from operations to customer role")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be migrated without making changes")
    parser.add_argument("--recent-only", action="store_true", help="Only migrate users created in the last 30 days")
    
    args = parser.parse_args()
    
    success = await migrate_customer_users(dry_run=args.dry_run, recent_only=args.recent_only)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
