#!/usr/bin/env python3
"""
Clear database of all data except user accounts and system configuration.
This script preserves:
- Users and their addresses
- Zones and state zones (shipping configuration)
- Coupons (optional)

Everything else (products, orders, inventory, etc.) is cleared.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from mdv.db import session_scope
from mdv import models

async def clear_database():
    """Clear database while preserving user data and system configuration."""
    
    print("🔄 Starting database cleanup...")
    
    async with session_scope() as session:
        try:
            # Get current counts before deletion
            print("\n📊 Current database counts:")
            
            # Get counts for main tables
            user_result = await session.execute(text("SELECT COUNT(*) FROM users"))
            user_count = user_result.scalar()
            
            product_result = await session.execute(text("SELECT COUNT(*) FROM products"))
            product_count = product_result.scalar()
            
            order_result = await session.execute(text("SELECT COUNT(*) FROM orders"))
            order_count = order_result.scalar()
            
            category_result = await session.execute(text("SELECT COUNT(*) FROM categories"))
            category_count = category_result.scalar()
            
            cart_result = await session.execute(text("SELECT COUNT(*) FROM carts"))
            cart_count = cart_result.scalar()
            
            inventory_result = await session.execute(text("SELECT COUNT(*) FROM inventory"))
            inventory_count = inventory_result.scalar()
            
            print(f"   users: {user_count}")
            print(f"   products: {product_count}")
            print(f"   orders: {order_count}")
            print(f"   categories: {category_count}")
            print(f"   carts: {cart_count}")
            print(f"   inventory: {inventory_count}")
            
            print("\n🗑️  Clearing non-user data...")
            
            # Clear in order to respect foreign key constraints
            # Start with dependent tables first
            
            # Clear reviews and votes
            await session.execute(text("DELETE FROM review_votes"))
            await session.execute(text("DELETE FROM reviews"))
            
            # Clear wishlists
            await session.execute(text("DELETE FROM wishlist_items"))
            await session.execute(text("DELETE FROM wishlists"))
            
            # Clear returns and refunds
            await session.execute(text("DELETE FROM return_items"))
            await session.execute(text("DELETE FROM returns"))
            await session.execute(text("DELETE FROM refunds"))
            
            # Clear shipments and events
            await session.execute(text("DELETE FROM shipment_events"))
            await session.execute(text("DELETE FROM shipments"))
            
            # Clear fulfillments
            await session.execute(text("DELETE FROM fulfillment_items"))
            await session.execute(text("DELETE FROM fulfillments"))
            
            # Clear orders and related
            await session.execute(text("DELETE FROM order_items"))
            await session.execute(text("DELETE FROM addresses"))
            await session.execute(text("DELETE FROM orders"))
            
            # Clear reservations and cart items
            await session.execute(text("DELETE FROM reservations"))
            await session.execute(text("DELETE FROM cart_items"))
            await session.execute(text("DELETE FROM carts"))
            
            # Clear inventory and stock
            await session.execute(text("DELETE FROM stock_ledger"))
            await session.execute(text("DELETE FROM inventory"))
            
            # Clear product data
            await session.execute(text("DELETE FROM product_images"))
            await session.execute(text("DELETE FROM variants"))
            await session.execute(text("DELETE FROM products"))
            await session.execute(text("DELETE FROM categories"))
            
            # Clear audit logs (optional - comment out if you want to keep them)
            await session.execute(text("DELETE FROM audit_logs"))
            
            # Optional: Clear coupons (uncomment if you want to clear them too)
            # await session.execute(text("DELETE FROM coupons"))
            
            # Session will auto-commit due to session_scope context manager
            
            print("✅ Database cleared successfully!")
            
            # Show final counts
            print("\n📊 Final database counts:")
            
            user_result = await session.execute(text("SELECT COUNT(*) FROM users"))
            user_count_final = user_result.scalar()
            
            product_result = await session.execute(text("SELECT COUNT(*) FROM products"))
            product_count_final = product_result.scalar()
            
            order_result = await session.execute(text("SELECT COUNT(*) FROM orders"))
            order_count_final = order_result.scalar()
            
            category_result = await session.execute(text("SELECT COUNT(*) FROM categories"))
            category_count_final = category_result.scalar()
            
            cart_result = await session.execute(text("SELECT COUNT(*) FROM carts"))
            cart_count_final = cart_result.scalar()
            
            inventory_result = await session.execute(text("SELECT COUNT(*) FROM inventory"))
            inventory_count_final = inventory_result.scalar()
            
            print(f"   users: {user_count_final}")
            print(f"   products: {product_count_final}")
            print(f"   orders: {order_count_final}")
            print(f"   categories: {category_count_final}")
            print(f"   carts: {cart_count_final}")
            print(f"   inventory: {inventory_count_final}")
            
            # Show preserved data
            user_addr_result = await session.execute(text("SELECT COUNT(*) FROM user_addresses"))
            user_addr_count = user_addr_result.scalar()
            
            zone_result = await session.execute(text("SELECT COUNT(*) FROM zones"))
            zone_count = zone_result.scalar()
            
            state_zone_result = await session.execute(text("SELECT COUNT(*) FROM state_zones"))
            state_zone_count = state_zone_result.scalar()
            
            coupon_result = await session.execute(text("SELECT COUNT(*) FROM coupons"))
            coupon_count = coupon_result.scalar()
            
            print(f"\n🔐 Preserved data:")
            print(f"   Users: {user_count_final}")
            print(f"   User addresses: {user_addr_count}")
            print(f"   Shipping zones: {zone_count}")
            print(f"   State zones: {state_zone_count}")
            print(f"   Coupons: {coupon_count}")
            
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")
            raise
        
        print("\n🎉 Database cleanup completed successfully!")

async def main():
    # Confirm before running
    print("⚠️  WARNING: This will clear all data except users and system configuration!")
    print("   This action cannot be undone.")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--confirm":
        await clear_database()
    else:
        print("\n   To run this script, use: python clear_database.py --confirm")
        print("   Or run it through Railway CLI with the --confirm flag")

if __name__ == "__main__":
    asyncio.run(main())
