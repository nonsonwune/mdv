"""Test that Python enum values match the database enum values"""
import pytest
import sys
from pathlib import Path

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parents[1]))

from mdv.models import (
    OrderStatus,
    FulfillmentStatus,
    ShipmentStatus,
    ReservationStatus,
    RefundMethod,
    Role
)

def test_order_status_values():
    """Verify OrderStatus enum values match database enum"""
    assert OrderStatus.pending_payment.value == "pending_payment"
    assert OrderStatus.paid.value == "paid"
    assert OrderStatus.cancelled.value == "cancelled"
    assert OrderStatus.refunded.value == "refunded"
    
    # Ensure all enum members are accounted for
    assert len(OrderStatus) == 4
    
def test_fulfillment_status_values():
    """Verify FulfillmentStatus enum values match database enum"""
    assert FulfillmentStatus.processing.value == "processing"
    assert FulfillmentStatus.ready_to_ship.value == "ready_to_ship"

    # Ensure all enum members are accounted for
    assert len(FulfillmentStatus) == 2

def test_shipment_status_values():
    """Verify ShipmentStatus enum values match database enum"""
    assert ShipmentStatus.dispatched.value == "dispatched"
    assert ShipmentStatus.in_transit.value == "in_transit"
    assert ShipmentStatus.delivered.value == "delivered"
    assert ShipmentStatus.returned.value == "returned"

    # Ensure all enum members are accounted for
    assert len(ShipmentStatus) == 4

def test_reservation_status_values():
    """Verify ReservationStatus enum values match database enum"""
    assert ReservationStatus.active.value == "active"
    assert ReservationStatus.released.value == "released"
    assert ReservationStatus.consumed.value == "consumed"
    assert ReservationStatus.expired.value == "expired"

    # Ensure all enum members are accounted for
    assert len(ReservationStatus) == 4

def test_refund_method_values():
    """Verify RefundMethod enum values match database enum"""
    assert RefundMethod.paystack.value == "paystack"
    assert RefundMethod.manual.value == "manual"
    
    # Ensure all enum members are accounted for
    assert len(RefundMethod) == 2

def test_role_values():
    """Verify Role enum values match database enum"""
    assert Role.admin.value == "admin"
    assert Role.supervisor.value == "supervisor"
    assert Role.operations.value == "operations"
    assert Role.logistics.value == "logistics"
    
    # Ensure all enum members are accounted for
    assert len(Role) == 4

def test_enum_str_inheritance():
    """Verify that all enums properly inherit from str for SQLAlchemy compatibility"""
    # When enums inherit from str, they should be directly usable as strings
    assert OrderStatus.pending_payment.value == "pending_payment"
    assert OrderStatus.pending_payment == "pending_payment"  # This works because of str inheritance

    assert FulfillmentStatus.processing.value == "processing"
    assert FulfillmentStatus.processing == "processing"

    assert ShipmentStatus.dispatched.value == "dispatched"
    assert ShipmentStatus.dispatched == "dispatched"

    assert ReservationStatus.active.value == "active"
    assert ReservationStatus.active == "active"

def test_enum_values_are_strings():
    """Ensure all enum values are proper strings matching production database format"""
    # For production compatibility, enum values should match the member names (lowercase/snake_case)
    for status in OrderStatus:
        # The value should be the same as the member name for production database compatibility
        assert status.value == status.name
        # The value should be a lowercase string
        assert status.value.islower()

    for status in FulfillmentStatus:
        assert status.value == status.name
        assert status.value.islower()

    for status in ShipmentStatus:
        assert status.value == status.name
        assert status.value.islower()

    for status in ReservationStatus:
        assert status.value == status.name
        assert status.value.islower()

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
