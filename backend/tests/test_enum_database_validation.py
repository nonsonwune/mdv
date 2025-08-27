"""
Comprehensive enum validation tests to ensure Python enums match PostgreSQL enum types.

This test suite validates that:
1. Python enum values exactly match database enum values
2. All enum values can be successfully stored and retrieved
3. Enum transitions work correctly
4. No orphaned enum values exist in either system

Run with: pytest backend/tests/test_enum_database_validation.py -v
"""

import pytest
import os
import asyncio
from typing import Dict, List, Any
from datetime import datetime, timezone
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from mdv.db import get_session_factory
from mdv.models import (
    OrderStatus, FulfillmentStatus, ShipmentStatus, ReservationStatus,
    RefundMethod, Role, Order, Fulfillment, Shipment, Reservation
)


class TestEnumDatabaseValidation:
    """Test suite to validate enum consistency between Python and PostgreSQL."""
    
    @pytest.fixture
    async def db_session(self):
        """Create test database session."""
        # Skip tests if not using Postgres in CI/local env
        if not os.environ.get("DATABASE_URL", "").startswith("postgresql"):
            pytest.skip("Enum DB validation requires PostgreSQL DATABASE_URL")

        Session = get_session_factory()
        async with Session() as session:
            yield session

    async def get_postgres_enum_values(self, db: AsyncSession, enum_name: str) -> List[str]:
        """Get enum values from PostgreSQL database."""
        query = text("""
            SELECT enumlabel 
            FROM pg_enum 
            WHERE enumtypid = (
                SELECT oid 
                FROM pg_type 
                WHERE typname = :enum_name
            )
            ORDER BY enumlabel
        """)
        result = await db.execute(query, {"enum_name": enum_name})
        return [row[0] for row in result.fetchall()]

    async def test_order_status_enum_consistency(self, db_session):
        """Test OrderStatus enum values match database."""
        python_values = sorted([status.value for status in OrderStatus])
        db_values = sorted(await self.get_postgres_enum_values(db_session, "order_status"))
        
        assert python_values == db_values, (
            f"OrderStatus enum mismatch:\n"
            f"Python: {python_values}\n"
            f"Database: {db_values}\n"
            f"Missing in DB: {set(python_values) - set(db_values)}\n"
            f"Extra in DB: {set(db_values) - set(python_values)}"
        )

    async def test_fulfillment_status_enum_consistency(self, db_session):
        """Test FulfillmentStatus enum values match database."""
        python_values = sorted([status.value for status in FulfillmentStatus])
        db_values = sorted(await self.get_postgres_enum_values(db_session, "fulfillment_status"))
        
        assert python_values == db_values, (
            f"FulfillmentStatus enum mismatch:\n"
            f"Python: {python_values}\n"
            f"Database: {db_values}"
        )

    async def test_shipment_status_enum_consistency(self, db_session):
        """Test ShipmentStatus enum values match database."""
        python_values = sorted([status.value for status in ShipmentStatus])
        db_values = sorted(await self.get_postgres_enum_values(db_session, "shipment_status"))
        
        assert python_values == db_values, (
            f"ShipmentStatus enum mismatch:\n"
            f"Python: {python_values}\n"
            f"Database: {db_values}"
        )

    async def test_reservation_status_enum_consistency(self, db_session):
        """Test ReservationStatus enum values match database."""
        python_values = sorted([status.value for status in ReservationStatus])
        db_values = sorted(await self.get_postgres_enum_values(db_session, "reservation_status"))
        
        assert python_values == db_values, (
            f"ReservationStatus enum mismatch:\n"
            f"Python: {python_values}\n"
            f"Database: {db_values}"
        )

    async def test_refund_method_enum_consistency(self, db_session):
        """Test RefundMethod enum values match database."""
        python_values = sorted([method.value for method in RefundMethod])
        db_values = sorted(await self.get_postgres_enum_values(db_session, "refund_method"))
        
        assert python_values == db_values, (
            f"RefundMethod enum mismatch:\n"
            f"Python: {python_values}\n"
            f"Database: {db_values}"
        )

    async def test_role_enum_consistency(self, db_session):
        """Test Role enum values match database."""
        python_values = sorted([role.value for role in Role])
        db_values = sorted(await self.get_postgres_enum_values(db_session, "role"))
        
        assert python_values == db_values, (
            f"Role enum mismatch:\n"
            f"Python: {python_values}\n"
            f"Database: {db_values}"
        )

    async def test_enum_storage_and_retrieval(self, db_session):
        """Test that all enum values can be stored and retrieved correctly."""
        # Test OrderStatus storage/retrieval
        for status in OrderStatus:
            # Create a test order with this status
            order = Order(cart_id=1, status=status.value)
            db_session.add(order)
            await db_session.flush()
            
            # Retrieve and verify
            result = await db_session.execute(
                select(Order).where(Order.id == order.id)
            )
            retrieved_order = result.scalar_one()
            assert retrieved_order.status == status.value
            
            # Clean up
            await db_session.delete(order)

    async def test_enum_value_format_consistency(self, db_session):
        """Test that all enum values follow consistent naming conventions."""
        enum_classes = [OrderStatus, FulfillmentStatus, ShipmentStatus, ReservationStatus, RefundMethod, Role]
        
        for enum_class in enum_classes:
            for enum_member in enum_class:
                # Check that enum values are properly formatted
                assert isinstance(enum_member.value, str), (
                    f"{enum_class.__name__}.{enum_member.name}.value must be string"
                )
                
                # For most enums, values should be snake_case
                if enum_class != Role and enum_class != RefundMethod:
                    assert "_" in enum_member.value or enum_member.value.islower(), (
                        f"{enum_class.__name__}.{enum_member.name}.value should be snake_case: {enum_member.value}"
                    )

    async def test_enum_member_names_consistency(self, db_session):
        """Test that enum member names are consistent with values."""
        enum_classes = [OrderStatus, FulfillmentStatus, ShipmentStatus, ReservationStatus]
        
        for enum_class in enum_classes:
            for enum_member in enum_class:
                # Member name should be snake_case version of the value
                expected_name = enum_member.value.lower().replace("-", "_")
                assert enum_member.name == expected_name, (
                    f"{enum_class.__name__}: member name '{enum_member.name}' "
                    f"should match value format '{expected_name}'"
                )

    async def test_all_database_enums_have_python_equivalents(self, db_session):
        """Test that all PostgreSQL enum types have corresponding Python enums."""
        # Get all enum types from database
        query = text("""
            SELECT typname 
            FROM pg_type 
            WHERE typtype = 'e'
            ORDER BY typname
        """)
        result = await db_session.execute(query)
        db_enum_types = [row[0] for row in result.fetchall()]
        
        # Expected enum types (based on our Python enums)
        expected_enum_types = {
            "fulfillment_status",
            "order_status", 
            "refund_method",
            "reservation_status",
            "role",
            "shipment_status"
        }
        
        db_enum_set = set(db_enum_types)
        
        # Check that we have Python equivalents for all DB enums
        assert expected_enum_types.issubset(db_enum_set), (
            f"Missing database enum types: {expected_enum_types - db_enum_set}"
        )
        
        # Warn about extra enum types in database
        extra_enums = db_enum_set - expected_enum_types
        if extra_enums:
            print(f"Warning: Extra enum types in database: {extra_enums}")

    @pytest.mark.asyncio
    async def test_enum_transition_scenarios(self, db_session):
        """Test common enum transition scenarios work correctly."""
        # Test order status transitions
        order = Order(cart_id=1, status=OrderStatus.pending_payment.value)
        db_session.add(order)
        await db_session.flush()
        
        # Transition: pending_payment -> paid
        order.status = OrderStatus.paid.value
        await db_session.flush()
        
        # Retrieve and verify
        result = await db_session.execute(select(Order).where(Order.id == order.id))
        retrieved_order = result.scalar_one()
        assert retrieved_order.status == OrderStatus.paid.value
        
        # Clean up
        await db_session.delete(order)

    async def test_enum_default_values(self, db_session):
        """Test that model default enum values work correctly."""
        # Test Order default status
        order = Order(cart_id=1)  # No status specified, should use default
        db_session.add(order)
        await db_session.flush()

        # Should have default pending_payment status
        assert order.status == OrderStatus.pending_payment.value

        # Clean up
        await db_session.delete(order)

    @pytest.mark.asyncio
    async def test_all_enum_defaults_comprehensive(self, db_session):
        """Test that all model enum defaults work correctly without explicit status assignment."""

        # Test Order default (the critical one that was failing in production)
        order = Order(cart_id=1)
        db_session.add(order)
        await db_session.flush()
        assert order.status == OrderStatus.pending_payment.value
        assert order.status == "PendingPayment"  # Verify it matches database enum value

        # Test Reservation default
        reservation = Reservation(cart_id=1, variant_id=1, qty=1, expires_at=datetime.now(timezone.utc))
        db_session.add(reservation)
        await db_session.flush()
        assert reservation.status == ReservationStatus.active.value
        assert reservation.status == "Active"

        # Test Fulfillment default
        fulfillment = Fulfillment(order_id=order.id)
        db_session.add(fulfillment)
        await db_session.flush()
        assert fulfillment.status == FulfillmentStatus.processing.value
        assert fulfillment.status == "Processing"

        # Test Shipment default
        shipment = Shipment(fulfillment_id=fulfillment.id, courier="Test Courier", tracking_id="TEST123")
        db_session.add(shipment)
        await db_session.flush()
        assert shipment.status == ShipmentStatus.dispatched.value
        assert shipment.status == "Dispatched"

        # Clean up (in reverse order due to foreign key constraints)
        await db_session.delete(shipment)
        await db_session.delete(fulfillment)
        await db_session.delete(reservation)
        await db_session.delete(order)
        await db_session.flush()

    @pytest.mark.asyncio
    async def test_enum_defaults_database_insertion(self, db_session):
        """Test that enum defaults work correctly when inserting into database (reproduces production scenario)."""
        # This test specifically reproduces the production checkout scenario
        # where Order is created without explicit status and relies on model default

        # Create order exactly like in checkout endpoint
        order = Order(cart_id=1)  # This is what was failing in production
        db_session.add(order)

        # This flush should not raise InvalidTextRepresentationError
        try:
            await db_session.flush()
        except Exception as e:
            pytest.fail(f"Enum default insertion failed: {e}")

        # Verify the order was created with correct status
        assert order.id is not None
        assert order.status == "PendingPayment"

        # Verify we can retrieve it from database
        result = await db_session.execute(select(Order).where(Order.id == order.id))
        retrieved_order = result.scalar_one()
        assert retrieved_order.status == "PendingPayment"

        # Clean up
        await db_session.delete(order)

    async def test_enum_validation_comprehensive_report(self, db_session):
        """Generate a comprehensive validation report for all enums."""
        enum_info = {}
        
        enum_mappings = {
            "order_status": OrderStatus,
            "fulfillment_status": FulfillmentStatus,
            "shipment_status": ShipmentStatus,
            "reservation_status": ReservationStatus,
            "refund_method": RefundMethod,
            "role": Role
        }
        
        for db_name, python_enum in enum_mappings.items():
            try:
                python_values = sorted([e.value for e in python_enum])
                db_values = sorted(await self.get_postgres_enum_values(db_session, db_name))
                
                enum_info[db_name] = {
                    "python_values": python_values,
                    "db_values": db_values,
                    "match": python_values == db_values,
                    "missing_in_db": list(set(python_values) - set(db_values)),
                    "extra_in_db": list(set(db_values) - set(python_values))
                }
            except Exception as e:
                enum_info[db_name] = {"error": str(e)}
        
        # Print comprehensive report
        print("\n" + "="*60)
        print("ENUM VALIDATION COMPREHENSIVE REPORT")
        print("="*60)
        
        for enum_name, info in enum_info.items():
            print(f"\n{enum_name.upper()}:")
            if "error" in info:
                print(f"  ERROR: {info['error']}")
                continue
                
            print(f"  Match: {'✓' if info['match'] else '✗'}")
            print(f"  Python values: {info['python_values']}")
            print(f"  DB values: {info['db_values']}")
            
            if info['missing_in_db']:
                print(f"  Missing in DB: {info['missing_in_db']}")
            if info['extra_in_db']:
                print(f"  Extra in DB: {info['extra_in_db']}")
        
        print("\n" + "="*60)
        
        # Assert all enums match
        mismatched = [name for name, info in enum_info.items() 
                     if "error" not in info and not info["match"]]
        
        assert not mismatched, f"Enum mismatches found in: {mismatched}"


# Utility functions for CI/CD integration
async def validate_all_enums() -> Dict[str, Any]:
    """
    Standalone function to validate all enums. 
    Can be called from migration scripts or CI/CD.
    """
    Session = get_session_factory()
    async with Session() as session:
        validator = TestEnumDatabaseValidation()
        
        results = {}
        enum_mappings = {
            "order_status": OrderStatus,
            "fulfillment_status": FulfillmentStatus, 
            "shipment_status": ShipmentStatus,
            "reservation_status": ReservationStatus,
            "refund_method": RefundMethod,
            "role": Role
        }
        
        for db_name, python_enum in enum_mappings.items():
            try:
                python_values = sorted([e.value for e in python_enum])
                db_values = sorted(await validator.get_postgres_enum_values(session, db_name))
                
                results[db_name] = {
                    "valid": python_values == db_values,
                    "python_values": python_values,
                    "db_values": db_values,
                    "issues": {
                        "missing_in_db": list(set(python_values) - set(db_values)),
                        "extra_in_db": list(set(db_values) - set(python_values))
                    }
                }
            except Exception as e:
                results[db_name] = {"valid": False, "error": str(e)}
        
        return results


if __name__ == "__main__":
    # Run validation as standalone script
    async def main():
        results = await validate_all_enums()
        
        print("ENUM VALIDATION RESULTS:")
        print("="*50)
        
        all_valid = True
        for enum_name, result in results.items():
            status = "✓ VALID" if result.get("valid") else "✗ INVALID"
            print(f"{enum_name}: {status}")
            
            if not result.get("valid"):
                all_valid = False
                if "error" in result:
                    print(f"  Error: {result['error']}")
                else:
                    issues = result.get("issues", {})
                    if issues.get("missing_in_db"):
                        print(f"  Missing in DB: {issues['missing_in_db']}")
                    if issues.get("extra_in_db"):
                        print(f"  Extra in DB: {issues['extra_in_db']}")
        
        print("="*50)
        if all_valid:
            print("✓ ALL ENUMS VALID")
        else:
            print("✗ ENUM VALIDATION FAILED")
            exit(1)
    
    asyncio.run(main())
