#!/usr/bin/env python3
"""
Railway PostgreSQL Connection Test Script

Simple script to test connection to Railway PostgreSQL database
and display basic information about the current state.
"""

import asyncio
import asyncpg


async def test_connection():
    """Test connection to Railway PostgreSQL database."""
    
    # Railway connection URLs
    public_url = "postgresql://postgres:JTITwnMYUWxDvpedixscWLBOUAUejFxM@caboose.proxy.rlwy.net:27635/railway"
    internal_url = "postgresql://postgres:JTITwnMYUWxDvpedixscWLBOUAUejFxM@postgres.railway.internal:5432/railway"
    
    print("🔌 Testing Railway PostgreSQL Connection")
    print("=" * 50)
    
    # Try both URLs
    for name, url in [("Public URL", public_url), ("Internal URL", internal_url)]:
        print(f"\n📡 Testing {name}...")
        try:
            conn = await asyncpg.connect(url)
            
            # Get PostgreSQL version
            version = await conn.fetchval("SELECT version()")
            print(f"✅ Connected successfully!")
            print(f"  PostgreSQL: {version.split(',')[0]}")
            
            # Get database info
            db_name = await conn.fetchval("SELECT current_database()")
            user_name = await conn.fetchval("SELECT current_user")
            print(f"  Database: {db_name}")
            print(f"  User: {user_name}")
            
            # Get table count
            table_count = await conn.fetchval("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
            """)
            print(f"  Tables: {table_count}")
            
            # Check for admin user
            admin_exists = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@mdv.ng')"
            )
            print(f"  Admin user exists: {'✅ Yes' if admin_exists else '❌ No'}")
            
            # Get total record counts
            total_users = await conn.fetchval("SELECT COUNT(*) FROM users")
            total_products = await conn.fetchval("SELECT COUNT(*) FROM products")
            total_orders = await conn.fetchval("SELECT COUNT(*) FROM orders")
            
            print(f"  Users: {total_users}")
            print(f"  Products: {total_products}")
            print(f"  Orders: {total_orders}")
            
            await conn.close()
            print(f"✅ {name} connection test successful!")
            return True
            
        except Exception as e:
            print(f"❌ {name} connection failed: {e}")
    
    return False


if __name__ == "__main__":
    success = asyncio.run(test_connection())
    if success:
        print("\n🎉 Railway database connection is working!")
        print("You can now run the reset script safely.")
    else:
        print("\n❌ Could not connect to Railway database.")
        print("Please check your network connection and database credentials.")
