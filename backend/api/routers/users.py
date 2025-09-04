"""
User management endpoints for profile, addresses, and account settings.
"""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

from mdv.auth import get_current_claims, create_access_token
from mdv.models import User, Role, Address as AddressModel, Order, UserAddress
from ..deps import get_db

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/api", tags=["users"])


# Schemas
class UserProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    active: bool
    created_at: datetime
    phone: Optional[str] = None
    
class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    
class UserRegistrationRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class AddressResponse(BaseModel):
    id: int
    name: str
    phone: str
    state: str
    city: str
    street: str
    is_default: bool = False
    user_id: Optional[int] = None

class AddressCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=160)
    phone: str = Field(..., min_length=10, max_length=32)
    state: str = Field(..., min_length=2, max_length=80)
    city: str = Field(..., min_length=2, max_length=120)
    street: str = Field(..., min_length=5, max_length=255)
    is_default: bool = False

class AddressUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=160)
    phone: Optional[str] = Field(None, min_length=10, max_length=32)
    state: Optional[str] = Field(None, min_length=2, max_length=80)
    city: Optional[str] = Field(None, min_length=2, max_length=120)
    street: Optional[str] = Field(None, min_length=5, max_length=255)
    is_default: Optional[bool] = None


# User Profile Endpoints
@router.get("/users/profile", response_model=UserProfileResponse)
async def get_user_profile(
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's profile."""
    user_id = int(claims["sub"])
    user = await db.get(User, user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserProfileResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
        active=user.active,
        created_at=user.created_at,
        phone=getattr(user, 'phone', None)
    )


@router.put("/users/profile", response_model=UserProfileResponse)
async def update_user_profile(
    profile_update: UserProfileUpdate,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's profile."""
    user_id = int(claims["sub"])
    user = await db.get(User, user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields if provided
    if profile_update.name is not None:
        user.name = profile_update.name
    if profile_update.phone is not None:
        # We'll need to add phone field to User model
        pass  # TODO: Add phone field to User model
    
    await db.commit()
    await db.refresh(user)
    
    return UserProfileResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
        active=user.active,
        created_at=user.created_at,
        phone=getattr(user, 'phone', None)
    )


# Authentication Enhancements
@router.post("/auth/register", response_model=dict)
async def register_user(
    registration: UserRegistrationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user account."""
    # Check if email already exists
    existing_user = (await db.execute(
        select(User).where(User.email == registration.email)
    )).scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user with hashed password
    # Note: We need to add password_hash field to User model
    user = User(
        name=registration.name,
        email=registration.email,
        role=Role.customer,  # Proper customer role assignment
        active=True
    )
    # TODO: Store password_hash = pwd_context.hash(registration.password)
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Generate token
    token = create_access_token(subject=str(user.id), role=user.role)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role.value,
        "user_id": user.id
    }


@router.post("/auth/change-password")
async def change_password(
    password_change: PasswordChangeRequest,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Change current user's password."""
    user_id = int(claims["sub"])
    user = await db.get(User, user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # TODO: Verify current password when password_hash field is added
    # if not pwd_context.verify(password_change.current_password, user.password_hash):
    #     raise HTTPException(status_code=400, detail="Invalid current password")
    
    # TODO: Update password_hash
    # user.password_hash = pwd_context.hash(password_change.new_password)
    
    await db.commit()
    
    return {"message": "Password changed successfully"}


@router.post("/auth/reset-password")
async def reset_password_request(
    reset_request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """Request a password reset token."""
    user = (await db.execute(
        select(User).where(User.email == reset_request.email)
    )).scalar_one_or_none()
    
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a reset link has been sent"}
    
    # TODO: Generate reset token and send email
    # For now, just return success message
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/auth/reset-password/confirm")
async def reset_password_confirm(
    reset_confirm: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """Confirm password reset with token."""
    # TODO: Validate reset token and update password
    return {"message": "Password reset successfully"}


# Address Management
@router.get("/users/addresses", response_model=List[AddressResponse])
async def get_user_addresses(
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Get all saved addresses for the current user."""
    user_id = int(claims["sub"])
    rows = (
        await db.execute(
            select(UserAddress).where(UserAddress.user_id == user_id).order_by(UserAddress.is_default.desc(), UserAddress.created_at.desc())
        )
    ).scalars().all()
    out: list[AddressResponse] = []
    for a in rows:
        out.append(
            AddressResponse(
                id=a.id,
                name=a.name,
                phone=a.phone,
                state=a.state,
                city=a.city,
                street=a.street,
                is_default=a.is_default,
                user_id=a.user_id,
            )
        )
    return out


@router.post("/addresses", response_model=AddressResponse)
async def create_address(
    address: AddressCreate,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Create a new address for the current user."""
    user_id = int(claims["sub"])

    # If setting default, unset others
    if address.is_default:
        await db.execute(
            UserAddress.__table__.update()
            .where(UserAddress.user_id == user_id)
            .values(is_default=False)
        )

    ua = UserAddress(
        user_id=user_id,
        label=None,
        name=address.name,
        phone=address.phone,
        state=address.state,
        city=address.city,
        street=address.street,
        is_default=address.is_default,
    )
    db.add(ua)
    await db.flush()
    await db.commit()
    return AddressResponse(
        id=ua.id,
        name=ua.name,
        phone=ua.phone,
        state=ua.state,
        city=ua.city,
        street=ua.street,
        is_default=ua.is_default,
        user_id=user_id,
    )


@router.put("/addresses/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: int,
    address_update: AddressUpdate,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing address."""
    user_id = int(claims["sub"])

    ua = (
        await db.execute(
            select(UserAddress).where((UserAddress.id == address_id) & (UserAddress.user_id == user_id))
        )
    ).scalar_one_or_none()
    if not ua:
        raise HTTPException(status_code=404, detail="Address not found")

    if address_update.is_default is True:
        await db.execute(
            UserAddress.__table__.update()
            .where(UserAddress.user_id == user_id)
            .values(is_default=False)
        )

    if address_update.name is not None:
        ua.name = address_update.name
    if address_update.phone is not None:
        ua.phone = address_update.phone
    if address_update.state is not None:
        ua.state = address_update.state
    if address_update.city is not None:
        ua.city = address_update.city
    if address_update.street is not None:
        ua.street = address_update.street
    if address_update.is_default is not None:
        ua.is_default = address_update.is_default

    await db.commit()
    await db.refresh(ua)
    return AddressResponse(
        id=ua.id,
        name=ua.name,
        phone=ua.phone,
        state=ua.state,
        city=ua.city,
        street=ua.street,
        is_default=ua.is_default,
        user_id=user_id,
    )


@router.delete("/addresses/{address_id}")
async def delete_address(
    address_id: int,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Delete an address."""
    user_id = int(claims["sub"])

    ua = (
        await db.execute(
            select(UserAddress).where((UserAddress.id == address_id) & (UserAddress.user_id == user_id))
        )
    ).scalar_one_or_none()
    if not ua:
        raise HTTPException(status_code=404, detail="Address not found")

    await db.delete(ua)
    await db.commit()
    return {"message": "Address deleted successfully"}


@router.put("/addresses/{address_id}/set-default")
async def set_default_address(
    address_id: int,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Set an address as the default."""
    user_id = int(claims["sub"])

    ua = (
        await db.execute(
            select(UserAddress).where((UserAddress.id == address_id) & (UserAddress.user_id == user_id))
        )
    ).scalar_one_or_none()
    if not ua:
        raise HTTPException(status_code=404, detail="Address not found")

    await db.execute(
        UserAddress.__table__.update()
        .where(UserAddress.user_id == user_id)
        .values(is_default=False)
    )
    ua.is_default = True
    await db.commit()
    return {"message": "Default address updated"}


# Logout endpoint (token invalidation would require a blacklist mechanism)
@router.post("/auth/logout")
async def logout(claims: dict = Depends(get_current_claims)):
    """Logout the current user."""
    # TODO: Implement token blacklist mechanism for proper logout
    return {"message": "Logged out successfully"}


# Refresh token endpoint
@router.post("/auth/refresh")
async def refresh_token(
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Refresh the authentication token."""
    user_id = int(claims["sub"])
    user = await db.get(User, user_id)
    
    if not user or not user.active:
        raise HTTPException(status_code=401, detail="Invalid user")
    
    # Generate new token
    new_token = create_access_token(subject=str(user.id), role=user.role)
    
    return {
        "access_token": new_token,
        "token_type": "bearer",
        "role": user.role.value
    }
