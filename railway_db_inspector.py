#!/usr/bin/env python3
"""
Direct Railway production database inspection to determine actual enum values.
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

async def inspect_railway_production():
    """Connect to Railway production database and inspect enum schema."""
    print("🔍 RAILWAY PRODUCTION DATABASE INSPECTION")
    print("=" * 60)
    
    # Get DATABASE_URL from environment
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        print("Please set DATABASE_URL with Railway database credentials")
        return None
    
    # Convert to async format
    if database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
    
    print(f"🔗 Connecting to Railway database...")
    print(f"   Host: caboose.proxy.rlwy.net:27635")
    
    try:
        engine = create_async_engine(database_url, echo=False)
        
        async with engine.begin() as conn:
            print(f"✅ Connected to Railway production database")
            
            # 1. Check if order_status enum exists
            print(f"\n📋 CHECKING ORDER_STATUS ENUM:")
            result = await conn.execute(text("""
                SELECT typname, oid 
                FROM pg_type 
                WHERE typname = 'order_status' AND typtype = 'e';
            """))
            enum_type = result.fetchone()
            
            if not enum_type:
                print(f"   ❌ order_status enum type does not exist!")
                return {"enum_exists": False}
            
            print(f"   ✅ order_status enum exists (OID: {enum_type[1]})")
            
            # 2. Get actual enum values
            print(f"\n🔍 GETTING ACTUAL ENUM VALUES:")
            result = await conn.execute(text("""
                SELECT enumlabel, enumsortorder
                FROM pg_enum 
                WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
                ORDER BY enumsortorder;
            """))
            
            enum_values = result.fetchall()
            if enum_values:
                print(f"   ✅ Found {len(enum_values)} enum values:")
                actual_values = []
                for i, (value, sort_order) in enumerate(enum_values, 1):
                    print(f"      {i}. '{value}' (sort: {sort_order})")
                    actual_values.append(value)
                
                return {
                    "enum_exists": True,
                    "values": actual_values
                }
            else:
                print(f"   ❌ No enum values found!")
                return {"enum_exists": True, "values": []}
            
        await engine.dispose()
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return None

async def main():
    """Main inspection function."""
    result = await inspect_railway_production()
    
    print(f"\n" + "=" * 60)
    if result:
        print(f"🎯 INSPECTION COMPLETE")
        if result["enum_exists"] and result.get("values"):
            print(f"✅ Found actual enum values: {result['values']}")
            return result
        else:
            print(f"❌ Enum exists but no values found")
    else:
        print(f"❌ INSPECTION FAILED")
    
    return result

if __name__ == "__main__":
    result = asyncio.run(main())
    if result:
        print(f"\n🔧 NEXT STEP: Update Python enums to match these exact values")
    sys.exit(0 if result else 1)
