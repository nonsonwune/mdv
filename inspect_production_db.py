#!/usr/bin/env python3
"""
Database inspection script to determine the actual production enum schema.
This will help us understand what enum values the production database actually expects.
"""

import sys
import asyncio
import os
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def inspect_production_database():
    """Inspect the production database to understand the actual enum schema."""
    print("🔍 PRODUCTION DATABASE INSPECTION")
    print("=" * 60)
    
    # Use production database URL (you'll need to set this)
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return False
    
    # Convert to async format if needed
    if database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
    
    print(f"🔗 Connecting to database...")
    
    try:
        engine = create_async_engine(database_url, echo=False)
        
        async with engine.begin() as conn:
            print(f"✅ Connected to production database")
            
            # 1. Check if enum types exist
            print(f"\n📋 CHECKING ENUM TYPES:")
            result = await conn.execute(text("""
                SELECT typname, oid 
                FROM pg_type 
                WHERE typtype = 'e' 
                ORDER BY typname;
            """))
            enum_types = result.fetchall()
            
            if enum_types:
                for enum_type in enum_types:
                    print(f"   ✅ Enum type: {enum_type[0]} (OID: {enum_type[1]})")
            else:
                print(f"   ❌ No enum types found in database!")
                return False
            
            # 2. Check enum values for each type
            print(f"\n🔍 CHECKING ENUM VALUES:")
            for enum_type in enum_types:
                type_name = enum_type[0]
                print(f"\n   📝 {type_name} enum values:")
                
                result = await conn.execute(text("""
                    SELECT enumlabel 
                    FROM pg_enum 
                    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = :type_name)
                    ORDER BY enumsortorder;
                """), {"type_name": type_name})
                
                enum_values = result.fetchall()
                if enum_values:
                    for i, value in enumerate(enum_values, 1):
                        print(f"      {i}. '{value[0]}'")
                else:
                    print(f"      ❌ No values found for {type_name}")
            
            # 3. Check existing orders table structure
            print(f"\n🏗️  CHECKING ORDERS TABLE:")
            try:
                result = await conn.execute(text("""
                    SELECT column_name, data_type, udt_name
                    FROM information_schema.columns 
                    WHERE table_name = 'orders' 
                    AND column_name = 'status';
                """))
                
                column_info = result.fetchone()
                if column_info:
                    print(f"   ✅ Orders.status column:")
                    print(f"      Column: {column_info[0]}")
                    print(f"      Data type: {column_info[1]}")
                    print(f"      UDT name: {column_info[2]}")
                else:
                    print(f"   ❌ Orders table or status column not found")
            except Exception as e:
                print(f"   ❌ Error checking orders table: {e}")
            
            # 4. Check existing order records (if any)
            print(f"\n📊 CHECKING EXISTING ORDER RECORDS:")
            try:
                result = await conn.execute(text("""
                    SELECT status, COUNT(*) as count
                    FROM orders 
                    GROUP BY status 
                    ORDER BY count DESC;
                """))
                
                order_statuses = result.fetchall()
                if order_statuses:
                    print(f"   ✅ Existing order statuses:")
                    for status, count in order_statuses:
                        print(f"      '{status}': {count} orders")
                else:
                    print(f"   ℹ️  No existing orders found")
            except Exception as e:
                print(f"   ❌ Error checking order records: {e}")
            
            # 5. Check migration history
            print(f"\n📜 CHECKING MIGRATION HISTORY:")
            try:
                result = await conn.execute(text("""
                    SELECT version_num FROM alembic_version;
                """))
                
                version = result.fetchone()
                if version:
                    print(f"   ✅ Current migration version: {version[0]}")
                else:
                    print(f"   ❌ No migration version found")
            except Exception as e:
                print(f"   ❌ Error checking migration history: {e}")
        
        await engine.dispose()
        return True
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

async def main():
    """Main inspection function."""
    success = await inspect_production_database()
    
    print(f"\n" + "=" * 60)
    if success:
        print(f"🎯 INSPECTION COMPLETE")
        print(f"Use the information above to determine the correct enum values.")
    else:
        print(f"❌ INSPECTION FAILED")
        print(f"Check database connection and permissions.")
    
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)
