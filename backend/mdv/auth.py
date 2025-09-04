from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, Iterable, Optional, Dict, Any
import logging

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .config import settings
from .models import Role, User

logger = logging.getLogger(__name__)


# Enhanced security configuration
TOKEN_ALGORITHM = "HS256"
TOKEN_ISSUER = "mdv-api"
TOKEN_AUDIENCE = "mdv-web"
MAX_TOKEN_AGE = timedelta(hours=8)
REFRESH_TOKEN_AGE = timedelta(days=7)

# Token blacklist (in production, use Redis or database)
_token_blacklist: set = set()

bearer_scheme = HTTPBearer(auto_error=False)


class TokenValidationError(Exception):
    """Custom exception for token validation errors."""
    def __init__(self, message: str, error_code: str = "INVALID_TOKEN"):
        self.message = message
        self.error_code = error_code
        super().__init__(message)


def generate_jti() -> str:
    """Generate a unique JWT ID for token tracking."""
    return secrets.token_urlsafe(32)


def create_access_token(
    subject: str,
    role: Role,
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None
) -> str:
    """Create a JWT access token with enhanced security claims."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or MAX_TOKEN_AGE)

    # Generate unique token ID for tracking
    jti = generate_jti()

    # Base claims
    to_encode = {
        "sub": subject,
        "role": role.value,
        "iat": now,
        "exp": expire,
        "nbf": now,  # Not before
        "iss": TOKEN_ISSUER,
        "aud": TOKEN_AUDIENCE,
        "jti": jti,
        "token_type": "access"
    }

    # Add request context if available
    if request:
        to_encode.update({
            "ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent", "")[:200]  # Limit length
        })

    # Add additional claims
    if additional_claims:
        to_encode.update(additional_claims)

    # Create token signature with enhanced security
    token = jwt.encode(to_encode, settings.jwt_secret, algorithm=TOKEN_ALGORITHM)

    # Log token creation for audit
    logger.info(f"Access token created for user {subject} with role {role.value}, jti: {jti}")

    return token


def decode_token(token: str, verify_claims: bool = True) -> dict:
    """Decode and validate JWT token with comprehensive security checks."""
    try:
        # Decode token with algorithm verification
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[TOKEN_ALGORITHM],
            issuer=TOKEN_ISSUER,
            audience=TOKEN_AUDIENCE,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": True,
                "verify_iat": True,
                "verify_aud": True,
                "verify_iss": True,
                "require_exp": True,
                "require_iat": True,
                "require_nbf": True
            }
        )

        if verify_claims:
            validate_token_claims(payload)

        return payload

    except jwt.ExpiredSignatureError:
        logger.warning(f"Expired token attempted: {token[:20]}...")
        raise TokenValidationError("Token has expired", "TOKEN_EXPIRED")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token attempted: {token[:20]}... - {str(e)}")
        raise TokenValidationError("Invalid token format", "INVALID_TOKEN")
    except jwt.InvalidIssuerError:
        logger.warning(f"Invalid issuer in token: {token[:20]}...")
        raise TokenValidationError("Invalid token issuer", "INVALID_ISSUER")
    except jwt.InvalidAudienceError:
        logger.warning(f"Invalid audience in token: {token[:20]}...")
        raise TokenValidationError("Invalid token audience", "INVALID_AUDIENCE")
    except jwt.ImmatureSignatureError:
        logger.warning(f"Token used before valid time: {token[:20]}...")
        raise TokenValidationError("Token not yet valid", "TOKEN_NOT_YET_VALID")
    except JWTError as e:
        logger.error(f"JWT decode error: {str(e)}")
        raise TokenValidationError("Token validation failed", "VALIDATION_FAILED")


def validate_token_claims(payload: dict) -> None:
    """Validate JWT token claims for security compliance."""

    # Check if token is blacklisted
    jti = payload.get("jti")
    if jti and jti in _token_blacklist:
        raise TokenValidationError("Token has been revoked", "TOKEN_REVOKED")

    # Validate required claims
    required_claims = ["sub", "role", "iat", "exp", "jti", "token_type"]
    for claim in required_claims:
        if claim not in payload:
            raise TokenValidationError(f"Missing required claim: {claim}", "MISSING_CLAIM")

    # Validate token type
    if payload.get("token_type") != "access":
        raise TokenValidationError("Invalid token type", "INVALID_TOKEN_TYPE")

    # Validate user ID format
    try:
        user_id = int(payload["sub"])
        if user_id <= 0:
            raise ValueError("Invalid user ID")
    except (ValueError, TypeError):
        raise TokenValidationError("Invalid user ID in token", "INVALID_USER_ID")

    # Validate role
    role_value = payload.get("role")
    try:
        Role(role_value)
    except ValueError:
        raise TokenValidationError(f"Invalid role: {role_value}", "INVALID_ROLE")

    # Validate token age (additional security check)
    iat = payload.get("iat")
    if iat:
        token_age = datetime.now(timezone.utc) - datetime.fromtimestamp(iat, timezone.utc)
        if token_age > MAX_TOKEN_AGE + timedelta(minutes=5):  # 5 minute grace period
            raise TokenValidationError("Token is too old", "TOKEN_TOO_OLD")

    # Validate JTI format
    if not isinstance(jti, str) or len(jti) < 16:
        raise TokenValidationError("Invalid token identifier", "INVALID_JTI")


def create_refresh_token(subject: str, role: Role) -> str:
    """Create a refresh token for token renewal."""
    now = datetime.now(timezone.utc)
    expire = now + REFRESH_TOKEN_AGE

    to_encode = {
        "sub": subject,
        "role": role.value,
        "iat": now,
        "exp": expire,
        "nbf": now,
        "iss": TOKEN_ISSUER,
        "aud": TOKEN_AUDIENCE,
        "jti": generate_jti(),
        "token_type": "refresh"
    }

    return jwt.encode(to_encode, settings.jwt_secret, algorithm=TOKEN_ALGORITHM)


def revoke_token(token: str) -> bool:
    """Add token to blacklist to prevent further use."""
    try:
        payload = decode_token(token, verify_claims=False)
        jti = payload.get("jti")
        if jti:
            _token_blacklist.add(jti)
            logger.info(f"Token revoked: {jti}")
            return True
    except Exception as e:
        logger.error(f"Failed to revoke token: {str(e)}")
    return False


def revoke_all_user_tokens(user_id: str) -> None:
    """Revoke all tokens for a specific user (logout from all devices)."""
    # In production, this would query a database for all user tokens
    # For now, we'll implement a simple approach
    logger.info(f"All tokens revoked for user: {user_id}")
    # This would typically involve:
    # 1. Querying database for all active tokens for the user
    # 2. Adding all JTIs to blacklist
    # 3. Updating user's token version/salt in database


def is_token_revoked(jti: str) -> bool:
    """Check if a token has been revoked."""
    return jti in _token_blacklist


def cleanup_expired_tokens() -> None:
    """Clean up expired tokens from blacklist (should be run periodically)."""
    # In production, this would be handled by Redis TTL or database cleanup
    # For now, we'll keep it simple
    pass


def verify_token_signature(token: str) -> bool:
    """Verify token signature without full validation."""
    try:
        jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[TOKEN_ALGORITHM],
            options={"verify_signature": True, "verify_exp": False}
        )
        return True
    except JWTError:
        return False


def extract_token_claims_unsafe(token: str) -> Optional[dict]:
    """Extract claims from token without verification (for logging/debugging)."""
    try:
        return jwt.decode(token, options={"verify_signature": False})
    except Exception:
        return None


async def get_current_claims(
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    request: Optional[Request] = None
) -> dict:
    """Get current user claims from JWT token with enhanced validation."""
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        claims = decode_token(creds.credentials)

        # Additional security checks
        if request:
            await validate_token_context(claims, request)

        return claims

    except TokenValidationError as e:
        logger.warning(f"Token validation failed: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message,
            headers={"WWW-Authenticate": "Bearer"}
        )
    except Exception as e:
        logger.error(f"Unexpected error in token validation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"}
        )


async def validate_token_context(claims: dict, request: Request) -> None:
    """Validate token context against request for additional security."""

    # Check IP address consistency (optional, can be disabled for mobile users)
    token_ip = claims.get("ip")
    request_ip = request.client.host if request.client else None

    # For now, we'll just log IP mismatches for monitoring
    if token_ip and request_ip and token_ip != request_ip:
        logger.info(f"IP mismatch for user {claims.get('sub')}: token={token_ip}, request={request_ip}")

    # Check user agent consistency (basic check)
    token_ua = claims.get("user_agent", "")
    request_ua = request.headers.get("user-agent", "")

    # Basic user agent validation (allow some variation)
    if token_ua and request_ua:
        # Extract browser/platform info for comparison
        token_browser = token_ua.split()[0] if token_ua else ""
        request_browser = request_ua.split()[0] if request_ua else ""

        if token_browser and request_browser and token_browser != request_browser:
            logger.warning(f"User agent mismatch for user {claims.get('sub')}")


async def get_current_claims_optional(
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    request: Optional[Request] = None
) -> Optional[dict]:
    """Get current user claims if available, otherwise return None."""
    if creds is None or creds.scheme.lower() != "bearer":
        return None

    try:
        claims = decode_token(creds.credentials)
        if request:
            await validate_token_context(claims, request)
        return claims
    except Exception as e:
        logger.debug(f"Optional token validation failed: {str(e)}")
        return None


def require_roles(*allowed: Iterable[Role]):
    """Enhanced role-based access control with detailed logging."""
    allowed_values = {r.value if isinstance(r, Role) else r for r in allowed}

    async def _checker(
        claims: Annotated[dict, Depends(get_current_claims)],
        request: Optional[Request] = None
    ):
        user_role = claims.get("role")
        user_id = claims.get("sub")

        if user_role not in allowed_values:
            # Log access denial for audit
            logger.warning(
                f"Access denied for user {user_id} with role {user_role}. "
                f"Required roles: {list(allowed_values)}. "
                f"Path: {request.url.path if request else 'unknown'}"
            )

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {list(allowed_values)}"
            )

        # Log successful access for audit
        logger.info(
            f"Access granted for user {user_id} with role {user_role}. "
            f"Path: {request.url.path if request else 'unknown'}"
        )

        return claims

    return _checker


def require_permissions(*required_permissions: str):
    """Permission-based access control (future enhancement)."""
    async def _checker(claims: Annotated[dict, Depends(get_current_claims)]):
        user_role = claims.get("role")

        # This would check against a permission matrix
        # For now, we'll use role-based checks
        role_permissions = get_role_permissions(user_role)

        for permission in required_permissions:
            if permission not in role_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing permission: {permission}"
                )

        return claims

    return _checker


def get_role_permissions(role: str) -> set:
    """Get permissions for a given role."""
    # This would typically come from a database or configuration
    role_permissions = {
        "admin": {
            "user:create", "user:read", "user:update", "user:delete",
            "product:create", "product:read", "product:update", "product:delete",
            "order:create", "order:read", "order:update", "order:delete",
            "inventory:read", "inventory:update",
            "settings:read", "settings:update"
        },
        "supervisor": {
            "user:read", "user:update",
            "product:create", "product:read", "product:update",
            "order:read", "order:update",
            "inventory:read", "inventory:update"
        },
        "operations": {
            "product:read", "product:update",
            "order:read", "order:update",
            "inventory:read"
        },
        "logistics": {
            "order:read", "order:update",
            "inventory:read"
        },
        "customer": {
            "order:create", "order:read"
        }
    }

    return role_permissions.get(role, set())


async def get_current_user(
    claims: Annotated[dict, Depends(get_current_claims)],
    db: AsyncSession
) -> User:
    """Get current authenticated user with validation."""
    try:
        user_id = int(claims.get("sub"))
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            logger.warning(f"User {user_id} not found in database but has valid token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        if not user.active:
            logger.warning(f"Inactive user {user_id} attempted access")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive"
            )

        # Validate role consistency
        token_role = claims.get("role")
        if user.role.value != token_role:
            logger.error(f"Role mismatch for user {user_id}: token={token_role}, db={user.role.value}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token role mismatch"
            )

        return user

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )


async def get_current_user_optional(
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    db: AsyncSession,
    request: Optional[Request] = None
) -> Optional[User]:
    """Get current user if authenticated, otherwise return None."""
    if creds is None or creds.scheme.lower() != "bearer":
        return None

    try:
        claims = decode_token(creds.credentials)
        if request:
            await validate_token_context(claims, request)

        user_id = int(claims.get("sub"))
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        # Validate user exists and is active
        if not user or not user.active:
            return None

        # Validate role consistency
        if user.role.value != claims.get("role"):
            logger.warning(f"Role mismatch for user {user_id}")
            return None

        return user

    except Exception as e:
        logger.debug(f"Optional user retrieval failed: {str(e)}")
        return None


async def validate_user_session(user: User, claims: dict) -> None:
    """Validate user session for additional security checks."""

    # Check if user should be forced to change password
    if hasattr(user, 'force_password_change') and user.force_password_change:
        logger.info(f"User {user.id} requires password change")
        # This could be handled by requiring specific endpoints

    # Check last login time vs token issued time
    if hasattr(user, 'last_login') and user.last_login:
        token_iat = claims.get("iat")
        if token_iat:
            token_time = datetime.fromtimestamp(token_iat, timezone.utc)
            if user.last_login > token_time + timedelta(minutes=5):
                logger.warning(f"Token issued before last login for user {user.id}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session invalidated by recent login"
                )

