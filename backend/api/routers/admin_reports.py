from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select, func, and_, cast, Date, case
from sqlalchemy.ext.asyncio import AsyncSession

from mdv.models import Order, OrderItem, Inventory, Variant, Product, User, Category
from mdv.rbac import require_permission, Permission
from ..deps import get_db
import csv
import io


router = APIRouter(prefix="/api/admin/reports", tags=["admin-reports"])


def _cutoff_from_period(period: str) -> datetime:
    now = datetime.utcnow()
    if period == "7d":
        return now - timedelta(days=7)
    if period == "90d":
        return now - timedelta(days=90)
    if period == "365d":
        return now - timedelta(days=365)
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

    # Calculate inventory value (quantity * price from variants)
    inventory_value_query = (
        select(func.coalesce(func.sum(Inventory.quantity * Variant.price), 0))
        .select_from(Inventory)
        .join(Variant, Variant.id == Inventory.variant_id)
    )
    inventory_value = (await db.execute(inventory_value_query)).scalar_one()

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
        .order_by((Inventory.safety_stock - Inventory.quantity).desc().nulls_last())
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
        "inventory_value": float(inventory_value or 0),
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



@router.get("/categories")
async def categories_report(
    period: str = Query("30d", description="Time window: 7d|30d|90d|365d (for sales metrics)"),
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.REPORT_VIEW))
):
    """Category-level statistics combining inventory and sales.

    Returns overall counts and per-category breakdown including:
    - product_count
    - variant_count
    - total_inventory_qty
    - inventory_value
    - low_stock_count (number of variants below safety stock)
    - sales_revenue (within selected period)
    - orders_count (within selected period)
    """
    cutoff = _cutoff_from_period(period)

    # Base inventory/category aggregation
    inv_query = (
        select(
            Category.id.label("category_id"),
            Category.name.label("category_name"),
            func.count(func.distinct(Product.id)).label("product_count"),
            func.count(func.distinct(Variant.id)).label("variant_count"),
            func.coalesce(func.sum(Inventory.quantity), 0).label("total_inventory_qty"),
            func.coalesce(func.sum(Inventory.quantity * Variant.price), 0).label("inventory_value"),
            func.coalesce(
                func.sum(
                    case((Inventory.quantity < Inventory.safety_stock, 1), else_=0)
                ),
                0,
            ).label("low_stock_count"),
        )
        .select_from(Category)
        .join(Product, Product.category_id == Category.id, isouter=True)
        .join(Variant, Variant.product_id == Product.id, isouter=True)
        .join(Inventory, Inventory.variant_id == Variant.id, isouter=True)
        .group_by(Category.id, Category.name)
        .order_by(Category.name)
    )

    inv_rows = (await db.execute(inv_query)).all()
    categories = []

    # Sales by category within period (use ON-clause filter to preserve categories without sales)
    sales_query = (
        select(
            Category.id.label("category_id"),
            func.coalesce(func.sum(OrderItem.unit_price * OrderItem.qty), 0).label("sales_revenue"),
            func.count(func.distinct(Order.id)).label("orders_count"),
        )
        .select_from(Category)
        .join(Product, Product.category_id == Category.id, isouter=True)
        .join(Variant, Variant.product_id == Product.id, isouter=True)
        .join(OrderItem, OrderItem.variant_id == Variant.id, isouter=True)
        .join(
            Order,
            and_(Order.id == OrderItem.order_id, Order.created_at >= cutoff),
            isouter=True,
        )
        .group_by(Category.id)
    )
    sales_rows = (await db.execute(sales_query)).all()
    sales_map = {row.category_id: row for row in sales_rows}

    # Build response
    total_products = 0
    total_variants = 0
    total_qty = 0
    total_value = 0.0
    total_low_stock = 0
    total_sales_revenue = 0.0
    total_orders = 0

    for r in inv_rows:
        sr = sales_map.get(r.category_id)
        sales_revenue = float((sr.sales_revenue if sr else 0) or 0)
        orders_count = int((sr.orders_count if sr else 0) or 0)

        categories.append(
            {
                "id": r.category_id,
                "name": r.category_name,
                "product_count": int(r.product_count or 0),
                "variant_count": int(r.variant_count or 0),
                "total_inventory_qty": int(r.total_inventory_qty or 0),
                "inventory_value": float(r.inventory_value or 0),
                "low_stock_count": int(r.low_stock_count or 0),
                "sales_revenue": sales_revenue,
                "orders_count": orders_count,
            }
        )

        total_products += int(r.product_count or 0)
        total_variants += int(r.variant_count or 0)
        total_qty += int(r.total_inventory_qty or 0)
        total_value += float(r.inventory_value or 0)
        total_low_stock += int(r.low_stock_count or 0)
        total_sales_revenue += sales_revenue
        total_orders += orders_count

    return {
        "period": period,
        "total_categories": len(inv_rows),
        "summary": {
            "product_count": total_products,
            "variant_count": total_variants,
            "total_inventory_qty": total_qty,
            "inventory_value": total_value,
            "low_stock_count": total_low_stock,
            "sales_revenue": total_sales_revenue,
            "orders_count": total_orders,
        },
        "categories": categories,
    }


@router.get("/export/categories")
async def export_categories_csv(
    period: str = Query("30d", description="Time window: 7d|30d|90d|365d"),
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.REPORT_EXPORT)),
):
    """Export Categories Report as CSV.

    Returns a JSON string containing CSV content so that the frontend typed API client
    (which expects JSON) can parse it and download as a CSV file.
    """
    # Reuse existing computation to ensure parity with the JSON report
    data = await categories_report(period=period, db=db, claims=claims)

    output = io.StringIO()
    writer = csv.writer(output)

    # Header row
    writer.writerow([
        "Category ID",
        "Category Name",
        "Products",
        "Variants",
        "Inventory Qty",
        "Inventory Value",
        "Low Stock",
        "Sales Revenue",
        "Orders",
    ])

    for cat in data.get("categories", []):
        writer.writerow([
            cat.get("id", ""),
            cat.get("name", ""),
            int(cat.get("product_count", 0) or 0),
            int(cat.get("variant_count", 0) or 0),
            int(cat.get("total_inventory_qty", 0) or 0),
            float(cat.get("inventory_value", 0.0) or 0.0),
            int(cat.get("low_stock_count", 0) or 0),
            float(cat.get("sales_revenue", 0.0) or 0.0),
            int(cat.get("orders_count", 0) or 0),
        ])

    csv_text = output.getvalue()
    output.close()

    # Return as JSON string (not text/csv) for compatibility with frontend api() helper
    return JSONResponse(content=csv_text)
