"""Inventory management endpoints for admin users."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import and_, or_, func, select, update, insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from mdv.models import (
    Inventory, Variant, Product, StockLedger, Role
)
from mdv.db import get_async_db
from mdv.auth import get_current_claims
from mdv.rbac import require_permission, Permission

router = APIRouter(prefix="/admin/inventory", tags=["Admin - Inventory"])


# Pydantic models
class InventoryItem(BaseModel):
    """Inventory item response model."""
    id: int = Field(description="Variant ID")
    variant_id: int
    product_title: str
    sku: str
    size: Optional[str] = None
    color: Optional[str] = None
    price: float
    quantity: int
    safety_stock: int
    status: str
    
    class Config:
        from_attributes = True


class LowStockItem(BaseModel):
    """Low stock alert item."""
    variant_id: int
    product_id: int
    product_title: str
    sku: str
    size: Optional[str] = None
    color: Optional[str] = None
    current_quantity: int
    safety_stock: int
    shortage: int


class StockAdjustmentItem(BaseModel):
    """Stock adjustment request item."""
    variant_id: int
    delta: int
    safety_stock: Optional[int] = None


class StockAdjustmentRequest(BaseModel):
    """Bulk stock adjustment request."""
    adjustments: List[StockAdjustmentItem]
    reason: str
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None


class InventoryListResponse(BaseModel):
    """Inventory list response with pagination."""
    items: List[InventoryItem]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("", response_model=InventoryListResponse)
async def list_inventory(
    search: Optional[str] = Query(None, description="Search by product title or SKU"),
    status: Optional[str] = Query(None, description="Filter by status: in_stock, low_stock, out_of_stock"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
    _: dict = Depends(require_permission(Permission.VIEW_INVENTORY))
):
    """List inventory items with search and filtering."""
    # Build base query with joins
    query = (
        select(Inventory, Variant, Product)
        .join(Variant, Inventory.variant_id == Variant.id)
        .join(Product, Variant.product_id == Product.id)
    )
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Product.title.ilike(search_term),
                Variant.sku.ilike(search_term)
            )
        )
    
    # Apply status filter
    if status:
        if status == "out_of_stock":
            query = query.where(Inventory.quantity == 0)
        elif status == "low_stock":
            query = query.where(
                and_(
                    Inventory.quantity > 0,
                    Inventory.quantity <= Inventory.safety_stock
                )
            )
        elif status == "in_stock":
            query = query.where(Inventory.quantity > Inventory.safety_stock)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    result = await db.execute(count_query)
    total = result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    rows = result.all()
    
    # Format response
    items = []
    for inventory, variant, product in rows:
        # Determine status
        if inventory.quantity == 0:
            status_str = "out_of_stock"
        elif inventory.quantity <= inventory.safety_stock:
            status_str = "low_stock"
        else:
            status_str = "in_stock"
        
        items.append(InventoryItem(
            id=variant.id,
            variant_id=variant.id,
            product_title=product.title,
            sku=variant.sku,
            size=variant.size,
            color=variant.color,
            price=float(variant.price),
            quantity=inventory.quantity,
            safety_stock=inventory.safety_stock,
            status=status_str
        ))
    
    total_pages = (total + page_size - 1) // page_size
    
    return InventoryListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/low-stock", response_model=List[LowStockItem])
async def get_low_stock_items(
    db: AsyncSession = Depends(get_async_db),
    _: dict = Depends(require_permission(Permission.VIEW_INVENTORY))
):
    """Get items that are at or below safety stock levels."""
    query = (
        select(Inventory, Variant, Product)
        .join(Variant, Inventory.variant_id == Variant.id)
        .join(Product, Variant.product_id == Product.id)
        .where(Inventory.quantity <= Inventory.safety_stock)
        .order_by((Inventory.safety_stock - Inventory.quantity).desc())
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    items = []
    for inventory, variant, product in rows:
        shortage = max(0, inventory.safety_stock - inventory.quantity)
        items.append(LowStockItem(
            variant_id=variant.id,
            product_id=product.id,
            product_title=product.title,
            sku=variant.sku,
            size=variant.size,
            color=variant.color,
            current_quantity=inventory.quantity,
            safety_stock=inventory.safety_stock,
            shortage=shortage
        ))
    
    return items


@router.post("/adjust", dependencies=[Depends(require_permission(Permission.INVENTORY_ADJUST))])
async def adjust_stock(
    request: StockAdjustmentRequest,
    db: AsyncSession = Depends(get_async_db),
):
    """Adjust stock levels for multiple items."""
    # claims already validated for permission via dependency
    # In tests we don't use user_id here
    
    # Process each adjustment
    for adjustment in request.adjustments:
        # Update inventory
        stmt = (
            update(Inventory)
            .where(Inventory.variant_id == adjustment.variant_id)
            .values(quantity=Inventory.quantity + adjustment.delta)
        )
        
        # Update safety stock if provided
        if adjustment.safety_stock is not None:
            stmt = stmt.values(safety_stock=adjustment.safety_stock)
        
        await db.execute(stmt)
        
        # Create stock ledger entry
        await db.execute(
            insert(StockLedger).values(
                variant_id=adjustment.variant_id,
                delta=adjustment.delta,
                reason=request.reason,
                ref_type=request.reference_type,
                ref_id=request.reference_id
            )
        )
    
    await db.commit()
    
    return {"status": "success", "message": f"Adjusted stock for {len(request.adjustments)} items"}


@router.post("/sync")
async def sync_inventory(
    db: AsyncSession = Depends(get_async_db),
    _: dict = Depends(require_permission(Permission.INVENTORY_SYNC))
):
    """Sync inventory levels - ensure all variants have inventory records."""
    # Get all variant IDs that don't have inventory records
    subquery = select(Inventory.variant_id)
    query = (
        select(Variant.id)
        .where(Variant.id.notin_(subquery))
    )
    
    result = await db.execute(query)
    variant_ids = [row[0] for row in result.all()]
    
    # Create inventory records for missing variants
    if variant_ids:
        for variant_id in variant_ids:
            await db.execute(
                insert(Inventory).values(
                    variant_id=variant_id,
                    quantity=0,
                    safety_stock=5  # Default safety stock
                )
            )
        await db.commit()
    
    return {
        "status": "success",
        "message": f"Created inventory records for {len(variant_ids)} variants",
        "created": len(variant_ids)
    }
