#!/usr/bin/env python3
"""
Fix Migration Chain Script

This script analyzes and fixes overlapping migration heads by:
1. Analyzing the current migration chain structure
2. Identifying problematic dependencies and merge points
3. Creating a linear migration chain with proper dependencies
4. Generating corrected migration files

Usage:
    python scripts/fix_migration_chain.py [--dry-run] [--verbose]
"""

import os
import sys
import re
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Set, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parents[1]))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class Migration:
    """Represents a migration file with its metadata."""
    revision: str
    down_revision: Optional[str]
    down_revisions: List[str]  # For merge migrations
    file_path: Path
    description: str
    create_date: str
    is_merge: bool = False
    dependencies: Set[str] = None
    
    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = set()


class MigrationChainFixer:
    """Fixes overlapping migration heads and creates linear chain."""
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.migrations_dir = Path(__file__).parents[1] / "alembic" / "versions"
        self.migrations: Dict[str, Migration] = {}
        self.issues_found: List[str] = []
        self.fixes_applied: List[str] = []
    
    def analyze_migrations(self) -> Dict[str, Migration]:
        """Analyze all migration files and extract metadata."""
        logger.info("Analyzing migration files...")
        
        for file_path in self.migrations_dir.glob("*.py"):
            if file_path.name.startswith("__"):
                continue
                
            migration = self._parse_migration_file(file_path)
            if migration:
                self.migrations[migration.revision] = migration
                if self.verbose:
                    logger.info(f"Found migration: {migration.revision} - {migration.description}")
        
        logger.info(f"Found {len(self.migrations)} migrations")
        return self.migrations
    
    def _parse_migration_file(self, file_path: Path) -> Optional[Migration]:
        """Parse a migration file and extract metadata."""
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Extract revision ID
            revision_match = re.search(r"revision = ['\"]([^'\"]+)['\"]", content)
            if not revision_match:
                logger.warning(f"No revision found in {file_path}")
                return None
            revision = revision_match.group(1)
            
            # Extract down_revision(s)
            down_revision_match = re.search(r"down_revision = ([^\\n]+)", content)
            if not down_revision_match:
                logger.warning(f"No down_revision found in {file_path}")
                return None
            
            down_revision_str = down_revision_match.group(1).strip()
            
            # Handle tuple format for merge migrations
            is_merge = False
            down_revisions = []
            
            if down_revision_str.startswith('(') and down_revision_str.endswith(')'):
                # Merge migration
                is_merge = True
                # Extract revisions from tuple
                tuple_content = down_revision_str[1:-1]
                revisions = [r.strip().strip('\'"') for r in tuple_content.split(',')]
                down_revisions = [r for r in revisions if r and r != 'None']
                down_revision = None
            else:
                # Single revision
                down_revision = down_revision_str.strip('\'"')
                if down_revision == 'None':
                    down_revision = None
                down_revisions = [down_revision] if down_revision else []
            
            # Extract description from docstring
            desc_match = re.search(r'"""([^\\n]+)', content)
            description = desc_match.group(1) if desc_match else file_path.stem
            
            # Extract create date
            date_match = re.search(r"Create Date: ([^\\n]+)", content)
            create_date = date_match.group(1) if date_match else "Unknown"
            
            return Migration(
                revision=revision,
                down_revision=down_revision,
                down_revisions=down_revisions,
                file_path=file_path,
                description=description,
                create_date=create_date,
                is_merge=is_merge
            )
            
        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")
            return None
    
    def find_issues(self) -> List[str]:
        """Find issues in the migration chain."""
        logger.info("Analyzing migration chain for issues...")
        
        issues = []
        
        # Find heads (migrations with no children)
        heads = self._find_heads()
        if len(heads) > 1:
            issues.append(f"Multiple heads found: {heads}")
        
        # Find orphaned migrations
        orphans = self._find_orphans()
        if orphans:
            issues.append(f"Orphaned migrations: {orphans}")
        
        # Find circular dependencies
        cycles = self._find_cycles()
        if cycles:
            issues.append(f"Circular dependencies: {cycles}")
        
        # Find merge migrations
        merges = [m.revision for m in self.migrations.values() if m.is_merge]
        if merges:
            issues.append(f"Merge migrations found: {merges}")
        
        # Find inconsistent dependencies
        inconsistent = self._find_inconsistent_dependencies()
        if inconsistent:
            issues.append(f"Inconsistent dependencies: {inconsistent}")
        
        self.issues_found = issues
        return issues
    
    def _find_heads(self) -> List[str]:
        """Find migration heads (no children)."""
        all_revisions = set(self.migrations.keys())
        referenced_revisions = set()
        
        for migration in self.migrations.values():
            for down_rev in migration.down_revisions:
                if down_rev:
                    referenced_revisions.add(down_rev)
        
        heads = list(all_revisions - referenced_revisions)
        return heads
    
    def _find_orphans(self) -> List[str]:
        """Find orphaned migrations (invalid down_revision)."""
        orphans = []
        
        for migration in self.migrations.values():
            for down_rev in migration.down_revisions:
                if down_rev and down_rev not in self.migrations:
                    orphans.append(f"{migration.revision} -> {down_rev}")
        
        return orphans
    
    def _find_cycles(self) -> List[str]:
        """Find circular dependencies."""
        # Simple cycle detection using DFS
        visited = set()
        rec_stack = set()
        cycles = []
        
        def dfs(revision: str, path: List[str]) -> bool:
            if revision in rec_stack:
                cycle_start = path.index(revision)
                cycles.append(" -> ".join(path[cycle_start:] + [revision]))
                return True
            
            if revision in visited:
                return False
            
            visited.add(revision)
            rec_stack.add(revision)
            
            migration = self.migrations.get(revision)
            if migration:
                for down_rev in migration.down_revisions:
                    if down_rev and dfs(down_rev, path + [revision]):
                        return True
            
            rec_stack.remove(revision)
            return False
        
        for revision in self.migrations:
            if revision not in visited:
                dfs(revision, [])
        
        return cycles
    
    def _find_inconsistent_dependencies(self) -> List[str]:
        """Find migrations with inconsistent dependency declarations."""
        inconsistent = []
        
        for migration in self.migrations.values():
            if migration.is_merge:
                # Check if merge migration has proper dependencies
                if len(migration.down_revisions) < 2:
                    inconsistent.append(f"{migration.revision}: Merge migration with < 2 dependencies")
            else:
                # Check if single migration has multiple dependencies
                if len(migration.down_revisions) > 1:
                    inconsistent.append(f"{migration.revision}: Single migration with multiple dependencies")
        
        return inconsistent
    
    def create_linear_chain(self) -> List[Migration]:
        """Create a linear migration chain from the current structure."""
        logger.info("Creating linear migration chain...")
        
        # Get topological order of migrations
        ordered_migrations = self._topological_sort()
        
        # Create linear chain by updating down_revision pointers
        linear_chain = []
        prev_revision = None
        
        for migration in ordered_migrations:
            # Skip merge migrations - we'll handle them separately
            if migration.is_merge:
                continue
                
            # Update down_revision to create linear chain
            new_migration = Migration(
                revision=migration.revision,
                down_revision=prev_revision,
                down_revisions=[prev_revision] if prev_revision else [],
                file_path=migration.file_path,
                description=migration.description,
                create_date=migration.create_date,
                is_merge=False
            )
            
            linear_chain.append(new_migration)
            prev_revision = migration.revision
        
        return linear_chain
    
    def _topological_sort(self) -> List[Migration]:
        """Sort migrations in topological order."""
        # Build dependency graph
        graph = {}
        in_degree = {}
        
        for migration in self.migrations.values():
            if migration.is_merge:
                continue  # Skip merge migrations
                
            graph[migration.revision] = []
            in_degree[migration.revision] = 0
        
        for migration in self.migrations.values():
            if migration.is_merge:
                continue
                
            for down_rev in migration.down_revisions:
                if down_rev and down_rev in graph:
                    graph[down_rev].append(migration.revision)
                    in_degree[migration.revision] += 1
        
        # Kahn's algorithm
        queue = [rev for rev, degree in in_degree.items() if degree == 0]
        result = []
        
        while queue:
            current = queue.pop(0)
            result.append(self.migrations[current])
            
            for neighbor in graph[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        return result
    
    def fix_migration_files(self, linear_chain: List[Migration], dry_run: bool = False) -> bool:
        """Fix migration files to create linear chain."""
        logger.info(f"Fixing {len(linear_chain)} migration files...")
        
        if dry_run:
            logger.info("DRY RUN - No files will be modified")
        
        for migration in linear_chain:
            try:
                self._fix_migration_file(migration, dry_run)
                self.fixes_applied.append(f"Fixed {migration.revision}")
            except Exception as e:
                logger.error(f"Failed to fix {migration.revision}: {e}")
                return False
        
        # Remove merge migration files
        merge_migrations = [m for m in self.migrations.values() if m.is_merge]
        for merge_migration in merge_migrations:
            if not dry_run:
                merge_migration.file_path.unlink()
                logger.info(f"Removed merge migration: {merge_migration.revision}")
            else:
                logger.info(f"Would remove merge migration: {merge_migration.revision}")
            
            self.fixes_applied.append(f"Removed merge migration {merge_migration.revision}")
        
        return True
    
    def _fix_migration_file(self, migration: Migration, dry_run: bool = False):
        """Fix a single migration file."""
        with open(migration.file_path, 'r') as f:
            content = f.read()
        
        # Update down_revision
        if migration.down_revision:
            new_down_revision = f"down_revision = '{migration.down_revision}'"
        else:
            new_down_revision = "down_revision = None"
        
        # Replace down_revision line
        content = re.sub(
            r"down_revision = [^\\n]+",
            new_down_revision,
            content
        )
        
        if not dry_run:
            with open(migration.file_path, 'w') as f:
                f.write(content)
            
            logger.info(f"Updated {migration.file_path.name}: down_revision = {migration.down_revision}")
    
    def generate_report(self) -> str:
        """Generate a comprehensive report of the migration chain analysis."""
        report = []
        report.append("# Migration Chain Analysis Report")
        report.append("=" * 50)
        report.append("")
        
        report.append(f"**Total Migrations:** {len(self.migrations)}")
        report.append(f"**Issues Found:** {len(self.issues_found)}")
        report.append(f"**Fixes Applied:** {len(self.fixes_applied)}")
        report.append("")
        
        if self.issues_found:
            report.append("## Issues Found")
            for issue in self.issues_found:
                report.append(f"- {issue}")
            report.append("")
        
        if self.fixes_applied:
            report.append("## Fixes Applied")
            for fix in self.fixes_applied:
                report.append(f"- {fix}")
            report.append("")
        
        # Migration chain structure
        report.append("## Current Migration Chain")
        heads = self._find_heads()
        for head in heads:
            report.append(f"**Head:** {head}")
            chain = self._build_chain_from_head(head)
            for i, migration_id in enumerate(chain):
                migration = self.migrations.get(migration_id)
                if migration:
                    indent = "  " * i
                    report.append(f"{indent}- {migration_id}: {migration.description}")
        
        return "\\n".join(report)
    
    def _build_chain_from_head(self, head: str) -> List[str]:
        """Build migration chain from head to base."""
        chain = []
        current = head
        
        while current:
            chain.append(current)
            migration = self.migrations.get(current)
            if migration and migration.down_revision:
                current = migration.down_revision
            else:
                break
        
        return chain


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Fix migration chain overlapping heads")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without making changes")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--report", "-r", help="Generate report file")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    fixer = MigrationChainFixer(verbose=args.verbose)
    
    # Analyze migrations
    migrations = fixer.analyze_migrations()
    if not migrations:
        logger.error("No migrations found!")
        sys.exit(1)
    
    # Find issues
    issues = fixer.find_issues()
    
    if not issues:
        logger.info("✅ No migration chain issues found!")
        sys.exit(0)
    
    logger.warning(f"Found {len(issues)} issues:")
    for issue in issues:
        logger.warning(f"  - {issue}")
    
    # Create linear chain
    linear_chain = fixer.create_linear_chain()
    logger.info(f"Created linear chain with {len(linear_chain)} migrations")
    
    # Fix migration files
    if args.dry_run:
        logger.info("DRY RUN - Would fix migration files")
    else:
        success = fixer.fix_migration_files(linear_chain, dry_run=args.dry_run)
        if not success:
            logger.error("Failed to fix migration files")
            sys.exit(1)
    
    # Generate report
    if args.report:
        report = fixer.generate_report()
        with open(args.report, 'w') as f:
            f.write(report)
        logger.info(f"Report written to {args.report}")
    
    logger.info("✅ Migration chain fix completed successfully!")


if __name__ == "__main__":
    main()
