#!/usr/bin/env python3
"""
Rebuild Migration Chain Script

This script completely rebuilds the migration chain by:
1. Backing up existing migrations
2. Creating a clean linear chain based on chronological order
3. Fixing all syntax errors and dependencies

Usage:
    python scripts/rebuild_migration_chain.py [--dry-run]
"""

import os
import re
import sys
import shutil
import argparse
import logging
from pathlib import Path
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# Define the correct migration order based on logical dependencies
MIGRATION_ORDER = [
    # Base schema
    ('b3bf7ca54a70_recreate_init_schema.py', 'b3bf7ca54a70', None),

    # Core table modifications
    ('c2d8e9f3a1b5_add_category_and_cloudinary_fields.py', 'c2d8e9f3a1b5', 'b3bf7ca54a70'),
    ('3c25fab13c32_add_missing_columns_to_categories_table.py', '3c25fab13c32', 'c2d8e9f3a1b5'),
    ('f064035cc545_add_parent_id_to_categories_table.py', 'f064035cc545', '3c25fab13c32'),

    # User and auth related
    ('55fb081a9d2a_add_password_hash_column.py', '55fb081a9d2a', 'f064035cc545'),
    ('e93d7f7e267f_add_customer_role_to_enum.py', 'e93d7f7e267f', '55fb081a9d2a'),

    # App settings and features
    ('a1f9e2c7_add_refund_method_and_app_settings.py', 'a1f9e2c7', 'e93d7f7e267f'),
    ('add_dynamic_navigation_fields.py', 'add_dynamic_navigation_fields', 'a1f9e2c7'),

    # Audit system
    ('create_audit_logs_simple.py', 'create_audit_logs_simple', 'add_dynamic_navigation_fields'),
    ('enhance_audit_log_schema.py', 'enhance_audit_log_schema', 'create_audit_logs_simple'),
    ('fix_audit_metadata_column.py', 'fix_audit_metadata_column', 'enhance_audit_log_schema'),

    # Final schema
    ('1652add7b7e5_init_schema.py', '1652add7b7e5', 'fix_audit_metadata_column'),
]


def backup_migrations(migrations_dir: Path) -> Path:
    """Backup existing migrations."""
    backup_dir = migrations_dir.parent / f"versions_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copytree(migrations_dir, backup_dir)
    logger.info(f"Backed up migrations to {backup_dir}")
    return backup_dir


def extract_revision_id(filename: str) -> str:
    """Extract revision ID from filename."""
    # Try to extract from filename pattern
    match = re.match(r'^([a-f0-9]+)_', filename)
    if match:
        return match.group(1)
    
    # For files without prefix, use the filename without extension
    return filename.replace('.py', '')


def fix_migration_file(file_path: Path, revision_id: str, down_revision: str = None) -> bool:
    """Fix a migration file with correct revision and down_revision."""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Extract the original upgrade/downgrade functions
        upgrade_match = re.search(r'def upgrade\(\).*?(?=def downgrade|$)', content, re.DOTALL)
        downgrade_match = re.search(r'def downgrade\(\).*?$', content, re.DOTALL)
        
        upgrade_func = upgrade_match.group(0) if upgrade_match else 'def upgrade() -> None:\\n    pass'
        downgrade_func = downgrade_match.group(0) if downgrade_match else 'def downgrade() -> None:\\n    pass'
        
        # Extract description from docstring or filename
        desc_match = re.search(r'"""([^\\n]+)', content)
        description = desc_match.group(1) if desc_match else file_path.stem.replace('_', ' ').title()
        
        # Create clean migration file content
        new_content = f'''"""
{description}

Revision ID: {revision_id}
Revises: {down_revision or 'None'}
Create Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')}

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '{revision_id}'
down_revision = {repr(down_revision) if down_revision else 'None'}
branch_labels = None
depends_on = None


{upgrade_func}


{downgrade_func}
'''
        
        with open(file_path, 'w') as f:
            f.write(new_content)
        
        logger.info(f"Fixed {file_path.name}: {revision_id} -> {down_revision}")
        return True
        
    except Exception as e:
        logger.error(f"Error fixing {file_path}: {e}")
        return False


def rebuild_chain(migrations_dir: Path, dry_run: bool = False) -> bool:
    """Rebuild the migration chain."""
    logger.info("Rebuilding migration chain...")
    
    if not dry_run:
        # Backup existing migrations
        backup_dir = backup_migrations(migrations_dir)
    
    success_count = 0

    for filename, revision_id, down_revision in MIGRATION_ORDER:
        file_path = migrations_dir / filename
        
        if not file_path.exists():
            logger.warning(f"Migration file not found: {filename}")
            continue
        
        # revision_id is now provided in the tuple
        
        if dry_run:
            logger.info(f"Would fix {filename}: {revision_id} -> {down_revision}")
        else:
            if fix_migration_file(file_path, revision_id, down_revision):
                success_count += 1
    
    # Remove merge migration files that are no longer needed
    merge_files = [
        '072fade3ff12_merge_multiple_heads.py',
        'bd41eba8dd9e_merge_audit_fixes.py'
    ]
    
    for merge_file in merge_files:
        merge_path = migrations_dir / merge_file
        if merge_path.exists():
            if not dry_run:
                merge_path.unlink()
                logger.info(f"Removed merge migration: {merge_file}")
            else:
                logger.info(f"Would remove merge migration: {merge_file}")
    
    logger.info(f"Successfully processed {success_count} migrations")
    return success_count > 0


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Rebuild migration chain")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without making changes")
    
    args = parser.parse_args()
    
    migrations_dir = Path(__file__).parents[1] / "alembic" / "versions"
    
    if not migrations_dir.exists():
        logger.error(f"Migrations directory not found: {migrations_dir}")
        sys.exit(1)
    
    success = rebuild_chain(migrations_dir, args.dry_run)
    
    if not success:
        logger.error("Failed to rebuild migration chain")
        sys.exit(1)
    
    logger.info("✅ Migration chain rebuilt successfully!")


if __name__ == "__main__":
    main()
