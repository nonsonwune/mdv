"""
Admin system management endpoints for database operations.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text, select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from mdv.auth import require_roles
from mdv.rbac import ADMINS
from mdv.models import Product, User, Role
from mdv.password import hash_password
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
        from mdv.audit import AuditService
        from mdv.models import AuditAction, AuditEntity

        await AuditService.log_event(
            action=AuditAction.BULK_DELETE,
            entity=AuditEntity.SYSTEM,
            after={
                "products_cleared": product_count_before - product_count_after,
                "users_preserved": user_count_after,
                "tables_cleared": len(cleared_tables)
            },
            actor_id=actor_id,
            session=db
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


@router.post("/system/reset-users")
async def reset_all_users(
    confirm: bool = Query(False, description="Must be true to proceed"),
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_roles(*ADMINS))
):
    """Reset all users and recreate admin user. Requires admin role and confirmation."""
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Must set confirm=true to proceed with user reset"
        )

    actor_id = parse_actor_id(claims)

    try:
        # Step 1: Count existing users
        result = await db.execute(select(User))
        existing_users = result.scalars().all()
        user_count = len(existing_users)

        existing_user_list = []
        if user_count > 0:
            for user in existing_users:
                existing_user_list.append({
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "role": user.role.value,
                    "active": user.active
                })

        # Step 2: Delete all users
        if user_count > 0:
            await db.execute(delete(User))
            await db.commit()

        # Step 3: Recreate admin user
        admin_user = User(
            name="Admin User",
            email="admin@mdv.ng",
            role=Role.admin,
            active=True,
            password_hash=hash_password("admin123")
        )

        db.add(admin_user)
        await db.commit()

        # Step 4: Verify the reset
        verify_result = await db.execute(select(User))
        final_users = verify_result.scalars().all()

        final_user_list = []
        for user in final_users:
            final_user_list.append({
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role.value,
                "active": user.active
            })

        # Audit the operation
        from mdv.audit import AuditService
        from mdv.models import AuditAction, AuditEntity

        await AuditService.log_event(
            action=AuditAction.BULK_DELETE,
            entity=AuditEntity.USER,
            metadata={
                "deleted_users_count": user_count,
                "deleted_users": existing_user_list,
                "recreated_admin": True,
                "final_user_count": len(final_users)
            },
            actor_id=actor_id,
            session=db
        )

        return {
            "success": True,
            "message": "User reset completed successfully",
            "details": {
                "deleted_users_count": user_count,
                "deleted_users": existing_user_list,
                "final_users": final_user_list,
                "admin_credentials": {
                    "email": "admin@mdv.ng",
                    "password": "admin123",
                    "note": "Change this password immediately after login"
                }
            }
        }

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset users: {str(e)}"
        )
