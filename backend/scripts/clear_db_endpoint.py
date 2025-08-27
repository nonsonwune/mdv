#!/usr/bin/env python3
"""
Simple HTTP endpoint to clear database data.
This can be called via Railway run to execute the database cleanup.
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

async def clear_database():
    """Clear database while preserving user data."""
    
    print("🔄 Starting database cleanup...")
    
    async with session_scope() as session:
        try:
            # Get current counts before deletion
            print("\n📊 Current database counts:")
            
            # Get counts for main tables using raw SQL to avoid model issues
            counts_before = {}
            tables = ['users', 'products', 'orders', 'categories', 'carts', 'inventory', 'user_addresses', 'zones', 'state_zones', 'coupons']
            
            for table in tables:
                try:
                    result = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    counts_before[table] = count
                    print(f"   {table}: {count}")
                except Exception as e:
                    print(f"   {table}: N/A (table may not exist yet)")
                    counts_before[table] = 0
            
            print("\n🗑️  Clearing non-user data...")
            
            # Clear in order to respect foreign key constraints
            delete_statements = [
                "DELETE FROM review_votes",
                "DELETE FROM reviews", 
                "DELETE FROM wishlist_items",
                "DELETE FROM wishlists",
                "DELETE FROM return_items",
                "DELETE FROM returns",
                "DELETE FROM refunds",
                "DELETE FROM shipment_events",
                "DELETE FROM shipments",
                "DELETE FROM fulfillment_items",
                "DELETE FROM fulfillments",
                "DELETE FROM order_items",
                "DELETE FROM addresses",  # Order addresses, not user_addresses
                "DELETE FROM orders",
                "DELETE FROM reservations",
                "DELETE FROM cart_items",
                "DELETE FROM carts",
                "DELETE FROM stock_ledger",
                "DELETE FROM inventory",
                "DELETE FROM product_images",
                "DELETE FROM variants",
                "DELETE FROM products",
                "DELETE FROM categories",
                "DELETE FROM audit_logs",
            ]
            
            for i, stmt in enumerate(delete_statements):
                try:
                    print(f"   Executing: {stmt}")
                    await session.execute(text(stmt))
                except Exception as e:
                    print(f"   Warning: {stmt} failed - {e} (table may not exist)")
            
            print("✅ Database cleared successfully!")
            
            # Show final counts
            print("\n📊 Final database counts:")
            counts_after = {}
            
            for table in tables:
                try:
                    result = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    counts_after[table] = count
                    print(f"   {table}: {count}")
                except Exception as e:
                    counts_after[table] = 0
                    print(f"   {table}: N/A")
            
            print(f"\n🔐 Preserved data:")
            preserved_tables = ['users', 'user_addresses', 'zones', 'state_zones', 'coupons']
            for table in preserved_tables:
                count = counts_after.get(table, 0)
                print(f"   {table}: {count}")
                
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")
            raise
        
        print("\n🎉 Database cleanup completed successfully!")

if __name__ == "__main__":
    asyncio.run(clear_database())
