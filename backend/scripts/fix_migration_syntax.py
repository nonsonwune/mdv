#!/usr/bin/env python3
"""
Fix Migration Syntax Script

This script fixes syntax errors in migration files caused by the migration chain fix.
It ensures all migration files have proper syntax and valid down_revision values.

Usage:
    python scripts/fix_migration_syntax.py [--dry-run]
"""

import os
import re
import sys
import argparse
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def fix_migration_file(file_path: Path, dry_run: bool = False) -> bool:
    """Fix syntax errors in a migration file."""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        original_content = content
        
        # Fix corrupted down_revision lines
        content = re.sub(
            r"down_revision = '[^']*'[a-zA-Z_]+",
            lambda m: m.group(0).split("'")[0] + "'" + m.group(0).split("'")[1] + "'",
            content
        )
        
        # Fix malformed down_revision assignments
        content = re.sub(
            r"down_revision = '([^']+)'[^\\n]*",
            r"down_revision = '\1'",
            content
        )
        
        # Fix type annotations if present
        content = re.sub(
            r"revision: str = '([^']+)'",
            r"revision = '\1'",
            content
        )
        
        content = re.sub(
            r"down_revision: Union\[str, None\] = '([^']*)'",
            r"down_revision = '\1'" if r"\1" else "down_revision = None",
            content
        )
        
        content = re.sub(
            r"down_revision: Union\[str, None\] = None",
            r"down_revision = None",
            content
        )
        
        content = re.sub(
            r"branch_labels: Union\[str, Sequence\[str\], None\] = None",
            r"branch_labels = None",
            content
        )
        
        content = re.sub(
            r"depends_on: Union\[str, Sequence\[str\], None\] = None",
            r"depends_on = None",
            content
        )
        
        # Remove any remaining type imports if not used
        if "Union" not in content and "Sequence" not in content:
            content = re.sub(
                r"from typing import.*\\n",
                "",
                content
            )
        
        if content != original_content:
            if not dry_run:
                with open(file_path, 'w') as f:
                    f.write(content)
                logger.info(f"Fixed syntax in {file_path.name}")
            else:
                logger.info(f"Would fix syntax in {file_path.name}")
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error fixing {file_path}: {e}")
        return False


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Fix migration file syntax errors")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without making changes")
    
    args = parser.parse_args()
    
    migrations_dir = Path(__file__).parents[1] / "alembic" / "versions"
    
    if not migrations_dir.exists():
        logger.error(f"Migrations directory not found: {migrations_dir}")
        sys.exit(1)
    
    logger.info(f"Fixing migration files in {migrations_dir}")
    
    fixed_count = 0
    total_count = 0
    
    for file_path in migrations_dir.glob("*.py"):
        if file_path.name.startswith("__"):
            continue
        
        total_count += 1
        if fix_migration_file(file_path, args.dry_run):
            fixed_count += 1
    
    logger.info(f"Fixed {fixed_count} out of {total_count} migration files")
    
    if args.dry_run:
        logger.info("DRY RUN - No files were actually modified")


if __name__ == "__main__":
    main()
