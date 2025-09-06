"""
Admin homepage configuration endpoints.
"""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from mdv.auth import get_current_claims
from mdv.rbac import Permission, require_permission
from mdv.models import HomepageConfig, Product, ProductImage, Variant
from mdv.schemas.homepage import (
    HomepageConfigRequest, HomepageConfigResponse, 
    FeaturedProductCandidate, PublicHomepageConfig
)
from mdv.audit import AuditService, AuditAction, AuditEntity
from ..deps import get_db

router = APIRouter(prefix="/api/admin/homepage", tags=["admin-homepage"])


def parse_actor_id(claims: dict) -> int:
    """Parse actor ID from JWT claims."""
    return int(claims.get("sub", 0))


@router.get("/config", response_model=HomepageConfigResponse)
async def get_homepage_config(
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.SYSTEM_SETTINGS))
):
    """Get current homepage configuration."""
    result = await db.execute(select(HomepageConfig).order_by(HomepageConfig.id.desc()).limit(1))
    config = result.scalar_one_or_none()
    
    if not config:
        # Create default configuration
        config = HomepageConfig(
            hero_title="Maison De Valeur",
            hero_subtitle="Discover affordable essentials and last-season fashion pieces. Quality style that doesn't break the bank, exclusively for Nigeria.",
            hero_cta_text="Shop Now",
            featured_product_ids=[],
            categories_enabled=True
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
    
    return config


@router.put("/config", response_model=HomepageConfigResponse)
async def update_homepage_config(
    request: HomepageConfigRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.SYSTEM_SETTINGS))
):
    """Update homepage configuration."""
    actor_id = parse_actor_id(claims)
    
    # Get existing config or create new one
    result = await db.execute(select(HomepageConfig).order_by(HomepageConfig.id.desc()).limit(1))
    config = result.scalar_one_or_none()
    
    if config:
        # Store old values for audit
        old_values = {
            "hero_title": config.hero_title,
            "hero_subtitle": config.hero_subtitle,
            "hero_cta_text": config.hero_cta_text,
            "hero_image_url": config.hero_image_url,
            "featured_product_ids": config.featured_product_ids,
            "categories_enabled": config.categories_enabled
        }
        
        # Update existing config
        config.hero_title = request.hero_title
        config.hero_subtitle = request.hero_subtitle
        config.hero_cta_text = request.hero_cta_text
        config.hero_image_url = request.hero_image_url
        config.featured_product_ids = request.featured_product_ids
        config.categories_enabled = request.categories_enabled
    else:
        # Create new config
        old_values = None
        config = HomepageConfig(
            hero_title=request.hero_title,
            hero_subtitle=request.hero_subtitle,
            hero_cta_text=request.hero_cta_text,
            hero_image_url=request.hero_image_url,
            featured_product_ids=request.featured_product_ids,
            categories_enabled=request.categories_enabled
        )
        db.add(config)
    
    await db.flush()
    
    # Audit log
    await AuditService.log_event(
        action=AuditAction.UPDATE if old_values else AuditAction.CREATE,
        entity=AuditEntity.SYSTEM,
        entity_id=config.id,
        before=old_values,
        after={
            "hero_title": config.hero_title,
            "hero_subtitle": config.hero_subtitle,
            "hero_cta_text": config.hero_cta_text,
            "hero_image_url": config.hero_image_url,
            "featured_product_ids": config.featured_product_ids,
            "categories_enabled": config.categories_enabled
        },
        actor_id=actor_id,
        session=db
    )
    
    await db.commit()
    await db.refresh(config)
    
    return config


@router.get("/featured-candidates", response_model=List[FeaturedProductCandidate])
async def get_featured_product_candidates(
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.SYSTEM_SETTINGS))
):
    """Get products that can be featured on homepage."""
    # Get current featured product IDs
    config_result = await db.execute(select(HomepageConfig).order_by(HomepageConfig.id.desc()).limit(1))
    config = config_result.scalar_one_or_none()
    featured_ids = config.featured_product_ids if config else []
    
    # Get products with basic info
    query = (
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.variants).selectinload(Variant.inventory)
        )
        .order_by(Product.created_at.desc())
        .limit(50)  # Limit for performance
    )
    
    result = await db.execute(query)
    products = result.scalars().all()
    
    candidates = []
    for product in products:
        # Get primary image
        primary_image = next((img for img in product.images if img.is_primary), None)
        if not primary_image and product.images:
            primary_image = product.images[0]
        
        # Calculate min price and total inventory
        min_price = None
        total_inventory = 0
        
        if product.variants:
            prices = [float(v.price) for v in product.variants]
            min_price = min(prices) if prices else None
            
            for variant in product.variants:
                if variant.inventory:
                    total_inventory += variant.inventory.quantity
        
        candidates.append(FeaturedProductCandidate(
            id=product.id,
            title=product.title,
            slug=product.slug,
            image_url=primary_image.url if primary_image else None,
            min_price=min_price,
            total_inventory=total_inventory,
            is_featured=product.id in featured_ids
        ))
    
    return candidates
