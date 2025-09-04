#!/usr/bin/env python3
"""
Run database migration in production environment.

This script runs the Alembic migration to add the customer role to the PostgreSQL enum.
It should be run in the production environment where the DATABASE_URL points to the
production PostgreSQL database.

Usage:
    python scripts/run_production_migration.py
"""

import asyncio
import sys
import os
import subprocess
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from mdv.config import settings


def run_alembic_migration():
    """Run the Alembic migration to add customer role."""
    
    print("🚀 Production Database Migration")
    print("=" * 40)
    print()
    
    # Check if we're in production environment
    if not settings.database_url.startswith('postgresql'):
        print("❌ This script should only be run in production with PostgreSQL")
        print(f"Current DATABASE_URL: {settings.database_url[:20]}...")
        return False
    
    print("✅ Production PostgreSQL database detected")
    print()
    
    try:
        # Change to backend directory for Alembic
        os.chdir(backend_dir)
        
        # Check current migration status
        print("📋 Checking current migration status...")
        result = subprocess.run(['alembic', 'current'], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"❌ Failed to check migration status: {result.stderr}")
            return False
        
        current_revision = result.stdout.strip().split('\n')[-1]
        print(f"Current revision: {current_revision}")
        
        # Check what migrations are pending
        print("\n📋 Checking pending migrations...")
        result = subprocess.run(['alembic', 'heads'], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"❌ Failed to check migration heads: {result.stderr}")
            return False
        
        head_revision = result.stdout.strip().split('\n')[-1]
        print(f"Latest revision: {head_revision}")
        
        if current_revision == head_revision:
            print("✅ Database is already up to date")
            return True
        
        # Run the migration
        print("\n🔄 Running database migration...")
        print("This will add the 'customer' role to the PostgreSQL enum...")
        
        result = subprocess.run(['alembic', 'upgrade', 'head'], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Migration completed successfully!")
            print(result.stdout)
            
            # Verify the migration
            print("\n🔍 Verifying migration...")
            result = subprocess.run(['alembic', 'current'], capture_output=True, text=True)
            if result.returncode == 0:
                new_revision = result.stdout.strip().split('\n')[-1]
                print(f"New revision: {new_revision}")
                
                if new_revision == head_revision:
                    print("✅ Migration verification successful!")
                    return True
                else:
                    print("⚠️  Migration may not have completed fully")
                    return False
            else:
                print("⚠️  Could not verify migration status")
                return False
        else:
            print("❌ Migration failed!")
            print(f"Error: {result.stderr}")
            print(f"Output: {result.stdout}")
            return False
            
    except Exception as e:
        print(f"❌ Migration failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("🔧 MDV Production Database Migration")
    print("Adding customer role to PostgreSQL enum")
    print("=" * 50)
    print()
    
    success = run_alembic_migration()
    
    if success:
        print()
        print("🎉 Migration completed successfully!")
        print()
        print("Next steps:")
        print("1. ✅ Customer role added to database enum")
        print("2. 🔄 New customer registrations will use customer role")
        print("3. 📋 Run migrate_customer_users.py to migrate existing customers")
        print("4. 🧪 Test customer registration flow")
        print()
        print("To migrate existing customer users:")
        print("python scripts/migrate_customer_users.py --dry-run")
        print("python scripts/migrate_customer_users.py")
    else:
        print()
        print("❌ Migration failed!")
        print("Please check the error messages above and try again.")
    
    return success


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
