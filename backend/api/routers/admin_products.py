"""
Admin product management endpoints with complete CRUD operations,
inventory management, and Cloudinary image upload.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from sqlalchemy import select, func, and_, or_, delete as sql_delete, update as sql_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging
import json
from decimal import Decimal

from mdv.auth import require_roles
from mdv.rbac import (
    ADMINS, SUPERVISORS, Permission,
    require_permission, require_any_permission
)
from mdv.models import (
    Product, Variant, Category, ProductImage, 
    Inventory, StockLedger, Reservation, ReservationStatus,
    AuditLog, User, OrderItem
)
from mdv.schemas.admin_products import (
    ProductCreateRequest, ProductUpdateRequest, ProductDetailResponse, ProductListResponse,
    VariantCreateRequest, VariantUpdateRequest, VariantDetailResponse,
    InventoryUpdateRequest, BulkInventoryAdjustRequest, InventorySyncRequest, LowStockAlert,
    CategoryCreateRequest, CategoryUpdateRequest, CategoryResponse,
    ImageUploadResponse, ImageResponse,
    OperationResponse, PaginatedResponse, BulkDeleteRequest
)
from mdv.cloudinary_utils import cloudinary_manager
from mdv.utils import parse_actor_id, audit
from ..deps import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin-products"])


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def log_admin_action(
    db: AsyncSession,
    actor_id: int,
    action: str,
    entity: str,
    entity_id: int,
    before: Optional[dict] = None,
    after: Optional[dict] = None
):
    """Log admin actions for audit trail (JSON-safe)."""
    # Delegate to centralized audit utility which JSON-serializes Decimals/datetimes/etc.
    await audit(db, actor_id, action, entity, entity_id, before, after)


async def get_product_with_details(db: AsyncSession, product_id: int) -> Optional[Product]:
    """Get product with all related data."""
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.variants).selectinload(Variant.inventory)
        )
        .where(Product.id == product_id)
    )
    return result.scalar_one_or_none()


async def create_stock_ledger_entry(
    db: AsyncSession,
    variant_id: int,
    delta: int,
    reason: str,
    ref_type: Optional[str] = None,
    ref_id: Optional[int] = None
):
    """Create stock ledger entry for inventory changes."""
    entry = StockLedger(
        variant_id=variant_id,
        delta=delta,
        reason=reason,
        ref_type=ref_type,
        ref_id=ref_id
    )
    db.add(entry)


# ============================================================================
# PRODUCT ENDPOINTS
# ============================================================================

@router.post("/products", response_model=ProductDetailResponse)
async def create_product(
    request: ProductCreateRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.PRODUCT_CREATE))
):
    """Create a new product with variants. Requires PRODUCT_CREATE permission."""
    actor_id = parse_actor_id(claims)
    
    try:
        # Check if slug is unique
        if request.slug:
            existing = await db.execute(
                select(Product).where(Product.slug == request.slug)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Slug already exists")
        
        # Create product
        product = Product(
            title=request.title,
            slug=request.slug or request.title.lower().replace(" ", "-"),
            description=request.description,
            compare_at_price=request.compare_at_price,
            flags=request.flags
        )
        
        # Add category if provided
        if request.category_id:
            category = await db.get(Category, request.category_id)
            if not category:
                raise HTTPException(status_code=404, detail="Category not found")
            product.category_id = request.category_id
        
        db.add(product)
        await db.flush()
        
        # Create variants with inventory
        for variant_data in request.variants:
            # Check SKU uniqueness
            existing_sku = await db.execute(
                select(Variant).where(Variant.sku == variant_data.sku)
            )
            if existing_sku.scalar_one_or_none():
                raise HTTPException(
                    status_code=400, 
                    detail=f"SKU {variant_data.sku} already exists"
                )
            
            variant = Variant(
                product_id=product.id,
                sku=variant_data.sku,
                size=variant_data.size,
                color=variant_data.color,
                price=variant_data.price
            )
            db.add(variant)
            await db.flush()
            
            # Create inventory record
            inventory = Inventory(
                variant_id=variant.id,
                quantity=variant_data.initial_quantity,
                safety_stock=variant_data.safety_stock
            )
            db.add(inventory)
            
            # Create initial stock ledger entry
            if variant_data.initial_quantity > 0:
                await create_stock_ledger_entry(
                    db, variant.id, variant_data.initial_quantity,
                    "Initial inventory", "product_creation", product.id
                )
        
        # Log action
        await log_admin_action(
            db, actor_id, "product.create", "Product", product.id,
            after={"title": product.title, "variants": len(request.variants)}
        )
        
        await db.commit()
        
        # Fetch complete product data
        product = await get_product_with_details(db, product.id)
        
        # Build response
        return await build_product_detail_response(db, product)
        
    except IntegrityError as e:
        await db.rollback()
        logger.error(f"Database error creating product: {str(e)}")
        raise HTTPException(status_code=400, detail="Database constraint violation")
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating product: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/products/{product_id}", response_model=ProductDetailResponse)
async def update_product(
    product_id: int,
    request: ProductUpdateRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.PRODUCT_EDIT))
):
    """Update product details. Requires PRODUCT_EDIT permission."""
    actor_id = parse_actor_id(claims)
    
    product = await get_product_with_details(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Capture before state
    before_state = {
        "title": product.title,
        "slug": product.slug,
        "description": product.description,
        "category_id": product.category_id
    }
    
    # Update fields
    update_data = request.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    
    # Log action
    await log_admin_action(
        db, actor_id, "product.update", "Product", product_id,
        before=before_state, after=update_data
    )
    
    await db.commit()
    await db.refresh(product)
    
    return await build_product_detail_response(db, product)


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    force: bool = Query(False, description="Force delete even with orders"),
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.PRODUCT_DELETE))
):
    """Delete a product and all its variants. Requires PRODUCT_DELETE permission."""
    actor_id = parse_actor_id(claims)
    
    product = await get_product_with_details(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check for existing orders unless forced
    if not force:
        from mdv.models import OrderItem
        order_items = await db.execute(
            select(OrderItem)
            .join(Variant)
            .where(Variant.product_id == product_id)
            .limit(1)
        )
        if order_items.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail="Product has associated orders. Use force=true to delete anyway."
            )
    
    # Delete associated images from Cloudinary
    for image in product.images:
        if hasattr(image, 'public_id') and image.public_id:
            try:
                cloudinary_manager.delete_image(image.public_id)
            except Exception as e:
                logger.warning(f"Failed to delete image from Cloudinary: {e}")
    
    # Log action
    await log_admin_action(
        db, actor_id, "product.delete", "Product", product_id,
        before={"title": product.title, "variants": len(product.variants)}
    )
    
    # Delete product (cascades to variants, inventory, images)
    await db.delete(product)
    await db.commit()
    
    return OperationResponse(
        success=True,
        message=f"Product '{product.title}' deleted successfully"
    )


@router.get("/products", response_model=PaginatedResponse)
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    low_stock_only: bool = False,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.PRODUCT_VIEW))
):
    """List products with filtering and pagination. Requires PRODUCT_VIEW permission."""
    # Base query
    query = select(Product).options(
        selectinload(Product.images),
        selectinload(Product.variants).selectinload(Variant.inventory)
    )
    
    # Apply filters
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Product.title.ilike(search_term),
                Product.slug.ilike(search_term)
            )
        )
    
    if category_id:
        query = query.where(Product.category_id == category_id)
    
    # Count total
    count_query = select(func.count()).select_from(Product)
    if search:
        count_query = count_query.where(
            or_(
                Product.title.ilike(search_term),
                Product.slug.ilike(search_term)
            )
        )
    if category_id:
        count_query = count_query.where(Product.category_id == category_id)
    
    total = (await db.execute(count_query)).scalar_one()
    
    # Pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(Product.created_at.desc())
    
    result = await db.execute(query)
    products = result.scalars().all()
    
    # Build response items
    items = []
    for product in products:
        # Calculate inventory stats
        total_inventory = 0
        low_stock_count = 0
        min_price = None
        max_price = None
        
        for variant in product.variants:
            if variant.inventory:
                total_inventory += variant.inventory.quantity
                if variant.inventory.quantity < variant.inventory.safety_stock:
                    low_stock_count += 1
            
            price = float(variant.price)
            if min_price is None or price < min_price:
                min_price = price
            if max_price is None or price > max_price:
                max_price = price
        
        # Skip if filtering for low stock only
        if low_stock_only and low_stock_count == 0:
            continue
        
        # Get primary image
        primary_image = next(
            (img for img in product.images if img.is_primary),
            product.images[0] if product.images else None
        )
        
        # Get category name
        category_name = None
        if product.category_id:
            category = await db.get(Category, product.category_id)
            if category:
                category_name = category.name
        
        items.append(ProductListResponse(
            id=product.id,
            title=product.title,
            slug=product.slug,
            category_name=category_name,
            variant_count=len(product.variants),
            total_inventory=total_inventory,
            low_stock_count=low_stock_count,
            image_url=primary_image.url if primary_image else None,
            min_price=min_price,
            max_price=max_price,
            created_at=product.created_at or datetime.now(timezone.utc)
        ))
    
    total_pages = (total + page_size - 1) // page_size
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )


@router.get("/products/{product_id}", response_model=ProductDetailResponse)
async def get_product_details(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.PRODUCT_VIEW))
):
    """Get detailed product information. Requires PRODUCT_VIEW permission."""
    product = await get_product_with_details(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return await build_product_detail_response(db, product)


# ============================================================================
# VARIANT ENDPOINTS
# ============================================================================

@router.post("/products/{product_id}/variants", response_model=VariantDetailResponse)
async def add_variant(
    product_id: int,
    request: VariantCreateRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_any_permission(Permission.PRODUCT_CREATE, Permission.PRODUCT_EDIT))
):
    """Add a new variant to a product."""
    actor_id = parse_actor_id(claims)
    
    # Check product exists
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check SKU uniqueness
    existing_sku = await db.execute(
        select(Variant).where(Variant.sku == request.sku)
    )
    if existing_sku.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"SKU {request.sku} already exists")
    
    # Create variant
    variant = Variant(
        product_id=product_id,
        sku=request.sku,
        size=request.size,
        color=request.color,
        price=request.price
    )
    db.add(variant)
    await db.flush()
    
    # Create inventory
    inventory = Inventory(
        variant_id=variant.id,
        quantity=request.initial_quantity,
        safety_stock=request.safety_stock
    )
    db.add(inventory)
    
    # Stock ledger entry
    if request.initial_quantity > 0:
        await create_stock_ledger_entry(
            db, variant.id, request.initial_quantity,
            "Initial inventory", "variant_creation", variant.id
        )
    
    # Log action
    await log_admin_action(
        db, actor_id, "variant.create", "Variant", variant.id,
        after={"sku": variant.sku, "product_id": product_id}
    )
    
    await db.commit()
    await db.refresh(variant)
    await db.refresh(inventory)
    
    return VariantDetailResponse(
        id=variant.id,
        product_id=variant.product_id,
        sku=variant.sku,
        size=variant.size,
        color=variant.color,
        price=variant.price,
        inventory=build_inventory_response(inventory)
    )


@router.put("/variants/{variant_id}", response_model=VariantDetailResponse)
async def update_variant(
    variant_id: int,
    request: VariantUpdateRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.PRODUCT_EDIT))
):
    """Update variant details."""
    actor_id = parse_actor_id(claims)
    
    # Get variant with inventory
    result = await db.execute(
        select(Variant).options(selectinload(Variant.inventory))
        .where(Variant.id == variant_id)
    )
    variant = result.scalar_one_or_none()
    
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    # Capture before state
    before_state = {
        "sku": variant.sku,
        "price": str(variant.price),
        "size": variant.size,
        "color": variant.color
    }
    
    # Check SKU uniqueness if changing
    if request.sku and request.sku != variant.sku:
        existing = await db.execute(
            select(Variant).where(Variant.sku == request.sku)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"SKU {request.sku} already exists")
    
    # Update fields
    update_data = request.dict(exclude_unset=True)
    
    # Track price change for stock ledger
    price_changed = False
    old_price = variant.price
    
    for field, value in update_data.items():
        if field == "price" and value != variant.price:
            price_changed = True
        setattr(variant, field, value)
    
    # Create stock ledger entry for price change
    if price_changed:
        await create_stock_ledger_entry(
            db, variant_id, 0,
            f"Price changed from {old_price} to {variant.price}",
            "price_update", variant_id
        )
    
    # Log action
    await log_admin_action(
        db, actor_id, "variant.update", "Variant", variant_id,
        before=before_state, after=update_data
    )
    
    await db.commit()
    await db.refresh(variant)
    
    return VariantDetailResponse(
        id=variant.id,
        product_id=variant.product_id,
        sku=variant.sku,
        size=variant.size,
        color=variant.color,
        price=variant.price,
        inventory=build_inventory_response(variant.inventory) if variant.inventory else None
    )


@router.delete("/variants/{variant_id}")
async def delete_variant(
    variant_id: int,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.PRODUCT_DELETE))
):
    """Delete a variant."""
    actor_id = parse_actor_id(claims)
    
    variant = await db.get(Variant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    # Check if it's the last variant
    variant_count = await db.execute(
        select(func.count(Variant.id))
        .where(Variant.product_id == variant.product_id)
    )
    if variant_count.scalar_one() <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the last variant. Delete the product instead."
        )
    
    # Check for orders
    from mdv.models import OrderItem
    order_items = await db.execute(
        select(OrderItem).where(OrderItem.variant_id == variant_id).limit(1)
    )
    if order_items.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Variant has associated orders and cannot be deleted"
        )
    
    # Log action
    await log_admin_action(
        db, actor_id, "variant.delete", "Variant", variant_id,
        before={"sku": variant.sku}
    )
    
    await db.delete(variant)
    await db.commit()
    
    return OperationResponse(
        success=True,
        message=f"Variant {variant.sku} deleted successfully"
    )


# ============================================================================
# INVENTORY ENDPOINTS
# ============================================================================

@router.put("/inventory/{variant_id}", response_model=OperationResponse)
async def update_inventory(
    variant_id: int,
    request: InventoryUpdateRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.INVENTORY_ADJUST))
):
    """Update inventory for a variant. Requires INVENTORY_ADJUST permission."""
    actor_id = parse_actor_id(claims)
    
    # Get or create inventory record
    inventory = await db.get(Inventory, variant_id)
    if not inventory:
        inventory = Inventory(variant_id=variant_id, quantity=0, safety_stock=0)
        db.add(inventory)
        await db.flush()
    
    # Calculate delta
    delta = request.quantity - inventory.quantity
    
    # Update inventory
    inventory.quantity = request.quantity
    if request.safety_stock is not None:
        inventory.safety_stock = request.safety_stock
    
    # Create stock ledger entry
    await create_stock_ledger_entry(
        db, variant_id, delta, request.reason,
        request.reference_type, request.reference_id
    )
    
    # Log action
    await log_admin_action(
        db, actor_id, "inventory.update", "Inventory", variant_id,
        before={"quantity": inventory.quantity - delta},
        after={"quantity": inventory.quantity, "delta": delta}
    )
    
    await db.commit()
    
    return OperationResponse(
        success=True,
        message=f"Inventory updated. New quantity: {inventory.quantity}",
        data={"quantity": inventory.quantity, "delta": delta}
    )


@router.post("/inventory/adjust", response_model=OperationResponse)
async def bulk_adjust_inventory(
    request: BulkInventoryAdjustRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.INVENTORY_ADJUST))
):
    """Bulk adjust inventory for multiple variants. Requires INVENTORY_ADJUST permission."""
    actor_id = parse_actor_id(claims)
    
    adjusted = []
    errors = []
    
    for adjustment in request.adjustments:
        try:
            # Get or create inventory
            inventory = await db.get(Inventory, adjustment.variant_id)
            if not inventory:
                inventory = Inventory(
                    variant_id=adjustment.variant_id,
                    quantity=0,
                    safety_stock=0
                )
                db.add(inventory)
                await db.flush()
            
            # Apply adjustment
            new_quantity = inventory.quantity + adjustment.delta
            if new_quantity < 0:
                errors.append(f"Variant {adjustment.variant_id}: Would result in negative inventory")
                continue
            
            inventory.quantity = new_quantity
            if adjustment.safety_stock is not None:
                inventory.safety_stock = adjustment.safety_stock
            
            # Stock ledger entry
            await create_stock_ledger_entry(
                db, adjustment.variant_id, adjustment.delta,
                request.reason, request.reference_type, request.reference_id
            )
            
            adjusted.append({
                "variant_id": adjustment.variant_id,
                "new_quantity": new_quantity,
                "delta": adjustment.delta
            })
            
        except Exception as e:
            errors.append(f"Variant {adjustment.variant_id}: {str(e)}")
    
    # Log action
    await log_admin_action(
        db, actor_id, "inventory.bulk_adjust", "Inventory", 0,
        after={"adjusted": len(adjusted), "errors": len(errors)}
    )
    
    await db.commit()
    
    return OperationResponse(
        success=len(errors) == 0,
        message=f"Adjusted {len(adjusted)} variants",
        data={"adjusted": adjusted},
        errors=errors if errors else None
    )


@router.post("/inventory/sync", response_model=OperationResponse)
async def sync_inventory(
    request: InventorySyncRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.INVENTORY_SYNC))
):
    """Sync inventory with physical counts. Requires INVENTORY_SYNC permission."""
    actor_id = parse_actor_id(claims)
    
    synced = []
    
    for count in request.counts:
        # Get or create inventory
        inventory = await db.get(Inventory, count.variant_id)
        if not inventory:
            inventory = Inventory(
                variant_id=count.variant_id,
                quantity=0,
                safety_stock=0
            )
            db.add(inventory)
            await db.flush()
        
        # Calculate delta
        delta = count.counted_quantity - inventory.quantity
        
        # Update inventory
        old_quantity = inventory.quantity
        inventory.quantity = count.counted_quantity
        if count.safety_stock is not None:
            inventory.safety_stock = count.safety_stock
        
        # Stock ledger entry
        if delta != 0:
            await create_stock_ledger_entry(
                db, count.variant_id, delta, request.reason,
                "inventory_sync", None
            )
        
        synced.append({
            "variant_id": count.variant_id,
            "old_quantity": old_quantity,
            "new_quantity": count.counted_quantity,
            "delta": delta
        })
    
    # Log action
    await log_admin_action(
        db, actor_id, "inventory.sync", "Inventory", 0,
        after={"synced_count": len(synced)}
    )
    
    await db.commit()
    
    return OperationResponse(
        success=True,
        message=f"Synced {len(synced)} inventory records",
        data={"synced": synced}
    )


@router.get("/inventory/low-stock", response_model=List[LowStockAlert])
async def get_low_stock_items(
    threshold_multiplier: float = Query(1.0, description="Multiplier for safety stock threshold"),
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.INVENTORY_VIEW))
):
    """Get list of low stock items. Requires INVENTORY_VIEW permission."""
    # Query for low stock variants
    query = (
        select(Variant, Inventory, Product)
        .join(Inventory, Variant.id == Inventory.variant_id)
        .join(Product, Variant.product_id == Product.id)
        .where(Inventory.quantity < Inventory.safety_stock * threshold_multiplier)
    )
    
    result = await db.execute(query)
    alerts = []
    
    for variant, inventory, product in result:
        alerts.append(LowStockAlert(
            variant_id=variant.id,
            product_id=product.id,
            product_title=product.title,
            sku=variant.sku,
            size=variant.size,
            color=variant.color,
            current_quantity=inventory.quantity,
            safety_stock=inventory.safety_stock,
            shortage=inventory.safety_stock - inventory.quantity
        ))
    
    return alerts


# ============================================================================
# IMAGE MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/products/{product_id}/images", response_model=ImageUploadResponse)
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    alt_text: Optional[str] = Form(None),
    is_primary: bool = Form(False),
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.PRODUCT_EDIT))
):
    """Upload a product image to Cloudinary."""
    actor_id = parse_actor_id(claims)
    
    # Check product exists
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Validate file
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read file data
    file_data = await file.read()
    
    # Validate image
    is_valid, error_msg = cloudinary_manager.validate_image(file_data)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    try:
        # Upload to Cloudinary
        upload_result = cloudinary_manager.upload_image(
            file_data,
            file.filename,
            folder=f"products/{product_id}",
            tags=[f"product_{product_id}", product.slug]
        )
        
        # Generate responsive URLs
        responsive_urls = cloudinary_manager.generate_responsive_urls(
            upload_result["public_id"],
            upload_result["url"]
        )
        
        # If setting as primary, unset other primary images
        if is_primary:
            await db.execute(
                sql_update(ProductImage)
                .where(ProductImage.product_id == product_id)
                .values(is_primary=False)
            )
        
        # Get next sort order
        max_sort = await db.execute(
            select(func.coalesce(func.max(ProductImage.sort_order), 0))
            .where(ProductImage.product_id == product_id)
        )
        next_sort = max_sort.scalar_one() + 1
        
        # Create database record
        image = ProductImage(
            product_id=product_id,
            url=upload_result["url"],
            alt_text=alt_text or product.title,
            width=upload_result.get("width"),
            height=upload_result.get("height"),
            sort_order=next_sort,
            is_primary=is_primary,
            public_id=upload_result["public_id"]  # Store for deletion
        )
        db.add(image)
        
        # Log action
        await log_admin_action(
            db, actor_id, "image.upload", "ProductImage", product_id,
            after={"filename": file.filename, "public_id": upload_result["public_id"]}
        )
        
        await db.commit()
        await db.refresh(image)
        
        return ImageUploadResponse(
            id=image.id,
            product_id=product_id,
            url=image.url,
            public_id=upload_result["public_id"],
            width=image.width,
            height=image.height,
            size=upload_result.get("size"),
            format=upload_result.get("format"),
            responsive_urls=responsive_urls
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error uploading image: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload image")


@router.put("/images/{image_id}", response_model=ImageResponse)
async def update_image(
    image_id: int,
    alt_text: Optional[str] = None,
    sort_order: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.PRODUCT_EDIT))
):
    """Update image metadata."""
    actor_id = parse_actor_id(claims)
    
    image = await db.get(ProductImage, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Update fields
    if alt_text is not None:
        image.alt_text = alt_text
    if sort_order is not None:
        image.sort_order = sort_order
    
    # Log action
    await log_admin_action(
        db, actor_id, "image.update", "ProductImage", image_id,
        after={"alt_text": alt_text, "sort_order": sort_order}
    )
    
    await db.commit()
    await db.refresh(image)
    
    return ImageResponse(
        id=image.id,
        url=image.url,
        alt_text=image.alt_text,
        width=image.width,
        height=image.height,
        sort_order=image.sort_order,
        is_primary=image.is_primary
    )


@router.delete("/images/{image_id}")
async def delete_image(
    image_id: int,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.PRODUCT_EDIT))
):
    """Delete a product image."""
    actor_id = parse_actor_id(claims)
    
    image = await db.get(ProductImage, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Delete from Cloudinary if public_id is stored
    if hasattr(image, 'public_id') and image.public_id:
        try:
            cloudinary_manager.delete_image(image.public_id)
        except Exception as e:
            logger.warning(f"Failed to delete image from Cloudinary: {e}")
    
    # Log action
    await log_admin_action(
        db, actor_id, "image.delete", "ProductImage", image_id,
        before={"url": image.url}
    )
    
    await db.delete(image)
    await db.commit()
    
    return OperationResponse(
        success=True,
        message="Image deleted successfully"
    )


@router.post("/images/{image_id}/set-primary")
async def set_primary_image(
    image_id: int,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_roles(*ADMINS))
):
    """Set an image as primary."""
    actor_id = parse_actor_id(claims)
    
    image = await db.get(ProductImage, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Unset other primary images for the product
    await db.execute(
        sql_update(ProductImage)
        .where(ProductImage.product_id == image.product_id)
        .values(is_primary=False)
    )
    
    # Set this image as primary
    image.is_primary = True
    
    # Log action
    await log_admin_action(
        db, actor_id, "image.set_primary", "ProductImage", image_id,
        after={"product_id": image.product_id}
    )
    
    await db.commit()
    
    return OperationResponse(
        success=True,
        message="Primary image updated"
    )


# ============================================================================
# CATEGORY ENDPOINTS
# ============================================================================

@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    request: CategoryCreateRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_roles(*SUPERVISORS))  # Allow both admin and supervisor
):
    """Create a new category. Requires supervisor or admin role."""
    actor_id = parse_actor_id(claims)
    
    # Check slug uniqueness
    if request.slug:
        existing = await db.execute(
            select(Category).where(Category.slug == request.slug)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Slug already exists")
    
    category = Category(
        name=request.name,
        slug=request.slug or request.name.lower().replace(" ", "-")
    )
    db.add(category)
    
    # Log action
    await log_admin_action(
        db, actor_id, "category.create", "Category", 0,
        after={"name": category.name}
    )
    
    await db.commit()
    await db.refresh(category)
    
    return CategoryResponse(
        id=category.id,
        name=category.name,
        slug=category.slug,
        product_count=0
    )


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    request: CategoryUpdateRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_roles(*SUPERVISORS))  # Allow both admin and supervisor
):
    """Update a category. Requires supervisor or admin role."""
    actor_id = parse_actor_id(claims)
    
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Update fields
    if request.name is not None:
        category.name = request.name
    if request.slug is not None:
        category.slug = request.slug
    
    # Log action
    await log_admin_action(
        db, actor_id, "category.update", "Category", category_id,
        after=request.dict(exclude_unset=True)
    )
    
    await db.commit()
    await db.refresh(category)
    
    # Get product count
    count_result = await db.execute(
        select(func.count(Product.id))
        .where(Product.category_id == category_id)
    )
    product_count = count_result.scalar_one()
    
    return CategoryResponse(
        id=category.id,
        name=category.name,
        slug=category.slug,
        product_count=product_count
    )


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    force: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_roles(*SUPERVISORS))  # Allow both admin and supervisor
):
    """Delete a category. Requires supervisor or admin role."""
    actor_id = parse_actor_id(claims)
    
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check for products
    if not force:
        count_result = await db.execute(
            select(func.count(Product.id))
            .where(Product.category_id == category_id)
        )
        if count_result.scalar_one() > 0:
            raise HTTPException(
                status_code=409,
                detail="Category has products. Use force=true to delete anyway."
            )
    
    # Log action
    await log_admin_action(
        db, actor_id, "category.delete", "Category", category_id,
        before={"name": category.name}
    )
    
    # Set products category_id to null if force delete
    if force:
        await db.execute(
            sql_update(Product)
            .where(Product.category_id == category_id)
            .values(category_id=None)
        )
    
    await db.delete(category)
    await db.commit()
    
    return OperationResponse(
        success=True,
        message=f"Category '{category.name}' deleted"
    )


@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_roles(*SUPERVISORS))
):
    """List all categories with product counts."""
    # Query categories with product counts
    query = (
        select(
            Category,
            func.count(Product.id).label("product_count")
        )
        .outerjoin(Product, Category.id == Product.category_id)
        .group_by(Category.id)
        .order_by(Category.name)
    )
    
    result = await db.execute(query)
    categories = []
    
    for category, product_count in result:
        categories.append(CategoryResponse(
            id=category.id,
            name=category.name,
            slug=category.slug,
            product_count=product_count or 0
        ))
    
    return categories


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def build_inventory_response(inventory: Optional[Inventory]) -> Optional[dict]:
    """Build inventory response dict."""
    if not inventory:
        return None
    
    # Calculate available (would need reservation data in real implementation)
    available = inventory.quantity  # Simplified - should subtract active reservations
    
    return {
        "variant_id": inventory.variant_id,
        "quantity": inventory.quantity,
        "safety_stock": inventory.safety_stock,
        "available": available,
        "reserved": inventory.quantity - available,
        "low_stock": inventory.quantity < inventory.safety_stock
    }


async def build_product_detail_response(db: AsyncSession, product: Product) -> ProductDetailResponse:
    """Build detailed product response."""
    # Get category name
    category_name = None
    if hasattr(product, 'category_id') and product.category_id:
        category = await db.get(Category, product.category_id)
        if category:
            category_name = category.name
    
    # Build variants
    variants = []
    total_inventory = 0
    low_stock_variants = 0
    
    for variant in product.variants:
        inventory_response = build_inventory_response(variant.inventory if hasattr(variant, 'inventory') else None)
        
        if inventory_response:
            total_inventory += inventory_response["quantity"]
            if inventory_response["low_stock"]:
                low_stock_variants += 1
        
        variants.append(VariantDetailResponse(
            id=variant.id,
            product_id=variant.product_id,
            sku=variant.sku,
            size=variant.size,
            color=variant.color,
            price=variant.price,
            inventory=inventory_response
        ))
    
    # Build images
    images = []
    for image in product.images:
        images.append(ImageResponse(
            id=image.id,
            url=image.url,
            alt_text=image.alt_text,
            width=image.width,
            height=image.height,
            sort_order=image.sort_order,
            is_primary=image.is_primary,
            public_id=getattr(image, 'public_id', None)
        ))
    
    return ProductDetailResponse(
        id=product.id,
        title=product.title,
        slug=product.slug,
        description=product.description,
        category_id=getattr(product, 'category_id', None),
        category_name=category_name,
        compare_at_price=product.compare_at_price,
        flags=product.flags,
        variants=variants,
        images=images,
        total_inventory=total_inventory,
        low_stock_variants=low_stock_variants,
        created_at=getattr(product, 'created_at', datetime.now(timezone.utc)),
        updated_at=getattr(product, 'updated_at', None)
    )
