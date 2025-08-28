#!/usr/bin/env python3
"""
Test the VARCHAR fix for Order creation.
"""

import sys
import asyncio
from pathlib import Path
import os

# Add backend to path
backend_dir = (Path(__file__).resolve().parent.parent / "backend")
sys.path.insert(0, str(backend_dir))

# Ensure required env vars are available before importing backend settings
if (
    "DATABASE_URL" not in os.environ
    or "REDIS_URL" not in os.environ
    or "JWT_SECRET" not in os.environ
):
    env_file = backend_dir / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'").strip('"')
                if k not in os.environ and k in ("DATABASE_URL", "REDIS_URL", "JWT_SECRET"):
                    os.environ[k] = v
    # Safe local defaults if still missing
    os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./mdv_dev.db")
    os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
    os.environ.setdefault("JWT_SECRET", "dev")

from mdv.models import Order, Cart, OrderStatus
from mdv.db import get_session_factory, get_engine, Base

async def test_varchar_fix():
    """Test Order creation with VARCHAR status column."""
    print("🔍 TESTING VARCHAR FIX")
    print("=" * 50)
    
    try:
        # Ensure tables exist (create if missing)
        engine = get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        Session = get_session_factory()
        async with Session() as session:
            # Create a cart to satisfy FK and test creating order without explicit status
            cart1 = Cart()
            session.add(cart1)
            await session.flush()

            order = Order(cart_id=cart1.id)
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
            # Assertions for first order
            assert order.status == OrderStatus.pending_payment
            assert db_status == "PendingPayment"
            
            # Create second cart and test explicit status setting
            cart2 = Cart()
            session.add(cart2)
            await session.flush()

            order2 = Order(cart_id=cart2.id, status=OrderStatus.paid)
            session.add(order2)
            await session.flush()
            
            print(f"\n✅ Order with explicit status created!")
            print(f"   Order ID: {order2.id}")
            print(f"   Status: '{order2.status}'")
            # Verify the database value for second order
            from sqlalchemy import text as _text
            result2 = await session.execute(
                _text("SELECT status FROM orders WHERE id = :order_id"),
                {"order_id": order2.id}
            )
            db_status2 = result2.scalar()
            print(f"   Database value (order2): '{db_status2}'")
            print(f"   Database type (order2): {type(db_status2)}")
            # Assertions for second order
            assert order2.status == OrderStatus.paid
            assert db_status2 == "Paid"
            
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

