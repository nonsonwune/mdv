from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from mdv.auth import create_access_token, get_current_claims
from mdv.models import User, Role
from mdv.password import hash_password, verify_password, needs_rehash
from mdv.rate_limit import limiter, RATE_LIMITS, record_auth_failure, create_rate_limited_endpoint
from mdv.schemas import AuthLoginRequest, AuthLoginResponse, UserResponse
from mdv.audit import audit_context, audit_login, audit_logout, AuditService, AuditAction, AuditEntity
from ..deps import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthCheckResponse(BaseModel):
    user: dict


@router.post("/login", response_model=AuthLoginResponse)
# Rate limiting temporarily disabled to resolve middleware conflicts
async def login(request: Request, body: AuthLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate user with email and password.
    Supports both bcrypt and legacy SHA256 hashes.
    """
    # Set up audit context
    audit_context.set_request_context(request)

    # Look up user by email
    user = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    
    if not user:
        # Record auth failure for rate limiting
        record_auth_failure(request)

        # Log failed login attempt
        await AuditService.log_authentication(
            action=AuditAction.LOGIN_FAILED,
            email=body.email,
            success=False,
            error_message="User not found",
            metadata={"reason": "user_not_found"}
        )

        # Special handling for MVP mode - auto-create users
        # Remove this block in production
        if body.email.endswith("@mdv.ng"):
            # Create staff user with provided password - assign role based on email prefix
            if body.email == "admin@mdv.ng":
                role = Role.admin
            elif body.email.startswith("supervisor"):
                role = Role.supervisor
            elif body.email.startswith("logistics"):
                role = Role.logistics
            elif body.email.startswith("operations"):
                role = Role.operations
            else:
                role = Role.operations  # Default fallback
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

            # Log user auto-creation
            await AuditService.log_event(
                action=AuditAction.CREATE,
                entity=AuditEntity.USER,
                entity_id=user.id,
                after={"email": user.email, "role": user.role.value, "auto_created": True},
                metadata={"reason": "mvp_auto_creation"}
            )
        else:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
    
    # Check if user has a password set
    if user.password_hash:
        # Verify password
        if not verify_password(body.password, user.password_hash):
            # Record auth failure for rate limiting
            record_auth_failure(request)

            # Log failed login attempt
            await AuditService.log_authentication(
                action=AuditAction.LOGIN_FAILED,
                user_id=user.id,
                email=user.email,
                success=False,
                error_message="Invalid password",
                metadata={"reason": "invalid_password"}
            )
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

    # Set audit context with authenticated user
    audit_context.actor_id = user.id
    audit_context.actor_role = user.role.value
    audit_context.actor_email = user.email

    # Log successful login
    await AuditService.log_authentication(
        action=AuditAction.LOGIN,
        user_id=user.id,
        email=user.email,
        success=True,
        metadata={
            "role": user.role.value,
            "force_password_change": user.force_password_change
        }
    )

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

    # Get user (allow inactive users to change forced passwords)
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")

    # Verify current password
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid current password")

    # Update password, clear force flag, and ensure user is active
    user.password_hash = hash_password(new_password)
    user.force_password_change = False
    user.active = True  # Activate user when they change forced password

    await db.commit()

    # Create access token now that password is changed
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

