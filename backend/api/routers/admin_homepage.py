"""
Admin homepage configuration endpoints.
"""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, text
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
            "categories_enabled": config.categories_enabled
        }
        
        # Update existing config
        config.hero_title = request.hero_title
        config.hero_subtitle = request.hero_subtitle
        config.hero_cta_text = request.hero_cta_text
        config.hero_image_url = request.hero_image_url
        config.categories_enabled = request.categories_enabled
    else:
        # Create new config
        old_values = None
        config = HomepageConfig(
            hero_title=request.hero_title,
            hero_subtitle=request.hero_subtitle,
            hero_cta_text=request.hero_cta_text,
            hero_image_url=request.hero_image_url,
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



@router.post("/migrate-remove-featured-products")
async def migrate_remove_featured_products(
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.SYSTEM_SETTINGS))
):
    """
    Migration endpoint to remove featured_product_ids column from homepage_config table.
    """
    try:
        # Execute the migration SQL
        await db.execute(text("ALTER TABLE homepage_config DROP COLUMN IF EXISTS featured_product_ids"))
        await db.commit()

        return {
            "success": True,
            "message": "Successfully removed featured_product_ids column from homepage_config table"
        }
    except Exception as e:
        await db.rollback()
        return {
            "success": False,
            "message": f"Migration failed: {str(e)}"
        }


@router.post("/create-table")
async def create_homepage_config_table(
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.SYSTEM_SETTINGS))
):
    """
    Emergency endpoint to create homepage_config table if it doesn't exist.
    This is a temporary fix for migration issues.
    """

    try:
        # Check if table exists
        result = await db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'homepage_config'
            );
        """))
        table_exists = result.scalar()

        if table_exists:
            return {"message": "Table already exists", "created": False}

        # Create the table
        await db.execute(text("""
            CREATE TABLE homepage_config (
                id SERIAL PRIMARY KEY,
                hero_title VARCHAR(255),
                hero_subtitle VARCHAR(500),
                hero_cta_text VARCHAR(100),
                hero_image_url VARCHAR(500),
                featured_product_ids JSON,
                categories_enabled BOOLEAN,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))

        await db.commit()

        return {"message": "Table created successfully", "created": True}

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create table: {str(e)}"
        )
