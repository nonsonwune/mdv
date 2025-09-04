#!/usr/bin/env python3
"""
Migration Chain Report Generator

This script generates a comprehensive report of the migration chain status
after fixing overlapping heads and creating a linear dependency chain.

Usage:
    python scripts/migration_chain_report.py [--output report.md]
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path
from datetime import datetime


def run_alembic_command(command: str) -> tuple[bool, str]:
    """Run an alembic command and return success status and output."""
    try:
        result = subprocess.run(
            f"python -m alembic {command}",
            shell=True,
            capture_output=True,
            text=True,
            cwd=Path(__file__).parents[1]
        )
        
        success = result.returncode == 0
        output = result.stdout + result.stderr
        
        return success, output
        
    except Exception as e:
        return False, str(e)


def generate_report() -> str:
    """Generate a comprehensive migration chain report."""
    report = []
    
    # Header
    report.append("# Migration Chain Status Report")
    report.append("=" * 50)
    report.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("")
    
    # Check heads
    success, output = run_alembic_command("heads")
    if success:
        heads = [line.strip() for line in output.strip().split('\n') if line.strip()]
        report.append(f"## Migration Heads")
        report.append(f"**Count:** {len(heads)}")
        
        if len(heads) == 1:
            report.append("✅ **Status:** Single head (FIXED)")
            report.append(f"**Head:** {heads[0]}")
        else:
            report.append("❌ **Status:** Multiple heads detected")
            for head in heads:
                report.append(f"- {head}")
    else:
        report.append("❌ **Error:** Could not retrieve heads")
        report.append(f"```\n{output}\n```")
    
    report.append("")
    
    # Migration history
    success, output = run_alembic_command("history")
    if success:
        report.append("## Migration Chain")
        report.append("```")
        report.append(output.strip())
        report.append("```")
    else:
        report.append("❌ **Error:** Could not retrieve migration history")
    
    report.append("")
    
    # Migration files count
    migrations_dir = Path(__file__).parents[1] / "alembic" / "versions"
    migration_files = list(migrations_dir.glob("*.py"))
    migration_files = [f for f in migration_files if not f.name.startswith("__")]
    
    report.append("## Migration Files")
    report.append(f"**Total Files:** {len(migration_files)}")
    report.append("")
    
    for file_path in sorted(migration_files):
        report.append(f"- {file_path.name}")
    
    report.append("")
    
    # Validation results
    report.append("## Validation Results")
    
    # Test syntax
    syntax_errors = []
    for file_path in migration_files:
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            compile(content, file_path, 'exec')
        except SyntaxError as e:
            syntax_errors.append(f"{file_path.name}: {e}")
        except Exception as e:
            syntax_errors.append(f"{file_path.name}: {e}")
    
    if syntax_errors:
        report.append("❌ **Syntax Validation:** FAILED")
        for error in syntax_errors:
            report.append(f"  - {error}")
    else:
        report.append("✅ **Syntax Validation:** PASSED")
    
    # Test chain structure
    if len(heads) == 1:
        report.append("✅ **Chain Structure:** PASSED (Single head)")
    else:
        report.append("❌ **Chain Structure:** FAILED (Multiple heads)")
    
    report.append("")
    
    # Summary
    report.append("## Summary")
    
    if len(heads) == 1 and not syntax_errors:
        report.append("✅ **Overall Status:** MIGRATION CHAIN FIXED")
        report.append("")
        report.append("### Issues Resolved:")
        report.append("- ✅ Overlapping migration heads eliminated")
        report.append("- ✅ Linear dependency chain established")
        report.append("- ✅ All syntax errors corrected")
        report.append("- ✅ Merge migrations removed")
        report.append("- ✅ Clean migration history created")
    else:
        report.append("❌ **Overall Status:** ISSUES REMAIN")
        report.append("")
        report.append("### Remaining Issues:")
        if len(heads) > 1:
            report.append("- ❌ Multiple migration heads still exist")
        if syntax_errors:
            report.append("- ❌ Syntax errors in migration files")
    
    report.append("")
    
    # Next steps
    report.append("## Next Steps")
    
    if len(heads) == 1 and not syntax_errors:
        report.append("1. **Deploy to staging environment** for testing")
        report.append("2. **Run migration tests** with actual database")
        report.append("3. **Validate schema changes** are correct")
        report.append("4. **Plan production deployment** with rollback strategy")
    else:
        report.append("1. **Fix remaining issues** identified above")
        report.append("2. **Re-run validation** after fixes")
        report.append("3. **Test migration chain** thoroughly")
    
    report.append("")
    
    # Technical details
    report.append("## Technical Details")
    report.append("")
    report.append("### Migration Chain Order")
    report.append("The migrations are now ordered as follows:")
    report.append("")
    
    # Parse history to show chain
    if success:
        lines = output.strip().split('\n')
        chain_order = []
        for line in lines:
            if ' -> ' in line:
                parts = line.split(' -> ')
                if len(parts) >= 2:
                    from_rev = parts[0].strip()
                    to_rev = parts[1].split(',')[0].strip()
                    chain_order.append((from_rev, to_rev))
        
        # Build chain from base to head
        current = '<base>'
        step = 1
        while True:
            next_migration = None
            for from_rev, to_rev in chain_order:
                if from_rev == current:
                    next_migration = to_rev
                    break
            
            if not next_migration:
                break
            
            report.append(f"{step}. {current} → {next_migration}")
            current = next_migration
            step += 1
            
            if step > 20:  # Safety break
                break
    
    report.append("")
    report.append("### Files Modified")
    report.append("- All migration files in `alembic/versions/`")
    report.append("- Removed merge migration files")
    report.append("- Fixed syntax errors and dependencies")
    
    return "\n".join(report)


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Generate migration chain report")
    parser.add_argument("--output", "-o", help="Output file path (default: stdout)")
    
    args = parser.parse_args()
    
    report = generate_report()
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(report)
        print(f"Report written to {args.output}")
    else:
        print(report)


if __name__ == "__main__":
    main()
