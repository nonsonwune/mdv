#!/usr/bin/env python3
"""
Migration Rollback Procedures

This script provides safe rollback procedures for database migrations with
automated backup creation and validation.

Usage:
    python scripts/migration_rollback.py --target <revision> [--dry-run] [--backup]
    python scripts/migration_rollback.py --list-migrations
    python scripts/migration_rollback.py --current
"""

import os
import sys
import argparse
import subprocess
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Tuple

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parents[1]))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class MigrationRollback:
    """Handles safe migration rollbacks with backup and validation."""
    
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.backend_dir = Path(__file__).parents[1]
        self.backup_dir = self.backend_dir / "backups"
        self.backup_dir.mkdir(exist_ok=True)
    
    def run_alembic_command(self, command: str) -> Tuple[bool, str]:
        """Run an alembic command and return success status and output."""
        try:
            full_command = f"python -m alembic {command}"
            logger.info(f"Running: {full_command}")
            
            if self.dry_run and any(cmd in command for cmd in ['upgrade', 'downgrade']):
                logger.info("DRY RUN - Would execute migration command")
                return True, "DRY RUN - Command not executed"
            
            result = subprocess.run(
                full_command,
                shell=True,
                capture_output=True,
                text=True,
                cwd=self.backend_dir
            )
            
            success = result.returncode == 0
            output = result.stdout + result.stderr
            
            if not success:
                logger.error(f"Command failed: {output}")
            
            return success, output
            
        except Exception as e:
            logger.error(f"Error running command: {e}")
            return False, str(e)
    
    def get_current_revision(self) -> Optional[str]:
        """Get the current migration revision."""
        success, output = self.run_alembic_command("current")
        if success and output.strip():
            # Extract revision from output
            lines = output.strip().split('\n')
            for line in lines:
                if line and not line.startswith('INFO'):
                    return line.split()[0]
        return None
    
    def list_migrations(self) -> List[Tuple[str, str]]:
        """List all migrations with their descriptions."""
        success, output = self.run_alembic_command("history")
        migrations = []
        
        if success:
            lines = output.strip().split('\n')
            for line in lines:
                if ' -> ' in line and not line.startswith('INFO'):
                    parts = line.split(' -> ')
                    if len(parts) >= 2:
                        revision = parts[1].split(',')[0].strip()
                        description = parts[1].split(',')[1].strip() if ',' in parts[1] else "No description"
                        migrations.append((revision, description))
        
        return migrations
    
    def validate_target_revision(self, target: str) -> bool:
        """Validate that the target revision exists."""
        migrations = self.list_migrations()
        valid_revisions = [rev for rev, _ in migrations] + ['base']
        
        return target in valid_revisions
    
    def create_backup(self) -> Optional[str]:
        """Create a database backup before rollback."""
        if self.dry_run:
            logger.info("DRY RUN - Would create database backup")
            return "dry-run-backup"
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = self.backup_dir / f"pre_rollback_{timestamp}.sql"
        
        # Get database URL
        db_url = os.getenv('DATABASE_URL')
        if not db_url:
            logger.error("DATABASE_URL not found in environment")
            return None
        
        try:
            # Extract connection details from URL
            # Format: postgresql://user:pass@host:port/dbname
            if db_url.startswith('postgresql://'):
                url_parts = db_url.replace('postgresql://', '').split('/')
                db_name = url_parts[-1]
                host_part = url_parts[0].split('@')[-1]
                
                # Create pg_dump command
                dump_command = f"pg_dump {db_url} > {backup_file}"
                
                logger.info(f"Creating backup: {backup_file}")
                result = subprocess.run(dump_command, shell=True, capture_output=True, text=True)
                
                if result.returncode == 0:
                    logger.info(f"✅ Backup created successfully: {backup_file}")
                    return str(backup_file)
                else:
                    logger.error(f"Backup failed: {result.stderr}")
                    return None
            else:
                logger.error("Unsupported database URL format")
                return None
                
        except Exception as e:
            logger.error(f"Error creating backup: {e}")
            return None
    
    def rollback_to_revision(self, target: str, create_backup: bool = True) -> bool:
        """Rollback to a specific revision."""
        logger.info(f"Starting rollback to revision: {target}")
        
        # Get current revision
        current = self.get_current_revision()
        if not current:
            logger.error("Could not determine current revision")
            return False
        
        logger.info(f"Current revision: {current}")
        
        if current == target:
            logger.info("Already at target revision")
            return True
        
        # Validate target revision
        if not self.validate_target_revision(target):
            logger.error(f"Invalid target revision: {target}")
            return False
        
        # Create backup if requested
        backup_file = None
        if create_backup:
            backup_file = self.create_backup()
            if not backup_file and not self.dry_run:
                logger.error("Failed to create backup. Aborting rollback.")
                return False
        
        # Perform rollback
        logger.info(f"Rolling back from {current} to {target}")
        success, output = self.run_alembic_command(f"downgrade {target}")
        
        if success:
            logger.info("✅ Rollback completed successfully")
            if backup_file and not self.dry_run:
                logger.info(f"Backup available at: {backup_file}")
            return True
        else:
            logger.error(f"❌ Rollback failed: {output}")
            if backup_file and not self.dry_run:
                logger.info(f"Database backup available for recovery: {backup_file}")
            return False
    
    def rollback_one_step(self, create_backup: bool = True) -> bool:
        """Rollback one migration step."""
        return self.rollback_to_revision("-1", create_backup)
    
    def show_rollback_plan(self, target: str) -> bool:
        """Show what migrations would be rolled back."""
        current = self.get_current_revision()
        if not current:
            logger.error("Could not determine current revision")
            return False
        
        logger.info(f"Rollback plan from {current} to {target}:")
        
        # Get migration history
        migrations = self.list_migrations()
        
        # Find migrations that would be rolled back
        rollback_migrations = []
        found_current = False
        found_target = False
        
        for rev, desc in migrations:
            if rev == current:
                found_current = True
            
            if found_current and not found_target:
                if rev == target:
                    found_target = True
                    break
                rollback_migrations.append((rev, desc))
        
        if rollback_migrations:
            logger.info("Migrations to be rolled back:")
            for i, (rev, desc) in enumerate(rollback_migrations, 1):
                logger.info(f"  {i}. {rev}: {desc}")
        else:
            logger.info("No migrations to rollback")
        
        return True


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Migration rollback procedures")
    parser.add_argument("--target", "-t", help="Target revision to rollback to")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without executing")
    parser.add_argument("--backup", action="store_true", default=True, help="Create backup before rollback (default: true)")
    parser.add_argument("--no-backup", action="store_true", help="Skip backup creation")
    parser.add_argument("--list-migrations", "-l", action="store_true", help="List all migrations")
    parser.add_argument("--current", "-c", action="store_true", help="Show current revision")
    parser.add_argument("--one-step", "-1", action="store_true", help="Rollback one migration step")
    parser.add_argument("--plan", "-p", help="Show rollback plan for target revision")
    
    args = parser.parse_args()
    
    rollback = MigrationRollback(dry_run=args.dry_run)
    
    if args.list_migrations:
        migrations = rollback.list_migrations()
        if migrations:
            print("Available migrations:")
            for rev, desc in migrations:
                print(f"  {rev}: {desc}")
        else:
            print("No migrations found")
        return
    
    if args.current:
        current = rollback.get_current_revision()
        if current:
            print(f"Current revision: {current}")
        else:
            print("Could not determine current revision")
        return
    
    if args.plan:
        rollback.show_rollback_plan(args.plan)
        return
    
    if args.one_step:
        create_backup = not args.no_backup
        success = rollback.rollback_one_step(create_backup)
        sys.exit(0 if success else 1)
    
    if args.target:
        create_backup = not args.no_backup
        success = rollback.rollback_to_revision(args.target, create_backup)
        sys.exit(0 if success else 1)
    
    # If no specific action, show help
    parser.print_help()


if __name__ == "__main__":
    main()
