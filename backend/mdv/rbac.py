from __future__ import annotations

from typing import Set, Dict, Optional, Callable, Any
from enum import Enum
from functools import wraps
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Role, User
from .auth import get_current_claims

# Convenience role groups
ALL_STAFF = (Role.admin, Role.supervisor, Role.operations, Role.logistics)
FULFILLMENT_STAFF = (Role.admin, Role.supervisor, Role.operations)
LOGISTICS_STAFF = (Role.admin, Role.supervisor, Role.logistics)
SUPERVISORS = (Role.admin, Role.supervisor)
ADMINS = (Role.admin,)


class Permission(str, Enum):
    """Granular permissions for actions in the system."""
    # Product permissions
    PRODUCT_VIEW = "product:view"
    PRODUCT_CREATE = "product:create"
    PRODUCT_EDIT = "product:edit"
    PRODUCT_DELETE = "product:delete"
    PRODUCT_PUBLISH = "product:publish"
    
    # Inventory permissions
    INVENTORY_VIEW = "inventory:view"
    INVENTORY_ADJUST = "inventory:adjust"
    INVENTORY_SYNC = "inventory:sync"
    
    # Order permissions
    ORDER_VIEW = "order:view"
    ORDER_CREATE = "order:create"
    ORDER_EDIT = "order:edit"
    ORDER_CANCEL = "order:cancel"
    ORDER_FULFILL = "order:fulfill"
    ORDER_REFUND = "order:refund"
    
    # User permissions
    USER_VIEW = "user:view"
    USER_CREATE = "user:create"
    USER_EDIT = "user:edit"
    USER_DELETE = "user:delete"
    USER_ACTIVATE = "user:activate"
    USER_ASSIGN_ROLE = "user:assign_role"
    
    # Payment permissions
    PAYMENT_VIEW = "payment:view"
    PAYMENT_PROCESS = "payment:process"
    PAYMENT_REFUND = "payment:refund"
    
    # Report permissions
    REPORT_VIEW = "report:view"
    REPORT_GENERATE = "report:generate"
    REPORT_EXPORT = "report:export"
    
    # System permissions
    SYSTEM_SETTINGS = "system:settings"
    SYSTEM_AUDIT = "system:audit"
    SYSTEM_BACKUP = "system:backup"
    
    # Analytics permissions
    ANALYTICS_VIEW = "analytics:view"
    ANALYTICS_EXPORT = "analytics:export"


# Role-Permission mapping
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.admin: set(Permission),  # Admins have all permissions
    
    Role.supervisor: {
        # Products - full access except delete
        Permission.PRODUCT_VIEW,
        Permission.PRODUCT_CREATE,
        Permission.PRODUCT_EDIT,
        Permission.PRODUCT_PUBLISH,
        # Inventory - full access
        Permission.INVENTORY_VIEW,
        Permission.INVENTORY_ADJUST,
        Permission.INVENTORY_SYNC,
        # Orders - full access
        Permission.ORDER_VIEW,
        Permission.ORDER_CREATE,
        Permission.ORDER_EDIT,
        Permission.ORDER_CANCEL,
        Permission.ORDER_FULFILL,
        Permission.ORDER_REFUND,
        # Users - limited access
        Permission.USER_VIEW,
        Permission.USER_CREATE,
        Permission.USER_EDIT,
        Permission.USER_ACTIVATE,
        # Payments - view and process
        Permission.PAYMENT_VIEW,
        Permission.PAYMENT_PROCESS,
        Permission.PAYMENT_REFUND,
        # Reports - full access
        Permission.REPORT_VIEW,
        Permission.REPORT_GENERATE,
        Permission.REPORT_EXPORT,
        # Analytics
        Permission.ANALYTICS_VIEW,
        Permission.ANALYTICS_EXPORT,
    },
    
    Role.operations: {
        # Products - view only
        Permission.PRODUCT_VIEW,
        # Inventory - view and adjust
        Permission.INVENTORY_VIEW,
        Permission.INVENTORY_ADJUST,
        # Orders - manage fulfillment
        Permission.ORDER_VIEW,
        Permission.ORDER_EDIT,
        Permission.ORDER_FULFILL,
        # Payments - view only
        Permission.PAYMENT_VIEW,
        # Reports - view only
        Permission.REPORT_VIEW,
        # Analytics - view only
        Permission.ANALYTICS_VIEW,
    },
    
    Role.logistics: {
        # Products - view only
        Permission.PRODUCT_VIEW,
        # Inventory - view only
        Permission.INVENTORY_VIEW,
        # Orders - view and update shipping
        Permission.ORDER_VIEW,
        Permission.ORDER_EDIT,
        # Reports - view logistics reports
        Permission.REPORT_VIEW,
        # Analytics - view logistics analytics
        Permission.ANALYTICS_VIEW,
    },
}


def has_permission(role: Role, permission: Permission) -> bool:
    """Check if a role has a specific permission."""
    return permission in ROLE_PERMISSIONS.get(role, set())


def has_any_permission(role: Role, *permissions: Permission) -> bool:
    """Check if a role has any of the specified permissions."""
    role_perms = ROLE_PERMISSIONS.get(role, set())
    return any(perm in role_perms for perm in permissions)


def has_all_permissions(role: Role, *permissions: Permission) -> bool:
    """Check if a role has all of the specified permissions."""
    role_perms = ROLE_PERMISSIONS.get(role, set())
    return all(perm in role_perms for perm in permissions)


def require_permission(permission: Permission):
    """Dependency to require a specific permission."""
    async def _checker(claims: dict = Depends(get_current_claims)):
        role_str = claims.get("role")
        try:
            role = Role(role_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid role"
            )
        
        if not has_permission(role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission.value}"
            )
        
        return claims
    
    return _checker


def require_any_permission(*permissions: Permission):
    """Dependency to require any of the specified permissions."""
    async def _checker(claims: dict = Depends(get_current_claims)):
        role_str = claims.get("role")
        try:
            role = Role(role_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid role"
            )
        
        if not has_any_permission(role, *permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: requires one of {[p.value for p in permissions]}"
            )
        
        return claims
    
    return _checker


def require_all_permissions(*permissions: Permission):
    """Dependency to require all of the specified permissions."""
    async def _checker(claims: dict = Depends(get_current_claims)):
        role_str = claims.get("role")
        try:
            role = Role(role_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid role"
            )
        
        if not has_all_permissions(role, *permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: requires all of {[p.value for p in permissions]}"
            )
        
        return claims
    
    return _checker


class ResourceOwnershipChecker:
    """Check if user owns or has access to a specific resource."""
    
    @staticmethod
    async def can_access_user(
        claims: dict,
        target_user_id: int,
        db: AsyncSession
    ) -> bool:
        """Check if current user can access target user's data."""
        current_user_id = int(claims.get("sub"))
        role_str = claims.get("role")
        
        # User can always access their own data
        if current_user_id == target_user_id:
            return True
        
        # Check role-based access
        try:
            role = Role(role_str)
            # Admins and supervisors can access any user
            if role in [Role.admin, Role.supervisor]:
                return True
            # Operations and logistics can only access their own data
            return False
        except ValueError:
            return False
    
    @staticmethod
    async def can_modify_order(
        claims: dict,
        order_id: int,
        db: AsyncSession
    ) -> bool:
        """Check if current user can modify an order."""
        role_str = claims.get("role")
        
        try:
            role = Role(role_str)
            
            # Admins and supervisors can modify any order
            if role in [Role.admin, Role.supervisor]:
                return True
            
            # Operations can modify orders for fulfillment
            if role == Role.operations:
                # Could add additional checks here for order status
                return True
            
            # Logistics can modify orders for shipping
            if role == Role.logistics:
                # Could check if order is in shipping phase
                return True
            
            return False
        except ValueError:
            return False


def owner_or_permission(permission: Permission):
    """Decorator for endpoints that allow access to resource owner OR users with permission."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # This is a simplified example - actual implementation would need
            # to extract the resource ID and check ownership
            return await func(*args, **kwargs)
        return wrapper
    return decorator

