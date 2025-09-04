"""
Comprehensive test suite for enum default values.

This test verifies that SQLAlchemy enum defaults work correctly with enum members
(not .value) and that the database stores the correct enum values.
"""

import pytest
import asyncio
from datetime import datetime, timezone

from mdv.models import (
    Order, OrderStatus, User, Role, Reservation, ReservationStatus,
    Fulfillment, FulfillmentStatus, Shipment, ShipmentStatus,
    Refund, RefundMethod
)
from mdv.db import get_session_factory


class TestEnumDefaultsComprehensive:
    """Comprehensive test suite for enum default values."""
    
    @pytest.fixture
    async def db_session(self):
        """Create test database session."""
        Session = get_session_factory()
        async with Session() as session:
            yield session
    
    @pytest.mark.asyncio
    async def test_order_status_default(self, db_session):
        """Test that Order.status defaults to OrderStatus.pending_payment."""
        # Create order without specifying status
        order = Order(cart_id=1)
        db_session.add(order)
        await db_session.flush()
        
        # Check that default is applied correctly
        assert order.status == OrderStatus.pending_payment
        assert order.status.value == "PendingPayment"
        
        # Verify database storage
        await db_session.refresh(order)
        assert order.status == OrderStatus.pending_payment
        
        # Clean up
        await db_session.delete(order)
    
    @pytest.mark.asyncio
    async def test_user_role_default(self, db_session):
        """Test that User.role defaults to Role.customer."""
        # Create user without specifying role
        user = User(name="Test User", email="test@example.com")
        db_session.add(user)
        await db_session.flush()
        
        # Check that default is applied correctly
        assert user.role == Role.customer
        assert user.role.value == "customer"
        
        # Verify database storage
        await db_session.refresh(user)
        assert user.role == Role.customer
        
        # Clean up
        await db_session.delete(user)
    
    @pytest.mark.asyncio
    async def test_reservation_status_default(self, db_session):
        """Test that Reservation.status defaults to ReservationStatus.active."""
        # Create reservation without specifying status
        reservation = Reservation(
            cart_id=1, 
            variant_id=1, 
            qty=1, 
            expires_at=datetime.now(timezone.utc)
        )
        db_session.add(reservation)
        await db_session.flush()
        
        # Check that default is applied correctly
        assert reservation.status == ReservationStatus.active
        assert reservation.status.value == "Active"
        
        # Verify database storage
        await db_session.refresh(reservation)
        assert reservation.status == ReservationStatus.active
        
        # Clean up
        await db_session.delete(reservation)
    
    @pytest.mark.asyncio
    async def test_fulfillment_status_default(self, db_session):
        """Test that Fulfillment.status defaults to FulfillmentStatus.processing."""
        # Create fulfillment without specifying status
        fulfillment = Fulfillment(order_id=1)
        db_session.add(fulfillment)
        await db_session.flush()
        
        # Check that default is applied correctly
        assert fulfillment.status == FulfillmentStatus.processing
        assert fulfillment.status.value == "Processing"
        
        # Verify database storage
        await db_session.refresh(fulfillment)
        assert fulfillment.status == FulfillmentStatus.processing
        
        # Clean up
        await db_session.delete(fulfillment)
    
    @pytest.mark.asyncio
    async def test_shipment_status_default(self, db_session):
        """Test that Shipment.status defaults to ShipmentStatus.dispatched."""
        # Create shipment without specifying status
        shipment = Shipment(fulfillment_id=1)
        db_session.add(shipment)
        await db_session.flush()
        
        # Check that default is applied correctly
        assert shipment.status == ShipmentStatus.dispatched
        assert shipment.status.value == "Dispatched"
        
        # Verify database storage
        await db_session.refresh(shipment)
        assert shipment.status == ShipmentStatus.dispatched
        
        # Clean up
        await db_session.delete(shipment)
    
    @pytest.mark.asyncio
    async def test_refund_method_default(self, db_session):
        """Test that Refund.refund_method defaults to RefundMethod.paystack."""
        # Create refund without specifying method
        refund = Refund(order_id=1, amount=100.00)
        db_session.add(refund)
        await db_session.flush()
        
        # Check that default is applied correctly
        assert refund.refund_method == RefundMethod.paystack
        assert refund.refund_method.value == "paystack"
        
        # Verify database storage
        await db_session.refresh(refund)
        assert refund.refund_method == RefundMethod.paystack
        
        # Clean up
        await db_session.delete(refund)
    
    @pytest.mark.asyncio
    async def test_enum_member_vs_value_consistency(self, db_session):
        """Test that enum members and values are handled consistently."""
        # Test all enum types
        test_cases = [
            (Order(cart_id=1), "status", OrderStatus.pending_payment, "PendingPayment"),
            (User(name="Test", email="test@example.com"), "role", Role.customer, "customer"),
            (Reservation(cart_id=1, variant_id=1, qty=1, expires_at=datetime.now(timezone.utc)), 
             "status", ReservationStatus.active, "Active"),
            (Fulfillment(order_id=1), "status", FulfillmentStatus.processing, "Processing"),
            (Shipment(fulfillment_id=1), "status", ShipmentStatus.dispatched, "Dispatched"),
            (Refund(order_id=1, amount=100.00), "refund_method", RefundMethod.paystack, "paystack"),
        ]
        
        for model_instance, field_name, expected_enum_member, expected_value in test_cases:
            db_session.add(model_instance)
            await db_session.flush()
            
            # Check enum member
            actual_enum_member = getattr(model_instance, field_name)
            assert actual_enum_member == expected_enum_member, (
                f"{model_instance.__class__.__name__}.{field_name} should be {expected_enum_member}, "
                f"got {actual_enum_member}"
            )
            
            # Check enum value
            actual_value = actual_enum_member.value
            assert actual_value == expected_value, (
                f"{model_instance.__class__.__name__}.{field_name}.value should be {expected_value}, "
                f"got {actual_value}"
            )
            
            # Verify database storage
            await db_session.refresh(model_instance)
            refreshed_enum_member = getattr(model_instance, field_name)
            assert refreshed_enum_member == expected_enum_member
            
            # Clean up
            await db_session.delete(model_instance)
    
    @pytest.mark.asyncio
    async def test_enum_assignment_methods(self, db_session):
        """Test different ways of assigning enum values."""
        # Test assigning by enum member (recommended)
        order1 = Order(cart_id=1, status=OrderStatus.paid)
        db_session.add(order1)
        await db_session.flush()
        assert order1.status == OrderStatus.paid
        assert order1.status.value == "Paid"
        
        # Test assigning by string value (should work but not recommended)
        order2 = Order(cart_id=2, status="Cancelled")
        db_session.add(order2)
        await db_session.flush()
        assert order2.status == OrderStatus.cancelled
        assert order2.status.value == "Cancelled"
        
        # Clean up
        await db_session.delete(order1)
        await db_session.delete(order2)
    
    @pytest.mark.asyncio
    async def test_enum_validation(self, db_session):
        """Test that invalid enum values are rejected."""
        # Test invalid enum value
        with pytest.raises(ValueError):
            order = Order(cart_id=1, status="InvalidStatus")
            db_session.add(order)
            await db_session.flush()
    
    def test_enum_definitions_consistency(self):
        """Test that enum definitions are consistent."""
        # Test OrderStatus
        assert OrderStatus.pending_payment.value == "PendingPayment"
        assert OrderStatus.paid.value == "Paid"
        assert OrderStatus.cancelled.value == "Cancelled"
        assert OrderStatus.refunded.value == "Refunded"
        
        # Test Role
        assert Role.admin.value == "admin"
        assert Role.supervisor.value == "supervisor"
        assert Role.operations.value == "operations"
        assert Role.logistics.value == "logistics"
        assert Role.customer.value == "customer"
        
        # Test ReservationStatus
        assert ReservationStatus.active.value == "Active"
        assert ReservationStatus.released.value == "Released"
        assert ReservationStatus.consumed.value == "Consumed"
        assert ReservationStatus.expired.value == "Expired"
        
        # Test FulfillmentStatus
        assert FulfillmentStatus.processing.value == "Processing"
        assert FulfillmentStatus.ready_to_ship.value == "ReadyToShip"
        
        # Test ShipmentStatus
        assert ShipmentStatus.dispatched.value == "Dispatched"
        assert ShipmentStatus.in_transit.value == "InTransit"
        assert ShipmentStatus.delivered.value == "Delivered"
        assert ShipmentStatus.returned.value == "Returned"
        
        # Test RefundMethod
        assert RefundMethod.paystack.value == "paystack"
        assert RefundMethod.manual.value == "manual"
