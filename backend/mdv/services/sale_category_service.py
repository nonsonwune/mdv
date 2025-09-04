"""
Sale Category Service

Handles automatic population of sale categories based on product discount thresholds.
"""

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload

from mdv.models import Category, Product, Variant
from mdv.audit import AuditService
from mdv.models import AuditAction, AuditEntity


class SaleCategoryService:
    """Service for managing automatic sale categories."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_sale_categories(self) -> List[Category]:
        """Get all categories marked as sale categories."""
        stmt = (
            select(Category)
            .where(Category.is_sale_category == True)
            .where(Category.is_active == True)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_products_on_sale(self, threshold: int = 10) -> List[Product]:
        """
        Get products that are on sale (have discount >= threshold).
        
        Args:
            threshold: Minimum discount percentage to consider as "on sale"
        """
        stmt = (
            select(Product)
            .join(Variant, Product.id == Variant.product_id)
            .where(
                and_(
                    Product.compare_at_price.isnot(None),
                    Variant.price.isnot(None),
                    # Calculate discount percentage: ((compare_at_price - price) / compare_at_price) * 100 >= threshold
                    ((Product.compare_at_price - Variant.price) / Product.compare_at_price * 100) >= threshold
                )
            )
            .distinct()
            .options(selectinload(Product.variants))
        )
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def calculate_discount_percentage(self, product: Product) -> Optional[float]:
        """Calculate the discount percentage for a product."""
        if not product.compare_at_price or not product.variants:
            return None
        
        # Get the lowest price variant
        min_price = min(variant.price for variant in product.variants if variant.price)
        if not min_price:
            return None
        
        discount_amount = product.compare_at_price - min_price
        discount_percentage = (discount_amount / product.compare_at_price) * 100
        
        return round(discount_percentage, 2)
    
    async def update_sale_category_visibility(self, user_id: Optional[int] = None) -> dict:
        """
        Update the visibility of sale categories based on whether they have qualifying products.
        
        Returns:
            dict: Summary of changes made
        """
        changes = {
            'categories_shown': [],
            'categories_hidden': [],
            'total_sale_products': 0
        }
        
        # Get all sale categories
        sale_categories = await self.get_sale_categories()
        
        for category in sale_categories:
            threshold = category.auto_sale_threshold or 10
            sale_products = await self.get_products_on_sale(threshold)
            
            changes['total_sale_products'] = len(sale_products)
            
            # Determine if category should be shown in navigation
            should_show = len(sale_products) > 0
            
            if category.show_in_navigation != should_show:
                old_visibility = category.show_in_navigation
                category.show_in_navigation = should_show
                
                if should_show:
                    changes['categories_shown'].append(category.name)
                else:
                    changes['categories_hidden'].append(category.name)
                
                # Audit the change
                if user_id:
                    await AuditService.log_event(
                        action=AuditAction.UPDATE,
                        entity=AuditEntity.CATEGORY,
                        entity_id=category.id,
                        before={"show_in_navigation": old_visibility},
                        after={"show_in_navigation": should_show},
                        metadata={
                            "category_name": category.name,
                            "threshold": threshold,
                            "sale_products_count": len(sale_products),
                            "reason": "automatic_sale_category_update"
                        },
                        actor_id=user_id,
                        session=self.db
                    )
        
        await self.db.commit()
        return changes
    
    async def create_default_sale_category(self, user_id: Optional[int] = None) -> Category:
        """Create a default sale category if none exists."""
        # Check if a sale category already exists
        existing_sale_category = await self.db.execute(
            select(Category).where(Category.is_sale_category == True).limit(1)
        )
        
        if existing_sale_category.scalar_one_or_none():
            raise ValueError("A sale category already exists")
        
        # Create the sale category
        sale_category = Category(
            name="Sale",
            slug="sale",
            description="Products with significant discounts",
            sort_order=999,  # Show at the end
            is_active=True,
            show_in_navigation=False,  # Will be shown automatically when products are on sale
            navigation_icon="sale",
            is_sale_category=True,
            auto_sale_threshold=10  # 10% minimum discount
        )
        
        self.db.add(sale_category)
        await self.db.flush()  # Get the ID
        
        # Audit the creation
        if user_id:
            await AuditService.log_event(
                action=AuditAction.CREATE,
                entity=AuditEntity.CATEGORY,
                entity_id=sale_category.id,
                after={
                    "name": sale_category.name,
                    "is_sale_category": True,
                    "auto_sale_threshold": sale_category.auto_sale_threshold
                },
                metadata={
                    "category_name": sale_category.name,
                    "threshold": sale_category.auto_sale_threshold,
                    "reason": "automatic_sale_category_creation"
                },
                actor_id=user_id,
                session=self.db
            )
        
        await self.db.commit()
        return sale_category
    
    async def get_sale_category_stats(self) -> dict:
        """Get statistics about sale categories and products."""
        sale_categories = await self.get_sale_categories()
        
        stats = {
            'total_sale_categories': len(sale_categories),
            'visible_sale_categories': len([cat for cat in sale_categories if cat.show_in_navigation]),
            'categories': []
        }
        
        for category in sale_categories:
            threshold = category.auto_sale_threshold or 10
            sale_products = await self.get_products_on_sale(threshold)
            
            category_stats = {
                'id': category.id,
                'name': category.name,
                'threshold': threshold,
                'products_count': len(sale_products),
                'visible_in_navigation': category.show_in_navigation,
                'total_discount_value': 0
            }
            
            # Calculate total discount value
            total_discount = 0
            for product in sale_products:
                discount_percentage = await self.calculate_discount_percentage(product)
                if discount_percentage and product.compare_at_price:
                    min_price = min(variant.price for variant in product.variants if variant.price)
                    if min_price:
                        discount_amount = product.compare_at_price - min_price
                        total_discount += discount_amount
            
            category_stats['total_discount_value'] = round(total_discount, 2)
            stats['categories'].append(category_stats)
        
        return stats


async def update_all_sale_categories(db: AsyncSession, user_id: Optional[int] = None) -> dict:
    """
    Convenience function to update all sale categories.
    
    This can be called periodically (e.g., via a cron job) to keep sale categories up to date.
    """
    service = SaleCategoryService(db)
    return await service.update_sale_category_visibility(user_id)


async def ensure_sale_category_exists(db: AsyncSession, user_id: Optional[int] = None) -> Category:
    """
    Ensure that at least one sale category exists, creating one if necessary.
    """
    service = SaleCategoryService(db)
    
    # Check if any sale category exists
    existing = await db.execute(
        select(Category).where(Category.is_sale_category == True).limit(1)
    )
    
    if existing.scalar_one_or_none():
        return existing.scalar_one()
    
    # Create default sale category
    return await service.create_default_sale_category(user_id)
