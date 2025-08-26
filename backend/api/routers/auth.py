from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from mdv.auth import create_access_token
from mdv.models import User, Role
from mdv.password import hash_password, verify_password, needs_rehash
from mdv.rate_limit import limiter, RATE_LIMITS
from mdv.schemas import AuthLoginRequest, AuthLoginResponse
from ..deps import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


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
    
    # Create access token
    token = create_access_token(subject=str(user.id), role=user.role)
    
    # Return both access_token and token for client compatibility
    return AuthLoginResponse(
        access_token=token,
        token=token,
        role=user.role.value,
        token_type="bearer"
    )

