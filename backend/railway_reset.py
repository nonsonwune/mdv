#!/usr/bin/env python3
"""
Railway PostgreSQL Database Reset Script for MDV E-commerce Platform

This script safely resets the Railway PostgreSQL database to a clean state
while preserving ONLY the admin user (admin@mdv.ng) with full admin privileges.

PRODUCTION SAFETY FEATURES:
- Multiple confirmation prompts
- Connection testing before operations
- Transaction rollback on errors
- Admin user preservation
- Proper foreign key constraint handling

USAGE:
    python railway_reset.py [--dry-run] [--confirm] [--delete-audit-logs]

OPTIONS:
    --dry-run           Show what would be deleted without actually deleting
    --confirm           Skip interactive confirmation (use with caution)
    --delete-audit-logs Delete audit logs (default: preserve for compliance)
"""

import asyncio
import sys
import argparse
from datetime import datetime
from typing import Optional, List, Dict, Any

import asyncpg
from mdv.password import hash_password


class RailwayDatabaseReset:
    """Railway PostgreSQL database reset manager."""

    def __init__(self, database_url: str, dry_run: bool = False, delete_audit_logs: bool = False):
        self.database_url = database_url
        self.dry_run = dry_run
        self.delete_audit_logs = delete_audit_logs
        self.connection: Optional[asyncpg.Connection] = None

        # Railway connection details
        self.public_url = "postgresql://postgres:JTITwnMYUWxDvpedixscWLBOUAUejFxM@caboose.proxy.rlwy.net:27635/railway"
        self.internal_url = "postgresql://postgres:JTITwnMYUWxDvpedixscWLBOUAUejFxM@postgres.railway.internal:5432/railway"
    
    async def connect(self) -> bool:
        """Establish connection to Railway PostgreSQL database."""
        print("🔌 Connecting to Railway PostgreSQL database...")
        
        # Try public URL first, then internal URL
        urls_to_try = [self.public_url, self.internal_url, self.database_url] if self.database_url else [self.public_url, self.internal_url]
        
        for url in urls_to_try:
            try:
                print(f"  Trying: {url.split('@')[0]}@***")
                self.connection = await asyncpg.connect(url)
                
                # Test connection with a simple query
                result = await self.connection.fetchval("SELECT version()")
                print(f"✅ Connected successfully!")
                print(f"  PostgreSQL Version: {result.split(',')[0]}")
                return True
                
            except Exception as e:
                print(f"  ❌ Failed: {e}")
                continue
        
        print("❌ Could not connect to Railway database with any URL")
        return False
    
    async def disconnect(self):
        """Close database connection."""
        if self.connection:
            await self.connection.close()
            print("🔌 Database connection closed")
    
    async def get_admin_user(self) -> Optional[Dict[str, Any]]:
        """Get admin user data for preservation."""
        try:
            query = "SELECT * FROM users WHERE email = 'admin@mdv.ng'"
            result = await self.connection.fetchrow(query)
            
            if result:
                admin_data = dict(result)
                print(f"✅ Found admin user: {admin_data['name']} ({admin_data['email']})")
                return admin_data
            else:
                print("❌ Admin user not found!")
                return None
                
        except Exception as e:
            print(f"❌ Error fetching admin user: {e}")
            return None
    
    async def get_table_counts(self) -> Dict[str, int]:
        """Get record counts for all tables."""
        print("📊 Getting current table record counts...")
        
        # Get all table names
        tables_query = """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            AND table_name NOT IN ('alembic_version')
            ORDER BY table_name
        """
        
        tables = await self.connection.fetch(tables_query)
        counts = {}
        
        for table in tables:
            table_name = table['table_name']
            try:
                count = await self.connection.fetchval(f"SELECT COUNT(*) FROM {table_name}")
                counts[table_name] = count
                if count > 0:
                    print(f"  {table_name}: {count} records")
            except Exception as e:
                print(f"  ⚠️  Error counting {table_name}: {e}")
                counts[table_name] = -1
        
        return counts
    
    async def delete_all_data_except_admin(self) -> bool:
        """Delete all data except admin user."""
        print("\n🗑️  Starting data deletion process...")
        
        if self.dry_run:
            print("🔍 DRY RUN MODE - No actual deletions will be performed")
        
        try:
            # Start transaction
            async with self.connection.transaction():
                # Disable foreign key checks temporarily
                if not self.dry_run:
                    await self.connection.execute("SET session_replication_role = replica")
                
                # Get all tables in dependency order (reverse of creation order)
                deletion_order = [
                    # Order-related tables (delete first due to foreign keys)
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
                    'product_images',
                    'variants',
                    'products',
                    'categories',
                    
                    # User-related data (but not users table yet)
                    'user_addresses',
                    'addresses',
                    
                    # Other data
                    'coupons',
                    'zones',
                    'state_zones',
                ]

                # Add audit logs to deletion list if user chose to delete them
                if self.delete_audit_logs:
                    deletion_order.append('audit_logs')
                
                deleted_counts = {}
                
                for table in deletion_order:
                    try:
                        if self.dry_run:
                            count = await self.connection.fetchval(f"SELECT COUNT(*) FROM {table}")
                            print(f"  [DRY RUN] Would delete {count} records from {table}")
                            deleted_counts[table] = count
                        else:
                            result = await self.connection.execute(f"DELETE FROM {table}")
                            count = int(result.split()[-1]) if result.split()[-1].isdigit() else 0
                            deleted_counts[table] = count
                            if count > 0:
                                print(f"  ✅ Deleted {count} records from {table}")
                    except Exception as e:
                        print(f"  ⚠️  Error with {table}: {e}")
                
                # Delete all users except admin
                print("\n👥 Handling user accounts...")
                if self.dry_run:
                    count = await self.connection.fetchval(
                        "SELECT COUNT(*) FROM users WHERE email != 'admin@mdv.ng'"
                    )
                    print(f"  [DRY RUN] Would delete {count} user accounts (preserving admin)")
                else:
                    result = await self.connection.execute(
                        "DELETE FROM users WHERE email != 'admin@mdv.ng'"
                    )
                    count = int(result.split()[-1]) if result.split()[-1].isdigit() else 0
                    print(f"  ✅ Deleted {count} user accounts (preserved admin)")
                
                # Re-enable foreign key checks
                if not self.dry_run:
                    await self.connection.execute("SET session_replication_role = DEFAULT")
                
                # Report audit log status
                if self.delete_audit_logs:
                    print(f"\n{'[DRY RUN] ' if self.dry_run else ''}Data deletion completed successfully!")
                    print(f"{'[DRY RUN] ' if self.dry_run else ''}📋 Audit logs {'would be' if self.dry_run else 'were'} deleted as requested")
                else:
                    print(f"\n{'[DRY RUN] ' if self.dry_run else ''}Data deletion completed successfully!")
                    print(f"{'[DRY RUN] ' if self.dry_run else ''}📋 Audit logs {'would be' if self.dry_run else 'were'} preserved for compliance")

                return True
                
        except Exception as e:
            print(f"❌ Error during data deletion: {e}")
            return False
    
    async def create_admin_user_if_missing(self) -> bool:
        """Create admin user if it doesn't exist."""
        admin_user = await self.get_admin_user()
        
        if not admin_user:
            print("\n👤 Creating admin user...")
            
            if self.dry_run:
                print("  [DRY RUN] Would create admin user: admin@mdv.ng")
                return True
            
            try:
                password_hash = hash_password('admin')
                
                await self.connection.execute("""
                    INSERT INTO users (name, email, role, active, password_hash, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6)
                """, 'Admin User', 'admin@mdv.ng', 'admin', True, password_hash, datetime.utcnow())
                
                print("  ✅ Created admin user successfully")
                return True
                
            except Exception as e:
                print(f"  ❌ Error creating admin user: {e}")
                return False
        else:
            print("  ✅ Admin user already exists")
            return True
    
    async def reset_sequences(self) -> bool:
        """Reset PostgreSQL sequences for auto-increment columns."""
        print("\n🔄 Resetting auto-increment sequences...")
        
        if self.dry_run:
            print("  [DRY RUN] Would reset all sequence counters")
            return True
        
        try:
            # Get all sequences
            sequences_query = """
                SELECT sequence_name 
                FROM information_schema.sequences 
                WHERE sequence_schema = 'public'
            """
            
            sequences = await self.connection.fetch(sequences_query)
            
            for seq in sequences:
                seq_name = seq['sequence_name']
                try:
                    await self.connection.execute(f"ALTER SEQUENCE {seq_name} RESTART WITH 1")
                    print(f"  ✅ Reset sequence: {seq_name}")
                except Exception as e:
                    print(f"  ⚠️  Error resetting {seq_name}: {e}")
            
            # Ensure admin user gets ID = 1
            admin_user = await self.get_admin_user()
            if admin_user and admin_user['id'] != 1:
                await self.connection.execute(
                    "UPDATE users SET id = 1 WHERE email = 'admin@mdv.ng'"
                )
                await self.connection.execute("SELECT setval('users_id_seq', 1)")
                print("  ✅ Set admin user ID to 1")
            
            return True
            
        except Exception as e:
            print(f"❌ Error resetting sequences: {e}")
            return False
    
    async def verify_reset(self) -> bool:
        """Verify the database reset was successful."""
        print("\n🔍 Verifying database reset...")
        
        try:
            # Check admin user
            admin_user = await self.get_admin_user()
            if not admin_user:
                print("❌ Admin user verification failed!")
                return False
            
            print(f"✅ Admin user verified: ID={admin_user['id']}, Role={admin_user['role']}")
            
            # Check other tables are empty
            tables_to_check = ['products', 'orders', 'carts', 'reviews', 'categories']
            all_empty = True

            for table in tables_to_check:
                try:
                    count = await self.connection.fetchval(f"SELECT COUNT(*) FROM {table}")
                    if count == 0:
                        print(f"✅ {table} table is empty")
                    else:
                        print(f"⚠️  {table} table still has {count} records")
                        all_empty = False
                except Exception as e:
                    print(f"ℹ️  {table} table check failed: {e}")

            # Check audit logs status
            try:
                audit_count = await self.connection.fetchval("SELECT COUNT(*) FROM audit_logs")
                if self.delete_audit_logs:
                    if audit_count == 0:
                        print(f"✅ audit_logs table is empty (deleted as requested)")
                    else:
                        print(f"⚠️  audit_logs table still has {audit_count} records (should be 0)")
                        all_empty = False
                else:
                    print(f"✅ audit_logs table preserved with {audit_count} records")
            except Exception as e:
                print(f"ℹ️  audit_logs table check failed: {e}")

            # Check total user count
            user_count = await self.connection.fetchval("SELECT COUNT(*) FROM users")
            print(f"✅ Total users in database: {user_count} (should be 1)")

            if user_count != 1:
                all_empty = False

            return all_empty
            
        except Exception as e:
            print(f"❌ Verification error: {e}")
            return False


async def main():
    """Main function to run the database reset."""
    parser = argparse.ArgumentParser(description='Reset Railway PostgreSQL database')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be deleted without actually deleting')
    parser.add_argument('--confirm', action='store_true', help='Skip interactive confirmation')
    parser.add_argument('--database-url', help='Custom database URL')
    parser.add_argument('--delete-audit-logs', action='store_true', help='Delete audit logs (default: preserve)')

    args = parser.parse_args()

    print("🚨 RAILWAY POSTGRESQL DATABASE RESET")
    print("=" * 60)
    print("⚠️  WARNING: This will delete ALL data except admin@mdv.ng!")
    print("⚠️  This action affects the PRODUCTION database!")
    print("⚠️  This action is IRREVERSIBLE!")
    print("=" * 60)

    if args.dry_run:
        print("🔍 DRY RUN MODE: No actual changes will be made")
        print("=" * 60)

    # Determine audit log deletion preference
    delete_audit_logs = args.delete_audit_logs

    # Confirmation prompts
    if not args.confirm:
        if not args.dry_run:
            confirm1 = input("Type 'PRODUCTION' to confirm this is for production database: ")
            if confirm1 != 'PRODUCTION':
                print("❌ Database reset cancelled.")
                return 1

            confirm2 = input("Type 'RESET' to confirm database reset: ")
            if confirm2 != 'RESET':
                print("❌ Database reset cancelled.")
                return 1

        # Ask about audit logs if not specified via command line
        if not args.delete_audit_logs:
            print("\n📋 Audit Log Options:")
            print("  • Keep audit logs: Preserves compliance and debugging history")
            print("  • Delete audit logs: Complete clean slate for project handover")
            audit_choice = input("Do you want to delete audit logs? (y/N): ").strip().lower()
            delete_audit_logs = audit_choice in ['y', 'yes']

            if delete_audit_logs:
                print("⚠️  Audit logs will be deleted for complete clean slate")
            else:
                print("📋 Audit logs will be preserved for compliance")

    # Initialize reset manager
    reset_manager = RailwayDatabaseReset(args.database_url, args.dry_run, delete_audit_logs)
    
    try:
        # Connect to database
        if not await reset_manager.connect():
            return 1
        
        # Get initial state
        print("\n📊 Current database state:")
        initial_counts = await reset_manager.get_table_counts()
        
        # Verify admin user exists or can be created
        admin_exists = await reset_manager.get_admin_user() is not None
        if not admin_exists:
            print("\n⚠️  Admin user not found - will be created during reset")
        
        # Perform reset
        print(f"\n🔄 Starting database reset {'(DRY RUN)' if args.dry_run else ''}...")
        
        # Delete all data except admin
        if not await reset_manager.delete_all_data_except_admin():
            print("❌ Data deletion failed!")
            return 1
        
        # Create admin user if missing
        if not await reset_manager.create_admin_user_if_missing():
            print("❌ Admin user creation failed!")
            return 1
        
        # Reset sequences
        if not await reset_manager.reset_sequences():
            print("❌ Sequence reset failed!")
            return 1
        
        # Verify reset
        if not args.dry_run:
            if not await reset_manager.verify_reset():
                print("❌ Reset verification failed!")
                return 1
        
        # Success message
        print("\n" + "=" * 60)
        if args.dry_run:
            print("🔍 DRY RUN COMPLETED SUCCESSFULLY!")
            print("=" * 60)
            print("✅ Dry run shows reset would work correctly")
            print("✅ Admin user would be preserved")
            print("✅ All other data would be deleted")
            if delete_audit_logs:
                print("✅ Audit logs would be deleted (complete clean slate)")
            else:
                print("✅ Audit logs would be preserved (compliance mode)")
            print("✅ Run without --dry-run to perform actual reset")
        else:
            print("🎉 RAILWAY DATABASE RESET COMPLETED SUCCESSFULLY!")
            print("=" * 60)
            print("✅ All data deleted except admin user")
            print("✅ Admin user preserved: admin@mdv.ng")
            print("✅ Admin password: admin")
            print("✅ Admin role: admin")
            print("✅ Sequences reset")
            if delete_audit_logs:
                print("✅ Audit logs deleted (complete clean slate)")
            else:
                print("✅ Audit logs preserved (compliance mode)")
            print("✅ Database ready for fresh data")
        print("=" * 60)
        
        return 0
        
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {e}")
        return 1
    
    finally:
        await reset_manager.disconnect()


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
