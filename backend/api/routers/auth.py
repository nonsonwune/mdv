from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.mdv.auth import create_access_token
from backend.mdv.models import User, Role
from ..deps import get_db
from backend.mdv.schemas import AuthLoginRequest, AuthLoginResponse

router = APIRouter(prefix="/api/auth", tags=["auth"]) 


@router.post("/login", response_model=AuthLoginResponse)
async def login(body: AuthLoginRequest, db: AsyncSession = Depends(get_db)):
    # MVP: lookup by email; accept any password (replace with hashing later)
    user = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if not user:
        # For MVP, create a default staff user if email ends with @mdv.ng, otherwise operations
        role = Role.operations
        user = User(name=body.email.split("@")[0], email=body.email, role=role, active=True)
        db.add(user)
        await db.flush()
        await db.commit()
    token = create_access_token(subject=str(user.id), role=user.role)
    # Return both access_token and token for client compatibility
    return AuthLoginResponse(access_token=token, token=token, role=user.role.value)

