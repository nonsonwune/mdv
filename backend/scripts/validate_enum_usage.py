#!/usr/bin/env python3
"""
Comprehensive Enum Usage Validation Script

This script validates all enum usage across the entire codebase to ensure:
- Consistent enum member vs value usage
- Proper enum imports and references
- Correct enum comparisons and assignments
- API serialization consistency
- Database query correctness

Usage:
    python scripts/validate_enum_usage.py [--fix] [--verbose] [--report output.md]
"""

import os
import re
import ast
import sys
import argparse
import logging
from pathlib import Path
from typing import List, Dict, Set, Any, Tuple, Optional
from dataclasses import dataclass
from collections import defaultdict

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parents[1]))

from mdv.models import (
    OrderStatus, FulfillmentStatus, ShipmentStatus, ReservationStatus,
    RefundMethod, Role, AuditAction, AuditEntity, AuditStatus
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class EnumUsageIssue:
    """Represents an enum usage issue found in the codebase."""
    file_path: str
    line_number: int
    issue_type: str
    severity: str  # error, warning, info
    description: str
    current_code: str
    suggested_fix: Optional[str] = None
    context: Optional[str] = None


class EnumUsageValidator:
    """Comprehensive enum usage validator."""
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.backend_root = Path(__file__).parents[1]
        self.web_root = self.backend_root.parent / "web"
        
        # Define enum classes and their expected patterns
        self.enum_classes = {
            "OrderStatus": OrderStatus,
            "FulfillmentStatus": FulfillmentStatus,
            "ShipmentStatus": ShipmentStatus,
            "ReservationStatus": ReservationStatus,
            "RefundMethod": RefundMethod,
            "Role": Role,
            "AuditAction": AuditAction,
            "AuditEntity": AuditEntity,
            "AuditStatus": AuditStatus,
        }
        
        # Track all issues found
        self.issues: List[EnumUsageIssue] = []
        
        # Patterns to look for
        self.problematic_patterns = [
            # Using .value in comparisons (usually incorrect)
            r'(\w+Status|Role|RefundMethod|Audit\w+)\.(\w+)\.value\s*[=!]=',
            # Using string literals instead of enum members
            r'status\s*[=!]=\s*["\'](\w+)["\']',
            r'role\s*[=!]=\s*["\'](\w+)["\']',
            # Incorrect enum construction
            r'(\w+Status|Role|RefundMethod|Audit\w+)\(["\'](\w+)["\']\)',
        ]
    
    def validate_all_enum_usage(self) -> List[EnumUsageIssue]:
        """Validate enum usage across the entire codebase."""
        logger.info("Starting comprehensive enum usage validation...")
        
        # Validate backend Python files
        self._validate_directory(self.backend_root, [".py"])
        
        # Validate frontend TypeScript/JavaScript files
        if self.web_root.exists():
            self._validate_directory(self.web_root, [".ts", ".tsx", ".js", ".jsx"])
        
        # Validate specific patterns
        self._validate_api_serialization()
        self._validate_database_queries()
        self._validate_test_files()
        
        logger.info(f"Validation complete. Found {len(self.issues)} issues.")
        return self.issues
    
    def _validate_directory(self, directory: Path, extensions: List[str]):
        """Validate all files in a directory with given extensions."""
        for ext in extensions:
            for file_path in directory.rglob(f"*{ext}"):
                # Skip certain directories
                if any(skip in str(file_path) for skip in [
                    "__pycache__", ".git", "node_modules", ".next", "dist", "build"
                ]):
                    continue
                
                try:
                    self._validate_file(file_path)
                except Exception as e:
                    logger.warning(f"Error validating {file_path}: {e}")
    
    def _validate_file(self, file_path: Path):
        """Validate enum usage in a specific file."""
        if self.verbose:
            logger.info(f"Validating {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            # Skip binary files
            return
        
        lines = content.split('\n')
        
        # Check for problematic patterns
        for line_num, line in enumerate(lines, 1):
            self._check_line_for_issues(file_path, line_num, line, content)
        
        # For Python files, also do AST analysis
        if file_path.suffix == '.py':
            self._validate_python_ast(file_path, content)
    
    def _check_line_for_issues(self, file_path: Path, line_num: int, line: str, full_content: str):
        """Check a single line for enum usage issues."""
        
        # Check for .value usage in comparisons
        if '.value' in line and any(enum_name in line for enum_name in self.enum_classes.keys()):
            # This might be incorrect - check context
            if re.search(r'\.value\s*[=!]=', line):
                self.issues.append(EnumUsageIssue(
                    file_path=str(file_path),
                    line_number=line_num,
                    issue_type="incorrect_value_comparison",
                    severity="warning",
                    description="Using .value in enum comparison - consider using enum member directly",
                    current_code=line.strip(),
                    suggested_fix=line.replace('.value', '').strip(),
                    context="Enum comparisons should typically use enum members, not values"
                ))
        
        # Check for string literal comparisons
        for enum_name, enum_class in self.enum_classes.items():
            enum_values = [member.value for member in enum_class]
            
            # Look for string literals that match enum values
            for value in enum_values:
                if f'"{value}"' in line or f"'{value}'" in line:
                    # Check if this is in a comparison context
                    if re.search(rf'[=!]=\s*["\']?{re.escape(value)}["\']?', line):
                        # Find the corresponding enum member
                        enum_member = None
                        for member in enum_class:
                            if member.value == value:
                                enum_member = f"{enum_name}.{member.name}"
                                break
                        
                        if enum_member:
                            self.issues.append(EnumUsageIssue(
                                file_path=str(file_path),
                                line_number=line_num,
                                issue_type="string_literal_comparison",
                                severity="warning",
                                description=f"Using string literal '{value}' instead of enum member",
                                current_code=line.strip(),
                                suggested_fix=line.replace(f'"{value}"', enum_member).replace(f"'{value}'", enum_member).strip(),
                                context=f"Consider using {enum_member} instead of string literal"
                            ))
        
        # Check for incorrect enum construction
        if re.search(r'(\w+Status|Role|RefundMethod|Audit\w+)\(["\']', line):
            self.issues.append(EnumUsageIssue(
                file_path=str(file_path),
                line_number=line_num,
                issue_type="incorrect_enum_construction",
                severity="error",
                description="Incorrect enum construction with string argument",
                current_code=line.strip(),
                context="Enums should be accessed as members, not constructed with strings"
            ))
    
    def _validate_python_ast(self, file_path: Path, content: str):
        """Validate Python file using AST analysis."""
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return
        
        for node in ast.walk(tree):
            # Check for enum attribute access
            if isinstance(node, ast.Attribute):
                if isinstance(node.value, ast.Attribute):
                    # Check for patterns like EnumClass.member.value
                    if (isinstance(node.value.value, ast.Name) and 
                        node.value.value.id in self.enum_classes and
                        node.attr == 'value'):
                        
                        # This might be problematic depending on context
                        line_num = getattr(node, 'lineno', 0)
                        self.issues.append(EnumUsageIssue(
                            file_path=str(file_path),
                            line_number=line_num,
                            issue_type="enum_value_access",
                            severity="info",
                            description="Accessing enum .value - verify this is necessary",
                            current_code=f"{node.value.value.id}.{node.value.attr}.value",
                            context="Enum .value access should only be used for serialization or specific cases"
                        ))
    
    def _validate_api_serialization(self):
        """Validate enum usage in API serialization."""
        logger.info("Validating API serialization patterns...")
        
        # Check Pydantic models and API responses
        api_dir = self.backend_root / "api"
        if api_dir.exists():
            for file_path in api_dir.rglob("*.py"):
                self._check_api_serialization_file(file_path)
    
    def _check_api_serialization_file(self, file_path: Path):
        """Check API serialization file for enum usage."""
        try:
            with open(file_path, 'r') as f:
                content = f.read()
        except:
            return
        
        # Look for Pydantic model definitions
        if "BaseModel" in content:
            lines = content.split('\n')
            for line_num, line in enumerate(lines, 1):
                # Check for enum field definitions
                if any(enum_name in line for enum_name in self.enum_classes.keys()):
                    if "Field(" in line and ".value" in line:
                        self.issues.append(EnumUsageIssue(
                            file_path=str(file_path),
                            line_number=line_num,
                            issue_type="api_serialization_issue",
                            severity="warning",
                            description="Using .value in Pydantic Field - may cause serialization issues",
                            current_code=line.strip(),
                            context="Pydantic should handle enum serialization automatically"
                        ))
    
    def _validate_database_queries(self):
        """Validate enum usage in database queries."""
        logger.info("Validating database query patterns...")
        
        # Check for common query patterns
        for file_path in self.backend_root.rglob("*.py"):
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
            except:
                continue
            
            # Look for SQLAlchemy query patterns
            if "select(" in content or "filter(" in content or "where(" in content:
                self._check_database_query_file(file_path, content)
    
    def _check_database_query_file(self, file_path: Path, content: str):
        """Check database query file for enum usage."""
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # Check for enum usage in queries
            if any(enum_name in line for enum_name in self.enum_classes.keys()):
                # Look for potential issues
                if ".value" in line and ("filter(" in line or "where(" in line):
                    self.issues.append(EnumUsageIssue(
                        file_path=str(file_path),
                        line_number=line_num,
                        issue_type="database_query_issue",
                        severity="info",
                        description="Using .value in database query - verify this is correct",
                        current_code=line.strip(),
                        context="SQLAlchemy usually handles enum conversion automatically"
                    ))
    
    def _validate_test_files(self):
        """Validate enum usage in test files."""
        logger.info("Validating test file patterns...")
        
        test_dir = self.backend_root / "tests"
        if test_dir.exists():
            for file_path in test_dir.rglob("*.py"):
                self._check_test_file(file_path)
    
    def _check_test_file(self, file_path: Path):
        """Check test file for enum usage."""
        try:
            with open(file_path, 'r') as f:
                content = f.read()
        except:
            return
        
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # In tests, both enum members and values might be valid
            # But check for consistency
            if "assert" in line and any(enum_name in line for enum_name in self.enum_classes.keys()):
                if ".value" in line:
                    # This might be intentional in tests, but flag for review
                    self.issues.append(EnumUsageIssue(
                        file_path=str(file_path),
                        line_number=line_num,
                        issue_type="test_enum_usage",
                        severity="info",
                        description="Using .value in test assertion - verify this is intentional",
                        current_code=line.strip(),
                        context="Tests may need to check both enum members and values"
                    ))
    
    def generate_report(self) -> str:
        """Generate a comprehensive report of enum usage issues."""
        report = []
        report.append("# Enum Usage Validation Report")
        report.append("=" * 50)
        report.append("")
        
        if not self.issues:
            report.append("✅ **No enum usage issues found!**")
            report.append("")
            report.append("All enum usage appears to be consistent and correct.")
            return "\n".join(report)
        
        # Group issues by type
        issues_by_type = defaultdict(list)
        for issue in self.issues:
            issues_by_type[issue.issue_type].append(issue)
        
        # Summary
        report.append(f"**Total Issues Found:** {len(self.issues)}")
        report.append("")
        
        error_count = len([i for i in self.issues if i.severity == "error"])
        warning_count = len([i for i in self.issues if i.severity == "warning"])
        info_count = len([i for i in self.issues if i.severity == "info"])
        
        report.append(f"- **Errors:** {error_count}")
        report.append(f"- **Warnings:** {warning_count}")
        report.append(f"- **Info:** {info_count}")
        report.append("")
        
        # Issues by type
        for issue_type, issues in issues_by_type.items():
            report.append(f"## {issue_type.replace('_', ' ').title()} ({len(issues)} issues)")
            report.append("")
            
            for issue in issues:
                report.append(f"### {Path(issue.file_path).name}:{issue.line_number}")
                report.append(f"**Severity:** {issue.severity}")
                report.append(f"**Description:** {issue.description}")
                report.append(f"**Current Code:** `{issue.current_code}`")
                if issue.suggested_fix:
                    report.append(f"**Suggested Fix:** `{issue.suggested_fix}`")
                if issue.context:
                    report.append(f"**Context:** {issue.context}")
                report.append("")
        
        return "\n".join(report)


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Validate enum usage across codebase")
    parser.add_argument("--fix", action="store_true", help="Attempt to fix issues automatically")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--report", "-r", help="Generate report file")
    parser.add_argument("--severity", choices=["error", "warning", "info"], help="Filter by severity")
    
    args = parser.parse_args()
    
    validator = EnumUsageValidator(verbose=args.verbose)
    issues = validator.validate_all_enum_usage()
    
    # Filter by severity if specified
    if args.severity:
        issues = [issue for issue in issues if issue.severity == args.severity]
    
    # Display results
    if issues:
        logger.warning(f"Found {len(issues)} enum usage issues:")
        for issue in issues[:10]:  # Show first 10
            logger.warning(f"  {issue.file_path}:{issue.line_number} - {issue.description}")
        
        if len(issues) > 10:
            logger.info(f"  ... and {len(issues) - 10} more issues")
    else:
        logger.info("✅ No enum usage issues found!")
    
    # Generate report if requested
    if args.report:
        report = validator.generate_report()
        with open(args.report, 'w') as f:
            f.write(report)
        logger.info(f"Report written to {args.report}")
    
    # Exit with appropriate code
    error_count = len([i for i in issues if i.severity == "error"])
    if error_count > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
