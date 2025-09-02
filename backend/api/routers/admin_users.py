"""
Admin user management endpoints.
Only admins can access these endpoints.
"""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime, timedelta
import hashlib
import secrets

from mdv.auth import require_roles, get_current_claims
from mdv.rbac import (
    ADMINS, SUPERVISORS, Permission,
    require_permission, require_any_permission
)
from mdv.models import User, Role
from mdv.utils import audit, parse_actor_id
from ..deps import get_db

router = APIRouter(prefix="/api/admin/users", tags=["admin-users"])


# Schemas
class UserCreateRequest(BaseModel):
    """Request model for creating a new user."""
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    role: Role
    password: Optional[str] = Field(None, min_length=8, max_length=100)
    active: bool = True
    
    @field_validator('role')
    def validate_role(cls, v):
        """Validate that the role is valid."""
        if v not in [Role.admin, Role.supervisor, Role.operations, Role.logistics]:
            raise ValueError(f"Invalid role: {v}")
        return v


class UserUpdateRequest(BaseModel):
    """Request model for updating an existing user."""
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    email: Optional[EmailStr] = None
    role: Optional[Role] = None
    active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8, max_length=100)


class UserResponse(BaseModel):
    """Response model for user data."""
    id: int
    name: str
    email: str
    role: str
    active: bool
    created_at: datetime
    has_password: bool


class UserListResponse(BaseModel):
    """Response model for paginated user list."""
    items: List[UserResponse]
    total: int
    page: int
    per_page: int
    has_next: bool


class SupervisorCreateRequest(BaseModel):
    """Simplified request model for creating a supervisor."""
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)


class BulkUserCreateRequest(BaseModel):
    """Request model for creating multiple users."""
    users: List[UserCreateRequest]


class UserStatsResponse(BaseModel):
    """Response model for user statistics."""
    total_users: int
    active_users: int
    inactive_users: int
    by_role: dict
    recent_users: int  # Users created in last 30 days


# Helper functions
def hash_password(password: str) -> str:
    """Hash a password using SHA256 (should use bcrypt in production)."""
    # TODO: Replace with bcrypt when available
    return hashlib.sha256(password.encode()).hexdigest()


def generate_temp_password() -> str:
    """Generate a temporary password for new users."""
    return secrets.token_urlsafe(12)


# Endpoints

@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    role: Optional[Role] = None,
    active: Optional[bool] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.USER_VIEW))
):
    """
    List all users with pagination and filtering.
    Requires USER_VIEW permission.
    """
    # Build query
    query = select(User)
    count_query = select(func.count()).select_from(User)
    
    # Apply filters
    filters = []
    if role:
        filters.append(User.role == role)
    if active is not None:
        filters.append(User.active == active)
    if search:
        search_term = f"%{search}%"
        filters.append(or_(
            User.name.ilike(search_term),
            User.email.ilike(search_term)
        ))
    
    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))
    
    # Pagination
    query = query.order_by(User.id.desc())
    query = query.limit(per_page).offset((page - 1) * per_page)
    
    # Execute queries
    result = await db.execute(query)
    users = result.scalars().all()
    
    total = await db.execute(count_query)
    total = total.scalar_one()
    
    # Convert to response
    items = [
        UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role.value,
            active=user.active,
            created_at=user.created_at,
            has_password=bool(user.password_hash)
        )
        for user in users
    ]
    
    return UserListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        has_next=(page * per_page) < total
    )


@router.get("/stats", response_model=UserStatsResponse)
async def get_user_stats(
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_permission(Permission.USER_VIEW))
):
    """
    Get user statistics.
    Requires USER_VIEW permission.
    """
    # Total users
    total = await db.execute(select(func.count()).select_from(User))
    total_users = total.scalar_one()
    
    # Active users
    active = await db.execute(select(func.count()).select_from(User).where(User.active == True))
    active_users = active.scalar_one()
    
    # By role
    role_stats = {}
    for role in [Role.admin, Role.supervisor, Role.operations, Role.logistics]:
        count = await db.execute(
            select(func.count()).select_from(User).where(User.role == role)
        )
        role_stats[role.value] = count.scalar_one()
    
    # Recent users (last 30 days)
    from datetime import timedelta
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent = await db.execute(
        select(func.count()).select_from(User).where(User.created_at >= thirty_days_ago)
    )
    recent_users = recent.scalar_one()
    
    return UserStatsResponse(
        total_users=total_users,
        active_users=active_users,
        inactive_users=total_users - active_users,
        by_role=role_stats,
        recent_users=recent_users
    )


@router.get("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_roles(*ADMINS))])
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get a specific user by ID.
    Admin only.
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
        active=user.active,
        created_at=user.created_at,
        has_password=bool(user.password_hash)
    )


@router.post("", response_model=UserResponse, dependencies=[Depends(require_roles(*ADMINS))])
async def create_user(
    request: UserCreateRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_claims)
):
    """
    Create a new user.
    Admin only. Supervisors cannot create other supervisor accounts.
    """
    actor_id = parse_actor_id(claims)
    actor_role = claims.get("role")

    # Check supervisor restrictions
    if actor_role == "supervisor" and request.role in [Role.admin, Role.supervisor]:
        raise HTTPException(
            status_code=403,
            detail="Supervisors cannot create admin or supervisor accounts"
        )

    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == request.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(
        name=request.name,
        email=request.email,
        role=request.role,
        active=request.active
    )
    
    # Set password if provided
    if request.password:
        user.password_hash = hash_password(request.password)
    
    db.add(user)
    await db.flush()
    
    # Audit log
    await audit(
        db, actor_id, "user.create", "User", user.id,
        before=None,
        after={
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "active": user.active
        }
    )
    
    await db.commit()
    
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
        active=user.active,
        created_at=user.created_at,
        has_password=bool(user.password_hash)
    )


@router.post("/supervisor", response_model=UserResponse, dependencies=[Depends(require_roles(*ADMINS))])
async def create_supervisor(
    request: SupervisorCreateRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_claims)
):
    """
    Create a new supervisor user (simplified endpoint).
    Admin only.
    """
    actor_id = parse_actor_id(claims)
    
    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == request.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create supervisor user
    user = User(
        name=request.name,
        email=request.email,
        role=Role.supervisor,
        active=True,
        password_hash=hash_password(request.password)
    )
    
    db.add(user)
    await db.flush()
    
    # Audit log
    await audit(
        db, actor_id, "supervisor.create", "User", user.id,
        before=None,
        after={
            "name": user.name,
            "email": user.email,
            "role": "supervisor",
            "active": True
        }
    )
    
    await db.commit()
    
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
        active=user.active,
        created_at=user.created_at,
        has_password=True
    )


@router.put("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_roles(*ADMINS))])
async def update_user(
    user_id: int,
    request: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_claims)
):
    """
    Update an existing user.
    Admin only. Supervisors cannot modify admin or supervisor accounts.
    """
    actor_id = parse_actor_id(claims)
    actor_role = claims.get("role")

    # Get user
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check supervisor restrictions
    if actor_role == "supervisor":
        # Supervisors cannot modify admin or supervisor accounts
        if user.role in [Role.admin, Role.supervisor]:
            raise HTTPException(
                status_code=403,
                detail="Supervisors cannot modify admin or supervisor accounts"
            )
        # Supervisors cannot promote users to admin or supervisor
        if request.role and request.role in [Role.admin, Role.supervisor]:
            raise HTTPException(
                status_code=403,
                detail="Supervisors cannot promote users to admin or supervisor roles"
            )

    # Prevent self-demotion for admin
    if user_id == actor_id and request.role and request.role != Role.admin:
        raise HTTPException(status_code=400, detail="Cannot change your own admin role")
    
    # Track changes for audit
    before = {
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "active": user.active
    }
    
    # Update fields
    if request.name is not None:
        user.name = request.name
    if request.email is not None:
        # Check if new email already exists
        existing = await db.execute(
            select(User).where(and_(User.email == request.email, User.id != user_id))
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = request.email
    if request.role is not None:
        user.role = request.role
    if request.active is not None:
        # Prevent self-deactivation
        if user_id == actor_id and not request.active:
            raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
        user.active = request.active
    if request.password:
        user.password_hash = hash_password(request.password)
    
    # Audit log
    after = {
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "active": user.active
    }
    
    if before != after:
        await audit(
            db, actor_id, "user.update", "User", user.id,
            before=before,
            after=after
        )
    
    await db.commit()
    
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
        active=user.active,
        created_at=user.created_at,
        has_password=bool(user.password_hash)
    )


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    force: bool = Query(False, description="Force deletion even if user has active orders"),
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_roles(*ADMINS))
):
    """
    Delete a user (soft delete by deactivating).
    Checks for business rules unless force=true.
    Admin only. Supervisors cannot delete admin or supervisor accounts.
    """
    actor_id = parse_actor_id(claims)
    actor_role = claims.get("role")

    # Prevent self-deletion
    if user_id == actor_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    # Get user
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check supervisor restrictions
    if actor_role == "supervisor" and user.role in [Role.admin, Role.supervisor]:
        raise HTTPException(
            status_code=403,
            detail="Supervisors cannot delete admin or supervisor accounts"
        )

    # Check if user is already inactive
    if not user.active:
        raise HTTPException(status_code=400, detail="User is already inactive")

    # Business rule checks (unless forced)
    if not force:
        # Check for active orders
        from mdv.models import Order, OrderStatus
        active_orders = await db.execute(
            select(func.count(Order.id))
            .where(
                (Order.user_id == user_id) &
                (Order.status.in_([OrderStatus.pending_payment, OrderStatus.paid]))
            )
        )
        active_order_count = active_orders.scalar_one()

        if active_order_count > 0:
            raise HTTPException(
                status_code=409,
                detail=f"User has {active_order_count} active order(s). Use force=true to delete anyway."
            )

        # Check for recent orders (within last 30 days)
        from datetime import datetime, timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_orders = await db.execute(
            select(func.count(Order.id))
            .where(
                (Order.user_id == user_id) &
                (Order.created_at >= thirty_days_ago)
            )
        )
        recent_order_count = recent_orders.scalar_one()

        if recent_order_count > 0:
            raise HTTPException(
                status_code=409,
                detail=f"User has {recent_order_count} recent order(s) within 30 days. Use force=true to delete anyway."
            )

    # Soft delete by deactivating
    before = {"active": user.active}
    user.active = False

    # Audit log
    await audit(
        db, actor_id, "user.delete", "User", user.id,
        before=before,
        after={"active": False, "forced": force}
    )

    await db.commit()

    return {
        "message": "User deleted successfully",
        "user_id": user_id,
        "user_name": user.name,
        "user_email": user.email,
        "forced": force
    }


@router.post("/{user_id}/activate", dependencies=[Depends(require_roles(*ADMINS))])
async def activate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_claims)
):
    """
    Activate a deactivated user.
    Admin only.
    """
    actor_id = parse_actor_id(claims)
    
    # Get user
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.active:
        raise HTTPException(status_code=400, detail="User is already active")
    
    # Activate user
    before = {"active": user.active}
    user.active = True
    
    # Audit log
    await audit(
        db, actor_id, "user.activate", "User", user.id,
        before=before,
        after={"active": True}
    )
    
    await db.commit()
    
    return {"message": "User activated successfully", "user_id": user_id}


@router.post("/{user_id}/reset-password", dependencies=[Depends(require_roles(*ADMINS))])
async def reset_user_password(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_claims)
):
    """
    Reset a user's password to 'password123' and require change on next login.
    Admin only. Supervisors cannot reset admin or supervisor passwords.
    """
    actor_id = parse_actor_id(claims)
    actor_role = claims.get("role")

    # Prevent self-reset
    if user_id == actor_id:
        raise HTTPException(status_code=400, detail="Cannot reset your own password")

    # Get user
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check supervisor restrictions
    if actor_role == "supervisor" and user.role in [Role.admin, Role.supervisor]:
        raise HTTPException(
            status_code=403,
            detail="Supervisors cannot reset admin or supervisor passwords"
        )

    # Set password to "password123" and force change on next login
    default_password = "password123"
    user.password_hash = hash_password(default_password)
    user.force_password_change = True

    # Audit log
    await audit(
        db, actor_id, "user.password_reset", "User", user.id,
        before={"force_password_change": False},
        after={"password_reset": True, "force_password_change": True}
    )

    await db.commit()

    return {
        "message": "Password reset successfully",
        "user_id": user_id,
        "user_name": user.name,
        "user_email": user.email,
        "temporary_password": default_password,
        "note": "User must change password on next login"
    }


@router.post("/bulk", response_model=List[UserResponse], dependencies=[Depends(require_roles(*ADMINS))])
async def create_bulk_users(
    request: BulkUserCreateRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_claims)
):
    """
    Create multiple users at once.
    Admin only.
    """
    actor_id = parse_actor_id(claims)
    created_users = []
    
    # Check for duplicate emails in request
    emails = [u.email for u in request.users]
    if len(emails) != len(set(emails)):
        raise HTTPException(status_code=400, detail="Duplicate emails in request")
    
    # Check if any email already exists
    existing = await db.execute(select(User.email).where(User.email.in_(emails)))
    existing_emails = [e for e, in existing.all()]
    if existing_emails:
        raise HTTPException(
            status_code=400,
            detail=f"These emails already exist: {', '.join(existing_emails)}"
        )
    
    # Create all users
    for user_data in request.users:
        user = User(
            name=user_data.name,
            email=user_data.email,
            role=user_data.role,
            active=user_data.active
        )
        
        if user_data.password:
            user.password_hash = hash_password(user_data.password)
        
        db.add(user)
        await db.flush()
        
        # Audit log
        await audit(
            db, actor_id, "user.bulk_create", "User", user.id,
            before=None,
            after={
                "name": user.name,
                "email": user.email,
                "role": user.role.value,
                "active": user.active
            }
        )
        
        created_users.append(UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role.value,
            active=user.active,
            created_at=user.created_at,
            has_password=bool(user.password_hash)
        ))
    
    await db.commit()
    
    return created_users


@router.post("/{user_id}/change-role", dependencies=[Depends(require_roles(*ADMINS))])
async def change_user_role(
    user_id: int,
    new_role: Role,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(get_current_claims)
):
    """
    Change a user's role.
    Admin only.
    """
    actor_id = parse_actor_id(claims)
    
    # Prevent self role change
    if user_id == actor_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    # Get user
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Track change
    before = {"role": user.role.value}
    user.role = new_role
    after = {"role": user.role.value}
    
    # Audit log
    await audit(
        db, actor_id, "user.role_change", "User", user.id,
        before=before,
        after=after
    )
    
    await db.commit()
    
    return {
        "message": "Role changed successfully",
        "user_id": user_id,
        "old_role": before["role"],
        "new_role": after["role"]
    }
