"""
Session Management API Endpoints

Provides endpoints for managing user sessions including:
- Viewing active sessions
- Terminating sessions
- Session statistics and monitoring
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from mdv.auth import get_current_claims, require_roles
from mdv.models import Role
from mdv.session import (
    session_manager, 
    SessionInfo, 
    get_current_session,
    require_session,
    invalidate_user_sessions,
    block_device,
    unblock_device
)
from mdv.audit import AuditService, AuditAction, AuditEntity
from mdv.rate_limit import create_rate_limited_endpoint
from ..deps import get_db

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class SessionResponse(BaseModel):
    """Session information response model."""
    session_id: str
    user_id: int
    user_email: str
    user_role: str
    created_at: str
    last_activity: str
    expires_at: str
    ip_address: str
    user_agent: str
    device_fingerprint: str
    is_current: bool = False
    login_method: str = "password"
    security_flags: Dict[str, Any] = {}


class SessionListResponse(BaseModel):
    """Response model for session list."""
    sessions: List[SessionResponse]
    total_count: int
    current_session_id: str


class SessionStatsResponse(BaseModel):
    """Session statistics response model."""
    active_sessions: int
    suspicious_sessions: int
    unique_users: int
    unique_ips: int
    average_session_age_hours: float
    sessions_created_last_hour: int


class TerminateSessionRequest(BaseModel):
    """Request model for terminating sessions."""
    session_id: str
    reason: str = "user_requested"


class BlockDeviceRequest(BaseModel):
    """Request model for blocking devices."""
    device_fingerprint: str
    reason: str = "security_violation"


@router.get("/current", response_model=SessionResponse)
@create_rate_limited_endpoint("api_read")
async def get_current_session_info(
    request: Request,
    session_info: SessionInfo = Depends(require_session)
):
    """Get information about the current session."""
    return SessionResponse(
        session_id=session_info.session_id,
        user_id=session_info.user_id,
        user_email=session_info.user_email,
        user_role=session_info.user_role,
        created_at=session_info.created_at.isoformat(),
        last_activity=session_info.last_activity.isoformat(),
        expires_at=session_info.expires_at.isoformat(),
        ip_address=session_info.ip_address,
        user_agent=session_info.user_agent,
        device_fingerprint=session_info.device_fingerprint,
        is_current=True,
        login_method=session_info.login_method,
        security_flags=session_info.security_flags
    )


@router.get("/my-sessions", response_model=SessionListResponse)
@create_rate_limited_endpoint("api_read")
async def get_my_sessions(
    request: Request,
    session_info: SessionInfo = Depends(require_session)
):
    """Get all active sessions for the current user."""
    user_sessions = await session_manager.get_user_sessions(session_info.user_id)
    
    sessions = []
    for session in user_sessions:
        sessions.append(SessionResponse(
            session_id=session.session_id,
            user_id=session.user_id,
            user_email=session.user_email,
            user_role=session.user_role,
            created_at=session.created_at.isoformat(),
            last_activity=session.last_activity.isoformat(),
            expires_at=session.expires_at.isoformat(),
            ip_address=session.ip_address,
            user_agent=session.user_agent,
            device_fingerprint=session.device_fingerprint,
            is_current=session.session_id == session_info.session_id,
            login_method=session.login_method,
            security_flags=session.security_flags
        ))
    
    return SessionListResponse(
        sessions=sessions,
        total_count=len(sessions),
        current_session_id=session_info.session_id
    )


@router.post("/terminate")
@create_rate_limited_endpoint("api_write")
async def terminate_session(
    request: Request,
    body: TerminateSessionRequest,
    session_info: SessionInfo = Depends(require_session)
):
    """Terminate a specific session."""
    
    # Check if user is trying to terminate their own session
    target_session = session_manager.sessions.get(body.session_id)
    if not target_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Users can only terminate their own sessions (unless admin)
    if target_session.user_id != session_info.user_id:
        # Check if user has admin privileges
        if session_info.user_role not in [Role.admin.value, Role.supervisor.value]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only terminate your own sessions"
            )
    
    # Terminate the session
    success = await session_manager.destroy_session(body.session_id, body.reason)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or already terminated"
        )
    
    # Log the action
    await AuditService.log_event(
        action=AuditAction.DELETE,
        entity=AuditEntity.SESSION,
        entity_id=target_session.user_id,
        metadata={
            "terminated_session_id": body.session_id,
            "reason": body.reason,
            "terminated_by": session_info.user_id
        }
    )
    
    return {"message": "Session terminated successfully"}


@router.post("/terminate-all")
@create_rate_limited_endpoint("api_write")
async def terminate_all_sessions(
    request: Request,
    session_info: SessionInfo = Depends(require_session)
):
    """Terminate all sessions for the current user except the current one."""
    
    terminated_count = await invalidate_user_sessions(
        session_info.user_id, 
        except_session=session_info.session_id
    )
    
    # Log the action
    await AuditService.log_event(
        action=AuditAction.DELETE,
        entity=AuditEntity.SESSION,
        entity_id=session_info.user_id,
        metadata={
            "action": "terminate_all_sessions",
            "terminated_count": terminated_count,
            "kept_session": session_info.session_id
        }
    )
    
    return {
        "message": f"Terminated {terminated_count} sessions",
        "terminated_count": terminated_count
    }


@router.get("/stats", response_model=SessionStatsResponse)
@require_roles(Role.admin, Role.supervisor)
@create_rate_limited_endpoint("admin_action")
async def get_session_statistics(
    request: Request,
    claims: dict = Depends(get_current_claims)
):
    """Get session statistics (admin only)."""
    stats = await session_manager.get_session_statistics()
    
    return SessionStatsResponse(**stats)


@router.get("/all", response_model=SessionListResponse)
@require_roles(Role.admin, Role.supervisor)
@create_rate_limited_endpoint("admin_action")
async def get_all_sessions(
    request: Request,
    claims: dict = Depends(get_current_claims)
):
    """Get all active sessions (admin only)."""
    all_sessions = list(session_manager.sessions.values())
    
    sessions = []
    for session in all_sessions:
        sessions.append(SessionResponse(
            session_id=session.session_id,
            user_id=session.user_id,
            user_email=session.user_email,
            user_role=session.user_role,
            created_at=session.created_at.isoformat(),
            last_activity=session.last_activity.isoformat(),
            expires_at=session.expires_at.isoformat(),
            ip_address=session.ip_address,
            user_agent=session.user_agent,
            device_fingerprint=session.device_fingerprint,
            login_method=session.login_method,
            security_flags=session.security_flags
        ))
    
    return SessionListResponse(
        sessions=sessions,
        total_count=len(sessions),
        current_session_id=""
    )


@router.post("/admin/terminate")
@require_roles(Role.admin)
@create_rate_limited_endpoint("admin_sensitive")
async def admin_terminate_session(
    request: Request,
    body: TerminateSessionRequest,
    claims: dict = Depends(get_current_claims)
):
    """Terminate any session (admin only)."""
    
    target_session = session_manager.sessions.get(body.session_id)
    if not target_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    success = await session_manager.destroy_session(body.session_id, f"admin_terminated_{body.reason}")
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or already terminated"
        )
    
    # Log the admin action
    await AuditService.log_event(
        action=AuditAction.DELETE,
        entity=AuditEntity.SESSION,
        entity_id=target_session.user_id,
        metadata={
            "terminated_session_id": body.session_id,
            "reason": body.reason,
            "admin_action": True,
            "terminated_by": claims.get("sub")
        }
    )
    
    return {"message": "Session terminated by admin"}


@router.post("/admin/block-device")
@require_roles(Role.admin)
@create_rate_limited_endpoint("admin_sensitive")
async def admin_block_device(
    request: Request,
    body: BlockDeviceRequest,
    claims: dict = Depends(get_current_claims)
):
    """Block a device from creating sessions (admin only)."""
    
    await block_device(body.device_fingerprint, body.reason)
    
    # Log the admin action
    await AuditService.log_event(
        action=AuditAction.BLOCK,
        entity=AuditEntity.SYSTEM,
        metadata={
            "device_fingerprint": body.device_fingerprint,
            "reason": body.reason,
            "admin_action": True,
            "blocked_by": claims.get("sub")
        }
    )
    
    return {"message": "Device blocked successfully"}


@router.post("/admin/unblock-device")
@require_roles(Role.admin)
@create_rate_limited_endpoint("admin_sensitive")
async def admin_unblock_device(
    request: Request,
    device_fingerprint: str,
    claims: dict = Depends(get_current_claims)
):
    """Unblock a device (admin only)."""
    
    await unblock_device(device_fingerprint)
    
    # Log the admin action
    await AuditService.log_event(
        action=AuditAction.UNBLOCK,
        entity=AuditEntity.SYSTEM,
        metadata={
            "device_fingerprint": device_fingerprint,
            "admin_action": True,
            "unblocked_by": claims.get("sub")
        }
    )
    
    return {"message": "Device unblocked successfully"}
