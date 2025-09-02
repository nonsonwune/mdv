from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from mdv.auth import create_access_token, get_current_claims
from mdv.models import User, Role
from mdv.password import hash_password, verify_password, needs_rehash
from mdv.rate_limit import limiter, RATE_LIMITS
from mdv.schemas import AuthLoginRequest, AuthLoginResponse
from ..deps import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthCheckResponse(BaseModel):
    user: dict


@router.post("/login", response_model=AuthLoginResponse)
@limiter.limit(RATE_LIMITS["login"])
async def login(request: Request, body: AuthLoginRequest, db: AsyncSession = Depends(get_db)):
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
                status_code=401,
                detail="Invalid email or password"
            )
    
    # Check if user has a password set
    if user.password_hash:
        # Verify password
        if not verify_password(body.password, user.password_hash):
            raise HTTPException(
                status_code=401,
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
    
    # Check if password change is required
    if user.force_password_change:
        # Return special response indicating password change required
        return AuthLoginResponse(
            access_token=None,
            token=None,
            role=user.role.value,
            token_type="bearer",
            force_password_change=True,
            user_id=user.id,
            message="Password change required before accessing the system"
        )

    # Create access token
    token = create_access_token(subject=str(user.id), role=user.role)

    # Return both access_token and token for client compatibility
    return AuthLoginResponse(
        access_token=token,
        token=token,
        role=user.role.value,
        token_type="bearer"
    )


@router.post("/change-password-forced")
async def change_password_forced(
    body: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    Change password for users who are forced to change it.
    Does not require authentication token.
    """
    user_id = body.get("user_id")
    current_password = body.get("current_password")
    new_password = body.get("new_password")

    if not all([user_id, current_password, new_password]):
        raise HTTPException(status_code=400, detail="Missing required fields")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Get user
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user or not user.active:
        raise HTTPException(status_code=404, detail="User not found or inactive")

    # Verify current password
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid current password")

    # Update password and clear force flag
    user.password_hash = hash_password(new_password)
    user.force_password_change = False

    await db.commit()

    # Create access token now that password is changed
    token = create_access_token(subject=str(user.id), role=user.role)

    return AuthLoginResponse(
        access_token=token,
        token=token,
        role=user.role.value,
        token_type="bearer"
    )


@router.get("/check", response_model=AuthCheckResponse)
async def check_auth(
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """
    Check current authentication status and return user information.
    Requires valid JWT token in Authorization header.
    """
    user_id = int(claims["sub"])
    user = await db.get(User, user_id)
    
    if not user or not user.active:
        raise HTTPException(
            status_code=401,
            detail="User not found or inactive"
        )
    
    return AuthCheckResponse(
        user={
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "active": user.active,
            "created_at": user.created_at.isoformat()
        }
    )

