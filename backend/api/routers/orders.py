"""
Customer-facing order management endpoints.
"""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from datetime import datetime

from mdv.auth import get_current_claims
from mdv.models import (
    Order, OrderItem, OrderStatus, Address,
    Fulfillment, FulfillmentStatus, FulfillmentItem,
    Shipment, ShipmentStatus, ShipmentEvent,
    Variant, Product, Cart, CartItem, Return
)
from ..deps import get_db

router = APIRouter(prefix="/api/orders", tags=["orders"])


# Schemas
class OrderItemResponse(BaseModel):
    id: int
    variant_id: int
    product_name: Optional[str] = None
    variant_sku: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    qty: int
    unit_price: float
    subtotal: float
    on_sale: bool = False

class AddressResponse(BaseModel):
    name: str
    phone: str
    state: str
    city: str
    street: str

class OrderResponse(BaseModel):
    id: int
    status: str
    totals: Optional[dict] = None
    created_at: datetime
    items: List[OrderItemResponse] = []
    shipping_address: Optional[AddressResponse] = None
    tracking_available: bool = False
    can_cancel: bool = False
    can_return: bool = False

class OrderListItem(BaseModel):
    id: int
    status: str
    total: Optional[float] = None
    item_count: int
    created_at: datetime

class ReturnRequest(BaseModel):
    reason: str
    items: List[dict]  # [{"order_item_id": 1, "qty": 1}]

class ReorderRequest(BaseModel):
    order_id: int


# Get user's orders
@router.get("", response_model=List[OrderListItem])
async def get_user_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Get all orders for the current user."""
    user_id = int(claims["sub"])
    
    # Build query
    query = select(Order).where(Order.user_id == user_id)
    
    if status:
        try:
            order_status = OrderStatus(status)
            query = query.where(Order.status == order_status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid order status")
    
    query = query.order_by(Order.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query.options(selectinload(Order.items)))
    orders = result.scalars().all()
    
    # Format response
    order_list = []
    for order in orders:
        item_count = sum(item.qty for item in order.items) if order.items else 0
        total = order.totals.get("total") if order.totals else None
        
        order_list.append(OrderListItem(
            id=order.id,
            status=order.status.value,
            total=total,
            item_count=item_count,
            created_at=order.created_at
        ))
    
    return order_list


# Get specific order details
@router.get("/{order_id}", response_model=OrderResponse)
async def get_order_details(
    order_id: int,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about a specific order."""
    user_id = int(claims["sub"])
    
    # Get order with related data
    result = await db.execute(
        select(Order)
        .where(and_(Order.id == order_id, Order.user_id == user_id))
        .options(
            selectinload(Order.items),
            selectinload(Order.address),
            selectinload(Order.fulfillment)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get product details for items
    items_response = []
    for item in order.items:
        # Get variant and product info
        variant = await db.get(Variant, item.variant_id)
        if variant:
            product_result = await db.execute(
                select(Product).where(Product.id == variant.product_id)
            )
            product = product_result.scalar_one_or_none()
            
            items_response.append(OrderItemResponse(
                id=item.id,
                variant_id=item.variant_id,
                product_name=product.title if product else None,
                variant_sku=variant.sku,
                size=variant.size,
                color=variant.color,
                qty=item.qty,
                unit_price=float(item.unit_price),
                subtotal=float(item.unit_price * item.qty),
                on_sale=item.on_sale
            ))
    
    # Format address
    address_response = None
    if order.address:
        address_response = AddressResponse(
            name=order.address.name,
            phone=order.address.phone,
            state=order.address.state,
            city=order.address.city,
            street=order.address.street
        )
    
    # Determine capabilities
    can_cancel = order.status == OrderStatus.pending_payment
    can_return = order.status == OrderStatus.paid and order.fulfillment and order.fulfillment.status == FulfillmentStatus.ready_to_ship
    tracking_available = order.status in [OrderStatus.paid, OrderStatus.refunded]
    
    return OrderResponse(
        id=order.id,
        status=order.status.value,
        totals=order.totals,
        created_at=order.created_at,
        items=items_response,
        shipping_address=address_response,
        tracking_available=tracking_available,
        can_cancel=can_cancel,
        can_return=can_return
    )


# Cancel order (customer-facing)
@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Cancel an order (only if pending payment)."""
    user_id = int(claims["sub"])
    
    # Get order
    result = await db.execute(
        select(Order).where(and_(Order.id == order_id, Order.user_id == user_id))
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != OrderStatus.pending_payment:
        raise HTTPException(
            status_code=400,
            detail="Order can only be cancelled if payment is pending"
        )
    
    # Update order status
    order.status = OrderStatus.cancelled
    await db.commit()
    
    return {"message": "Order cancelled successfully", "order_id": order_id}


# Request return
@router.post("/{order_id}/return", response_model=dict)
async def request_return(
    order_id: int,
    return_request: ReturnRequest,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Request a return for an order."""
    user_id = int(claims["sub"])
    
    # Get order
    result = await db.execute(
        select(Order)
        .where(and_(Order.id == order_id, Order.user_id == user_id))
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != OrderStatus.paid:
        raise HTTPException(
            status_code=400,
            detail="Returns can only be requested for paid orders"
        )
    
    # Check if return already exists
    existing_return = await db.execute(
        select(Return).where(Return.order_id == order_id)
    )
    if existing_return.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Return already requested for this order")
    
    # Create return request
    return_obj = Return(
        order_id=order_id,
        status="Requested",
        reason=return_request.reason
    )
    db.add(return_obj)
    await db.commit()
    
    return {
        "message": "Return requested successfully",
        "return_id": return_obj.id,
        "status": "Requested"
    }


# Reorder
@router.post("/reorder", response_model=dict)
async def reorder(
    reorder_request: ReorderRequest,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Create a new cart with items from a previous order."""
    user_id = int(claims["sub"])
    
    # Get original order
    result = await db.execute(
        select(Order)
        .where(and_(Order.id == reorder_request.order_id, Order.user_id == user_id))
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Create new cart
    cart = Cart()
    db.add(cart)
    await db.flush()
    
    # Add items to cart
    for order_item in order.items:
        # Check if variant still exists and has inventory
        variant = await db.get(Variant, order_item.variant_id)
        if variant:
            cart_item = CartItem(
                cart_id=cart.id,
                variant_id=order_item.variant_id,
                qty=order_item.qty
            )
            db.add(cart_item)
    
    await db.commit()
    
    return {
        "message": "Items added to cart",
        "cart_id": cart.id
    }


# Get order tracking (already exists in public.py, but add customer-specific version)
@router.get("/{order_id}/tracking")
async def get_order_tracking(
    order_id: int,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Get tracking information for an order."""
    user_id = int(claims["sub"])
    
    # Verify order belongs to user
    result = await db.execute(
        select(Order)
        .where(and_(Order.id == order_id, Order.user_id == user_id))
        .options(
            selectinload(Order.fulfillment).selectinload(Fulfillment.shipment).selectinload(Shipment.events)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Build tracking timeline
    timeline = [
        {
            "code": "order_placed",
            "at": order.created_at.isoformat(),
            "message": "Order placed"
        }
    ]
    
    if order.status == OrderStatus.paid:
        timeline.append({
            "code": "payment_confirmed",
            "at": order.created_at.isoformat(),  # Would need payment timestamp
            "message": "Payment confirmed"
        })
    
    if order.fulfillment:
        timeline.append({
            "code": "processing",
            "at": order.fulfillment.packed_at.isoformat() if order.fulfillment.packed_at else order.created_at.isoformat(),
            "message": "Order being prepared"
        })
        
        if order.fulfillment.shipment:
            shipment = order.fulfillment.shipment
            timeline.append({
                "code": "shipped",
                "at": shipment.dispatched_at.isoformat() if shipment.dispatched_at else order.created_at.isoformat(),
                "message": f"Shipped via {shipment.courier}",
                "tracking_id": shipment.tracking_id
            })
            
            # Add shipment events
            for event in shipment.events:
                timeline.append({
                    "code": event.code,
                    "at": event.occurred_at.isoformat(),
                    "message": event.message
                })
    
    return {
        "order_id": order_id,
        "status": order.status.value,
        "timeline": sorted(timeline, key=lambda x: x["at"])
    }
