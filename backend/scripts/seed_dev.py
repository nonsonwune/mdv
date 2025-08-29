from __future__ import annotations

import asyncio
from datetime import datetime

from sqlalchemy import select

from mdv.db import session_scope
from mdv.models import Product, Variant, Inventory, Coupon, ProductImage, Category


async def seed_categories(db):
    """Seed default categories that match frontend navigation."""
    default_categories = [
        {"name": "Men's Collection", "slug": "men"},
        {"name": "Women's Collection", "slug": "women"},
        {"name": "Essentials", "slug": "essentials"},
        {"name": "Sale & Clearance", "slug": "sale"},
    ]

    for cat_data in default_categories:
        existing = (await db.execute(
            select(Category).where(Category.slug == cat_data["slug"])
        )).scalar_one_or_none()

        if not existing:
            category = Category(
                name=cat_data["name"],
                slug=cat_data["slug"]
            )
            db.add(category)
            print(f"Created category: {cat_data['name']} ({cat_data['slug']})")
        else:
            print(f"Category already exists: {cat_data['name']} ({cat_data['slug']})")


async def main() -> None:
    async with session_scope() as db:
        # Seed categories first
        await seed_categories(db)
        # Product (assign to Men's Collection category)
        prod = (await db.execute(select(Product).where(Product.slug == "basic-tee"))).scalar_one_or_none()
        if not prod:
            # Get Men's Collection category
            men_category = (await db.execute(
                select(Category).where(Category.slug == "men")
            )).scalar_one_or_none()

            prod = Product(
                title="Basic Tee",
                slug="basic-tee",
                description="Cotton tee",
                compare_at_price=19990,
                category_id=men_category.id if men_category else None
            )
            db.add(prod)
            await db.flush()
        # Variant
        var = (await db.execute(select(Variant).where(Variant.sku == "BTEE-001"))).scalar_one_or_none()
        if not var:
            var = Variant(product_id=prod.id, sku="BTEE-001", size="M", color="Black", price=9990)
            db.add(var)
            await db.flush()
        # Product image (placeholder)
        img = (await db.execute(select(ProductImage).where(ProductImage.product_id == prod.id))).scalar_one_or_none()
        if not img:
            db.add(ProductImage(product_id=prod.id, url="https://picsum.photos/seed/mdvtee/800/800", alt_text="Basic Tee", width=800, height=800, sort_order=0, is_primary=True))
        # Inventory
        inv = (await db.execute(select(Inventory).where(Inventory.variant_id == var.id))).scalar_one_or_none()
        if not inv:
            inv = Inventory(variant_id=var.id, quantity=100, safety_stock=2)
            db.add(inv)
        else:
            inv.quantity = max(inv.quantity, 100)
        # Coupons
        for code, ctype, val in [
            ("WELCOME10", "percent", 10.0),
            ("SALE20", "percent", 20.0),
            ("LAGOSFREE", "shipping", 0.0),
        ]:
            c = (await db.execute(select(Coupon).where(Coupon.code == code))).scalar_one_or_none()
            if not c:
                db.add(Coupon(code=code, type=ctype, value=val, conditions=None, active=True))


if __name__ == "__main__":
    asyncio.run(main())
