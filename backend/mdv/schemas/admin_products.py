"""
Pydantic schemas for admin product management.
"""
from __future__ import annotations

from pydantic import BaseModel, Field, validator, ConfigDict
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime


# Request Schemas
class VariantCreateRequest(BaseModel):
    """Schema for creating a new product variant."""
    sku: str = Field(..., min_length=1, max_length=64, description="Unique SKU for the variant")
    size: Optional[str] = Field(None, max_length=64, description="Size of the variant")
    color: Optional[str] = Field(None, max_length=64, description="Color of the variant")
    price: Decimal = Field(..., gt=0, decimal_places=2, description="Price of the variant")
    initial_quantity: int = Field(0, ge=0, description="Initial inventory quantity")
    safety_stock: int = Field(0, ge=0, description="Minimum stock level for alerts")
    
    @validator('sku')
    def validate_sku(cls, v):
        """Ensure SKU is uppercase and contains no spaces."""
        return v.upper().replace(' ', '-')


class ProductCreateRequest(BaseModel):
    """Schema for creating a new product."""
    title: str = Field(..., min_length=1, max_length=255, description="Product title")
    slug: Optional[str] = Field(None, max_length=255, description="URL-friendly slug")
    description: Optional[str] = Field(None, description="Product description")
    category_id: int = Field(..., description="Category ID")
    compare_at_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2, description="Original price for comparison")
    variants: List[VariantCreateRequest] = Field(..., min_items=1, description="Product variants")
    flags: Optional[Dict[str, Any]] = Field(None, description="Additional product flags/metadata")
    
    @validator('slug')
    def generate_slug(cls, v, values):
        """Generate slug from title if not provided."""
        if not v and 'title' in values:
            import re
            slug = re.sub(r'[^\w\s-]', '', values['title'].lower())
            slug = re.sub(r'[-\s]+', '-', slug)
            return slug.strip('-')
        return v
    
    @validator('variants')
    def validate_unique_skus(cls, v):
        """Ensure all variant SKUs are unique within the product."""
        skus = [variant.sku for variant in v]
        if len(skus) != len(set(skus)):
            raise ValueError("All variant SKUs must be unique")
        return v


class VariantUpdateRequest(BaseModel):
    """Schema for updating a variant."""
    sku: Optional[str] = Field(None, min_length=1, max_length=64)
    size: Optional[str] = Field(None, max_length=64)
    color: Optional[str] = Field(None, max_length=64)
    price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    
    @validator('sku')
    def validate_sku(cls, v):
        """Ensure SKU is uppercase and contains no spaces."""
        if v:
            return v.upper().replace(' ', '-')
        return v


class ProductUpdateRequest(BaseModel):
    """Schema for updating a product."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    category_id: Optional[int] = None
    compare_at_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    flags: Optional[Dict[str, Any]] = None


class InventoryUpdateRequest(BaseModel):
    """Schema for updating inventory levels."""
    quantity: int = Field(..., ge=0, description="New quantity level")
    safety_stock: Optional[int] = Field(None, ge=0, description="New safety stock level")
    reason: str = Field(..., min_length=1, max_length=80, description="Reason for adjustment")
    reference_type: Optional[str] = Field(None, max_length=80, description="Reference type (e.g., 'purchase_order')")
    reference_id: Optional[int] = Field(None, description="Reference ID")


class BulkInventoryAdjustRequest(BaseModel):
    """Schema for bulk inventory adjustments."""
    adjustments: List[InventoryAdjustItem]
    reason: str = Field(..., min_length=1, max_length=80, description="Reason for bulk adjustment")
    reference_type: Optional[str] = Field(None, max_length=80)
    reference_id: Optional[int] = None


class InventoryAdjustItem(BaseModel):
    """Individual item in bulk inventory adjustment."""
    variant_id: int = Field(..., description="Variant ID to adjust")
    delta: int = Field(..., description="Change in quantity (positive or negative)")
    safety_stock: Optional[int] = Field(None, ge=0, description="New safety stock level")


class InventorySyncRequest(BaseModel):
    """Schema for inventory synchronization/reconciliation."""
    counts: List[InventorySyncItem]
    reason: str = Field(default="Physical count reconciliation")


class InventorySyncItem(BaseModel):
    """Individual item in inventory sync."""
    variant_id: int
    counted_quantity: int = Field(..., ge=0)
    safety_stock: Optional[int] = Field(None, ge=0)


# Response Schemas
class ImageResponse(BaseModel):
    """Schema for image data in responses."""
    id: int
    url: str
    alt_text: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    sort_order: int = 0
    is_primary: bool = False
    public_id: Optional[str] = None
    responsive_urls: Optional[Dict[str, str]] = None


class ImageUploadResponse(BaseModel):
    """Response schema for image upload."""
    id: int
    product_id: int
    url: str
    public_id: str
    width: Optional[int] = None
    height: Optional[int] = None
    size: Optional[int] = None
    format: Optional[str] = None
    responsive_urls: Dict[str, str]
    message: str = "Image uploaded successfully"


class InventoryResponse(BaseModel):
    """Schema for inventory data in responses."""
    variant_id: int
    quantity: int
    safety_stock: int
    available: int  # quantity - reserved
    reserved: int = 0
    low_stock: bool = False
    
    model_config = ConfigDict(from_attributes=True)


class VariantDetailResponse(BaseModel):
    """Detailed variant response with inventory."""
    id: int
    product_id: int
    sku: str
    size: Optional[str] = None
    color: Optional[str] = None
    price: Decimal
    inventory: Optional[InventoryResponse] = None
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class ProductDetailResponse(BaseModel):
    """Detailed product response with all related data."""
    id: int
    title: str
    slug: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    compare_at_price: Optional[Decimal] = None
    flags: Optional[Dict[str, Any]] = None
    variants: List[VariantDetailResponse]
    images: List[ImageResponse]
    total_inventory: int = 0
    low_stock_variants: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    """Product list item for admin dashboard."""
    id: int
    title: str
    slug: str
    category_name: Optional[str] = None
    variant_count: int
    total_inventory: int
    low_stock_count: int
    image_url: Optional[str] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class LowStockAlert(BaseModel):
    """Schema for low stock alerts."""
    variant_id: int
    product_id: int
    product_title: str
    sku: str
    size: Optional[str] = None
    color: Optional[str] = None
    current_quantity: int
    safety_stock: int
    shortage: int  # How many units below safety stock
    
    model_config = ConfigDict(from_attributes=True)


class CategoryResponse(BaseModel):
    """Category response schema."""
    id: int
    name: str
    slug: str
    product_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class CategoryCreateRequest(BaseModel):
    """Schema for creating a category."""
    name: str = Field(..., min_length=1, max_length=120)
    slug: Optional[str] = Field(None, max_length=160)
    
    @validator('slug')
    def generate_slug(cls, v, values):
        """Generate slug from name if not provided."""
        if not v and 'name' in values:
            import re
            slug = re.sub(r'[^\w\s-]', '', values['name'].lower())
            slug = re.sub(r'[-\s]+', '-', slug)
            return slug.strip('-')
        return v


class CategoryUpdateRequest(BaseModel):
    """Schema for updating a category."""
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    slug: Optional[str] = Field(None, max_length=160)


class BulkDeleteRequest(BaseModel):
    """Schema for bulk delete operations."""
    ids: List[int] = Field(..., min_items=1)
    force: bool = Field(False, description="Force delete even if there are dependencies")


class OperationResponse(BaseModel):
    """Generic response for admin operations."""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    errors: Optional[List[str]] = None


class PaginatedResponse(BaseModel):
    """Generic paginated response."""
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool
