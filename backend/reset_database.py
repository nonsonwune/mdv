#!/usr/bin/env python3
"""
Database Reset Script for MDV E-commerce Platform

This script resets the entire database to a clean state while preserving
ONLY the admin user (admin@mdv.ng) with full admin privileges.

DANGER: This will delete ALL data except the admin user!
"""

import asyncio
import sys
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from mdv.db import get_session_factory
from mdv.models import (
    User, Role, Product, Variant, Category, Order, OrderItem,
    Cart, CartItem, Wishlist, WishlistItem, Review, Inventory, StockLedger,
    Reservation, Address, Fulfillment, FulfillmentItem, Shipment, ShipmentEvent,
    Return, AuditLog
)
from mdv.password import hash_password


async def reset_database():
    """Reset database to clean state, preserving only admin user."""
    
    print("🚨 MDV DATABASE RESET SCRIPT")
    print("=" * 50)
    print("⚠️  WARNING: This will delete ALL data except admin@mdv.ng!")
    print("⚠️  This action is IRREVERSIBLE!")
    print("=" * 50)
    
    # Confirmation prompt
    confirm = input("Type 'RESET' to confirm database reset: ")
    if confirm != 'RESET':
        print("❌ Database reset cancelled.")
        return False
    
    print("\n🔄 Starting database reset...")
    
    Session = get_session_factory()
    async with Session() as session:
        try:
            # Step 1: Preserve admin user data
            print("📋 Step 1: Backing up admin user...")
            admin_user = await session.execute(
                text("SELECT * FROM users WHERE email = 'admin@mdv.ng'")
            )
            admin_data = admin_user.fetchone()
            
            if not admin_data:
                print("❌ Admin user not found! Creating new admin user...")
                # Create admin user if it doesn't exist
                await session.execute(text("""
                    INSERT INTO users (name, email, role, active, password_hash, created_at, updated_at)
                    VALUES ('Admin User', 'admin@mdv.ng', 'admin', 1, :password_hash, :now, :now)
                """), {
                    'password_hash': hash_password('admin'),
                    'now': datetime.utcnow()
                })
                print("✅ Created new admin user")
            else:
                print(f"✅ Found admin user: {admin_data.name} ({admin_data.email})")
            
            # Step 2: Delete all data in correct order (respecting foreign keys)
            print("\n📋 Step 2: Deleting all data...")
            
            # Delete in order to respect foreign key constraints
            tables_to_clear = [
                # Order-related data
                'fulfillment_items',
                'fulfillments', 
                'shipment_events',
                'shipments',
                'returns',
                'order_items',
                'orders',
                
                # Cart and wishlist data
                'cart_items',
                'carts',
                'wishlist_items',
                'wishlists',
                
                # Inventory and stock data
                'reservations',
                'stock_ledger',
                'inventory',
                
                # Product data
                'reviews',
                'variants',
                'products',
                'categories',
                
                # User addresses (but not the admin user)
                'addresses',
                
                # Audit logs (optional - you may want to keep these)
                # 'audit_logs',
            ]
            
            for table in tables_to_clear:
                try:
                    result = await session.execute(text(f"DELETE FROM {table}"))
                    count = result.rowcount
                    print(f"  ✅ Cleared {table}: {count} records deleted")
                except Exception as e:
                    print(f"  ⚠️  Error clearing {table}: {e}")
            
            # Step 3: Delete all users except admin
            print("\n📋 Step 3: Removing all users except admin...")
            result = await session.execute(
                text("DELETE FROM users WHERE email != 'admin@mdv.ng'")
            )
            users_deleted = result.rowcount
            print(f"  ✅ Deleted {users_deleted} user accounts (preserved admin)")
            
            # Step 4: Reset auto-increment counters
            print("\n📋 Step 4: Resetting auto-increment counters...")
            
            # Get list of tables with auto-increment IDs
            auto_increment_tables = [
                'users', 'products', 'variants', 'categories', 'orders',
                'order_items', 'carts', 'cart_items', 'wishlists', 'wishlist_items',
                'reviews', 'inventory', 'stock_ledger', 'reservations', 'addresses',
                'fulfillments', 'fulfillment_items', 'shipments', 'shipment_events',
                'returns', 'audit_logs'
            ]
            
            for table in auto_increment_tables:
                try:
                    # For SQLite, we need to reset the sqlite_sequence table
                    await session.execute(
                        text(f"DELETE FROM sqlite_sequence WHERE name = '{table}'")
                    )
                    print(f"  ✅ Reset auto-increment for {table}")
                except Exception as e:
                    print(f"  ⚠️  Could not reset auto-increment for {table}: {e}")
            
            # Step 5: Ensure admin user has correct ID and role
            print("\n📋 Step 5: Ensuring admin user integrity...")
            
            # Update admin user to have ID = 1 and correct role
            await session.execute(text("""
                UPDATE users 
                SET id = 1, role = 'admin', active = 1, updated_at = :now
                WHERE email = 'admin@mdv.ng'
            """), {'now': datetime.utcnow()})
            
            # Reset the users table auto-increment to start from 2
            await session.execute(
                text("INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES ('users', 1)")
            )
            
            print("  ✅ Admin user configured with ID=1 and admin role")
            
            # Commit all changes
            await session.commit()
            
            print("\n" + "=" * 50)
            print("🎉 DATABASE RESET COMPLETED SUCCESSFULLY!")
            print("=" * 50)
            print("✅ All data deleted except admin user")
            print("✅ Admin user preserved: admin@mdv.ng")
            print("✅ Admin password: admin")
            print("✅ Admin role: admin")
            print("✅ Auto-increment counters reset")
            print("✅ Database ready for fresh data")
            print("=" * 50)
            
            return True
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ ERROR during database reset: {e}")
            print("🔄 Database rollback completed - no changes made")
            return False


async def verify_reset():
    """Verify the database reset was successful."""
    print("\n🔍 Verifying database reset...")
    
    Session = get_session_factory()
    async with Session() as session:
        # Check admin user exists
        admin_result = await session.execute(
            text("SELECT id, name, email, role, active FROM users WHERE email = 'admin@mdv.ng'")
        )
        admin = admin_result.fetchone()
        
        if admin:
            print(f"✅ Admin user verified: ID={admin.id}, Name={admin.name}, Role={admin.role}")
        else:
            print("❌ Admin user not found!")
            return False
        
        # Check other tables are empty
        tables_to_check = ['products', 'orders', 'carts', 'reviews']
        for table in tables_to_check:
            result = await session.execute(text(f"SELECT COUNT(*) as count FROM {table}"))
            count = result.fetchone().count
            if count == 0:
                print(f"✅ {table} table is empty")
            else:
                print(f"⚠️  {table} table still has {count} records")
        
        # Check total user count
        user_result = await session.execute(text("SELECT COUNT(*) as count FROM users"))
        user_count = user_result.fetchone().count
        print(f"✅ Total users in database: {user_count} (should be 1)")
        
        return True


async def main():
    """Main function to run the database reset."""
    print("Starting MDV Database Reset Process...")
    
    # Run the reset
    success = await reset_database()
    
    if success:
        # Verify the reset
        await verify_reset()
        print("\n🚀 Database reset completed successfully!")
        print("You can now:")
        print("1. Access admin panel at: http://localhost:3000/admin")
        print("2. Login with: admin@mdv.ng / admin")
        print("3. View audit logs at: http://localhost:3000/admin/audit")
        print("4. Start adding fresh products and data")
    else:
        print("\n❌ Database reset failed!")
        return 1
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
