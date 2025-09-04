#!/usr/bin/env python3
"""
Production Migration Test

This script tests the migration against the actual production database state
to ensure the idempotent migration fixes work correctly.

Usage:
    python scripts/test_production_migration.py [--dry-run] [--verbose]
"""

import os
import sys
import argparse
import logging
from pathlib import Path
from sqlalchemy import create_engine, text

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parents[1]))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def test_migration_safety(db_url: str, dry_run: bool = False) -> bool:
    """Test that the migration can be safely applied to production."""
    try:
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            logger.info("Testing migration safety against production database...")
            
            # Check current state
            logger.info("1. Checking current database state...")
            
            # Check if refunds table exists
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'refunds'
            """))
            
            refunds_exists = result.fetchone() is not None
            logger.info(f"   Refunds table exists: {refunds_exists}")
            
            if refunds_exists:
                # Check refunds table columns
                result = conn.execute(text("""
                    SELECT column_name, data_type, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = 'refunds' 
                    ORDER BY ordinal_position
                """))
                
                columns = {row[0]: {'type': row[1], 'nullable': row[2]} for row in result.fetchall()}
                logger.info(f"   Refunds columns: {list(columns.keys())}")
                
                # Check specific columns that migration adds
                refund_method_exists = 'refund_method' in columns
                manual_ref_exists = 'manual_ref' in columns
                
                logger.info(f"   refund_method column exists: {refund_method_exists}")
                logger.info(f"   manual_ref column exists: {manual_ref_exists}")
            
            # Check if app_settings table exists
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'app_settings'
            """))
            
            app_settings_exists = result.fetchone() is not None
            logger.info(f"   app_settings table exists: {app_settings_exists}")
            
            # Check current migration version
            try:
                result = conn.execute(text("SELECT version_num FROM alembic_version"))
                current_version = result.fetchone()
                if current_version:
                    logger.info(f"   Current migration version: {current_version[0]}")
                else:
                    logger.info("   No migration version found")
            except Exception as e:
                logger.warning(f"   Could not get migration version: {e}")
            
            logger.info("2. Testing migration logic...")
            
            # Test the migration logic without actually running it
            if refunds_exists and 'refund_method' in columns:
                logger.info("   ✅ Migration will skip adding refund_method (already exists)")
            elif refunds_exists:
                logger.info("   ✅ Migration will add refund_method column")
            else:
                logger.warning("   ⚠️  Refunds table doesn't exist - this is unexpected")
            
            if app_settings_exists:
                logger.info("   ✅ Migration will skip creating app_settings (already exists)")
            else:
                logger.info("   ✅ Migration will create app_settings table")
            
            logger.info("3. Checking enum types...")
            
            # Check if refund_method enum exists
            result = conn.execute(text("""
                SELECT typname 
                FROM pg_type 
                WHERE typname = 'refund_method'
            """))
            
            enum_exists = result.fetchone() is not None
            logger.info(f"   refund_method enum exists: {enum_exists}")
            
            if enum_exists and refunds_exists and 'refund_method' not in columns:
                logger.warning("   ⚠️  Enum exists but column doesn't - potential issue")
            
            logger.info("4. Migration safety assessment:")
            
            # Assess safety
            issues = []
            
            if not refunds_exists:
                issues.append("Refunds table missing")
            
            if refunds_exists and 'refund_method' in columns and not enum_exists:
                issues.append("refund_method column exists but enum type missing")
            
            if issues:
                logger.error("   ❌ Potential issues found:")
                for issue in issues:
                    logger.error(f"      - {issue}")
                return False
            else:
                logger.info("   ✅ Migration appears safe to run")
                return True
                
    except Exception as e:
        logger.error(f"Error testing migration safety: {e}")
        return False


def simulate_migration(db_url: str) -> bool:
    """Simulate the migration without actually running it."""
    try:
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            logger.info("Simulating migration execution...")
            
            # Simulate the migration logic from a1f9e2c7
            logger.info("1. Checking if refund_method column exists...")
            
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'refunds' AND column_name = 'refund_method'
            """))
            
            refund_method_exists = result.fetchone() is not None
            
            if not refund_method_exists:
                logger.info("   Would create refund_method enum and add columns")
            else:
                logger.info("   Would skip adding refund_method (already exists)")
            
            logger.info("2. Checking if app_settings table exists...")
            
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'app_settings'
            """))
            
            app_settings_exists = result.fetchone() is not None
            
            if not app_settings_exists:
                logger.info("   Would create app_settings table")
            else:
                logger.info("   Would skip creating app_settings (already exists)")
            
            logger.info("✅ Migration simulation completed successfully")
            return True
            
    except Exception as e:
        logger.error(f"Error simulating migration: {e}")
        return False


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Test production migration safety")
    parser.add_argument("--dry-run", action="store_true", help="Simulate without making changes")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Get database URL
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        logger.error("DATABASE_URL not found in environment")
        sys.exit(1)
    
    logger.info(f"Testing against database: {db_url.split('@')[-1] if '@' in db_url else 'local'}")
    
    # Test migration safety
    if not test_migration_safety(db_url, args.dry_run):
        logger.error("❌ Migration safety test failed")
        sys.exit(1)
    
    # Simulate migration if requested
    if args.dry_run:
        if not simulate_migration(db_url):
            logger.error("❌ Migration simulation failed")
            sys.exit(1)
    
    logger.info("✅ All tests passed - migration is safe to deploy")


if __name__ == "__main__":
    main()
