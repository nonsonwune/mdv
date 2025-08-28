#!/usr/bin/env python3
"""
Test the VARCHAR fix for Order creation.
"""

import sys
import asyncio
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from mdv.models import Order
from mdv.db import get_session_factory

async def test_varchar_fix():
    """Test Order creation with VARCHAR status column."""
    print("🔍 TESTING VARCHAR FIX")
    print("=" * 50)
    
    try:
        Session = get_session_factory()
        async with Session() as session:
            # Test creating order without explicit status
            order = Order(cart_id=1)
            print(f"✅ Order created in memory")
            print(f"   Status before flush: {order.status}")
            
            session.add(order)
            await session.flush()
            
            print(f"✅ Order flushed to database successfully!")
            print(f"   Order ID: {order.id}")
            print(f"   Status after flush: {order.status}")
            print(f"   Status type: {type(order.status)}")
            
            # Verify the database value
            from sqlalchemy import text
            result = await session.execute(
                text("SELECT status FROM orders WHERE id = :order_id"),
                {"order_id": order.id}
            )
            db_status = result.scalar()
            print(f"   Database value: '{db_status}'")
            print(f"   Database type: {type(db_status)}")
            
            # Test explicit status setting
            order2 = Order(cart_id=2, status="paid")
            session.add(order2)
            await session.flush()
            
            print(f"\n✅ Order with explicit status created!")
            print(f"   Order ID: {order2.id}")
            print(f"   Status: '{order2.status}'")
            
            await session.rollback()
            return True
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_varchar_fix())
    print(f"\n{'🎉 VARCHAR FIX WORKS!' if result else '❌ FIX FAILED'}")
