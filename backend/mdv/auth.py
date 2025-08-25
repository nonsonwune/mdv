from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated, Iterable, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .config import settings
from .models import Role, User


bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(subject: str, role: Role, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = {
        "sub": subject,
        "role": role.value,
        "iat": datetime.now(timezone.utc),
    }
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=8))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return payload
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from e


async def get_current_claims(creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)]):
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    claims = decode_token(creds.credentials)
    return claims


def require_roles(*allowed: Iterable[Role]):
    allowed_values = {r.value if isinstance(r, Role) else r for r in allowed}

    async def _checker(claims: Annotated[dict, Depends(get_current_claims)]):
        role = claims.get("role")
        if role not in allowed_values:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return claims

    return _checker


async def get_current_user_optional(
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    db: AsyncSession
) -> Optional[User]:
    """Get current user if authenticated, otherwise return None."""
    if creds is None or creds.scheme.lower() != "bearer":
        return None
    
    try:
        claims = decode_token(creds.credentials)
        user_id = int(claims.get("sub"))
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    except (JWTError, ValueError, HTTPException):
        return None

