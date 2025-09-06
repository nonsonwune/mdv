from __future__ import annotations

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Literal


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "mdv-api"
    version: str = "0.1.0"


class VariantOut(BaseModel):
    id: int
    sku: str
    size: Optional[str] = None
    color: Optional[str] = None
    price: float
    stock_quantity: Optional[int] = None
    stock_status: Optional[str] = None


class ProductOut(BaseModel):
    id: int
    title: str
    slug: str
    description: Optional[str] = None
    compare_at_price: Optional[float] = None
    variants: List[VariantOut] = []
    images: Optional[list[dict]] = None
    # Inventory data
    total_stock: Optional[int] = None
    stock_status: Optional[str] = None
    # Review data
    average_rating: Optional[float] = None
    review_count: Optional[int] = None


class Paginated(BaseModel):
    items: list
    total: int = Field(ge=0, default=0)
    page: int = Field(ge=1, default=1)
    page_size: int = Field(ge=1, default=20)


class CartCreateResponse(BaseModel):
    id: int


class CartItemIn(BaseModel):
    variant_id: int
    qty: int = Field(ge=1)


class CartItemOut(BaseModel):
    id: int
    variant_id: int
    qty: int
    # Optional enrichments used by web UI
    title: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None


class CartOut(BaseModel):
    id: int
    items: List[CartItemOut]


class AddressIn(BaseModel):
    name: str
    phone: str
    state: str
    city: str
    street: str


class CheckoutInitRequest(BaseModel):
    cart_id: int
    address: AddressIn
    email: str
    coupon_code: Optional[str] = None


class CheckoutInitResponse(BaseModel):
    order_id: int
    authorization_url: str
    reference: str
    totals: dict


class CartItemQtyUpdate(BaseModel):
    qty: int = Field(ge=1)


class ShippingEstimate(BaseModel):
    shipping_fee: float
    free_shipping_eligible: bool
    reason: Optional[str] = None


class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User data response schema that matches frontend User interface."""
    id: str
    name: str
    email: str
    role: str
    active: bool
    created_at: str
    phone: Optional[str] = None


class AuthLoginResponse(BaseModel):
    access_token: Optional[str] = None
    token: Optional[str] = None  # For backward compatibility
    role: str
    token_type: str = "bearer"
    force_password_change: Optional[bool] = None
    user_id: Optional[int] = None
    message: Optional[str] = None
    user: Optional[UserResponse] = None  # Complete user data for immediate frontend context

