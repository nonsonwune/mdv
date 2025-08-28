from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func, and_, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from mdv.models import Order, OrderItem, Inventory, Variant, Product, User
from mdv.rbac import require_permission, Permission
from ..deps import get_db


router = APIRouter(prefix="/api/admin/reports", tags=["admin-reports"])


def _cutoff_from_period(period: str) -> datetime:
    now = datetime.utcnow()
    if period == "7d":
        return now - timedelta(days=7)
    if period == "90d":
        return now - timedelta(days=90)
    # default 30d
    return now - timedelta(days=30)


@router.get("/sales")
async def sales_report(
    period: str = Query("30d", description="Time window: 7d|30d|90d"),
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.REPORT_VIEW))
):
    cutoff = _cutoff_from_period(period)

    # Orders count in period
    total_orders = (
        await db.execute(
            select(func.count(Order.id)).where(Order.created_at >= cutoff)
        )
    ).scalar_one()

    # Revenue = sum of order items (unit_price * qty) for orders in period
    revenue_query = (
        select(func.coalesce(func.sum(OrderItem.unit_price * OrderItem.qty), 0))
        .select_from(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .where(Order.created_at >= cutoff)
    )
    total_revenue = (await db.execute(revenue_query)).scalar_one()

    # Daily buckets
    daily_query = (
        select(
            cast(Order.created_at, Date).label("day"),
            func.count(Order.id).label("orders"),
            func.coalesce(func.sum(OrderItem.unit_price * OrderItem.qty), 0).label("revenue"),
        )
        .select_from(Order)
        .join(OrderItem, OrderItem.order_id == Order.id, isouter=True)
        .where(Order.created_at >= cutoff)
        .group_by(cast(Order.created_at, Date))
        .order_by(cast(Order.created_at, Date))
    )
    daily_rows = (await db.execute(daily_query)).all()
    daily = [
        {"date": str(row.day), "orders": int(row.orders or 0), "revenue": float(row.revenue or 0)}
        for row in daily_rows
    ]

    return {
        "period": period,
        "total_orders": int(total_orders or 0),
        "total_revenue": float(total_revenue or 0),
        "daily": daily,
    }


@router.get("/inventory")
async def inventory_report(
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.REPORT_VIEW))
):
    # Total SKUs
    total_skus = (await db.execute(select(func.count(Variant.id)))).scalar_one()

    # Total quantity
    total_qty = (
        await db.execute(select(func.coalesce(func.sum(Inventory.quantity), 0)))
    ).scalar_one()

    # Low stock count
    low_stock_count = (
        await db.execute(
            select(func.count(Inventory.variant_id)).where(
                Inventory.quantity < Inventory.safety_stock
            )
        )
    ).scalar_one()

    # Top 10 low stock variants with product title and shortage
    low_stock_query = (
        select(
            Variant.id,
            Variant.sku,
            Product.title,
            Inventory.quantity,
            Inventory.safety_stock,
            (Inventory.safety_stock - Inventory.quantity).label("shortage"),
        )
        .join(Inventory, Inventory.variant_id == Variant.id)
        .join(Product, Product.id == Variant.product_id)
        .where(Inventory.quantity < Inventory.safety_stock)
        .order_by(func.nulls_last((Inventory.safety_stock - Inventory.quantity).desc()))
        .limit(10)
    )
    low_rows = (await db.execute(low_stock_query)).all()
    low_stock = [
        {
            "variant_id": row.id,
            "sku": row.sku,
            "product_title": row.title,
            "quantity": int(row.quantity or 0),
            "safety_stock": int(row.safety_stock or 0),
            "shortage": int(row.shortage or 0),
        }
        for row in low_rows
    ]

    return {
        "total_skus": int(total_skus or 0),
        "total_quantity": int(total_qty or 0),
        "low_stock_count": int(low_stock_count or 0),
        "low_stock": low_stock,
    }


@router.get("/customers")
async def customers_report(
    period: str = Query("30d", description="Time window: 7d|30d|90d"),
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.REPORT_VIEW))
):
    cutoff = _cutoff_from_period(period)

    # New customers in period
    new_customers = (
        await db.execute(select(func.count(User.id)).where(User.created_at >= cutoff))
    ).scalar_one()

    # Customers with orders in period
    cust_orders_query = (
        select(Order.user_id, func.count(Order.id).label("cnt"))
        .where(and_(Order.user_id.is_not(None), Order.created_at >= cutoff))
        .group_by(Order.user_id)
    )
    cust_rows = (await db.execute(cust_orders_query)).all()
    total_cust_with_orders = len(cust_rows)
    repeat_cust = sum(1 for r in cust_rows if (r.cnt or 0) > 1)
    repeat_rate = (repeat_cust / total_cust_with_orders) if total_cust_with_orders > 0 else 0.0

    # Recent customers (latest 10)
    recent_query = (
        select(User.id, User.name, User.email, User.created_at)
        .order_by(User.created_at.desc())
        .limit(10)
    )
    recent_rows = (await db.execute(recent_query)).all()
    recent = [
        {
            "id": row.id,
            "name": row.name,
            "email": row.email,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in recent_rows
    ]

    return {
        "period": period,
        "new_customers": int(new_customers or 0),
        "repeat_rate": repeat_rate,
        "recent": recent,
    }


