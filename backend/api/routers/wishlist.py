"""
Wishlist management endpoints with database persistence.
"""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from datetime import datetime

from mdv.auth import get_current_claims
from mdv.models import (
    User, Product, Variant, Cart, CartItem,
    Wishlist, WishlistItem, ProductImage, Inventory
)
from ..deps import get_db

router = APIRouter(prefix="/api/wishlist", tags=["wishlist"])


# Schemas
class WishlistItemResponse(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    product_name: str
    product_slug: str
    price: float
    image_url: Optional[str] = None
    added_at: datetime
    in_stock: bool = True

class WishlistResponse(BaseModel):
    user_id: int
    items: List[WishlistItemResponse]
    total_items: int
    created_at: datetime
    updated_at: datetime

class AddToWishlistRequest(BaseModel):
    product_id: int
    variant_id: Optional[int] = None

class MoveToCartRequest(BaseModel):
    item_id: int
    cart_id: Optional[int] = None  # If not provided, create new cart


# Get wishlist
@router.get("", response_model=WishlistResponse)
async def get_wishlist(
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Get the current user's wishlist."""
    user_id = int(claims["sub"])
    
    # Get or create wishlist
    result = await db.execute(
        select(Wishlist)
        .options(selectinload(Wishlist.items).selectinload(WishlistItem.product),
                 selectinload(Wishlist.items).selectinload(WishlistItem.variant))
        .where(Wishlist.user_id == user_id)
    )
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        # Create new wishlist
        wishlist = Wishlist(user_id=user_id)
        db.add(wishlist)
        await db.commit()
        await db.refresh(wishlist)
    
    # Enrich items with product data
    enriched_items = []
    for item in wishlist.items:
        if item.product:
            # Get primary image
            image_url = None
            image_result = await db.execute(
                select(ProductImage)
                .where(ProductImage.product_id == item.product_id)
                .order_by(ProductImage.is_primary.desc(), ProductImage.sort_order.asc())
                .limit(1)
            )
            image = image_result.scalar_one_or_none()
            if image:
                image_url = image.url
            
            # Get price from variant or product
            price = float(item.variant.price) if item.variant else float(item.product.compare_at_price or 0)
            
            # Check inventory
            in_stock = True
            if item.variant:
                inv_result = await db.execute(
                    select(Inventory).where(Inventory.variant_id == item.variant_id)
                )
                inventory = inv_result.scalar_one_or_none()
                in_stock = inventory.available > 0 if inventory else False
            
            enriched_items.append(WishlistItemResponse(
                id=item.id,
                product_id=item.product_id,
                variant_id=item.variant_id,
                product_name=item.product.title,
                product_slug=item.product.slug,
                price=price,
                image_url=image_url,
                added_at=item.added_at,
                in_stock=in_stock
            ))
    
    return WishlistResponse(
        user_id=user_id,
        items=enriched_items,
        total_items=len(enriched_items),
        created_at=wishlist.created_at,
        updated_at=wishlist.updated_at
    )


# Add to wishlist
@router.post("/items", response_model=dict)
async def add_to_wishlist(
    request: AddToWishlistRequest,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Add an item to the wishlist."""
    user_id = int(claims["sub"])
    
    # Verify product exists
    product = await db.get(Product, request.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Verify variant if provided
    if request.variant_id:
        variant = await db.get(Variant, request.variant_id)
        if not variant or variant.product_id != request.product_id:
            raise HTTPException(status_code=404, detail="Variant not found")
    
    # Get or create wishlist
    result = await db.execute(
        select(Wishlist).where(Wishlist.user_id == user_id)
    )
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        wishlist = Wishlist(user_id=user_id)
        db.add(wishlist)
        await db.flush()
    
    # Check if item already in wishlist
    existing_result = await db.execute(
        select(WishlistItem).where(
            and_(
                WishlistItem.wishlist_id == wishlist.id,
                WishlistItem.product_id == request.product_id,
                WishlistItem.variant_id == request.variant_id
            )
        )
    )
    existing_item = existing_result.scalar_one_or_none()
    
    if existing_item:
        return {"message": "Item already in wishlist", "item_id": existing_item.id}
    
    # Add new item
    new_item = WishlistItem(
        wishlist_id=wishlist.id,
        product_id=request.product_id,
        variant_id=request.variant_id
    )
    db.add(new_item)
    await db.commit()
    
    # Get total items
    count_result = await db.execute(
        select(WishlistItem).where(WishlistItem.wishlist_id == wishlist.id)
    )
    total_items = len(count_result.scalars().all())
    
    return {
        "message": "Item added to wishlist",
        "item_id": new_item.id,
        "total_items": total_items
    }


# Remove from wishlist
@router.delete("/items/{item_id}")
async def remove_from_wishlist(
    item_id: int,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Remove an item from the wishlist."""
    user_id = int(claims["sub"])
    
    # Get wishlist
    result = await db.execute(
        select(Wishlist).where(Wishlist.user_id == user_id)
    )
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    
    # Find and remove item
    item_result = await db.execute(
        select(WishlistItem).where(
            and_(
                WishlistItem.wishlist_id == wishlist.id,
                WishlistItem.id == item_id
            )
        )
    )
    item = item_result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found in wishlist")
    
    await db.delete(item)
    await db.commit()
    
    # Get remaining items count
    count_result = await db.execute(
        select(WishlistItem).where(WishlistItem.wishlist_id == wishlist.id)
    )
    total_items = len(count_result.scalars().all())
    
    return {
        "message": "Item removed from wishlist",
        "total_items": total_items
    }


# Move to cart
@router.post("/items/{item_id}/move-to-cart", response_model=dict)
async def move_to_cart(
    item_id: int,
    request: Optional[MoveToCartRequest] = None,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Move an item from wishlist to cart."""
    user_id = int(claims["sub"])
    
    # Get wishlist
    wishlist_result = await db.execute(
        select(Wishlist).where(Wishlist.user_id == user_id)
    )
    wishlist = wishlist_result.scalar_one_or_none()
    
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    
    # Find item in wishlist
    item_result = await db.execute(
        select(WishlistItem).where(
            and_(
                WishlistItem.wishlist_id == wishlist.id,
                WishlistItem.id == item_id
            )
        )
    )
    wishlist_item = item_result.scalar_one_or_none()
    
    if not wishlist_item:
        raise HTTPException(status_code=404, detail="Item not found in wishlist")
    
    # Get or create cart
    cart_id = request.cart_id if request else None
    if not cart_id:
        # Create new cart
        cart = Cart()
        db.add(cart)
        await db.flush()
        cart_id = cart.id
    else:
        # Verify cart exists
        cart = await db.get(Cart, cart_id)
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")
    
    # Determine variant to add
    variant_id = wishlist_item.variant_id
    if not variant_id:
        # Get default variant for product
        result = await db.execute(
            select(Variant).where(Variant.product_id == wishlist_item.product_id).limit(1)
        )
        variant = result.scalar_one_or_none()
        if not variant:
            raise HTTPException(status_code=404, detail="No variant available for product")
        variant_id = variant.id
    
    # Check if item already in cart
    existing_cart_item = await db.execute(
        select(CartItem).where(
            and_(CartItem.cart_id == cart_id, CartItem.variant_id == variant_id)
        )
    )
    existing = existing_cart_item.scalar_one_or_none()
    
    if existing:
        # Update quantity
        existing.qty += 1
    else:
        # Add new cart item
        cart_item = CartItem(
            cart_id=cart_id,
            variant_id=variant_id,
            qty=1
        )
        db.add(cart_item)
    
    # Remove from wishlist
    await db.delete(wishlist_item)
    await db.commit()
    
    # Get remaining wishlist items count
    count_result = await db.execute(
        select(WishlistItem).where(WishlistItem.wishlist_id == wishlist.id)
    )
    items_remaining = len(count_result.scalars().all())
    
    return {
        "message": "Item moved to cart",
        "cart_id": cart_id,
        "wishlist_items_remaining": items_remaining
    }


# Clear wishlist
@router.delete("")
async def clear_wishlist(
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Clear all items from the wishlist."""
    user_id = int(claims["sub"])
    
    # Get wishlist
    result = await db.execute(
        select(Wishlist).where(Wishlist.user_id == user_id)
    )
    wishlist = result.scalar_one_or_none()
    
    if wishlist:
        # Delete all items
        await db.execute(
            delete(WishlistItem).where(WishlistItem.wishlist_id == wishlist.id)
        )
        await db.commit()
    
    return {"message": "Wishlist cleared"}


# Create wishlist (explicit creation)
@router.post("", response_model=dict)
async def create_wishlist(
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Create a new wishlist for the user."""
    user_id = int(claims["sub"])
    
    # Check if wishlist already exists
    result = await db.execute(
        select(Wishlist).where(Wishlist.user_id == user_id)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        return {"message": "Wishlist already exists", "user_id": user_id}
    
    # Create new wishlist
    wishlist = Wishlist(user_id=user_id)
    db.add(wishlist)
    await db.commit()
    
    return {"message": "Wishlist created", "user_id": user_id}
