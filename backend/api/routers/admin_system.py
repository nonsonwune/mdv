"""
Admin system management endpoints for database operations.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from mdv.auth import require_roles
from mdv.rbac import ADMINS
from mdv.models import Product, User
from mdv.utils import parse_actor_id, audit
from ..deps import get_db

router = APIRouter(prefix="/api/admin", tags=["admin-system"])


@router.post("/system/clear-database")
async def clear_database_data(
    confirm: bool = Query(False, description="Must be true to proceed"),
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_roles(*ADMINS))
):
    """Clear all data except user accounts. Requires admin role and confirmation."""
    if not confirm:
        raise HTTPException(
            status_code=400, 
            detail="Must set confirm=true to proceed with database clearing"
        )
    
    actor_id = parse_actor_id(claims)
    
    try:
        # Get counts before deletion
        product_count_before = (await db.execute(text("SELECT COUNT(*) FROM products"))).scalar_one_or_none() or 0
        user_count_before = (await db.execute(text("SELECT COUNT(*) FROM users"))).scalar_one_or_none() or 0
        
        print(f"Before cleanup: {product_count_before} products, {user_count_before} users")
        
        # Clear in order to respect foreign key constraints
        delete_statements = [
            # Reviews and customer data
            "DELETE FROM review_votes",
            "DELETE FROM reviews", 
            "DELETE FROM wishlist_items",
            "DELETE FROM wishlists",
            
            # Returns and refunds
            "DELETE FROM return_items",
            "DELETE FROM returns",
            "DELETE FROM refunds",
            
            # Shipments and fulfillment
            "DELETE FROM shipment_events",
            "DELETE FROM shipments",
            "DELETE FROM fulfillment_items",
            "DELETE FROM fulfillments",
            
            # Orders
            "DELETE FROM order_items",
            "DELETE FROM addresses",  # Order addresses, not user_addresses
            "DELETE FROM orders",
            
            # Cart and reservations
            "DELETE FROM reservations",
            "DELETE FROM cart_items",
            "DELETE FROM carts",
            
            # Inventory
            "DELETE FROM stock_ledger",
            "DELETE FROM inventory",
            
            # Products (this is the main one we want to clear)
            "DELETE FROM product_images",
            "DELETE FROM variants",
            "DELETE FROM products",
            "DELETE FROM categories",
            
            # System logs
            "DELETE FROM audit_logs",
        ]
        
        cleared_tables = []
        for stmt in delete_statements:
            try:
                result = await db.execute(text(stmt))
                rows_affected = result.rowcount
                table_name = stmt.split("FROM ")[1].strip()
                if rows_affected > 0:
                    cleared_tables.append(f"{table_name}: {rows_affected} rows")
                    print(f"Cleared {rows_affected} rows from {table_name}")
            except Exception as e:
                print(f"Warning: {stmt} failed - {e}")
        
        # Get counts after deletion
        product_count_after = (await db.execute(text("SELECT COUNT(*) FROM products"))).scalar_one_or_none() or 0
        user_count_after = (await db.execute(text("SELECT COUNT(*) FROM users"))).scalar_one_or_none() or 0
        
        print(f"After cleanup: {product_count_after} products, {user_count_after} users")
        
        # Log the action
        await audit(
            db, actor_id, "system.database_clear", "Database", 0,
            after={
                "products_cleared": product_count_before - product_count_after,
                "users_preserved": user_count_after,
                "tables_cleared": len(cleared_tables)
            }
        )
        
        await db.commit()
        
        return {
            "success": True,
            "message": "Database cleared successfully while preserving user accounts",
            "summary": {
                "products_before": product_count_before,
                "products_after": product_count_after,
                "users_preserved": user_count_after,
                "tables_cleared": cleared_tables
            }
        }
        
    except Exception as e:
        await db.rollback()
        print(f"Error during database clear: {e}")
        raise HTTPException(status_code=500, detail=f"Database clear failed: {str(e)}")


@router.get("/system/database-status")
async def get_database_status(
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_roles(*ADMINS))
):
    """Get current database table counts. Requires admin role."""
    
    tables = [
        "users", "products", "orders", "categories", "carts", 
        "inventory", "user_addresses", "zones", "state_zones", "coupons"
    ]
    
    counts = {}
    for table in tables:
        try:
            result = await db.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar_one_or_none() or 0
            counts[table] = count
        except Exception as e:
            counts[table] = f"Error: {str(e)}"
    
    return {
        "database_status": counts,
        "summary": {
            "has_products": counts.get("products", 0) > 0,
            "has_orders": counts.get("orders", 0) > 0,
            "user_count": counts.get("users", 0)
        }
    }
