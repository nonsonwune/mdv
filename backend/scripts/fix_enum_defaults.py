#!/usr/bin/env python3
"""
Fix OrderStatus Enum Default Values Script

This script ensures that SQLAlchemy enum defaults use enum members (not .value)
and validates that the enum definitions are consistent with database expectations.

The issue: SQLAlchemy should use enum members (e.g., OrderStatus.pending_payment)
not enum values (e.g., OrderStatus.pending_payment.value) for default values.

Usage:
    python scripts/fix_enum_defaults.py [--check] [--fix] [--verbose]
"""

import sys
import ast
import argparse
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple
import re

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parents[1]))

from mdv.models import (
    OrderStatus, FulfillmentStatus, ShipmentStatus, ReservationStatus,
    RefundMethod, Role
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class EnumDefaultFixer:
    """Fix enum default value issues in SQLAlchemy models."""
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.models_file = Path(__file__).parents[1] / "mdv" / "models.py"
        self.issues_found = []
        self.fixes_applied = []
    
    def check_enum_defaults(self) -> List[Dict[str, Any]]:
        """Check for enum default value issues in models.py."""
        logger.info("Checking enum default values in models.py...")
        
        with open(self.models_file, 'r') as f:
            content = f.read()
        
        issues = []
        
        # Parse the file to find enum default issues
        tree = ast.parse(content)
        
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                for item in node.body:
                    if isinstance(item, ast.AnnAssign) and isinstance(item.value, ast.Call):
                        # Look for mapped_column calls
                        if (isinstance(item.value.func, ast.Name) and 
                            item.value.func.id == "mapped_column"):
                            
                            # Check for default parameter
                            for keyword in item.value.keywords:
                                if keyword.arg == "default":
                                    issue = self._analyze_default_value(
                                        node.name, 
                                        item.target.id if isinstance(item.target, ast.Name) else "unknown",
                                        keyword.value,
                                        content
                                    )
                                    if issue:
                                        issues.append(issue)
        
        self.issues_found = issues
        return issues
    
    def _analyze_default_value(self, class_name: str, field_name: str, default_node: ast.AST, content: str) -> Dict[str, Any]:
        """Analyze a default value to check for enum issues."""
        
        # Convert AST node back to source code
        try:
            default_source = ast.unparse(default_node)
        except AttributeError:
            # Python < 3.9 doesn't have ast.unparse
            default_source = self._ast_to_source(default_node)
        
        # Check if this is an enum default
        enum_classes = ["OrderStatus", "FulfillmentStatus", "ShipmentStatus", 
                       "ReservationStatus", "RefundMethod", "Role"]
        
        for enum_class in enum_classes:
            if enum_class in default_source:
                # Check if it's using .value (incorrect)
                if ".value" in default_source:
                    return {
                        "type": "incorrect_enum_value_usage",
                        "class": class_name,
                        "field": field_name,
                        "current": default_source,
                        "suggested": default_source.replace(".value", ""),
                        "severity": "error",
                        "description": f"Using .value in enum default is incorrect for SQLAlchemy"
                    }
                
                # Check if it's using enum member (correct)
                elif "." in default_source and not ".value" in default_source:
                    if self.verbose:
                        logger.info(f"✅ {class_name}.{field_name}: Correct enum member usage: {default_source}")
                    return None
                
                # Check for other potential issues
                else:
                    return {
                        "type": "unusual_enum_usage",
                        "class": class_name,
                        "field": field_name,
                        "current": default_source,
                        "severity": "warning",
                        "description": f"Unusual enum default pattern: {default_source}"
                    }
        
        return None
    
    def _ast_to_source(self, node: ast.AST) -> str:
        """Convert AST node to source code (fallback for Python < 3.9)."""
        if isinstance(node, ast.Attribute):
            return f"{self._ast_to_source(node.value)}.{node.attr}"
        elif isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Constant):
            return repr(node.value)
        else:
            return str(node)
    
    def validate_enum_consistency(self) -> List[Dict[str, Any]]:
        """Validate that enum definitions are consistent with expected usage."""
        logger.info("Validating enum consistency...")
        
        consistency_issues = []
        
        # Check each enum class
        enum_classes = {
            "OrderStatus": OrderStatus,
            "FulfillmentStatus": FulfillmentStatus,
            "ShipmentStatus": ShipmentStatus,
            "ReservationStatus": ReservationStatus,
            "RefundMethod": RefundMethod,
            "Role": Role
        }
        
        for enum_name, enum_class in enum_classes.items():
            for member in enum_class:
                # Check that member name and value follow conventions
                member_name = member.name
                member_value = member.value
                
                # For most enums, check naming consistency
                if enum_name not in ["RefundMethod", "Role"]:
                    # Check if value is PascalCase (current database format)
                    if not member_value[0].isupper():
                        consistency_issues.append({
                            "type": "enum_value_case_mismatch",
                            "enum": enum_name,
                            "member": member_name,
                            "current_value": member_value,
                            "expected_format": "PascalCase",
                            "severity": "warning",
                            "description": f"Enum value should be PascalCase to match database"
                        })
                
                # Check that member name is snake_case
                if not member_name.islower() or " " in member_name:
                    consistency_issues.append({
                        "type": "enum_member_name_format",
                        "enum": enum_name,
                        "member": member_name,
                        "current_value": member_value,
                        "severity": "info",
                        "description": f"Enum member name should be snake_case"
                    })
        
        return consistency_issues
    
    def fix_enum_defaults(self) -> bool:
        """Fix enum default value issues in models.py."""
        if not self.issues_found:
            logger.info("No enum default issues found to fix.")
            return True
        
        logger.info(f"Fixing {len(self.issues_found)} enum default issues...")
        
        with open(self.models_file, 'r') as f:
            content = f.read()
        
        original_content = content
        
        for issue in self.issues_found:
            if issue["type"] == "incorrect_enum_value_usage":
                # Replace .value usage with enum member
                old_pattern = issue["current"]
                new_pattern = issue["suggested"]
                
                # Use regex to find and replace the specific pattern
                pattern = re.escape(old_pattern)
                content = re.sub(pattern, new_pattern, content)
                
                self.fixes_applied.append({
                    "issue": issue,
                    "old": old_pattern,
                    "new": new_pattern
                })
                
                logger.info(f"Fixed: {issue['class']}.{issue['field']}: {old_pattern} → {new_pattern}")
        
        # Write back the fixed content
        if content != original_content:
            with open(self.models_file, 'w') as f:
                f.write(content)
            
            logger.info(f"Applied {len(self.fixes_applied)} fixes to {self.models_file}")
            return True
        else:
            logger.info("No changes needed.")
            return True
    
    def generate_report(self) -> str:
        """Generate a comprehensive report of enum default issues."""
        report = []
        report.append("# Enum Default Values Analysis Report")
        report.append("=" * 50)
        report.append("")
        
        if not self.issues_found:
            report.append("✅ **No enum default issues found!**")
            report.append("")
            report.append("All enum defaults are using enum members correctly.")
        else:
            report.append(f"❌ **Found {len(self.issues_found)} issues:**")
            report.append("")
            
            for i, issue in enumerate(self.issues_found, 1):
                report.append(f"## Issue {i}: {issue['type']}")
                report.append(f"- **Class:** {issue['class']}")
                report.append(f"- **Field:** {issue['field']}")
                report.append(f"- **Current:** `{issue['current']}`")
                if "suggested" in issue:
                    report.append(f"- **Suggested:** `{issue['suggested']}`")
                report.append(f"- **Severity:** {issue['severity']}")
                report.append(f"- **Description:** {issue['description']}")
                report.append("")
        
        # Add consistency check results
        consistency_issues = self.validate_enum_consistency()
        if consistency_issues:
            report.append("## Enum Consistency Issues")
            report.append("")
            for issue in consistency_issues:
                report.append(f"- **{issue['enum']}.{issue['member']}:** {issue['description']}")
        
        if self.fixes_applied:
            report.append("## Fixes Applied")
            report.append("")
            for fix in self.fixes_applied:
                report.append(f"- **{fix['issue']['class']}.{fix['issue']['field']}:** {fix['old']} → {fix['new']}")
        
        return "\n".join(report)


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Fix enum default value issues")
    parser.add_argument("--check", action="store_true", help="Only check for issues, don't fix")
    parser.add_argument("--fix", action="store_true", help="Fix found issues")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--report", "-r", help="Generate report file")
    
    args = parser.parse_args()
    
    if not args.check and not args.fix:
        args.check = True  # Default to check mode
    
    fixer = EnumDefaultFixer(verbose=args.verbose)
    
    # Check for issues
    issues = fixer.check_enum_defaults()
    
    if args.check:
        if issues:
            logger.error(f"Found {len(issues)} enum default issues:")
            for issue in issues:
                logger.error(f"  - {issue['class']}.{issue['field']}: {issue['description']}")
        else:
            logger.info("✅ No enum default issues found!")
    
    # Fix issues if requested
    if args.fix and issues:
        success = fixer.fix_enum_defaults()
        if not success:
            sys.exit(1)
    
    # Generate report if requested
    if args.report:
        report = fixer.generate_report()
        with open(args.report, 'w') as f:
            f.write(report)
        logger.info(f"Report written to {args.report}")
    
    # Exit with appropriate code
    if issues and not args.fix:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
