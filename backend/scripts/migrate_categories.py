#!/usr/bin/env python3
"""
Migration script to add hierarchical category structure and create subcategories.
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parents[1]))

from mdv.db import session_scope
from mdv.models import Category
from sqlalchemy import select, text


async def add_category_fields():
    """Add new fields to categories table."""
    async with session_scope() as db:
        try:
            # Add parent_id column
            await db.execute(text("""
                ALTER TABLE categories 
                ADD COLUMN parent_id INTEGER REFERENCES categories(id)
            """))
            
            # Add description column
            await db.execute(text("""
                ALTER TABLE categories 
                ADD COLUMN description TEXT
            """))
            
            # Add sort_order column
            await db.execute(text("""
                ALTER TABLE categories 
                ADD COLUMN sort_order INTEGER DEFAULT 0
            """))
            
            # Add is_active column
            await db.execute(text("""
                ALTER TABLE categories 
                ADD COLUMN is_active BOOLEAN DEFAULT TRUE
            """))
            
            # Add index on parent_id
            await db.execute(text("""
                CREATE INDEX idx_categories_parent_id ON categories(parent_id)
            """))
            
            await db.commit()
            print("✅ Successfully added new category fields")
            
        except Exception as e:
            print(f"⚠️  Fields may already exist or error occurred: {e}")
            await db.rollback()


async def create_subcategories():
    """Create subcategories for Men's, Women's, and Essentials."""
    async with session_scope() as db:
        # Get existing main categories
        result = await db.execute(
            select(Category).where(Category.parent_id.is_(None))
        )
        main_categories = {cat.slug: cat for cat in result.scalars()}
        
        # Define subcategory structure
        subcategories_data = {
            "men": {
                "name": "Men's Collection",
                "subcategories": [
                    {"name": "T-Shirts", "slug": "men-t-shirts", "sort_order": 1},
                    {"name": "Shirts", "slug": "men-shirts", "sort_order": 2},
                    {"name": "Pants", "slug": "men-pants", "sort_order": 3},
                    {"name": "Jackets", "slug": "men-jackets", "sort_order": 4},
                    {"name": "Shoes", "slug": "men-shoes", "sort_order": 5},
                    {"name": "Accessories", "slug": "men-accessories", "sort_order": 6},
                ]
            },
            "women": {
                "name": "Women's Collection",
                "subcategories": [
                    {"name": "T-Shirts", "slug": "women-t-shirts", "sort_order": 1},
                    {"name": "Shirts", "slug": "women-shirts", "sort_order": 2},
                    {"name": "Pants", "slug": "women-pants", "sort_order": 3},
                    {"name": "Dresses", "slug": "women-dresses", "sort_order": 4},
                    {"name": "Jackets", "slug": "women-jackets", "sort_order": 5},
                    {"name": "Shoes", "slug": "women-shoes", "sort_order": 6},
                    {"name": "Accessories", "slug": "women-accessories", "sort_order": 7},
                ]
            },
            "essentials": {
                "name": "Essentials",
                "subcategories": [
                    {"name": "Basics", "slug": "essentials-basics", "sort_order": 1},
                    {"name": "Undergarments", "slug": "essentials-undergarments", "sort_order": 2},
                    {"name": "Socks", "slug": "essentials-socks", "sort_order": 3},
                    {"name": "Sleepwear", "slug": "essentials-sleepwear", "sort_order": 4},
                    {"name": "Activewear", "slug": "essentials-activewear", "sort_order": 5},
                ]
            }
        }
        
        created_count = 0
        
        for parent_slug, category_info in subcategories_data.items():
            parent_category = main_categories.get(parent_slug)
            
            if not parent_category:
                print(f"⚠️  Parent category '{parent_slug}' not found, creating it...")
                parent_category = Category(
                    name=category_info["name"],
                    slug=parent_slug,
                    description=f"Main category for {category_info['name'].lower()}",
                    sort_order=0,
                    is_active=True
                )
                db.add(parent_category)
                await db.flush()  # Get the ID
                main_categories[parent_slug] = parent_category
            
            print(f"\n📁 Creating subcategories for {category_info['name']}:")
            
            for subcat_data in category_info["subcategories"]:
                # Check if subcategory already exists
                existing = await db.execute(
                    select(Category).where(Category.slug == subcat_data["slug"])
                )
                
                if existing.scalar_one_or_none():
                    print(f"   ⚠️  Subcategory '{subcat_data['name']}' already exists")
                    continue
                
                subcategory = Category(
                    name=subcat_data["name"],
                    slug=subcat_data["slug"],
                    parent_id=parent_category.id,
                    description=f"{subcat_data['name']} in {category_info['name']}",
                    sort_order=subcat_data["sort_order"],
                    is_active=True
                )
                db.add(subcategory)
                created_count += 1
                print(f"   ✅ Created: {subcat_data['name']} ({subcat_data['slug']})")
        
        await db.commit()
        print(f"\n🎉 Successfully created {created_count} subcategories")


async def update_existing_categories():
    """Update existing categories with new fields."""
    async with session_scope() as db:
        # Get all categories
        result = await db.execute(select(Category))
        categories = list(result.scalars())
        
        updated_count = 0
        
        for category in categories:
            needs_update = False
            
            # Set default values for new fields if they're None
            if category.sort_order is None:
                category.sort_order = 0
                needs_update = True
            
            if category.is_active is None:
                category.is_active = True
                needs_update = True
            
            # Add descriptions for main categories
            if not category.parent_id and not category.description:
                descriptions = {
                    "men": "Stylish clothing and accessories for men",
                    "women": "Fashion-forward clothing and accessories for women", 
                    "essentials": "Essential items for everyday comfort",
                    "sale": "Discounted items and special offers"
                }
                category.description = descriptions.get(category.slug, f"Products in {category.name}")
                needs_update = True
            
            if needs_update:
                updated_count += 1
        
        if updated_count > 0:
            await db.commit()
            print(f"✅ Updated {updated_count} existing categories")
        else:
            print("✅ All existing categories are up to date")


async def verify_category_structure():
    """Verify the category structure is correct."""
    async with session_scope() as db:
        # Get all categories with their relationships
        result = await db.execute(
            select(Category).order_by(Category.parent_id.asc().nullsfirst(), Category.sort_order.asc())
        )
        categories = list(result.scalars())
        
        print("\n📊 Category Structure:")
        print("=" * 50)
        
        # Group by parent
        main_categories = [cat for cat in categories if cat.parent_id is None]
        subcategories = [cat for cat in categories if cat.parent_id is not None]
        
        for main_cat in main_categories:
            print(f"📁 {main_cat.name} ({main_cat.slug})")
            
            # Find subcategories
            sub_cats = [cat for cat in subcategories if cat.parent_id == main_cat.id]
            sub_cats.sort(key=lambda x: x.sort_order)
            
            for sub_cat in sub_cats:
                print(f"   └── {sub_cat.name} ({sub_cat.slug})")
            
            if not sub_cats:
                print("   └── (no subcategories)")
        
        print(f"\nTotal categories: {len(categories)}")
        print(f"Main categories: {len(main_categories)}")
        print(f"Subcategories: {len(subcategories)}")


async def main():
    """Run the category migration."""
    print("🔄 Starting Category Structure Migration")
    print("=" * 50)
    
    try:
        # Step 1: Add new fields to categories table
        print("\n1. Adding new fields to categories table...")
        await add_category_fields()
        
        # Step 2: Update existing categories
        print("\n2. Updating existing categories...")
        await update_existing_categories()
        
        # Step 3: Create subcategories
        print("\n3. Creating subcategories...")
        await create_subcategories()
        
        # Step 4: Verify structure
        print("\n4. Verifying category structure...")
        await verify_category_structure()
        
        print("\n🎉 Category migration completed successfully!")
        print("\nNext steps:")
        print("- Update admin interface to show subcategories")
        print("- Update frontend navigation")
        print("- Update product creation to use subcategories")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
