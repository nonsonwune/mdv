#!/usr/bin/env python3
"""
Simple category seeding script for production.
Creates the basic categories needed for the MDV platform.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

async def seed_categories():
    """Seed basic categories for MDV platform."""
    try:
        from mdv.db import session_scope
        from mdv.models import Category
        from sqlalchemy import select
        
        print("🌱 Starting category seeding...")
        
        async with session_scope() as db:
            # Define the categories that match frontend expectations
            categories_to_create = [
                {"name": "Men's Collection", "slug": "men"},
                {"name": "Women's Collection", "slug": "women"},
                {"name": "Essentials", "slug": "essentials"},
                {"name": "Sale & Clearance", "slug": "sale"},
            ]
            
            created_count = 0
            
            for cat_data in categories_to_create:
                # Check if category already exists
                existing = await db.execute(
                    select(Category).where(Category.slug == cat_data["slug"])
                )
                
                if existing.scalar_one_or_none():
                    print(f"✓ Category already exists: {cat_data['name']} ({cat_data['slug']})")
                else:
                    # Create new category
                    category = Category(
                        name=cat_data["name"],
                        slug=cat_data["slug"],
                        is_active=True,
                        sort_order=0
                    )
                    db.add(category)
                    created_count += 1
                    print(f"✅ Created category: {cat_data['name']} ({cat_data['slug']})")
            
            if created_count > 0:
                await db.commit()
                print(f"\n🎉 Successfully created {created_count} categories!")
            else:
                print("\n✅ All categories already exist - no changes needed")
                
            # Verify categories exist
            print("\n📋 Verifying categories:")
            all_categories = await db.execute(select(Category))
            for cat in all_categories.scalars():
                print(f"  - {cat.name} ({cat.slug})")
                
    except Exception as e:
        print(f"❌ Error seeding categories: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
        
    return True

if __name__ == "__main__":
    print("🚀 MDV Category Seeding Script")
    print("=" * 40)
    
    success = asyncio.run(seed_categories())
    
    if success:
        print("\n✅ Category seeding completed successfully!")
    else:
        print("\n❌ Category seeding failed!")
        sys.exit(1)
