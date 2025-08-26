#!/usr/bin/env python3
"""
Enum Validation Script for CI/CD Pipeline

This script validates that Python enum values match PostgreSQL enum types.
It can be run in CI/CD pipelines, pre-commit hooks, or manually.

Usage:
    python scripts/validate_enums.py [--environment ENV] [--fix-suggestions]
    
Examples:
    python scripts/validate_enums.py --environment test
    python scripts/validate_enums.py --fix-suggestions
    python scripts/validate_enums.py --help

Exit codes:
    0: All enums valid
    1: Enum validation failed
    2: Connection error
    3: Invalid arguments
"""

import asyncio
import argparse
import sys
import os
from pathlib import Path
from typing import Dict, Any, List

# Add backend to path for imports
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

try:
    from tests.test_enum_database_validation import validate_all_enums
    from mdv.models import (
        OrderStatus, FulfillmentStatus, ShipmentStatus, 
        ReservationStatus, RefundMethod, Role
    )
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running from the project root and dependencies are installed.")
    sys.exit(2)


def print_banner():
    """Print validation banner."""
    print("=" * 60)
    print("🔍 MDV ENUM VALIDATION")
    print("=" * 60)


def print_enum_fix_suggestions(results: Dict[str, Any]) -> None:
    """Print specific suggestions for fixing enum mismatches."""
    print("\n" + "🔧 ENUM FIX SUGGESTIONS" + "\n" + "=" * 40)
    
    for enum_name, result in results.items():
        if not result.get("valid", True):
            print(f"\n❌ {enum_name.upper()}:")
            
            if "error" in result:
                print(f"   Error: {result['error']}")
                continue
            
            issues = result.get("issues", {})
            python_values = result.get("python_values", [])
            db_values = result.get("db_values", [])
            
            if issues.get("missing_in_db"):
                print(f"   Missing in database: {issues['missing_in_db']}")
                print(f"   💡 Add to database enum: ALTER TYPE {enum_name} ADD VALUE 'new_value';")
            
            if issues.get("extra_in_db"):
                print(f"   Extra in database: {issues['extra_in_db']}")
                print(f"   💡 Update Python enum to include: {issues['extra_in_db']}")
            
            # Show exact fixes needed
            print(f"\n   Current Python values: {python_values}")
            print(f"   Current DB values: {db_values}")
            
            # Generate suggested Python enum fix
            if db_values:
                print(f"\n   🔨 Suggested Python enum update:")
                enum_class_name = enum_name.title().replace("_", "")
                print(f"   class {enum_class_name}(str, enum.Enum):")
                for db_value in sorted(db_values):
                    member_name = db_value.lower()
                    print(f"       {member_name} = \"{db_value}\"")


def print_validation_summary(results: Dict[str, Any]) -> None:
    """Print validation results summary."""
    total_enums = len(results)
    valid_enums = sum(1 for r in results.values() if r.get("valid", False))
    invalid_enums = total_enums - valid_enums
    
    print(f"\n📊 VALIDATION SUMMARY")
    print(f"{'─' * 30}")
    print(f"Total enums checked: {total_enums}")
    print(f"Valid enums: {valid_enums} ✅")
    print(f"Invalid enums: {invalid_enums} ❌")
    
    if invalid_enums == 0:
        print(f"\n🎉 ALL ENUMS VALID!")
    else:
        print(f"\n⚠️  {invalid_enums} enum(s) need attention")


def print_detailed_results(results: Dict[str, Any]) -> None:
    """Print detailed validation results."""
    print(f"\n📋 DETAILED RESULTS")
    print(f"{'─' * 30}")
    
    for enum_name, result in sorted(results.items()):
        status = "✅ VALID" if result.get("valid") else "❌ INVALID"
        print(f"\n{enum_name.upper()}: {status}")
        
        if not result.get("valid"):
            if "error" in result:
                print(f"    Error: {result['error']}")
            else:
                issues = result.get("issues", {})
                if issues.get("missing_in_db"):
                    print(f"    Missing in DB: {issues['missing_in_db']}")
                if issues.get("extra_in_db"):
                    print(f"    Extra in DB: {issues['extra_in_db']}")
        else:
            print(f"    Python ↔ Database: {len(result.get('python_values', []))} values match")


def generate_migration_script(results: Dict[str, Any]) -> None:
    """Generate Alembic migration script for enum fixes."""
    print(f"\n🔄 MIGRATION SCRIPT GENERATOR")
    print(f"{'─' * 40}")
    
    has_issues = any(not r.get("valid", True) for r in results.values())
    
    if not has_issues:
        print("✅ No migration needed - all enums are valid!")
        return
    
    print("📝 Suggested Alembic migration script:")
    print(f"\n```python")
    print(f"\"\"\"Fix enum mismatches")
    print(f"\"\"\"")
    print(f"from alembic import op")
    print(f"import sqlalchemy as sa")
    print(f"")
    print(f"def upgrade():")
    
    for enum_name, result in results.items():
        if not result.get("valid", True) and "error" not in result:
            issues = result.get("issues", {})
            if issues.get("missing_in_db"):
                for missing_value in issues["missing_in_db"]:
                    print(f"    # Add missing value to {enum_name}")
                    print(f"    op.execute(\"ALTER TYPE {enum_name} ADD VALUE '{missing_value}'\")")
    
    print(f"")
    print(f"def downgrade():")
    print(f"    # Note: PostgreSQL doesn't support removing enum values")
    print(f"    # Consider creating new enum type if rollback needed")
    print(f"    pass")
    print(f"```")


async def main():
    """Main validation function."""
    parser = argparse.ArgumentParser(
        description="Validate enum consistency between Python and PostgreSQL",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python scripts/validate_enums.py
    python scripts/validate_enums.py --fix-suggestions
    python scripts/validate_enums.py --environment production
    python scripts/validate_enums.py --verbose --migration-script
        """
    )
    
    parser.add_argument(
        "--environment", "-e",
        choices=["development", "test", "staging", "production"],
        default="development",
        help="Environment to validate against (default: development)"
    )
    
    parser.add_argument(
        "--fix-suggestions", "-f",
        action="store_true",
        help="Show detailed fix suggestions for enum mismatches"
    )
    
    parser.add_argument(
        "--migration-script", "-m",
        action="store_true", 
        help="Generate Alembic migration script for fixes"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed validation results"
    )
    
    parser.add_argument(
        "--ci", 
        action="store_true",
        help="CI mode: minimal output, exit code only"
    )
    
    args = parser.parse_args()
    
    if not args.ci:
        print_banner()
        print(f"🔍 Validating enums in {args.environment} environment...")
    
    try:
        # Run validation
        results = await validate_all_enums()
        
        # Check if all enums are valid
        all_valid = all(result.get("valid", False) for result in results.values())
        
        if args.ci:
            # CI mode: minimal output
            if all_valid:
                print("✅ All enums valid")
            else:
                invalid_count = sum(1 for r in results.values() if not r.get("valid", False))
                print(f"❌ {invalid_count} enum(s) invalid")
        else:
            # Full output mode
            print_validation_summary(results)
            
            if args.verbose:
                print_detailed_results(results)
            
            if args.fix_suggestions and not all_valid:
                print_enum_fix_suggestions(results)
            
            if args.migration_script and not all_valid:
                generate_migration_script(results)
        
        # Exit with appropriate code
        sys.exit(0 if all_valid else 1)
        
    except Exception as e:
        if args.ci:
            print(f"❌ Validation error: {e}")
        else:
            print(f"\n💥 Validation failed with error:")
            print(f"   {e}")
            print(f"\n🔧 Troubleshooting:")
            print(f"   1. Check database connection")
            print(f"   2. Ensure migrations are up to date")
            print(f"   3. Verify environment configuration")
        
        sys.exit(2)


if __name__ == "__main__":
    asyncio.run(main())
