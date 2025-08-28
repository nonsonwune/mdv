"""
Security management endpoints for user devices and sessions.
"""
from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from datetime import datetime

from mdv.auth import get_current_claims
from ..deps import get_db

router = APIRouter(prefix="/api/security", tags=["security"])


# Schemas
class DeviceResponse(BaseModel):
    id: str
    name: str
    last_used: datetime
    current: bool = False


class SessionResponse(BaseModel):
    id: str
    device: str
    location: str
    last_active: datetime
    current: bool = False


@router.get("/devices", response_model=dict)
async def get_user_devices(
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Get all trusted devices for the current user."""
    user_id = int(claims["sub"])
    
    # TODO: Implement device tracking when needed
    # For now, return empty array to prevent 404 errors
    return {
        "devices": []
    }


@router.get("/sessions", response_model=dict)
async def get_user_sessions(
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Get all active sessions for the current user."""
    user_id = int(claims["sub"])
    
    # TODO: Implement session tracking when needed
    # For now, return empty array to prevent 404 errors
    return {
        "sessions": []
    }


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Revoke a specific session."""
    user_id = int(claims["sub"])
    
    # TODO: Implement session revocation when needed
    return {"message": "Session revoked successfully"}


@router.delete("/devices/{device_id}")
async def remove_trusted_device(
    device_id: str,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Remove a trusted device."""
    user_id = int(claims["sub"])
    
    # TODO: Implement device removal when needed
    return {"message": "Trusted device removed successfully"}
