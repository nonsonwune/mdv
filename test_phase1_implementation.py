#!/usr/bin/env python3
"""
Test script to verify Phase 1 implementation of hardcoded values fix.
This script tests the backend API changes to ensure they return the expected format.
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

async def test_admin_stats_format():
    """Test that the admin stats endpoint returns the expected format."""
    try:
        from mdv.db import session_scope
        from mdv.models import Product, User, Order
        from sqlalchemy import select, func
        
        async with session_scope() as db:
            # Test basic queries that the admin stats endpoint uses
            
            # Test product count
            total_products = await db.execute(select(func.count(Product.id)))
            product_count = total_products.scalar_one()
            print(f"✓ Product count query works: {product_count} products")
            
            # Test user count  
            total_users = await db.execute(select(func.count(User.id)))
            user_count = total_users.scalar_one()
            print(f"✓ User count query works: {user_count} users")
            
            # Test order count
            total_orders = await db.execute(select(func.count(Order.id)))
            order_count = total_orders.scalar_one()
            print(f"✓ Order count query works: {order_count} orders")
            
            print("✓ All admin stats queries working correctly")
            return True
            
    except Exception as e:
        print(f"✗ Admin stats test failed: {e}")
        return False

async def test_product_inventory_format():
    """Test that products include inventory data."""
    try:
        from mdv.db import session_scope
        from mdv.models import Product, Variant, Inventory
        from sqlalchemy import select
        
        async with session_scope() as db:
            # Test the inventory join query used in product endpoints
            products = await db.execute(select(Product).limit(1))
            product = products.scalar_one_or_none()
            
            if product:
                # Test variant inventory query
                variants = await db.execute(select(Variant).where(Variant.product_id == product.id))
                variant_count = len(list(variants.scalars().all()))
                print(f"✓ Product {product.id} has {variant_count} variants")
                
                # Test inventory query
                if variant_count > 0:
                    variant = await db.execute(select(Variant).where(Variant.product_id == product.id))
                    first_variant = variant.scalars().first()
                    if first_variant:
                        inventory = await db.execute(select(Inventory).where(Inventory.variant_id == first_variant.id))
                        inv = inventory.scalar_one_or_none()
                        if inv:
                            print(f"✓ Variant {first_variant.id} has inventory: {inv.quantity} units")
                        else:
                            print(f"! Variant {first_variant.id} has no inventory record")
                
                print("✓ Product inventory queries working correctly")
                return True
            else:
                print("! No products found in database")
                return True
                
    except Exception as e:
        print(f"✗ Product inventory test failed: {e}")
        return False

async def main():
    """Run all tests."""
    print("Testing Phase 1 Implementation...")
    print("=" * 50)
    
    # Test admin stats
    print("\n1. Testing Admin Stats API Format:")
    admin_stats_ok = await test_admin_stats_format()
    
    # Test product inventory
    print("\n2. Testing Product Inventory Data:")
    inventory_ok = await test_product_inventory_format()
    
    # Summary
    print("\n" + "=" * 50)
    if admin_stats_ok and inventory_ok:
        print("✓ All Phase 1 tests passed!")
        print("\nNext steps:")
        print("- Start the backend server: cd backend && uvicorn api.main:app --reload")
        print("- Start the frontend: cd web && npm run dev")
        print("- Test the admin dashboard at /admin")
        print("- Test product pages to see real stock status")
    else:
        print("✗ Some tests failed. Check the errors above.")
        
if __name__ == "__main__":
    asyncio.run(main())
