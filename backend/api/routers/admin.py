from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select, distinct
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import Literal, Optional
from decimal import Decimal

from mdv.auth import require_roles
from mdv.rbac import ALL_STAFF, FULFILLMENT_STAFF, LOGISTICS_STAFF, SUPERVISORS
from mdv.models import (
    Order,
    OrderStatus,
    Fulfillment,
    FulfillmentStatus,
    Shipment,
    ShipmentStatus,
    ShipmentEvent,
    Refund,
    User,
)
from mdv.utils import audit, parse_actor_id
from ..deps import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/orders", dependencies=[Depends(require_roles(*ALL_STAFF))])
async def admin_list_orders(status: str | None = None, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Order)
        .limit(page_size)
        .offset((page - 1) * page_size)
        .order_by(Order.id.desc())
        .options(
            selectinload(Order.items),
            selectinload(Order.address),
            selectinload(Order.user),
        )
    )
    count_stmt = select(func.count()).select_from(Order)
    if status:
        stmt = stmt.where(Order.status == status)
        count_stmt = count_stmt.where(Order.status == status)
    items = (await db.execute(stmt)).scalars().all()
    total = (await db.execute(count_stmt)).scalar_one()
    total_pages = (total + page_size - 1) // page_size

    def _status_value(s):
        return s.value if hasattr(s, "value") else s

    response_items = []
    for o in items:
        total_amount = (o.totals or {}).get("total")
        try:
            total_value = float(total_amount) if total_amount is not None else None
        except Exception:
            total_value = None
        item_count = sum(i.qty for i in (o.items or []))
        user_obj = {"name": o.user.name, "email": o.user.email} if getattr(o, "user", None) else None
        addr = getattr(o, "address", None)
        shipping_address = (
            {"name": addr.name, "city": addr.city, "state": addr.state} if addr else None
        )
        response_items.append(
            {
                "id": o.id,
                "status": _status_value(o.status),
                "total": total_value,
                "item_count": item_count,
                "created_at": o.created_at,
                "user": user_obj,
                "shipping_address": shipping_address,
            }
        )
    return {
        "items": response_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.post("/fulfillments/{fid}/ready")
async def set_ready_to_ship(fid: int, db: AsyncSession = Depends(get_db), claims=Depends(require_roles(*FULFILLMENT_STAFF))):
    actor_id = parse_actor_id(claims)
    ful = (await db.execute(select(Fulfillment).where(Fulfillment.id == fid))).scalar_one_or_none()
    if not ful:
        raise HTTPException(status_code=404, detail="Fulfillment not found")
    if ful.status != FulfillmentStatus.processing.value:
        raise HTTPException(status_code=409, detail="Fulfillment not in Processing")
    # Ensure order is paid
    order = (await db.execute(select(Order).where(Order.id == ful.order_id))).scalar_one()
    if order.status != OrderStatus.paid.value:
        raise HTTPException(status_code=409, detail="Order not Paid")
    before = {"status": ful.status.value}
    ful.status = FulfillmentStatus.ready_to_ship.value
    ful.packed_by = actor_id
    ful.packed_at = datetime.now(timezone.utc)
    await audit(db, actor_id, "fulfillment.ready", "Fulfillment", ful.id, before=before, after={"status": ful.status.value})
    await db.commit()
    return {"id": ful.id, "status": ful.status.value, "packed_by": ful.packed_by, "packed_at": ful.packed_at}


@router.post("/shipments")
async def create_shipment(fulfillment_id: int, courier: str, tracking_id: str, db: AsyncSession = Depends(get_db), claims=Depends(require_roles(*LOGISTICS_STAFF))):
    actor_id = parse_actor_id(claims)
    ful = (await db.execute(select(Fulfillment).where(Fulfillment.id == fulfillment_id))).scalar_one_or_none()
    if not ful:
        raise HTTPException(status_code=404, detail="Fulfillment not found")
    if ful.status != FulfillmentStatus.ready_to_ship.value:
        raise HTTPException(status_code=409, detail="Fulfillment not ReadyToShip")
    if not tracking_id:
        raise HTTPException(status_code=400, detail="tracking_id required")
    # Create shipment
    shp = Shipment(fulfillment_id=ful.id, courier=courier, tracking_id=tracking_id, status=ShipmentStatus.dispatched.value, dispatched_at=datetime.now(timezone.utc))
    db.add(shp)
    await db.flush()
    db.add(ShipmentEvent(shipment_id=shp.id, code="Dispatched", message="Shipment dispatched", occurred_at=datetime.now(timezone.utc), meta={"tracking_id": tracking_id}))
    await audit(db, actor_id, "shipment.create", "Shipment", shp.id, before=None, after={"status": shp.status.value})
    await db.commit()
    return {"id": shp.id, "status": shp.status.value, "tracking_id": shp.tracking_id}


ALLOWED_TRANSITIONS = {
    ShipmentStatus.dispatched: {ShipmentStatus.in_transit},
    ShipmentStatus.in_transit: {ShipmentStatus.delivered, ShipmentStatus.returned},
    ShipmentStatus.delivered: set(),
    ShipmentStatus.returned: set(),
}


@router.post("/shipments/{sid}/status")
async def update_shipment_status(sid: int, status: ShipmentStatus, db: AsyncSession = Depends(get_db), claims=Depends(require_roles(*LOGISTICS_STAFF))):
    actor_id = parse_actor_id(claims)
    shp = (await db.execute(select(Shipment).where(Shipment.id == sid))).scalar_one_or_none()
    if not shp:
        raise HTTPException(status_code=404, detail="Shipment not found")
    if status not in ALLOWED_TRANSITIONS.get(shp.status, set()):
        raise HTTPException(status_code=409, detail="Invalid transition")
    before = {"status": shp.status.value}
    shp.status = status.value
    code = status.value
    db.add(ShipmentEvent(shipment_id=shp.id, code=code, message=f"{code}", occurred_at=datetime.now(timezone.utc)))
    await audit(db, actor_id, "shipment.status", "Shipment", shp.id, before=before, after={"status": shp.status.value})
    await db.commit()
    return {"id": shp.id, "status": shp.status.value}


@router.post("/orders/{oid}/cancel")
async def cancel_order(oid: int, db: AsyncSession = Depends(get_db), claims=Depends(require_roles(*SUPERVISORS))):
    actor_id = parse_actor_id(claims)
    order = (await db.execute(select(Order).where(Order.id == oid))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.paid.value:
        raise HTTPException(status_code=409, detail="Only Paid orders can be cancelled pre-ship")
    # ensure no shipment exists
    ful = (await db.execute(select(Fulfillment).where(Fulfillment.order_id == order.id))).scalar_one_or_none()
    if ful:
        shp = (await db.execute(select(Shipment).where(Shipment.fulfillment_id == ful.id))).scalar_one_or_none()
        if shp:
            raise HTTPException(status_code=409, detail="Cannot cancel: shipment exists")
    before = {"status": order.status.value}
    order.status = OrderStatus.cancelled.value
    await audit(db, actor_id, "order.cancel", "Order", order.id, before=before, after={"status": order.status.value})
    await db.commit()
    return {"id": order.id, "status": order.status.value}


class RefundRequest(BaseModel):
    amount: float
    reason: Optional[str] = None
    method: Literal["paystack", "manual"] = "paystack"
    manual_ref: Optional[str] = None


@router.post("/orders/{oid}/refund")
async def refund_order(oid: int, body: RefundRequest, db: AsyncSession = Depends(get_db), claims=Depends(require_roles(*SUPERVISORS))):
    actor_id = parse_actor_id(claims)
    order = (await db.execute(select(Order).where(Order.id == oid))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be > 0")
    ref = Refund(order_id=order.id, amount=body.amount, reason=body.reason or "", created_by=actor_id, refund_method=body.method, manual_ref=body.manual_ref)
    db.add(ref)
    await audit(db, actor_id, "order.refund", "Order", order.id, before=None, after={"refund": body.amount, "reason": body.reason, "method": body.method})
    await db.commit()
    return {"id": order.id, "refunded": body.amount, "reason": body.reason, "method": body.method}


@router.get("/stats", dependencies=[Depends(require_roles(*ALL_STAFF))])
async def get_admin_stats(db: AsyncSession = Depends(get_db)):
    """Get dashboard statistics for the admin panel"""
    # Get total orders count
    total_orders_result = await db.execute(select(func.count(Order.id)))
    total_orders = total_orders_result.scalar_one()
    
    # Get total revenue (sum of all order totals)
    # First get all orders with totals
    orders_with_totals = await db.execute(select(Order.totals).where(Order.totals.isnot(None)))
    total_revenue = Decimal("0")
    for (totals,) in orders_with_totals:
        if totals and isinstance(totals, dict) and "total" in totals:
            try:
                # Convert to Decimal for accurate money calculations
                amount = Decimal(str(totals["total"]))
                total_revenue += amount
            except (ValueError, TypeError):
                pass
    
    # Get unique customer count
    customer_count_result = await db.execute(
        select(func.count(distinct(Order.user_id))).where(Order.user_id.isnot(None))
    )
    total_customers = customer_count_result.scalar_one() or 0
    
    # Calculate average order value
    average_order_value = float(total_revenue / total_orders) if total_orders > 0 else 0.0
    
    # Get stats for the last 30 days
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    # Orders in last 30 days
    recent_orders_result = await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= thirty_days_ago)
    )
    recent_orders = recent_orders_result.scalar_one()
    
    # Revenue in last 30 days
    recent_orders_with_totals = await db.execute(
        select(Order.totals).where(
            and_(
                Order.totals.isnot(None),
                Order.created_at >= thirty_days_ago
            )
        )
    )
    recent_revenue = Decimal("0")
    for (totals,) in recent_orders_with_totals:
        if totals and isinstance(totals, dict) and "total" in totals:
            try:
                amount = Decimal(str(totals["total"]))
                recent_revenue += amount
            except (ValueError, TypeError):
                pass
    
    return {
        "total_orders": total_orders,
        "total_revenue": float(total_revenue),
        "total_customers": total_customers,
        "average_order_value": round(average_order_value, 2),
        "recent_orders": recent_orders,
        "recent_revenue": float(recent_revenue),
        "period_days": 30
    }

