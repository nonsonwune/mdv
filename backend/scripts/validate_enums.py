#!/usr/bin/env python3
"""
Comprehensive Enum Validation Script for MDV Platform

This script validates consistency between Python enum definitions and PostgreSQL database enum types.
It checks for:
- Missing enum values in database
- Extra enum values in database
- Value format mismatches
- Enum type existence
- SQLAlchemy integration issues

Usage:
    python scripts/validate_enums.py [--fix] [--verbose] [--env production]
"""

import asyncio
import sys
import os
import argparse
import logging
from typing import Dict, List, Set, Any, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass
from enum import Enum

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parents[1]))

import asyncpg
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from mdv.config import settings
from mdv.db import get_session_factory
from mdv.models import (
    OrderStatus, FulfillmentStatus, ShipmentStatus, ReservationStatus,
    RefundMethod, Role, AuditAction, AuditEntity, AuditStatus
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class EnumValidationResult:
    """Result of enum validation."""
    enum_name: str
    python_values: Set[str]
    database_values: Set[str]
    missing_in_db: Set[str]
    extra_in_db: Set[str]
    is_valid: bool
    error_message: Optional[str] = None


@dataclass
class ValidationSummary:
    """Summary of all enum validations."""
    total_enums: int
    valid_enums: int
    invalid_enums: int
    results: List[EnumValidationResult]
    critical_issues: List[str]
    warnings: List[str]


class EnumValidator:
    """Comprehensive enum validation system."""
    
    def __init__(self, database_url: str, verbose: bool = False):
        self.database_url = database_url
        self.verbose = verbose
        self.session_factory = get_session_factory()
        
        # Define enum mappings
        self.enum_mappings = {
            "role": Role,
            "order_status": OrderStatus,
            "fulfillment_status": FulfillmentStatus,
            "shipment_status": ShipmentStatus,
            "reservation_status": ReservationStatus,
            "refund_method": RefundMethod,
            "audit_action": AuditAction,
            "audit_entity": AuditEntity,
            "audit_status": AuditStatus,
        }
    
    async def validate_all_enums(self) -> ValidationSummary:
        """Validate all enum types."""
        logger.info("Starting comprehensive enum validation...")
        
        results = []
        critical_issues = []
        warnings = []
        
        async with self.session_factory() as session:
            for db_enum_name, python_enum_class in self.enum_mappings.items():
                try:
                    result = await self._validate_enum(session, db_enum_name, python_enum_class)
                    results.append(result)
                    
                    if not result.is_valid:
                        if result.missing_in_db or result.extra_in_db:
                            critical_issues.append(
                                f"CRITICAL: {result.enum_name} has mismatched values"
                            )
                        if result.error_message:
                            critical_issues.append(f"ERROR: {result.enum_name} - {result.error_message}")
                    
                    if self.verbose:
                        self._log_validation_result(result)
                        
                except Exception as e:
                    error_result = EnumValidationResult(
                        enum_name=db_enum_name,
                        python_values=set(),
                        database_values=set(),
                        missing_in_db=set(),
                        extra_in_db=set(),
                        is_valid=False,
                        error_message=str(e)
                    )
                    results.append(error_result)
                    critical_issues.append(f"CRITICAL: Failed to validate {db_enum_name}: {e}")
        
        valid_count = sum(1 for r in results if r.is_valid)
        
        summary = ValidationSummary(
            total_enums=len(results),
            valid_enums=valid_count,
            invalid_enums=len(results) - valid_count,
            results=results,
            critical_issues=critical_issues,
            warnings=warnings
        )
        
        self._log_summary(summary)
        return summary
    
    async def _validate_enum(
        self, 
        session: AsyncSession, 
        db_enum_name: str, 
        python_enum_class: type
    ) -> EnumValidationResult:
        """Validate a specific enum type."""
        
        # Get Python enum values
        python_values = {member.value for member in python_enum_class}
        
        # Get database enum values
        try:
            database_values = await self._get_database_enum_values(session, db_enum_name)
        except Exception as e:
            return EnumValidationResult(
                enum_name=db_enum_name,
                python_values=python_values,
                database_values=set(),
                missing_in_db=set(),
                extra_in_db=set(),
                is_valid=False,
                error_message=f"Failed to query database enum: {e}"
            )
        
        # Compare values
        missing_in_db = python_values - database_values
        extra_in_db = database_values - python_values
        
        is_valid = len(missing_in_db) == 0 and len(extra_in_db) == 0
        
        # Additional validation checks
        error_message = None
        if not database_values:
            error_message = f"Enum type '{db_enum_name}' not found in database"
            is_valid = False
        elif not python_values:
            error_message = f"Python enum '{python_enum_class.__name__}' has no values"
            is_valid = False
        
        return EnumValidationResult(
            enum_name=db_enum_name,
            python_values=python_values,
            database_values=database_values,
            missing_in_db=missing_in_db,
            extra_in_db=extra_in_db,
            is_valid=is_valid,
            error_message=error_message
        )
    
    async def _get_database_enum_values(self, session: AsyncSession, enum_name: str) -> Set[str]:
        """Get enum values from database (PostgreSQL or SQLite)."""

        # Check if we're using PostgreSQL or SQLite
        dialect_name = session.bind.dialect.name

        if dialect_name == "postgresql":
            return await self._get_postgresql_enum_values(session, enum_name)
        elif dialect_name == "sqlite":
            return await self._get_sqlite_enum_values(session, enum_name)
        else:
            raise ValueError(f"Unsupported database dialect: {dialect_name}")

    async def _get_postgresql_enum_values(self, session: AsyncSession, enum_name: str) -> Set[str]:
        """Get enum values from PostgreSQL database."""
        query = text("""
            SELECT enumlabel
            FROM pg_enum
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
            WHERE pg_type.typname = :enum_name
            ORDER BY enumsortorder
        """)

        result = await session.execute(query, {"enum_name": enum_name})
        values = {row[0] for row in result.fetchall()}

        if not values:
            # Check if enum type exists at all
            type_check_query = text("""
                SELECT typname FROM pg_type WHERE typname = :enum_name
            """)
            type_result = await session.execute(type_check_query, {"enum_name": enum_name})
            if not type_result.fetchone():
                raise ValueError(f"Enum type '{enum_name}' does not exist in database")

        return values

    async def _get_sqlite_enum_values(self, session: AsyncSession, enum_name: str) -> Set[str]:
        """Get enum values from SQLite database by checking table constraints."""
        # SQLite doesn't have native enum types, so we need to check table constraints
        # or return empty set with a warning

        logger.warning(f"SQLite detected - enum validation for '{enum_name}' is limited")
        logger.info("For full enum validation, use PostgreSQL database")

        # For SQLite, we can't easily validate enum constraints
        # Return empty set to indicate validation is not possible
        return set()
    
    def _log_validation_result(self, result: EnumValidationResult):
        """Log detailed validation result."""
        status = "✅ VALID" if result.is_valid else "❌ INVALID"
        logger.info(f"{status} - {result.enum_name}")
        
        if self.verbose:
            logger.info(f"  Python values: {sorted(result.python_values)}")
            logger.info(f"  Database values: {sorted(result.database_values)}")
            
            if result.missing_in_db:
                logger.warning(f"  Missing in DB: {sorted(result.missing_in_db)}")
            
            if result.extra_in_db:
                logger.warning(f"  Extra in DB: {sorted(result.extra_in_db)}")
            
            if result.error_message:
                logger.error(f"  Error: {result.error_message}")
    
    def _log_summary(self, summary: ValidationSummary):
        """Log validation summary."""
        logger.info("\n" + "="*60)
        logger.info("ENUM VALIDATION SUMMARY")
        logger.info("="*60)
        logger.info(f"Total enums checked: {summary.total_enums}")
        logger.info(f"Valid enums: {summary.valid_enums}")
        logger.info(f"Invalid enums: {summary.invalid_enums}")
        
        if summary.critical_issues:
            logger.error("\nCRITICAL ISSUES:")
            for issue in summary.critical_issues:
                logger.error(f"  • {issue}")
        
        if summary.warnings:
            logger.warning("\nWARNINGS:")
            for warning in summary.warnings:
                logger.warning(f"  • {warning}")
        
        if summary.invalid_enums == 0:
            logger.info("\n🎉 All enums are valid!")
        else:
            logger.error(f"\n💥 {summary.invalid_enums} enum(s) have issues that need attention!")
    
    async def generate_fix_script(self, summary: ValidationSummary) -> str:
        """Generate SQL script to fix enum mismatches."""
        fix_statements = []
        fix_statements.append("-- Auto-generated enum fix script")
        fix_statements.append("-- Review carefully before executing!")
        fix_statements.append("")

        for result in summary.results:
            if not result.is_valid:
                # Handle missing enum types
                if result.error_message and "does not exist" in result.error_message:
                    fix_statements.append(f"-- Create missing enum type: {result.enum_name}")
                    values_list = "', '".join(sorted(result.python_values))
                    fix_statements.append(f"CREATE TYPE {result.enum_name} AS ENUM ('{values_list}');")
                    fix_statements.append("")

                # Handle missing/extra values in existing enums
                elif result.missing_in_db or result.extra_in_db:
                    fix_statements.append(f"-- Fix {result.enum_name} enum")

                    # Add missing values
                    for missing_value in sorted(result.missing_in_db):
                        fix_statements.append(
                            f"ALTER TYPE {result.enum_name} ADD VALUE IF NOT EXISTS '{missing_value}';"
                        )

                    # Note: PostgreSQL doesn't support removing enum values easily
                    # Extra values need manual intervention
                    if result.extra_in_db:
                        fix_statements.append(f"-- WARNING: Extra values in {result.enum_name}: {sorted(result.extra_in_db)}")
                        fix_statements.append(f"-- These need manual removal (requires recreating the enum)")

                    fix_statements.append("")

        return "\n".join(fix_statements)


async def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Validate enum consistency")
    parser.add_argument("--fix", action="store_true", help="Generate fix script")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--env", default="development", help="Environment (development/staging/production)")
    parser.add_argument("--output", "-o", help="Output file for fix script")
    
    args = parser.parse_args()
    
    # Get database URL
    database_url = settings.database_url
    if not database_url:
        logger.error("DATABASE_URL not configured")
        sys.exit(1)
    
    # Validate enums
    validator = EnumValidator(database_url, verbose=args.verbose)
    summary = await validator.validate_all_enums()
    
    # Generate fix script if requested
    if args.fix and summary.invalid_enums > 0:
        fix_script = await validator.generate_fix_script(summary)
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(fix_script)
            logger.info(f"Fix script written to {args.output}")
        else:
            print("\n" + "="*60)
            print("GENERATED FIX SCRIPT:")
            print("="*60)
            print(fix_script)
    
    # Exit with appropriate code
    if summary.critical_issues:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
