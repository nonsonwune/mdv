"""
Enhanced authentication router with bcrypt password hashing.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from mdv.auth import create_access_token
from mdv.models import User, Role
from mdv.password import hash_password, verify_password, needs_rehash
from mdv.emailer import send_email
from mdv.email_templates import welcome_email
from mdv.config import settings
from ..deps import get_db
from mdv.schemas import AuthLoginRequest, AuthLoginResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


@router.post("/login", response_model=AuthLoginResponse)
async def login(body: AuthLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate user with email and password.
    Supports both bcrypt and legacy SHA256 hashes.
    """
    # Look up user by email
    user = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    
    if not user:
        # Special handling for MVP mode - auto-create users
        # Remove this block in production
        if body.email.endswith("@mdv.ng"):
            # Create staff user with provided password
            role = Role.admin if body.email == "admin@mdv.ng" else Role.operations
            user = User(
                name=body.email.split("@")[0],
                email=body.email,
                role=role,
                active=True,
                password_hash=hash_password(body.password) if body.password else None
            )
            db.add(user)
            await db.flush()
            await db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
    
    # Check if user has a password set
    if user.password_hash:
        # Verify password
        if not verify_password(body.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if password hash needs updating (from SHA256 to bcrypt)
        if needs_rehash(user.password_hash):
            user.password_hash = hash_password(body.password)
            await db.commit()
    else:
        # No password set - for MVP compatibility
        # In production, this should require password setup
        if body.password:
            # Set the password for the first time
            user.password_hash = hash_password(body.password)
            await db.commit()
    
    # Create access token
    token = create_access_token(subject=str(user.id), role=user.role)

    # Create user response data that matches frontend User interface
    user_data = UserResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=user.role.value,
        active=user.active,
        created_at=user.created_at.isoformat(),
        phone=getattr(user, 'phone', None)
    )

    # Return both access_token and token for client compatibility, plus complete user data
    return AuthLoginResponse(
        access_token=token,
        token=token,
        role=user.role.value,
        token_type="bearer",
        user=user_data
    )


@router.post("/register", response_model=AuthLoginResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Register a new user with bcrypt password hashing.
    """
    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user with hashed password
    user = User(
        name=body.name,
        email=body.email,
        role=Role.customer,  # Proper customer role assignment
        active=True,
        password_hash=hash_password(body.password)
    )
    
    db.add(user)
    await db.flush()
    await db.commit()
    
    # Send welcome email
    try:
        email_data = {
            "name": body.name,
            "email": body.email,
            "app_url": settings.app_url
        }
        subject, html = welcome_email(email_data)
        await send_email(
            to_email=body.email,
            subject=subject,
            html=html
        )
    except Exception as e:
        # Log error but don't fail registration
        print(f"Failed to send welcome email: {e}")
    
    # Create access token
    token = create_access_token(subject=str(user.id), role=user.role)

    # Create user response data that matches frontend User interface
    user_data = UserResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=user.role.value,
        active=user.active,
        created_at=user.created_at.isoformat(),
        phone=getattr(user, 'phone', None)
    )

    return AuthLoginResponse(
        access_token=token,
        token=token,
        role=user.role.value,
        token_type="bearer",
        user=user_data
    )
