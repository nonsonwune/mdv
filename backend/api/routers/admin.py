from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Literal, Optional

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
)
from mdv.utils import audit, parse_actor_id
from ..deps import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/orders", dependencies=[Depends(require_roles(*ALL_STAFF))])
async def admin_list_orders(status: str | None = None, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    stmt = select(Order).limit(page_size).offset((page - 1) * page_size)
    count_stmt = select(func.count()).select_from(Order)
    if status:
        stmt = stmt.where(Order.status == status)
        count_stmt = count_stmt.where(Order.status == status)
    items = (await db.execute(stmt.order_by(Order.id.desc()))).scalars().all()
    total = (await db.execute(count_stmt)).scalar_one()
    return {"items": [{"id": o.id, "status": o.status.value if hasattr(o.status, 'value') else o.status, "total": (o.totals or {}).get("total") } for o in items], "total": total}


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

