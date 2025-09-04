#!/usr/bin/env python3
"""
Migration Backup Strategy

This script implements automated database backup before each migration with
integrity verification and retention policy management.

Usage:
    python scripts/migration_backup.py --create [--verify] [--compress]
    python scripts/migration_backup.py --list
    python scripts/migration_backup.py --cleanup [--days 30]
    python scripts/migration_backup.py --restore <backup_file>
"""

import os
import sys
import gzip
import shutil
import argparse
import subprocess
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class MigrationBackup:
    """Handles automated database backups for migrations."""
    
    def __init__(self):
        self.backend_dir = Path(__file__).parents[1]
        self.backup_dir = self.backend_dir / "backups"
        self.backup_dir.mkdir(exist_ok=True)
        
        # Backup retention policy (days)
        self.retention_days = int(os.getenv('BACKUP_RETENTION_DAYS', '30'))
    
    def get_database_url(self) -> Optional[str]:
        """Get database URL from environment."""
        db_url = os.getenv('DATABASE_URL')
        if not db_url:
            logger.error("DATABASE_URL not found in environment")
            return None
        return db_url
    
    def create_backup(self, compress: bool = True, verify: bool = True) -> Optional[str]:
        """Create a database backup with optional compression and verification."""
        db_url = self.get_database_url()
        if not db_url:
            return None
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"migration_backup_{timestamp}.sql"
        backup_file = self.backup_dir / backup_name
        
        try:
            logger.info(f"Creating database backup: {backup_name}")
            
            # Create pg_dump command
            dump_command = [
                "pg_dump",
                "--verbose",
                "--no-password",
                "--format=custom",
                "--compress=9",
                "--file", str(backup_file),
                db_url
            ]
            
            # Run pg_dump
            result = subprocess.run(
                dump_command,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                logger.error(f"pg_dump failed: {result.stderr}")
                return None
            
            logger.info(f"✅ Backup created: {backup_file}")
            
            # Verify backup integrity
            if verify:
                if not self.verify_backup(backup_file):
                    logger.error("Backup verification failed")
                    return None
            
            # Compress if requested and not already compressed
            if compress and not backup_file.name.endswith('.gz'):
                compressed_file = self.compress_backup(backup_file)
                if compressed_file:
                    backup_file = compressed_file
            
            # Store backup metadata
            self.store_backup_metadata(backup_file)
            
            return str(backup_file)
            
        except Exception as e:
            logger.error(f"Error creating backup: {e}")
            return None
    
    def verify_backup(self, backup_file: Path) -> bool:
        """Verify backup integrity."""
        try:
            logger.info(f"Verifying backup: {backup_file}")
            
            # Use pg_restore to verify the backup file
            verify_command = [
                "pg_restore",
                "--list",
                str(backup_file)
            ]
            
            result = subprocess.run(
                verify_command,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                logger.info("✅ Backup verification passed")
                return True
            else:
                logger.error(f"Backup verification failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Error verifying backup: {e}")
            return False
    
    def compress_backup(self, backup_file: Path) -> Optional[Path]:
        """Compress backup file using gzip."""
        try:
            compressed_file = backup_file.with_suffix(backup_file.suffix + '.gz')
            
            logger.info(f"Compressing backup: {backup_file} -> {compressed_file}")
            
            with open(backup_file, 'rb') as f_in:
                with gzip.open(compressed_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            # Remove original file
            backup_file.unlink()
            
            logger.info(f"✅ Backup compressed: {compressed_file}")
            return compressed_file
            
        except Exception as e:
            logger.error(f"Error compressing backup: {e}")
            return None
    
    def store_backup_metadata(self, backup_file: Path) -> None:
        """Store backup metadata for tracking."""
        metadata_file = backup_file.with_suffix('.meta')
        
        try:
            # Get current migration revision
            result = subprocess.run(
                ["python", "-m", "alembic", "current"],
                capture_output=True,
                text=True,
                cwd=self.backend_dir
            )
            
            current_revision = "unknown"
            if result.returncode == 0 and result.stdout.strip():
                current_revision = result.stdout.strip().split()[0]
            
            # Get database size
            db_url = self.get_database_url()
            db_size = "unknown"
            if db_url:
                size_result = subprocess.run([
                    "psql", db_url, "-t", "-c",
                    "SELECT pg_size_pretty(pg_database_size(current_database()));"
                ], capture_output=True, text=True)
                
                if size_result.returncode == 0:
                    db_size = size_result.stdout.strip()
            
            metadata = {
                'created_at': datetime.now().isoformat(),
                'backup_file': backup_file.name,
                'file_size': backup_file.stat().st_size,
                'migration_revision': current_revision,
                'database_size': db_size,
                'backup_type': 'migration'
            }
            
            with open(metadata_file, 'w') as f:
                import json
                json.dump(metadata, f, indent=2)
            
            logger.info(f"Metadata stored: {metadata_file}")
            
        except Exception as e:
            logger.error(f"Error storing metadata: {e}")
    
    def list_backups(self) -> List[Tuple[Path, dict]]:
        """List all available backups with metadata."""
        backups = []
        
        for backup_file in self.backup_dir.glob("migration_backup_*.sql*"):
            metadata_file = backup_file.with_suffix('.meta')
            metadata = {}
            
            if metadata_file.exists():
                try:
                    import json
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                except Exception as e:
                    logger.warning(f"Could not read metadata for {backup_file}: {e}")
            
            # Add basic file info if metadata is missing
            if not metadata:
                metadata = {
                    'created_at': datetime.fromtimestamp(backup_file.stat().st_mtime).isoformat(),
                    'file_size': backup_file.stat().st_size,
                    'migration_revision': 'unknown',
                    'database_size': 'unknown'
                }
            
            backups.append((backup_file, metadata))
        
        # Sort by creation time (newest first)
        backups.sort(key=lambda x: x[1].get('created_at', ''), reverse=True)
        return backups
    
    def cleanup_old_backups(self, retention_days: Optional[int] = None) -> int:
        """Clean up backups older than retention period."""
        if retention_days is None:
            retention_days = self.retention_days
        
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        removed_count = 0
        
        logger.info(f"Cleaning up backups older than {retention_days} days")
        
        backups = self.list_backups()
        for backup_file, metadata in backups:
            try:
                created_at = datetime.fromisoformat(metadata.get('created_at', ''))
                
                if created_at < cutoff_date:
                    logger.info(f"Removing old backup: {backup_file}")
                    backup_file.unlink()
                    
                    # Remove metadata file
                    metadata_file = backup_file.with_suffix('.meta')
                    if metadata_file.exists():
                        metadata_file.unlink()
                    
                    removed_count += 1
                    
            except Exception as e:
                logger.warning(f"Error processing backup {backup_file}: {e}")
        
        logger.info(f"✅ Removed {removed_count} old backups")
        return removed_count
    
    def restore_backup(self, backup_file: str, target_db: Optional[str] = None) -> bool:
        """Restore from a backup file."""
        backup_path = Path(backup_file)
        
        if not backup_path.exists():
            # Try looking in backup directory
            backup_path = self.backup_dir / backup_file
            if not backup_path.exists():
                logger.error(f"Backup file not found: {backup_file}")
                return False
        
        db_url = target_db or self.get_database_url()
        if not db_url:
            return False
        
        try:
            logger.info(f"Restoring backup: {backup_path}")
            logger.warning("⚠️  This will overwrite the current database!")
            
            # Confirm restoration
            response = input("Are you sure you want to continue? (yes/no): ")
            if response.lower() != 'yes':
                logger.info("Restoration cancelled")
                return False
            
            # Handle compressed files
            restore_file = backup_path
            if backup_path.suffix == '.gz':
                # Decompress temporarily
                temp_file = backup_path.with_suffix('')
                with gzip.open(backup_path, 'rb') as f_in:
                    with open(temp_file, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                restore_file = temp_file
            
            # Restore using pg_restore
            restore_command = [
                "pg_restore",
                "--verbose",
                "--clean",
                "--if-exists",
                "--no-owner",
                "--no-privileges",
                "--dbname", db_url,
                str(restore_file)
            ]
            
            result = subprocess.run(
                restore_command,
                capture_output=True,
                text=True
            )
            
            # Clean up temporary file
            if restore_file != backup_path:
                restore_file.unlink()
            
            if result.returncode == 0:
                logger.info("✅ Backup restored successfully")
                return True
            else:
                logger.error(f"Restoration failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Error restoring backup: {e}")
            return False


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Migration backup management")
    parser.add_argument("--create", "-c", action="store_true", help="Create a new backup")
    parser.add_argument("--verify", "-v", action="store_true", help="Verify backup integrity")
    parser.add_argument("--compress", action="store_true", default=True, help="Compress backup (default: true)")
    parser.add_argument("--list", "-l", action="store_true", help="List all backups")
    parser.add_argument("--cleanup", action="store_true", help="Clean up old backups")
    parser.add_argument("--days", type=int, default=30, help="Retention period in days (default: 30)")
    parser.add_argument("--restore", "-r", help="Restore from backup file")
    parser.add_argument("--target-db", help="Target database URL for restoration")
    
    args = parser.parse_args()
    
    backup_manager = MigrationBackup()
    
    if args.create:
        backup_file = backup_manager.create_backup(
            compress=args.compress,
            verify=args.verify
        )
        if backup_file:
            print(f"Backup created: {backup_file}")
        else:
            print("Backup creation failed")
            sys.exit(1)
    
    elif args.list:
        backups = backup_manager.list_backups()
        if backups:
            print("Available backups:")
            for backup_file, metadata in backups:
                size_mb = metadata.get('file_size', 0) / (1024 * 1024)
                print(f"  {backup_file.name}")
                print(f"    Created: {metadata.get('created_at', 'unknown')}")
                print(f"    Size: {size_mb:.1f} MB")
                print(f"    Revision: {metadata.get('migration_revision', 'unknown')}")
                print(f"    DB Size: {metadata.get('database_size', 'unknown')}")
                print()
        else:
            print("No backups found")
    
    elif args.cleanup:
        removed = backup_manager.cleanup_old_backups(args.days)
        print(f"Removed {removed} old backups")
    
    elif args.restore:
        success = backup_manager.restore_backup(args.restore, args.target_db)
        if not success:
            sys.exit(1)
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
