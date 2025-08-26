from __future__ import annotations

import hmac
import hashlib
from typing import Any
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import and_, select

from .config import settings
from .db import session_scope
from .models import (
    Order, OrderStatus, OrderItem, Fulfillment, FulfillmentStatus, 
    Inventory, StockLedger, Reservation, ReservationStatus, CartItem,
    Address, Product, Variant, User
)
from .emailer import send_email
from .email_templates import order_confirmation_email


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
    
    print(f"[WEBHOOK] Received event: {kind}, reference: {reference}")
    
    if not reference:
        print(f"[WEBHOOK] No reference found in event: {event}")
        return

    if kind in ("charge.success", "transfer.success", "paymentrequest.success"):
        async with session_scope() as db:
            order = (await db.execute(select(Order).where(Order.payment_ref == reference))).scalar_one_or_none()
            if not order:
                print(f"[WEBHOOK] No order found with reference: {reference}")
                return
            
            print(f"[WEBHOOK] Found order {order.id}, current status: {order.status}")
            
            if order.status in (OrderStatus.paid, OrderStatus.refunded, OrderStatus.cancelled):
                print(f"[WEBHOOK] Order {order.id} already processed (status: {order.status})")
                return  # idempotent
            
            print(f"[WEBHOOK] Updating order {order.id} from {order.status} to Paid")
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
            
            # Send order confirmation email
            try:
                # Get order details for email
                address = (await db.execute(select(Address).where(Address.order_id == order.id))).scalar_one_or_none()
                user = None
                if order.user_id:
                    user = (await db.execute(select(User).where(User.id == order.user_id))).scalar_one_or_none()
                
                # Build items data for email
                email_items = []
                for item in items:
                    variant = (await db.execute(select(Variant).where(Variant.id == item.variant_id))).scalar_one()
                    product = (await db.execute(select(Product).where(Product.id == variant.product_id))).scalar_one()
                    
                    variant_desc = []
                    if variant.size:
                        variant_desc.append(f"Size: {variant.size}")
                    if variant.color:
                        variant_desc.append(f"Color: {variant.color}")
                    
                    email_items.append({
                        "title": product.title,
                        "variant": " | ".join(variant_desc),
                        "qty": item.qty,
                        "price": float(item.unit_price),
                        "subtotal": float(item.unit_price * item.qty)
                    })
                
                # Prepare email data
                email_data = {
                    "id": order.id,
                    "customer_name": address.name if address else "Customer",
                    "email": data.get("customer", {}).get("email", "") or (user.email if user else ""),
                    "items": email_items,
                    "totals": order.totals or {},
                    "address": {
                        "name": address.name if address else "",
                        "street": address.street if address else "",
                        "city": address.city if address else "",
                        "state": address.state if address else "",
                        "phone": address.phone if address else ""
                    },
                    "created_at": datetime.now().strftime("%B %d, %Y at %I:%M %p"),
                    "app_url": settings.app_url
                }
                
                # Generate and send email
                if email_data["email"]:
                    subject, html = order_confirmation_email(email_data)
                    await send_email(
                        to_email=email_data["email"],
                        subject=subject,
                        html=html
                    )
            except Exception as e:
                # Log error but don't fail the payment processing
                print(f"Failed to send order confirmation email: {e}")

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

