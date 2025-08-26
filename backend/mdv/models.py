from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


# Enums
class Role(str, enum.Enum):
    admin = "admin"
    supervisor = "supervisor"
    operations = "operations"
    logistics = "logistics"


class OrderStatus(str, enum.Enum):
    pending_payment = "PendingPayment"
    paid = "Paid"
    cancelled = "Cancelled"
    refunded = "Refunded"


class FulfillmentStatus(str, enum.Enum):
    processing = "Processing"
    ready_to_ship = "ReadyToShip"


class ShipmentStatus(str, enum.Enum):
    dispatched = "Dispatched"
    in_transit = "InTransit"
    delivered = "Delivered"
    returned = "Returned"


class ReservationStatus(str, enum.Enum):
    active = "Active"
    released = "Released"
    consumed = "Consumed"
    expired = "Expired"


class RefundMethod(str, enum.Enum):
    paystack = "paystack"
    manual = "manual"


# Core
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Hashed password for customers
    role: Mapped[Role] = mapped_column(SAEnum(Role, name="role"), default=Role.operations, index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(120))
    entity: Mapped[str] = mapped_column(String(120))
    entity_id: Mapped[int] = mapped_column(Integer)
    before: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    after: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# Catalog
class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    # Relationships
    products: Mapped[list["Product"]] = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    flags: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    compare_at_price: Mapped[Optional[Numeric]] = mapped_column(Numeric(12, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    # Relationships
    images: Mapped[list["ProductImage"]] = relationship("ProductImage", cascade="all, delete-orphan", lazy="selectin")
    variants: Mapped[list["Variant"]] = relationship("Variant", cascade="all, delete-orphan", lazy="selectin")
    category: Mapped[Optional["Category"]] = relationship("Category", back_populates="products")


class Variant(Base):
    __tablename__ = "variants"
    __table_args__ = (UniqueConstraint("sku", name="uq_variants_sku"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="CASCADE"), index=True)
    sku: Mapped[str] = mapped_column(String(64))
    size: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    price: Mapped[Numeric] = mapped_column(Numeric(12, 2))
    # Relationships
    inventory: Mapped[Optional["Inventory"]] = relationship("Inventory", back_populates="variant", uselist=False)


class Inventory(Base):
    __tablename__ = "inventory"

    variant_id: Mapped[int] = mapped_column(Integer, ForeignKey("variants.id", ondelete="CASCADE"), primary_key=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    safety_stock: Mapped[int] = mapped_column(Integer, default=0)
    # Relationships
    variant: Mapped["Variant"] = relationship("Variant", back_populates="inventory")


class StockLedger(Base):
    __tablename__ = "stock_ledger"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    variant_id: Mapped[int] = mapped_column(Integer, ForeignKey("variants.id", ondelete="CASCADE"), index=True)
    delta: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(80))
    ref_type: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    ref_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# Media
class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String(500))
    public_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Cloudinary public_id for deletion
    alt_text: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)


# Cart & Reservation
class Cart(Base):
    __tablename__ = "carts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("cart_id", "variant_id", name="uq_cartitem_cart_variant"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cart_id: Mapped[int] = mapped_column(Integer, ForeignKey("carts.id", ondelete="CASCADE"), index=True)
    variant_id: Mapped[int] = mapped_column(Integer, ForeignKey("variants.id", ondelete="CASCADE"), index=True)
    qty: Mapped[int] = mapped_column(Integer)


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cart_id: Mapped[int] = mapped_column(Integer, ForeignKey("carts.id", ondelete="CASCADE"), index=True)
    variant_id: Mapped[int] = mapped_column(Integer, ForeignKey("variants.id", ondelete="CASCADE"), index=True)
    qty: Mapped[int] = mapped_column(Integer)
    status: Mapped[ReservationStatus] = mapped_column(SAEnum(ReservationStatus, name="reservation_status"), default=ReservationStatus.active)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


# Orders
class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    cart_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("carts.id"), nullable=True)
    totals: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[OrderStatus] = mapped_column(SAEnum(OrderStatus, name="order_status"), default=OrderStatus.pending_payment, index=True)
    payment_ref: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="order", lazy="selectin")
    address: Mapped[Optional["Address"]] = relationship("Address", back_populates="order", uselist=False, lazy="selectin")
    user: Mapped[Optional["User"]] = relationship("User", lazy="selectin")
    fulfillment: Mapped[Optional["Fulfillment"]] = relationship("Fulfillment", back_populates="order", uselist=False, lazy="selectin")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    variant_id: Mapped[int] = mapped_column(Integer, ForeignKey("variants.id"))
    qty: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Numeric] = mapped_column(Numeric(12, 2))
    on_sale: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="items")


class Address(Base):
    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str] = mapped_column(String(32))
    state: Mapped[str] = mapped_column(String(80))
    city: Mapped[str] = mapped_column(String(120))
    street: Mapped[str] = mapped_column(String(255))
    
    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="address")


# Fulfillment
class Fulfillment(Base):
    __tablename__ = "fulfillments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), unique=True)
    status: Mapped[FulfillmentStatus] = mapped_column(SAEnum(FulfillmentStatus, name="fulfillment_status"), default=FulfillmentStatus.processing, index=True)
    packed_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    packed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="fulfillment")


class FulfillmentItem(Base):
    __tablename__ = "fulfillment_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fulfillment_id: Mapped[int] = mapped_column(Integer, ForeignKey("fulfillments.id", ondelete="CASCADE"), index=True)
    order_item_id: Mapped[int] = mapped_column(Integer, ForeignKey("order_items.id", ondelete="CASCADE"))
    qty: Mapped[int] = mapped_column(Integer)


# Shipment
class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fulfillment_id: Mapped[int] = mapped_column(Integer, ForeignKey("fulfillments.id", ondelete="CASCADE"), unique=True)
    courier: Mapped[str] = mapped_column(String(80))
    tracking_id: Mapped[str] = mapped_column(String(160), index=True)
    status: Mapped[ShipmentStatus] = mapped_column(SAEnum(ShipmentStatus, name="shipment_status"), default=ShipmentStatus.dispatched, index=True)
    dispatched_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class ShipmentEvent(Base):
    __tablename__ = "shipment_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    shipment_id: Mapped[int] = mapped_column(Integer, ForeignKey("shipments.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(80))
    message: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


# Pricing & Zones
class Coupon(Base):
    __tablename__ = "coupons"

    code: Mapped[str] = mapped_column(String(40), primary_key=True)
    type: Mapped[str] = mapped_column(String(20))  # percent|fixed|shipping
    value: Mapped[Numeric] = mapped_column(Numeric(12, 2))
    conditions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Zone(Base):
    __tablename__ = "zones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    fee: Mapped[Numeric] = mapped_column(Numeric(12, 2))


class StateZone(Base):
    __tablename__ = "state_zones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    state: Mapped[str] = mapped_column(String(80), unique=True)
    zone_id: Mapped[int] = mapped_column(Integer, ForeignKey("zones.id", ondelete="CASCADE"))


# Returns & Refunds
class Return(Base):
    __tablename__ = "returns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(40))  # Requested|Approved|Received|Refunded|Rejected
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class ReturnItem(Base):
    __tablename__ = "return_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    return_id: Mapped[int] = mapped_column(Integer, ForeignKey("returns.id", ondelete="CASCADE"), index=True)
    order_item_id: Mapped[int] = mapped_column(Integer, ForeignKey("order_items.id", ondelete="CASCADE"))
    qty: Mapped[int] = mapped_column(Integer)
    condition: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)


class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    amount: Mapped[Numeric] = mapped_column(Numeric(12, 2))
    reason: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    refund_method: Mapped[RefundMethod] = mapped_column(SAEnum(RefundMethod, name="refund_method"), default=RefundMethod.paystack)
    paystack_ref: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    manual_ref: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# Customer Features
class UserAddress(Base):
    """User saved addresses for shipping."""
    __tablename__ = "user_addresses"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    label: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)  # e.g., "Home", "Office"
    name: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str] = mapped_column(String(32))
    state: Mapped[str] = mapped_column(String(80))
    city: Mapped[str] = mapped_column(String(120))
    street: Mapped[str] = mapped_column(String(255))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Wishlist(Base):
    """User wishlist."""
    __tablename__ = "wishlists"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    items: Mapped[list["WishlistItem"]] = relationship("WishlistItem", cascade="all, delete-orphan", lazy="selectin")


class WishlistItem(Base):
    """Individual wishlist items."""
    __tablename__ = "wishlist_items"
    __table_args__ = (UniqueConstraint("wishlist_id", "product_id", "variant_id", name="uq_wishlist_product_variant"),)
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    wishlist_id: Mapped[int] = mapped_column(Integer, ForeignKey("wishlists.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="CASCADE"), index=True)
    variant_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("variants.id", ondelete="CASCADE"), nullable=True)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    product: Mapped["Product"] = relationship("Product", lazy="selectin")
    variant: Mapped[Optional["Variant"]] = relationship("Variant", lazy="selectin")


class Review(Base):
    """Product reviews."""
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("product_id", "user_id", name="uq_review_product_user"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="check_rating_range"),
    )
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    variant_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("variants.id", ondelete="SET NULL"), nullable=True)
    rating: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    comment: Mapped[str] = mapped_column(Text)
    would_recommend: Mapped[bool] = mapped_column(Boolean, default=True)
    verified_purchase: Mapped[bool] = mapped_column(Boolean, default=False)
    helpful_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user: Mapped["User"] = relationship("User", lazy="selectin")
    product: Mapped["Product"] = relationship("Product", lazy="selectin")
    variant: Mapped[Optional["Variant"]] = relationship("Variant", lazy="selectin")
    votes: Mapped[list["ReviewVote"]] = relationship("ReviewVote", cascade="all, delete-orphan")


class ReviewVote(Base):
    """Track helpful votes on reviews."""
    __tablename__ = "review_votes"
    __table_args__ = (UniqueConstraint("review_id", "user_id", name="uq_review_vote_user"),)
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    review_id: Mapped[int] = mapped_column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    is_helpful: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

