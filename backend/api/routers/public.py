from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select
from sqlalchemy.orm import joinedload
import httpx

from mdv.schemas import (
    HealthResponse,
    Paginated,
    ProductOut,
    VariantOut,
    CartCreateResponse,
    CartItemIn,
    CartOut,
    CartItemOut,
    CheckoutInitRequest,
    CheckoutInitResponse,
    CartItemQtyUpdate,
    ShippingEstimate,
)
from mdv.models import Product, Variant, Cart, CartItem, Coupon, Zone, StateZone, Inventory, Reservation, ReservationStatus, Order, OrderItem, OrderStatus, Address, Shipment, ShipmentEvent, ShipmentStatus, Fulfillment, FulfillmentStatus, ProductImage, Category
from mdv.config import settings
from ..deps import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse()


@router.get("/api/orders/{order_id}/tracking")
async def order_tracking(order_id: int, db: AsyncSession = Depends(get_db)):
    order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    timeline = []
    # Order status
    timeline.append({"code": order.status.value if hasattr(order.status, 'value') else order.status, "at": order.created_at})
    # Fulfillment
    ful = (await db.execute(select(Fulfillment).where(Fulfillment.order_id == order.id))).scalar_one_or_none()
    if ful:
        timeline.append({"code": ful.status.value, "at": ful.packed_at})
        shp = (await db.execute(select(Shipment).where(Shipment.fulfillment_id == ful.id))).scalar_one_or_none()
        if shp:
            # events
            events = (await db.execute(select(ShipmentEvent).where(ShipmentEvent.shipment_id == shp.id).order_by(ShipmentEvent.occurred_at))).scalars().all()
            for ev in events:
                timeline.append({"code": ev.code, "at": ev.occurred_at, "message": ev.message})
    return {"order_id": order.id, "status": order.status.value if hasattr(order.status, 'value') else order.status, "timeline": timeline}


@router.get("/api/search/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db)
):
    """Get search suggestions for autocomplete"""
    if len(q) < 2:
        return {"suggestions": []}
    
    # Search in product titles
    like_pattern = f"%{q.lower()}%"
    
    # Get product suggestions
    product_stmt = (
        select(Product)
        .where(func.lower(Product.title).like(like_pattern))
        .limit(5)
    )
    product_results = await db.execute(product_stmt)
    products = product_results.scalars().all()
    
    suggestions = []
    
    # Add query suggestions
    suggestions.append({
        "id": f"query_{q}",
        "type": "query",
        "title": q,
        "url": f"/search?q={q}"
    })
    
    # Add product suggestions
    for product in products:
        # Get first variant price
        variant_stmt = select(Variant).where(Variant.product_id == product.id).limit(1)
        variant_result = await db.execute(variant_stmt)
        variant = variant_result.scalar_one_or_none()
        
        # Get first image
        image_stmt = (
            select(ProductImage.url)
            .where(ProductImage.product_id == product.id)
            .order_by(ProductImage.is_primary.desc(), ProductImage.sort_order.asc())
            .limit(1)
        )
        image_result = await db.execute(image_stmt)
        image_url = image_result.scalar_one_or_none()
        
        suggestions.append({
            "id": f"product_{product.id}",
            "type": "product",
            "title": product.title,
            "subtitle": product.description[:50] + "..." if product.description and len(product.description) > 50 else product.description,
            "image": image_url,
            "url": f"/product/{product.slug}",
            "price": float(variant.price) if variant else None
        })
    
    return {"suggestions": suggestions}


@router.get("/api/search/trending")
async def get_trending_searches():
    """Get trending search terms"""
    # For MVP, return some static trending searches
    # In production, this would come from analytics data
    trending = [
        {"query": "summer dresses", "count": 2345, "trend": "up"},
        {"query": "sneakers", "count": 1890, "trend": "up"},
        {"query": "handbags", "count": 1567, "trend": "stable"},
        {"query": "sunglasses", "count": 1234, "trend": "down"},
        {"query": "watches", "count": 987, "trend": "up"}
    ]
    return {"trending": trending}


@router.get("/api/search/popular")
async def get_popular_products(db: AsyncSession = Depends(get_db)):
    """Get popular products for search suggestions"""
    # Get recent products as "popular" for MVP
    stmt = (
        select(Product)
        .order_by(Product.id.desc())
        .limit(5)
    )
    results = await db.execute(stmt)
    products = results.scalars().all()
    
    popular = []
    for product in products:
        # Get first variant price
        variant_stmt = select(Variant).where(Variant.product_id == product.id).limit(1)
        variant_result = await db.execute(variant_stmt)
        variant = variant_result.scalar_one_or_none()
        
        # Get first image
        image_stmt = (
            select(ProductImage.url)
            .where(ProductImage.product_id == product.id)
            .order_by(ProductImage.is_primary.desc(), ProductImage.sort_order.asc())
            .limit(1)
        )
        image_result = await db.execute(image_stmt)
        image_url = image_result.scalar_one_or_none()
        
        popular.append({
            "id": str(product.id),
            "type": "product",
            "title": product.title,
            "subtitle": "Popular",
            "image": image_url,
            "url": f"/product/{product.slug}",
            "price": float(variant.price) if variant else None,
            "badge": "Popular"
        })
    
    return {"popular": popular}


@router.get("/api/products/recommendations")
async def get_product_recommendations(
    user_id: int = Query(None),
    limit: int = Query(6, ge=1, le=20),
    db: AsyncSession = Depends(get_db)
):
    """Get product recommendations for a user or general recommendations"""
    # For MVP, return recent products as recommendations
    # In production, this would use ML/collaborative filtering
    stmt = (
        select(Product)
        .order_by(Product.id.desc())
        .limit(limit)
    )
    results = await db.execute(stmt)
    products = results.scalars().all()
    
    recommendations = []
    for product in products:
        # Get first variant price
        variant_stmt = select(Variant).where(Variant.product_id == product.id).limit(1)
        variant_result = await db.execute(variant_stmt)
        variant = variant_result.scalar_one_or_none()
        
        # Get first image
        image_stmt = (
            select(ProductImage.url)
            .where(ProductImage.product_id == product.id)
            .order_by(ProductImage.is_primary.desc(), ProductImage.sort_order.asc())
            .limit(1)
        )
        image_result = await db.execute(image_stmt)
        image_url = image_result.scalar_one_or_none()
        
        recommendations.append({
            "id": product.id,
            "title": product.title,
            "description": product.description,
            "image": image_url,
            "slug": product.slug,
            "price": float(variant.price) if variant else None,
            "originalPrice": float(variant.price) if variant else None,
            "discount": 0
        })
    
    return {"products": recommendations}


@router.get("/api/products/filters")
async def get_product_filters(db: AsyncSession = Depends(get_db)):
    """Get available filter options for products"""
    
    # Get available sizes from variants
    size_stmt = (
        select(Variant.size, func.count(Variant.id).label('count'))
        .where(Variant.size.isnot(None))
        .group_by(Variant.size)
        .order_by(func.count(Variant.id).desc())
    )
    size_results = await db.execute(size_stmt)
    sizes = [{
        "id": row.size.lower().replace(' ', '_'),
        "label": row.size,
        "count": row.count
    } for row in size_results.all() if row.size]
    
    # Get available colors from variants
    color_stmt = (
        select(Variant.color, func.count(Variant.id).label('count'))
        .where(Variant.color.isnot(None))
        .group_by(Variant.color)
        .order_by(func.count(Variant.id).desc())
    )
    color_results = await db.execute(color_stmt)
    colors = []
    color_map = {
        'black': '#000000',
        'white': '#FFFFFF',
        'blue': '#0000FF',
        'red': '#FF0000',
        'green': '#00FF00',
        'yellow': '#FFFF00',
        'pink': '#FFC0CB',
        'gray': '#808080',
        'grey': '#808080',
        'brown': '#964B00',
        'purple': '#800080'
    }
    
    for row in color_results.all():
        if row.color:
            hex_color = color_map.get(row.color.lower(), '#808080')
            colors.append({
                "id": row.color.lower().replace(' ', '_'),
                "label": row.color,
                "hex": hex_color,
                "count": row.count
            })
    
    # Mock categories and brands for now (would come from product data in real implementation)
    categories = [
        {"id": "women", "label": "Women's Fashion", "count": 150},
        {"id": "men", "label": "Men's Fashion", "count": 120},
        {"id": "accessories", "label": "Accessories", "count": 80},
        {"id": "shoes", "label": "Shoes", "count": 60}
    ]
    
    brands = [
        {"id": "nike", "label": "Nike", "count": 45},
        {"id": "adidas", "label": "Adidas", "count": 38},
        {"id": "zara", "label": "Zara", "count": 32},
        {"id": "local", "label": "Local Brands", "count": 89}
    ]
    
    materials = [
        {"id": "cotton", "label": "Cotton", "count": 95},
        {"id": "polyester", "label": "Polyester", "count": 67},
        {"id": "silk", "label": "Silk", "count": 23},
        {"id": "leather", "label": "Leather", "count": 15}
    ]
    
    availability = [
        {"id": "in_stock", "label": "In Stock", "count": 234},
        {"id": "pre_order", "label": "Pre-order", "count": 12},
        {"id": "coming_soon", "label": "Coming Soon", "count": 5}
    ]
    
    discounts = [
        {"id": "10", "label": "10% off & above", "count": 45},
        {"id": "20", "label": "20% off & above", "count": 23},
        {"id": "30", "label": "30% off & above", "count": 12},
        {"id": "50", "label": "50% off & above", "count": 3}
    ]
    
    return {
        "categories": categories,
        "brands": brands,
        "sizes": sizes,
        "colors": colors,
        "materials": materials,
        "availability": availability,
        "discounts": discounts
    }


@router.get("/api/products", response_model=Paginated)
async def list_products(
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = Query("relevance"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Product).limit(page_size).offset((page - 1) * page_size)
    count_stmt = select(func.count()).select_from(Product)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(func.lower(Product.title).like(like))
        count_stmt = count_stmt.where(func.lower(Product.title).like(like))
    # Sorting (simplified)
    if sort == "newest":
        stmt = stmt.order_by(Product.id.desc())
    elif sort == "price_asc":
        stmt = stmt.order_by(func.coalesce(Product.compare_at_price, 0))
    elif sort == "price_desc":
        stmt = stmt.order_by(func.coalesce(Product.compare_at_price, 0).desc())

    # Eager-load variants; images are selectin via relationship
    res = await db.execute(stmt)
    products = res.scalars().all()
    total = (await db.execute(count_stmt)).scalar_one()

    # Load variants with inventory data
    items: list[ProductOut] = []
    for p in products:
        vres = await db.execute(select(Variant).where(Variant.product_id == p.id))
        variants_with_inventory = []
        total_stock = 0
        low_stock_count = 0
        out_of_stock_count = 0

        for v in vres.scalars().all():
            # Get inventory for this variant
            inv_res = await db.execute(select(Inventory).where(Inventory.variant_id == v.id))
            inventory = inv_res.scalar_one_or_none()

            stock_quantity = inventory.quantity if inventory else 0
            safety_stock = inventory.safety_stock if inventory else 0
            total_stock += stock_quantity

            # Determine stock status
            if stock_quantity == 0:
                stock_status = "out_of_stock"
                out_of_stock_count += 1
            elif stock_quantity <= safety_stock:
                stock_status = "low_stock"
                low_stock_count += 1
            else:
                stock_status = "in_stock"

            variant_data = {
                "id": v.id,
                "sku": v.sku,
                "size": v.size,
                "color": v.color,
                "price": float(v.price),
                "stock_quantity": stock_quantity,
                "stock_status": stock_status
            }
            variants_with_inventory.append(variant_data)

        # Calculate overall product stock status
        if out_of_stock_count == len(variants_with_inventory):
            product_stock_status = "out_of_stock"
        elif low_stock_count > 0 or out_of_stock_count > 0:
            product_stock_status = "low_stock"
        else:
            product_stock_status = "in_stock"

        # Map images if any (explicit query to avoid async lazy-load issues)
        imgs = []
        ires = await db.execute(
            select(ProductImage)
            .where(ProductImage.product_id == p.id)
            .order_by(ProductImage.is_primary.desc(), ProductImage.sort_order.asc())
        )
        for img in ires.scalars().all():
            imgs.append({
                "id": img.id,
                "url": img.url,
                "alt_text": img.alt_text,
                "width": img.width,
                "height": img.height,
                "sort_order": img.sort_order,
                "is_primary": img.is_primary,
            })

        # Return as plain dict to include images, variants fields, and inventory data
        item = {
            "id": p.id,
            "title": p.title,
            "slug": p.slug,
            "description": p.description,
            "compare_at_price": float(p.compare_at_price) if p.compare_at_price else None,
            "variants": variants_with_inventory,
            "images": imgs,
            "total_stock": total_stock,
            "stock_status": product_stock_status
        }
        items.append(item)
    return Paginated(items=items, total=total, page=page, page_size=page_size)


@router.get("/api/products/category/{category_slug}", response_model=Paginated)
async def get_products_by_category(
    category_slug: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = Query("relevance"),
    db: AsyncSession = Depends(get_db),
):
    """Get products filtered by category slug."""
    # First, find the category by slug
    category_result = await db.execute(
        select(Category).where(Category.slug == category_slug)
    )
    category = category_result.scalar_one_or_none()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Build query for products in this category
    stmt = (
        select(Product)
        .where(Product.category_id == category.id)
        .limit(page_size)
        .offset((page - 1) * page_size)
    )

    count_stmt = (
        select(func.count())
        .select_from(Product)
        .where(Product.category_id == category.id)
    )

    # Apply sorting
    if sort == "newest":
        stmt = stmt.order_by(Product.id.desc())
    elif sort == "price_asc":
        stmt = stmt.order_by(func.coalesce(Product.compare_at_price, 0))
    elif sort == "price_desc":
        stmt = stmt.order_by(func.coalesce(Product.compare_at_price, 0).desc())
    else:  # relevance (default)
        stmt = stmt.order_by(Product.id.desc())

    # Execute queries
    res = await db.execute(stmt)
    products = res.scalars().all()
    total = (await db.execute(count_stmt)).scalar_one()

    # Build response items (reuse existing logic)
    items: list = []
    for p in products:
        # Load variants
        vres = await db.execute(select(Variant).where(Variant.product_id == p.id))
        variants = [VariantOut(id=v.id, sku=v.sku, size=v.size, color=v.color, price=float(v.price)) for v in vres.scalars().all()]

        # Load images
        imgs = []
        ires = await db.execute(
            select(ProductImage)
            .where(ProductImage.product_id == p.id)
            .order_by(ProductImage.is_primary.desc(), ProductImage.sort_order.asc())
        )
        for img in ires.scalars().all():
            imgs.append({
                "id": img.id,
                "url": img.url,
                "alt_text": img.alt_text,
                "width": img.width,
                "height": img.height,
                "is_primary": img.is_primary
            })

        item = {
            "id": p.id,
            "title": p.title,
            "slug": p.slug,
            "description": p.description,
            "compare_at_price": float(p.compare_at_price) if p.compare_at_price else None,
            "variants": [v.model_dump() if hasattr(v, 'model_dump') else v.__dict__ for v in variants],
            "images": imgs,
        }
        items.append(item)

    return Paginated(items=items, total=total, page=page, page_size=page_size)


@router.get("/api/products/sale", response_model=Paginated)
async def get_sale_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = Query("relevance"),
    db: AsyncSession = Depends(get_db),
):
    """Get products that are on sale (compare_at_price > variant.price)."""
    # Build query for sale products
    # We need to join with variants to compare prices
    # Use subquery to avoid PostgreSQL JSON comparison issues with DISTINCT
    subquery = (
        select(Product.id)
        .join(Variant, Product.id == Variant.product_id)
        .where(
            and_(
                Product.compare_at_price.isnot(None),
                Product.compare_at_price > Variant.price
            )
        )
        .distinct()
    )

    stmt = (
        select(Product)
        .where(Product.id.in_(subquery))
        .limit(page_size)
        .offset((page - 1) * page_size)
    )

    count_stmt = select(func.count()).select_from(subquery.subquery())

    # Apply sorting
    if sort == "newest":
        stmt = stmt.order_by(Product.id.desc())
    elif sort == "price_asc":
        stmt = stmt.order_by(Product.compare_at_price.asc())
    elif sort == "price_desc":
        stmt = stmt.order_by(Product.compare_at_price.desc())
    else:  # relevance (default)
        stmt = stmt.order_by(Product.id.desc())

    # Execute queries
    res = await db.execute(stmt)
    products = res.scalars().all()
    total = (await db.execute(count_stmt)).scalar_one()

    # Build response items with inventory data
    items: list = []
    for p in products:
        # Load variants with inventory data
        vres = await db.execute(select(Variant).where(Variant.product_id == p.id))
        variants_with_inventory = []
        total_stock = 0
        low_stock_count = 0
        out_of_stock_count = 0

        for v in vres.scalars().all():
            # Get inventory for this variant
            inv_res = await db.execute(select(Inventory).where(Inventory.variant_id == v.id))
            inventory = inv_res.scalar_one_or_none()

            stock_quantity = inventory.quantity if inventory else 0
            safety_stock = inventory.safety_stock if inventory else 0
            total_stock += stock_quantity

            # Determine stock status
            if stock_quantity == 0:
                stock_status = "out_of_stock"
                out_of_stock_count += 1
            elif stock_quantity <= safety_stock:
                stock_status = "low_stock"
                low_stock_count += 1
            else:
                stock_status = "in_stock"

            variant_data = {
                "id": v.id,
                "sku": v.sku,
                "size": v.size,
                "color": v.color,
                "price": float(v.price),
                "stock_quantity": stock_quantity,
                "stock_status": stock_status
            }
            variants_with_inventory.append(variant_data)

        # Calculate overall product stock status
        if out_of_stock_count == len(variants_with_inventory):
            product_stock_status = "out_of_stock"
        elif low_stock_count > 0 or out_of_stock_count > 0:
            product_stock_status = "low_stock"
        else:
            product_stock_status = "in_stock"

        # Load images
        imgs = []
        ires = await db.execute(
            select(ProductImage)
            .where(ProductImage.product_id == p.id)
            .order_by(ProductImage.is_primary.desc(), ProductImage.sort_order.asc())
        )
        for img in ires.scalars().all():
            imgs.append({
                "id": img.id,
                "url": img.url,
                "alt_text": img.alt_text,
                "width": img.width,
                "height": img.height,
                "is_primary": img.is_primary
            })

        item = {
            "id": p.id,
            "title": p.title,
            "slug": p.slug,
            "description": p.description,
            "compare_at_price": float(p.compare_at_price) if p.compare_at_price else None,
            "variants": variants_with_inventory,
            "images": imgs,
            "total_stock": total_stock,
            "stock_status": product_stock_status
        }
        items.append(item)

    return Paginated(items=items, total=total, page=page, page_size=page_size)


@router.get("/api/products/{id_or_slug}", response_model=ProductOut)
async def get_product(id_or_slug: str, db: AsyncSession = Depends(get_db)):
    product = None
    if id_or_slug.isdigit():
        res = await db.execute(select(Product).where(Product.id == int(id_or_slug)))
        product = res.scalar_one_or_none()
    else:
        res = await db.execute(select(Product).where(Product.slug == id_or_slug))
        product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    vres = await db.execute(select(Variant).where(Variant.product_id == product.id))
    variants = [VariantOut(id=v.id, sku=v.sku, size=v.size, color=v.color, price=float(v.price)) for v in vres.scalars().all()]
    # Explicitly load images for this product
    imgs = []
    ires = await db.execute(
        select(ProductImage)
        .where(ProductImage.product_id == product.id)
        .order_by(ProductImage.is_primary.desc(), ProductImage.sort_order.asc())
    )
    for img in ires.scalars().all():
        imgs.append({
            "id": img.id,
            "url": img.url,
            "alt_text": img.alt_text,
            "width": img.width,
            "height": img.height,
            "sort_order": img.sort_order,
            "is_primary": img.is_primary,
        })
    out = {
        "id": product.id,
        "title": product.title,
        "slug": product.slug,
        "description": product.description,
        "compare_at_price": float(product.compare_at_price) if product.compare_at_price else None,
        "variants": [v.model_dump() if hasattr(v, 'model_dump') else v.__dict__ for v in variants],
        "images": imgs,
    }
    return out


@router.post("/api/cart", response_model=CartCreateResponse)
async def create_cart(db: AsyncSession = Depends(get_db)):
    cart = Cart()
    db.add(cart)
    await db.flush()
    await db.commit()
    return CartCreateResponse(id=cart.id)


async def _serialize_cart(db: AsyncSession, cart_id: int) -> CartOut:
    # Join cart items with variants and products to enrich with price/title
    rows = (await db.execute(
        select(CartItem, Variant, Product)
        .join(Variant, CartItem.variant_id == Variant.id)
        .join(Product, Variant.product_id == Product.id)
        .where(CartItem.cart_id == cart_id)
    )).all()
    items: list[CartItemOut] = []
    for ci, v, p in rows:
        attrs = " / ".join([s for s in [v.size, v.color] if s])
        title = f"{p.title}{(' - ' + attrs) if attrs else ''}"
        # Primary product image for cart visuals
        ires = await db.execute(
            select(ProductImage.url)
            .where(ProductImage.product_id == p.id)
            .order_by(ProductImage.is_primary.desc(), ProductImage.sort_order.asc())
            .limit(1)
        )
        img_url = ires.scalar_one_or_none()
        items.append(CartItemOut(
            id=ci.id,
            variant_id=ci.variant_id,
            qty=ci.qty,
            title=title,
            price=float(v.price),
            image_url=img_url,
        ))
    return CartOut(id=cart_id, items=items)


@router.get("/api/cart/{cart_id}", response_model=CartOut)
async def get_cart(cart_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Cart).where(Cart.id == cart_id))
    cart = res.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    return await _serialize_cart(db, cart.id)


@router.post("/api/cart/{cart_id}/items", response_model=CartOut)
async def add_cart_item(cart_id: int, body: CartItemIn, db: AsyncSession = Depends(get_db)):
    # ensure cart exists
    res = await db.execute(select(Cart).where(Cart.id == cart_id))
    cart = res.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    # ensure variant exists
    v = (await db.execute(select(Variant).where(Variant.id == body.variant_id))).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Variant not found")
    # upsert
    existing = (await db.execute(select(CartItem).where(and_(CartItem.cart_id == cart_id, CartItem.variant_id == body.variant_id)))).scalar_one_or_none()
    if existing:
        existing.qty += body.qty
    else:
        db.add(CartItem(cart_id=cart_id, variant_id=body.variant_id, qty=body.qty))
    await db.flush()
    # return cart
    await db.commit()
    return await _serialize_cart(db, cart_id)


@router.put("/api/cart/{cart_id}/items/{item_id}", response_model=CartOut)
async def update_cart_item(cart_id: int, item_id: int, body: CartItemQtyUpdate, db: AsyncSession = Depends(get_db)):
    # ensure cart exists
    cart = (await db.execute(select(Cart).where(Cart.id == cart_id))).scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    # ensure item exists
    item = (await db.execute(select(CartItem).where(and_(CartItem.id == item_id, CartItem.cart_id == cart_id)))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    item.qty = body.qty
    await db.flush()
    await db.commit()
    return await _serialize_cart(db, cart_id)


@router.delete("/api/cart/{cart_id}/items/{item_id}", response_model=CartOut)
async def delete_cart_item(cart_id: int, item_id: int, db: AsyncSession = Depends(get_db)):
    # ensure cart exists
    cart = (await db.execute(select(Cart).where(Cart.id == cart_id))).scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    # ensure item exists
    item = (await db.execute(select(CartItem).where(and_(CartItem.id == item_id, CartItem.cart_id == cart_id)))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    # delete and return cart
    await db.delete(item)
    await db.flush()
    await db.commit()
    return await _serialize_cart(db, cart_id)


@router.post("/api/cart/{cart_id}/clear", response_model=CartOut)
async def clear_cart(cart_id: int, db: AsyncSession = Depends(get_db)):
    cart = (await db.execute(select(Cart).where(Cart.id == cart_id))).scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    # bulk delete items
    await db.execute(CartItem.__table__.delete().where(CartItem.cart_id == cart_id))
    await db.commit()
    return await _serialize_cart(db, cart_id)


async def compute_shipping_fee(db: AsyncSession, state: str) -> float:
    st = (await db.execute(select(StateZone).where(StateZone.state == state))).scalar_one_or_none()
    if not st:
        # Default to Other zone fee if not found
        z = (await db.execute(select(Zone).where(Zone.name == "Other Zone"))).scalar_one_or_none()
        return float(z.fee) if z else 1500.0
    z = (await db.execute(select(Zone).where(Zone.id == st.zone_id))).scalar_one()
    return float(z.fee)


@router.get("/api/shipping/calculate", response_model=ShippingEstimate)
async def shipping_calculate(state: str = Query(...), subtotal: float | None = Query(default=None), coupon_code: str | None = Query(default=None), db: AsyncSession = Depends(get_db)):
    shipping_fee = await compute_shipping_fee(db, state)
    # Apply coupon-like logic similar to checkout (shipping coupon only)
    # For preview, only zero out shipping when coupon type is 'shipping'
    if coupon_code:
        c = (await db.execute(select(Coupon).where(and_(Coupon.code == coupon_code, Coupon.active == True)))).scalar_one_or_none()  # noqa: E712
        if c and c.type == "shipping":
            shipping_fee = 0.0
    free_shipping_eligible = False
    if state.lower() == "lagos" and subtotal is not None and subtotal >= float(settings.free_shipping_threshold_lagos):
        shipping_fee = 0.0
        free_shipping_eligible = True
    return ShippingEstimate(shipping_fee=round(float(shipping_fee), 2), free_shipping_eligible=free_shipping_eligible, reason=("Free shipping threshold met" if free_shipping_eligible else None))


async def apply_coupon(db: AsyncSession, code: str | None, subtotal: float, shipping_fee: float, state: str) -> tuple[float, float, str | None]:
    if not code:
        return 0.0, shipping_fee, None
    c = (await db.execute(select(Coupon).where(and_(Coupon.code == code, Coupon.active == True)))).scalar_one_or_none()  # noqa: E712
    if not c:
        return 0.0, shipping_fee, None
    ctype = c.type
    cval = float(c.value)
    discount = 0.0
    if ctype == "percent":
        discount = round(subtotal * (cval / 100.0), 2)
    elif ctype == "fixed":
        discount = min(subtotal, cval)
    elif ctype == "shipping":
        shipping_fee = 0.0
    return discount, shipping_fee, c.code


@router.post("/api/checkout/init", response_model=CheckoutInitResponse)
async def checkout_init(body: CheckoutInitRequest, db: AsyncSession = Depends(get_db)):
    # Load cart and items
    cart = (await db.execute(select(Cart).where(Cart.id == body.cart_id))).scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    items = (await db.execute(select(CartItem).where(CartItem.cart_id == cart.id))).scalars().all()
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Build order and calculate totals
    subtotal = 0.0
    subtotal_eligible = 0.0
    # Create order with enum value (will use model default)
    order = Order(cart_id=cart.id)
    db.add(order)
    await db.flush()

    order_items: list[OrderItem] = []
    for it in items:
        v = (await db.execute(select(Variant).where(Variant.id == it.variant_id))).scalar_one()
        # Find product to determine on_sale
        p = (await db.execute(select(Product).where(Product.id == v.product_id))).scalar_one()
        unit_price = float(v.price)
        on_sale = False
        if p.compare_at_price is not None and float(p.compare_at_price) > unit_price:
            on_sale = True
        subtotal += unit_price * it.qty
        if settings.coupon_applies_to_discounted or not on_sale:
            subtotal_eligible += unit_price * it.qty
        oi = OrderItem(order_id=order.id, variant_id=v.id, qty=it.qty, unit_price=unit_price, on_sale=on_sale)
        db.add(oi)
        order_items.append(oi)

    shipping_fee = await compute_shipping_fee(db, body.address.state)
    # Apply coupon to eligible subtotal only
    discount, shipping_fee, applied_code = await apply_coupon(db, body.coupon_code, subtotal_eligible, shipping_fee, body.address.state)

    # Free shipping threshold for Lagos evaluates after coupon
    if body.address.state.lower() == "lagos" and (subtotal - discount) >= float(settings.free_shipping_threshold_lagos):
        shipping_fee = 0.0

    total = max(0.0, subtotal - discount) + shipping_fee

    # Address
    addr = Address(order_id=order.id, name=body.address.name, phone=body.address.phone, state=body.address.state, city=body.address.city, street=body.address.street)
    db.add(addr)

    # Reservations (optional) - temporarily disabled for debugging
    if False:  # settings.enable_reservations:
        for it in items:
            inv = (await db.execute(select(Inventory).where(Inventory.variant_id == it.variant_id))).scalar_one_or_none()
            if not inv:
                # Skip reservation if inventory doesn't exist (allows checkout without inventory setup)
                print(f"Warning: No inventory record for variant {it.variant_id}, skipping reservation")
                continue
            # compute already reserved
            active_reserved = (await db.execute(select(func.coalesce(func.sum(Reservation.qty), 0)).where(and_(Reservation.variant_id == it.variant_id, Reservation.status == ReservationStatus.active, Reservation.expires_at > datetime.now(timezone.utc))))).scalar_one()
            available = (inv.quantity - inv.safety_stock) - int(active_reserved)
            if it.qty > max(0, available):
                raise HTTPException(status_code=409, detail="Insufficient stock to reserve")
            expires = datetime.now(timezone.utc) + timedelta(minutes=15)
            db.add(Reservation(cart_id=cart.id, variant_id=it.variant_id, qty=it.qty, status=ReservationStatus.active, expires_at=expires))

    order.totals = {
        "subtotal": round(subtotal, 2),
        "subtotal_eligible": round(subtotal_eligible, 2),
        "discount": round(discount, 2),
        "shipping_fee": round(shipping_fee, 2),
        "total": round(total, 2),
        "state": body.address.state,
        "coupon": applied_code,
    }

    # Initialize Paystack
    amount_kobo = int(round(total * 100))
    reference = f"MDV-{order.id}-{int(datetime.now(timezone.utc).timestamp())}"
    order.payment_ref = reference

    # Default to mock URL when no secret is configured (dev fallback)
    authorization_url = f"{settings.app_url}/paystack-mock?order_id={order.id}&ref={reference}"

    # Call Paystack initialize in non-dev environments when key is set
    if settings.paystack_secret_key and settings.paystack_secret_key != "sk_test_xxx":
        # Log webhook URL for debugging
        webhook_url = f"{settings.app_url.replace('mdv-web', 'mdv-api')}/api/paystack/webhook"
        print(f"[CHECKOUT] Webhook URL should be configured in Paystack dashboard: {webhook_url}")
        print(f"[CHECKOUT] Callback URL: {settings.app_url}/checkout/callback?order_id={order.id}&ref={reference}")

        init_payload = {
            "email": body.email,
            "amount": amount_kobo,
            "reference": reference,
            "currency": "NGN",
            "callback_url": f"{settings.app_url}/checkout/callback?order_id={order.id}&ref={reference}",
        }
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    "https://api.paystack.co/transaction/initialize",
                    headers={
                        "Authorization": f"Bearer {settings.paystack_secret_key}",
                        "Content-Type": "application/json",
                    },
                    json=init_payload,
                )
                data = resp.json()
                if resp.status_code >= 400 or not data.get("status"):
                    raise HTTPException(status_code=502, detail=f"Paystack init failed: {data.get('message') or resp.text}")
                authorization_url = data["data"]["authorization_url"]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail="Failed to initialize payment") from e

    await db.commit()
    return CheckoutInitResponse(order_id=order.id, authorization_url=authorization_url, reference=reference, totals=order.totals)


@router.get("/api/navigation/categories")
async def get_navigation_categories(db: AsyncSession = Depends(get_db)):
    """Get categories for navigation with product counts."""
    # Query categories with product counts
    query = (
        select(
            Category.id,
            Category.name,
            Category.slug,
            func.count(Product.id).label("product_count")
        )
        .outerjoin(Product, Category.id == Product.category_id)
        .group_by(Category.id, Category.name, Category.slug)
        .order_by(Category.name)
    )

    result = await db.execute(query)
    categories = []

    for row in result:
        categories.append({
            "id": row.id,
            "name": row.name,
            "slug": row.slug,
            "product_count": row.product_count or 0
        })

    return {"categories": categories}

