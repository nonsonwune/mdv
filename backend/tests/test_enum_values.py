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
    assert OrderStatus.pending_payment.value == "PendingPayment"
    assert OrderStatus.paid.value == "Paid"
    assert OrderStatus.cancelled.value == "Cancelled"
    assert OrderStatus.refunded.value == "Refunded"
    
    # Ensure all enum members are accounted for
    assert len(OrderStatus) == 4
    
def test_fulfillment_status_values():
    """Verify FulfillmentStatus enum values match database enum"""
    assert FulfillmentStatus.processing.value == "Processing"
    assert FulfillmentStatus.ready_to_ship.value == "ReadyToShip"
    
    # Ensure all enum members are accounted for
    assert len(FulfillmentStatus) == 2

def test_shipment_status_values():
    """Verify ShipmentStatus enum values match database enum"""
    assert ShipmentStatus.dispatched.value == "Dispatched"
    assert ShipmentStatus.in_transit.value == "InTransit"
    assert ShipmentStatus.delivered.value == "Delivered"
    assert ShipmentStatus.returned.value == "Returned"
    
    # Ensure all enum members are accounted for
    assert len(ShipmentStatus) == 4

def test_reservation_status_values():
    """Verify ReservationStatus enum values match database enum"""
    assert ReservationStatus.active.value == "Active"
    assert ReservationStatus.released.value == "Released"
    assert ReservationStatus.consumed.value == "Consumed"
    assert ReservationStatus.expired.value == "Expired"
    
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
    assert OrderStatus.pending_payment.value == "PendingPayment"
    assert OrderStatus.pending_payment == "PendingPayment"  # This works because of str inheritance

    assert FulfillmentStatus.processing.value == "Processing"
    assert FulfillmentStatus.processing == "Processing"

    assert ShipmentStatus.dispatched.value == "Dispatched"
    assert ShipmentStatus.dispatched == "Dispatched"
    
    assert ReservationStatus.active.value == "Active"
    assert ReservationStatus.active == "Active"

def test_enum_values_are_strings():
    """Ensure all enum values are proper strings (not the Python member names)"""
    # Iterate through all enum values to ensure they don't match the member names
    for status in OrderStatus:
        # The value should NOT be the same as the member name (e.g., "pending_payment")
        assert status.value != status.name
        # The value should be a properly cased string
        assert status.value[0].isupper()  # First letter should be uppercase
        
    for status in FulfillmentStatus:
        assert status.value != status.name
        assert status.value[0].isupper()
        
    for status in ShipmentStatus:
        assert status.value != status.name
        assert status.value[0].isupper()
        
    for status in ReservationStatus:
        assert status.value != status.name
        assert status.value[0].isupper()

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
