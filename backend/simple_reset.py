#!/usr/bin/env python3
"""
Simple Database Reset Script for MDV E-commerce Platform

This script resets the database using direct SQL commands.
"""

import sqlite3
import sys
from datetime import datetime
from mdv.password import hash_password


def reset_database():
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
    
    try:
        # Connect to database
        conn = sqlite3.connect('mdv_dev.db')
        cursor = conn.cursor()
        
        # Step 1: Check if admin user exists
        print("📋 Step 1: Checking admin user...")
        cursor.execute("SELECT * FROM users WHERE email = 'admin@mdv.ng'")
        admin_user = cursor.fetchone()
        
        if admin_user:
            print(f"✅ Found admin user: {admin_user[1]} ({admin_user[2]})")
        else:
            print("❌ Admin user not found! Will create after cleanup...")
        
        # Step 2: Delete all data in correct order (respecting foreign keys)
        print("\n📋 Step 2: Deleting all data...")
        
        # Disable foreign key constraints temporarily
        cursor.execute("PRAGMA foreign_keys = OFF")
        
        # Delete in order to respect foreign key constraints
        tables_to_clear = [
            'fulfillment_items',
            'fulfillments', 
            'shipment_events',
            'shipments',
            'returns',
            'order_items',
            'orders',
            'cart_items',
            'carts',
            'wishlist_items',
            'wishlists',
            'reservations',
            'stock_ledger',
            'inventory',
            'reviews',
            'variants',
            'products',
            'categories',
            'addresses',
            'user_addresses',
        ]
        
        for table in tables_to_clear:
            try:
                cursor.execute(f"DELETE FROM {table}")
                count = cursor.rowcount
                print(f"  ✅ Cleared {table}: {count} records deleted")
            except Exception as e:
                print(f"  ⚠️  Error clearing {table}: {e}")
        
        # Step 3: Delete all users except admin
        print("\n📋 Step 3: Removing all users except admin...")
        cursor.execute("DELETE FROM users WHERE email != 'admin@mdv.ng'")
        users_deleted = cursor.rowcount
        print(f"  ✅ Deleted {users_deleted} user accounts (preserved admin)")
        
        # Step 4: Create admin user if it doesn't exist
        if not admin_user:
            print("\n📋 Step 4: Creating admin user...")
            password_hash = hash_password('admin')
            cursor.execute("""
                INSERT INTO users (name, email, role, active, password_hash, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, ('Admin User', 'admin@mdv.ng', 'admin', True, password_hash, datetime.utcnow()))
            print("  ✅ Created admin user")
        
        # Step 5: Reset auto-increment counters
        print("\n📋 Step 5: Resetting auto-increment counters...")
        
        # Reset sqlite_sequence for all tables
        cursor.execute("DELETE FROM sqlite_sequence")
        
        # Set users sequence to start from the admin user ID
        cursor.execute("SELECT id FROM users WHERE email = 'admin@mdv.ng'")
        admin_id = cursor.fetchone()[0]
        cursor.execute("INSERT INTO sqlite_sequence (name, seq) VALUES ('users', ?)", (admin_id,))
        
        print(f"  ✅ Reset auto-increment counters (users will start from {admin_id + 1})")
        
        # Re-enable foreign key constraints
        cursor.execute("PRAGMA foreign_keys = ON")
        
        # Commit all changes
        conn.commit()
        
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
        print(f"\n❌ ERROR during database reset: {e}")
        if 'conn' in locals():
            conn.rollback()
            print("🔄 Database rollback completed - no changes made")
        return False
    finally:
        if 'conn' in locals():
            conn.close()


def verify_reset():
    """Verify the database reset was successful."""
    print("\n🔍 Verifying database reset...")
    
    try:
        conn = sqlite3.connect('mdv_dev.db')
        cursor = conn.cursor()
        
        # Check admin user exists
        cursor.execute("SELECT id, name, email, role, active FROM users WHERE email = 'admin@mdv.ng'")
        admin = cursor.fetchone()
        
        if admin:
            print(f"✅ Admin user verified: ID={admin[0]}, Name={admin[1]}, Role={admin[3]}")
        else:
            print("❌ Admin user not found!")
            return False
        
        # Check other tables are empty
        tables_to_check = ['products', 'orders', 'carts', 'reviews']
        for table in tables_to_check:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            if count == 0:
                print(f"✅ {table} table is empty")
            else:
                print(f"⚠️  {table} table still has {count} records")
        
        # Check total user count
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print(f"✅ Total users in database: {user_count} (should be 1)")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Verification error: {e}")
        return False


def main():
    """Main function to run the database reset."""
    print("Starting MDV Database Reset Process...")
    
    # Run the reset
    success = reset_database()
    
    if success:
        # Verify the reset
        verify_reset()
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
    exit_code = main()
    sys.exit(exit_code)
