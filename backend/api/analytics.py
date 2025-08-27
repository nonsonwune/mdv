"""Analytics endpoints for admin users."""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import func, select, and_, or_, case
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from mdv.models import (
    Order, OrderItem, Product, Variant, Category, User, OrderStatus
)
from mdv.db import get_async_db
from mdv.rbac import require_permission, Permission

router = APIRouter(prefix="/admin/analytics", tags=["Admin - Analytics"])


class SalesMetrics(BaseModel):
    """Sales metrics for a period."""
    total_revenue: float
    total_orders: int
    average_order_value: float
    total_items_sold: int
    conversion_rate: float
    
    
class ProductPerformance(BaseModel):
    """Product performance metrics."""
    product_id: int
    product_title: str
    units_sold: int
    revenue: float
    average_price: float
    

class CategoryPerformance(BaseModel):
    """Category performance metrics."""
    category_id: Optional[int]
    category_name: str
    units_sold: int
    revenue: float
    product_count: int


class CustomerMetrics(BaseModel):
    """Customer metrics."""
    total_customers: int
    new_customers: int
    returning_customers: int
    customer_lifetime_value: float


class AnalyticsResponse(BaseModel):
    """Complete analytics response."""
    period: str
    start_date: str
    end_date: str
    sales: SalesMetrics
    top_products: list[ProductPerformance]
    category_performance: list[CategoryPerformance]
    customer_metrics: CustomerMetrics
    daily_trends: list[Dict[str, Any]]


def parse_period(period: str) -> tuple[datetime, datetime]:
    """Parse period string and return start/end dates."""
    now = datetime.utcnow()
    
    if period == "7d":
        start = now - timedelta(days=7)
    elif period == "30d":
        start = now - timedelta(days=30)
    elif period == "90d":
        start = now - timedelta(days=90)
    elif period == "1y":
        start = now - timedelta(days=365)
    else:
        # Default to last 30 days
        start = now - timedelta(days=30)
    
    return start, now


@router.get("", response_model=AnalyticsResponse)
async def get_analytics(
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, 1y"),
    db: AsyncSession = Depends(get_async_db),
    _: dict = Depends(require_permission(Permission.ANALYTICS_VIEW))
):
    """Get comprehensive analytics for the specified period."""
    start_date, end_date = parse_period(period)
    
    # Sales Metrics
    sales_query = (
        select(
            func.count(Order.id).label("total_orders"),
            func.sum(Order.totals["total"].as_float()).label("total_revenue"),
            func.avg(Order.totals["total"].as_float()).label("avg_order_value")
        )
        .where(
            and_(
                Order.created_at >= start_date,
                Order.created_at <= end_date,
                Order.status == OrderStatus.paid
            )
        )
    )
    
    sales_result = await db.execute(sales_query)
    sales_row = sales_result.one()
    
    # Items sold count
    items_query = (
        select(func.sum(OrderItem.qty))
        .join(Order)
        .where(
            and_(
                Order.created_at >= start_date,
                Order.created_at <= end_date,
                Order.status == OrderStatus.paid
            )
        )
    )
    items_result = await db.execute(items_query)
    total_items = items_result.scalar() or 0
    
    # Top Products
    top_products_query = (
        select(
            Product.id,
            Product.title,
            func.sum(OrderItem.qty).label("units_sold"),
            func.sum(OrderItem.qty * OrderItem.unit_price).label("revenue"),
            func.avg(OrderItem.unit_price).label("avg_price")
        )
        .join(Variant, OrderItem.variant_id == Variant.id)
        .join(Product, Variant.product_id == Product.id)
        .join(Order, OrderItem.order_id == Order.id)
        .where(
            and_(
                Order.created_at >= start_date,
                Order.created_at <= end_date,
                Order.status == OrderStatus.paid
            )
        )
        .group_by(Product.id, Product.title)
        .order_by(func.sum(OrderItem.qty * OrderItem.unit_price).desc())
        .limit(10)
    )
    
    top_products_result = await db.execute(top_products_query)
    top_products = [
        ProductPerformance(
            product_id=row.id,
            product_title=row.title,
            units_sold=row.units_sold,
            revenue=float(row.revenue),
            average_price=float(row.avg_price)
        )
        for row in top_products_result.all()
    ]
    
    # Category Performance
    category_query = (
        select(
            Category.id,
            Category.name,
            func.sum(OrderItem.qty).label("units_sold"),
            func.sum(OrderItem.qty * OrderItem.unit_price).label("revenue"),
            func.count(func.distinct(Product.id)).label("product_count")
        )
        .outerjoin(Product, Category.id == Product.category_id)
        .join(Variant, Product.id == Variant.product_id)
        .join(OrderItem, Variant.id == OrderItem.variant_id)
        .join(Order, OrderItem.order_id == Order.id)
        .where(
            and_(
                Order.created_at >= start_date,
                Order.created_at <= end_date,
                Order.status == OrderStatus.paid
            )
        )
        .group_by(Category.id, Category.name)
        .order_by(func.sum(OrderItem.qty * OrderItem.unit_price).desc())
    )
    
    category_result = await db.execute(category_query)
    category_performance = [
        CategoryPerformance(
            category_id=row.id,
            category_name=row.name,
            units_sold=row.units_sold or 0,
            revenue=float(row.revenue or 0),
            product_count=row.product_count or 0
        )
        for row in category_result.all()
    ]
    
    # Customer Metrics
    # Total customers who made orders in period
    customers_query = (
        select(func.count(func.distinct(Order.user_id)))
        .where(
            and_(
                Order.created_at >= start_date,
                Order.created_at <= end_date,
                Order.status == OrderStatus.paid,
                Order.user_id.isnot(None)
            )
        )
    )
    total_customers = await db.scalar(customers_query) or 0
    
    # New customers (first order in this period)
    new_customers_subquery = (
        select(Order.user_id)
        .where(
            and_(
                Order.created_at < start_date,
                Order.user_id.isnot(None)
            )
        )
        .subquery()
    )
    
    new_customers_query = (
        select(func.count(func.distinct(Order.user_id)))
        .where(
            and_(
                Order.created_at >= start_date,
                Order.created_at <= end_date,
                Order.status == OrderStatus.paid,
                Order.user_id.isnot(None),
                Order.user_id.notin_(select(new_customers_subquery))
            )
        )
    )
    new_customers = await db.scalar(new_customers_query) or 0
    
    # Daily trends
    daily_query = (
        select(
            func.date(Order.created_at).label("date"),
            func.count(Order.id).label("orders"),
            func.sum(Order.totals["total"].as_float()).label("revenue")
        )
        .where(
            and_(
                Order.created_at >= start_date,
                Order.created_at <= end_date,
                Order.status == OrderStatus.paid
            )
        )
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
    )
    
    daily_result = await db.execute(daily_query)
    daily_trends = [
        {
            "date": str(row.date),
            "orders": row.orders,
            "revenue": float(row.revenue or 0)
        }
        for row in daily_result.all()
    ]
    
    # Calculate metrics
    sales_metrics = SalesMetrics(
        total_revenue=float(sales_row.total_revenue or 0),
        total_orders=sales_row.total_orders or 0,
        average_order_value=float(sales_row.avg_order_value or 0),
        total_items_sold=total_items,
        conversion_rate=0.0  # Would need session data to calculate properly
    )
    
    customer_metrics = CustomerMetrics(
        total_customers=total_customers,
        new_customers=new_customers,
        returning_customers=total_customers - new_customers,
        customer_lifetime_value=float(sales_row.total_revenue or 0) / max(total_customers, 1)
    )
    
    return AnalyticsResponse(
        period=period,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        sales=sales_metrics,
        top_products=top_products,
        category_performance=category_performance,
        customer_metrics=customer_metrics,
        daily_trends=daily_trends
    )


@router.get("/export")
async def export_analytics(
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, 1y"),
    format: str = Query("csv", description="Export format: csv or json"),
    db: AsyncSession = Depends(get_async_db),
    _: dict = Depends(require_permission(Permission.ANALYTICS_EXPORT))
):
    """Export analytics data in CSV or JSON format."""
    # Get analytics data
    analytics = await get_analytics(period, db, _)
    
    if format == "json":
        return analytics.dict()
    
    # CSV export would require additional formatting
    # For now, return a simple message
    return {
        "message": "CSV export not yet implemented",
        "data": analytics.dict()
    }
