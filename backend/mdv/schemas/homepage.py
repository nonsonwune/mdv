"""
Pydantic schemas for homepage configuration.
"""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime


class HomepageConfigRequest(BaseModel):
    """Request schema for updating homepage configuration."""
    hero_title: str = Field(..., min_length=1, max_length=255, description="Hero section title")
    hero_subtitle: Optional[str] = Field(None, max_length=1000, description="Hero section subtitle")
    hero_cta_text: str = Field(..., min_length=1, max_length=100, description="Hero section CTA button text")
    hero_image_url: Optional[str] = Field(None, max_length=500, description="Hero section background image URL")
    categories_enabled: bool = Field(True, description="Whether to show categories showcase")


class HomepageConfigResponse(BaseModel):
    """Response schema for homepage configuration."""
    id: int
    hero_title: str
    hero_subtitle: Optional[str] = None
    hero_cta_text: str
    hero_image_url: Optional[str] = None
    categories_enabled: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FeaturedProductCandidate(BaseModel):
    """Schema for products that can be featured."""
    id: int
    title: str
    slug: str
    image_url: Optional[str] = None
    min_price: Optional[float] = None
    total_inventory: int
    is_featured: bool = False

    class Config:
        from_attributes = True


class PublicHomepageConfig(BaseModel):
    """Public homepage configuration for frontend consumption."""
    hero_title: str
    hero_subtitle: Optional[str] = None
    hero_cta_text: str
    hero_image_url: Optional[str] = None
    categories_enabled: bool
