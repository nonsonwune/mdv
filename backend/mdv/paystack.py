from __future__ import annotations

import hmac
import hashlib
from typing import Any
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import and_, select

from .config import settings
from .db import session_scope
from .models import Order, OrderStatus, OrderItem, Fulfillment, FulfillmentStatus, Inventory, StockLedger, Reservation, ReservationStatus, CartItem


def verify_signature(raw_body: bytes, signature_header: str | None) -> None:
    if not signature_header:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing signature")
    computed = hmac.new(settings.paystack_secret_key.encode(), raw_body, hashlib.sha512).hexdigest()
    if not hmac.compare_digest(computed, signature_header):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")


async def handle_paystack_event(event: dict[str, Any]) -> None:
    kind = event.get("event")
    data = event.get("data", {})
    reference = data.get("reference") or data.get("ref")
    if not reference:
        return

    if kind in ("charge.success", "transfer.success", "paymentrequest.success"):
        async with session_scope() as db:
            order = (await db.execute(select(Order).where(Order.payment_ref == reference))).scalar_one_or_none()
            if not order:
                return
            if order.status in (OrderStatus.paid, OrderStatus.refunded, OrderStatus.cancelled):
                return  # idempotent
            order.status = OrderStatus.paid

            # Create fulfillment if missing
            ful = (await db.execute(select(Fulfillment).where(Fulfillment.order_id == order.id))).scalar_one_or_none()
            if not ful:
                ful = Fulfillment(order_id=order.id, status=FulfillmentStatus.processing)
                db.add(ful)

            # Reduce inventory and ledger entries
            items = (await db.execute(select(OrderItem).where(OrderItem.order_id == order.id))).scalars().all()
            for it in items:
                inv = (await db.execute(select(Inventory).where(Inventory.variant_id == it.variant_id))).scalar_one_or_none()
                if inv:
                    inv.quantity = max(0, inv.quantity - it.qty)
                db.add(StockLedger(variant_id=it.variant_id, delta=-it.qty, reason="order_paid", ref_type="order", ref_id=order.id))
                # consume reservations for this cart/variant
                await db.execute(
                    Reservation.__table__.update()
                    .where(and_(Reservation.variant_id == it.variant_id, Reservation.cart_id == order.cart_id, Reservation.status == ReservationStatus.active))
                    .values(status=ReservationStatus.consumed)
                )
            
            # Clear cart items after successful payment
            if order.cart_id:
                await db.execute(
                    CartItem.__table__.delete()
                    .where(CartItem.cart_id == order.cart_id)
                )

    elif kind in ("charge.failed", "transfer.failed"):
        # Release reservations on failure
        async with session_scope() as db:
            order = (await db.execute(select(Order).where(Order.payment_ref == reference))).scalar_one_or_none()
            if not order:
                return
            await db.execute(
                Reservation.__table__.update()
                .where(and_(Reservation.cart_id == order.cart_id, Reservation.status == ReservationStatus.active))
                .values(status=ReservationStatus.released)
            )

