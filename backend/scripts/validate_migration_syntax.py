#!/usr/bin/env python3
"""
Validate Migration Syntax Script

This script validates and fixes syntax errors in all migration files.
"""

import os
import re
import sys
import ast
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def validate_and_fix_file(file_path: Path) -> bool:
    """Validate and fix a migration file."""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        original_content = content
        
        # Fix common syntax errors
        # 1. Fix corrupted lines where text got concatenated
        content = re.sub(
            r"down_revision = '([^']+)'[a-zA-Z_][^\\n]*",
            r"down_revision = '\1'",
            content
        )
        
        # 2. Ensure proper line breaks after assignments
        content = re.sub(
            r"(down_revision = '[^']*')([a-zA-Z_])",
            r"\1\\n\2",
            content
        )
        
        # 3. Fix missing newlines between assignments
        content = re.sub(
            r"(= '[^']*')([a-zA-Z_]+ =)",
            r"\1\\n\2",
            content
        )
        
        # 4. Fix branch_labels and depends_on if they got corrupted
        if "branch_labels" not in content:
            content = re.sub(
                r"(down_revision = '[^']*')",
                r"\1\\nbranch_labels = None",
                content
            )
        
        if "depends_on" not in content:
            content = re.sub(
                r"(branch_labels = None)",
                r"\1\\ndepends_on = None",
                content
            )
        
        # Write back if changed
        if content != original_content:
            with open(file_path, 'w') as f:
                f.write(content)
            logger.info(f"Fixed {file_path.name}")
        
        # Try to parse the file to validate syntax
        try:
            ast.parse(content)
            return True
        except SyntaxError as e:
            logger.error(f"Syntax error in {file_path.name}: {e}")
            return False
            
    except Exception as e:
        logger.error(f"Error processing {file_path}: {e}")
        return False


def main():
    """Main function."""
    migrations_dir = Path(__file__).parents[1] / "alembic" / "versions"
    
    if not migrations_dir.exists():
        logger.error(f"Migrations directory not found: {migrations_dir}")
        sys.exit(1)
    
    logger.info(f"Validating migration files in {migrations_dir}")
    
    valid_count = 0
    total_count = 0
    
    for file_path in migrations_dir.glob("*.py"):
        if file_path.name.startswith("__"):
            continue
        
        total_count += 1
        if validate_and_fix_file(file_path):
            valid_count += 1
    
    logger.info(f"Valid: {valid_count}/{total_count} migration files")
    
    if valid_count != total_count:
        logger.error("Some migration files have syntax errors")
        sys.exit(1)
    else:
        logger.info("All migration files are valid")


if __name__ == "__main__":
    main()
