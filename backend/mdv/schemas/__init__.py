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


class ProductOut(BaseModel):
    id: int
    title: str
    slug: str
    description: Optional[str] = None
    compare_at_price: Optional[float] = None
    variants: List[VariantOut] = []
    images: Optional[list[dict]] = None
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


class AuthLoginResponse(BaseModel):
    access_token: Optional[str] = None
    token: Optional[str] = None  # For backward compatibility
    role: str
    token_type: str = "bearer"
    force_password_change: Optional[bool] = None
    user_id: Optional[int] = None
    message: Optional[str] = None

