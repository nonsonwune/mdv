"""
Wishlist management endpoints.
"""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from datetime import datetime

from backend.mdv.auth import get_current_claims
from backend.mdv.models import User, Product, Variant, Cart, CartItem
from ..deps import get_db

router = APIRouter(prefix="/api/wishlist", tags=["wishlist"])

# Note: We need to create a Wishlist model. For now, we'll use a simple implementation
# In production, this should be a proper database table

# Temporary in-memory storage for wishlist (should be database table)
user_wishlists = {}


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
    
    # TODO: Replace with database query when Wishlist model is created
    if user_id not in user_wishlists:
        user_wishlists[user_id] = {
            "items": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    
    wishlist = user_wishlists[user_id]
    
    # Enrich items with product data
    enriched_items = []
    for item in wishlist["items"]:
        product = await db.get(Product, item["product_id"])
        if product:
            # Get primary image if exists
            image_url = None
            if product.images:
                primary_image = next((img for img in product.images if img.get("is_primary")), None)
                if primary_image:
                    image_url = primary_image.get("url")
                elif product.images:
                    image_url = product.images[0].get("url")
            
            # Get price from variant or product
            price = product.compare_at_price or 0
            if item.get("variant_id"):
                variant = await db.get(Variant, item["variant_id"])
                if variant:
                    price = float(variant.price)
            
            enriched_items.append(WishlistItemResponse(
                id=item["id"],
                product_id=item["product_id"],
                variant_id=item.get("variant_id"),
                product_name=product.title,
                product_slug=product.slug,
                price=price,
                image_url=image_url,
                added_at=item["added_at"],
                in_stock=True  # TODO: Check actual inventory
            ))
    
    return WishlistResponse(
        user_id=user_id,
        items=enriched_items,
        total_items=len(enriched_items),
        created_at=wishlist["created_at"],
        updated_at=wishlist["updated_at"]
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
    
    # TODO: Replace with database operations when Wishlist model is created
    if user_id not in user_wishlists:
        user_wishlists[user_id] = {
            "items": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    
    wishlist = user_wishlists[user_id]
    
    # Check if item already in wishlist
    existing_item = next(
        (item for item in wishlist["items"] 
         if item["product_id"] == request.product_id and 
         item.get("variant_id") == request.variant_id),
        None
    )
    
    if existing_item:
        return {"message": "Item already in wishlist", "item_id": existing_item["id"]}
    
    # Add new item
    new_item = {
        "id": len(wishlist["items"]) + 1,
        "product_id": request.product_id,
        "variant_id": request.variant_id,
        "added_at": datetime.utcnow()
    }
    wishlist["items"].append(new_item)
    wishlist["updated_at"] = datetime.utcnow()
    
    return {
        "message": "Item added to wishlist",
        "item_id": new_item["id"],
        "total_items": len(wishlist["items"])
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
    
    # TODO: Replace with database operations when Wishlist model is created
    if user_id not in user_wishlists:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    
    wishlist = user_wishlists[user_id]
    
    # Find and remove item
    item_index = next(
        (i for i, item in enumerate(wishlist["items"]) if item["id"] == item_id),
        None
    )
    
    if item_index is None:
        raise HTTPException(status_code=404, detail="Item not found in wishlist")
    
    wishlist["items"].pop(item_index)
    wishlist["updated_at"] = datetime.utcnow()
    
    return {
        "message": "Item removed from wishlist",
        "total_items": len(wishlist["items"])
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
    
    # TODO: Replace with database operations when Wishlist model is created
    if user_id not in user_wishlists:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    
    wishlist = user_wishlists[user_id]
    
    # Find item in wishlist
    wishlist_item = next(
        (item for item in wishlist["items"] if item["id"] == item_id),
        None
    )
    
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
    variant_id = wishlist_item.get("variant_id")
    if not variant_id:
        # Get default variant for product
        result = await db.execute(
            select(Variant).where(Variant.product_id == wishlist_item["product_id"]).limit(1)
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
    wishlist["items"] = [item for item in wishlist["items"] if item["id"] != item_id]
    wishlist["updated_at"] = datetime.utcnow()
    
    await db.commit()
    
    return {
        "message": "Item moved to cart",
        "cart_id": cart_id,
        "wishlist_items_remaining": len(wishlist["items"])
    }


# Clear wishlist
@router.delete("")
async def clear_wishlist(
    claims: dict = Depends(get_current_claims)
):
    """Clear all items from the wishlist."""
    user_id = int(claims["sub"])
    
    # TODO: Replace with database operations when Wishlist model is created
    if user_id in user_wishlists:
        user_wishlists[user_id] = {
            "items": [],
            "created_at": user_wishlists[user_id]["created_at"],
            "updated_at": datetime.utcnow()
        }
    
    return {"message": "Wishlist cleared"}


# Create wishlist (explicit creation)
@router.post("", response_model=dict)
async def create_wishlist(
    claims: dict = Depends(get_current_claims)
):
    """Create a new wishlist for the user."""
    user_id = int(claims["sub"])
    
    # TODO: Replace with database operations when Wishlist model is created
    if user_id not in user_wishlists:
        user_wishlists[user_id] = {
            "items": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        return {"message": "Wishlist created", "user_id": user_id}
    
    return {"message": "Wishlist already exists", "user_id": user_id}
