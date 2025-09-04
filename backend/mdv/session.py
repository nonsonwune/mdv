"""
Comprehensive Session Management System for MDV Platform

Provides secure session handling with features like:
- Session creation and validation
- Concurrent session limits
- Session timeout and cleanup
- Device tracking and management
- Security monitoring and anomaly detection
"""

import secrets
import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Set, Any
from dataclasses import dataclass, asdict
from collections import defaultdict
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, or_
from fastapi import Request, HTTPException, status

from .models import User, Role
from .config import settings
from .audit import AuditService, AuditAction, AuditEntity, security_monitor

logger = logging.getLogger(__name__)


@dataclass
class SessionInfo:
    """Session information data structure."""
    session_id: str
    user_id: int
    user_email: str
    user_role: str
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    ip_address: str
    user_agent: str
    device_fingerprint: str
    is_active: bool = True
    login_method: str = "password"
    security_flags: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.security_flags is None:
            self.security_flags = {}
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        # Convert datetime objects to ISO strings
        for key in ['created_at', 'last_activity', 'expires_at']:
            if isinstance(data[key], datetime):
                data[key] = data[key].isoformat()
        return data
    
    def is_expired(self) -> bool:
        """Check if session is expired."""
        return datetime.now(timezone.utc) > self.expires_at
    
    def is_idle_timeout(self, idle_timeout_minutes: int = 30) -> bool:
        """Check if session has exceeded idle timeout."""
        idle_cutoff = datetime.now(timezone.utc) - timedelta(minutes=idle_timeout_minutes)
        return self.last_activity < idle_cutoff


class SessionManager:
    """Comprehensive session management with security features."""
    
    def __init__(self):
        # In-memory session storage (use Redis in production)
        self.sessions: Dict[str, SessionInfo] = {}
        self.user_sessions: Dict[int, Set[str]] = defaultdict(set)
        self.ip_sessions: Dict[str, Set[str]] = defaultdict(set)
        
        # Configuration
        self.max_sessions_per_user = 5
        self.max_sessions_per_ip = 10
        self.session_timeout_hours = 8
        self.idle_timeout_minutes = 30
        self.cleanup_interval_minutes = 15
        
        # Security tracking
        self.suspicious_sessions: Set[str] = set()
        self.blocked_devices: Set[str] = set()
    
    async def create_session(
        self,
        user: User,
        request: Request,
        login_method: str = "password",
        remember_me: bool = False
    ) -> SessionInfo:
        """Create a new session with security checks."""
        
        # Generate secure session ID
        session_id = self._generate_session_id()
        
        # Extract request information
        ip_address = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        device_fingerprint = self._generate_device_fingerprint(request)
        
        # Security checks
        await self._perform_security_checks(user, ip_address, device_fingerprint)
        
        # Check session limits
        await self._enforce_session_limits(user.id, ip_address)
        
        # Calculate expiration
        now = datetime.now(timezone.utc)
        if remember_me:
            expires_at = now + timedelta(days=30)  # Extended for "remember me"
        else:
            expires_at = now + timedelta(hours=self.session_timeout_hours)
        
        # Create session info
        session_info = SessionInfo(
            session_id=session_id,
            user_id=user.id,
            user_email=user.email,
            user_role=user.role.value,
            created_at=now,
            last_activity=now,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
            login_method=login_method,
            security_flags={
                "remember_me": remember_me,
                "trusted_device": False,
                "requires_verification": False
            }
        )
        
        # Store session
        self.sessions[session_id] = session_info
        self.user_sessions[user.id].add(session_id)
        self.ip_sessions[ip_address].add(session_id)
        
        # Log session creation
        await AuditService.log_event(
            action=AuditAction.LOGIN,
            entity=AuditEntity.SESSION,
            entity_id=user.id,
            metadata={
                "session_id": session_id,
                "login_method": login_method,
                "device_fingerprint": device_fingerprint,
                "remember_me": remember_me,
                "expires_at": expires_at.isoformat()
            }
        )
        
        logger.info(f"Session created for user {user.id} from {ip_address}")
        return session_info
    
    async def validate_session(self, session_id: str, request: Request) -> Optional[SessionInfo]:
        """Validate and refresh session."""
        session_info = self.sessions.get(session_id)
        
        if not session_info:
            return None
        
        # Check if session is expired
        if session_info.is_expired():
            await self.destroy_session(session_id, "expired")
            return None
        
        # Check idle timeout
        if session_info.is_idle_timeout(self.idle_timeout_minutes):
            await self.destroy_session(session_id, "idle_timeout")
            return None
        
        # Security validation
        current_ip = self._get_client_ip(request)
        current_ua = request.headers.get("user-agent", "")
        
        # Check for session hijacking indicators
        if await self._detect_session_anomalies(session_info, current_ip, current_ua):
            await self.destroy_session(session_id, "security_violation")
            return None
        
        # Update last activity
        session_info.last_activity = datetime.now(timezone.utc)
        
        return session_info
    
    async def destroy_session(self, session_id: str, reason: str = "logout") -> bool:
        """Destroy a session and clean up references."""
        session_info = self.sessions.get(session_id)
        
        if not session_info:
            return False
        
        # Remove from all tracking structures
        del self.sessions[session_id]
        self.user_sessions[session_info.user_id].discard(session_id)
        self.ip_sessions[session_info.ip_address].discard(session_id)
        self.suspicious_sessions.discard(session_id)
        
        # Log session destruction
        await AuditService.log_event(
            action=AuditAction.LOGOUT,
            entity=AuditEntity.SESSION,
            entity_id=session_info.user_id,
            metadata={
                "session_id": session_id,
                "reason": reason,
                "session_duration_minutes": (
                    datetime.now(timezone.utc) - session_info.created_at
                ).total_seconds() / 60
            }
        )
        
        logger.info(f"Session {session_id} destroyed: {reason}")
        return True
    
    async def destroy_all_user_sessions(self, user_id: int, except_session: Optional[str] = None) -> int:
        """Destroy all sessions for a user (logout from all devices)."""
        session_ids = list(self.user_sessions[user_id])
        destroyed_count = 0
        
        for session_id in session_ids:
            if session_id != except_session:
                if await self.destroy_session(session_id, "logout_all_devices"):
                    destroyed_count += 1
        
        return destroyed_count
    
    async def get_user_sessions(self, user_id: int) -> List[SessionInfo]:
        """Get all active sessions for a user."""
        session_ids = self.user_sessions[user_id]
        return [self.sessions[sid] for sid in session_ids if sid in self.sessions]
    
    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired and idle sessions."""
        now = datetime.now(timezone.utc)
        expired_sessions = []
        
        for session_id, session_info in self.sessions.items():
            if (session_info.is_expired() or 
                session_info.is_idle_timeout(self.idle_timeout_minutes)):
                expired_sessions.append(session_id)
        
        cleanup_count = 0
        for session_id in expired_sessions:
            reason = "expired" if self.sessions[session_id].is_expired() else "idle_timeout"
            if await self.destroy_session(session_id, reason):
                cleanup_count += 1
        
        if cleanup_count > 0:
            logger.info(f"Cleaned up {cleanup_count} expired/idle sessions")
        
        return cleanup_count
    
    def _generate_session_id(self) -> str:
        """Generate a cryptographically secure session ID."""
        return secrets.token_urlsafe(32)
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address."""
        # Check for forwarded headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return "unknown"
    
    def _generate_device_fingerprint(self, request: Request) -> str:
        """Generate device fingerprint for tracking."""
        components = [
            request.headers.get("user-agent", ""),
            request.headers.get("accept-language", ""),
            request.headers.get("accept-encoding", ""),
            # Could add more components like screen resolution, timezone, etc.
        ]
        fingerprint_data = "|".join(components)
        return hashlib.sha256(fingerprint_data.encode()).hexdigest()[:16]

    async def _perform_security_checks(self, user: User, ip_address: str, device_fingerprint: str):
        """Perform security checks before creating session."""

        # Check if device is blocked
        if device_fingerprint in self.blocked_devices:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Device is blocked due to security violations"
            )

        # Check if IP is suspicious
        if security_monitor.is_suspicious_ip(ip_address):
            # Allow but flag for monitoring
            logger.warning(f"Session created from suspicious IP {ip_address} for user {user.id}")

        # Check if user is high risk
        if security_monitor.is_high_risk_user(user.id):
            # Could require additional verification
            logger.warning(f"Session created for high-risk user {user.id}")

    async def _enforce_session_limits(self, user_id: int, ip_address: str):
        """Enforce session limits per user and IP."""

        # Check user session limit
        user_session_count = len(self.user_sessions[user_id])
        if user_session_count >= self.max_sessions_per_user:
            # Remove oldest session
            oldest_session_id = min(
                self.user_sessions[user_id],
                key=lambda sid: self.sessions[sid].created_at
            )
            await self.destroy_session(oldest_session_id, "session_limit_exceeded")

        # Check IP session limit
        ip_session_count = len(self.ip_sessions[ip_address])
        if ip_session_count >= self.max_sessions_per_ip:
            # This might indicate suspicious activity
            security_monitor.record_security_event(
                "excessive_sessions_from_ip",
                "medium",
                None,
                ip_address,
                None,
                {"session_count": ip_session_count}
            )

    async def _detect_session_anomalies(
        self,
        session_info: SessionInfo,
        current_ip: str,
        current_ua: str
    ) -> bool:
        """Detect potential session hijacking or anomalies."""

        # Check for IP address changes
        if session_info.ip_address != current_ip:
            # Log IP change
            logger.warning(
                f"IP change detected for session {session_info.session_id}: "
                f"{session_info.ip_address} -> {current_ip}"
            )

            # For now, allow but monitor (could be mobile users)
            security_monitor.record_security_event(
                "session_ip_change",
                "low",
                session_info.user_id,
                current_ip,
                current_ua,
                {
                    "original_ip": session_info.ip_address,
                    "new_ip": current_ip,
                    "session_id": session_info.session_id
                }
            )

        # Check for significant user agent changes
        if session_info.user_agent != current_ua:
            # Extract browser info for comparison
            original_browser = session_info.user_agent.split()[0] if session_info.user_agent else ""
            current_browser = current_ua.split()[0] if current_ua else ""

            if original_browser != current_browser:
                logger.warning(
                    f"Browser change detected for session {session_info.session_id}: "
                    f"{original_browser} -> {current_browser}"
                )

                # This is more suspicious than IP changes
                security_monitor.record_security_event(
                    "session_browser_change",
                    "medium",
                    session_info.user_id,
                    current_ip,
                    current_ua,
                    {
                        "original_ua": session_info.user_agent,
                        "new_ua": current_ua,
                        "session_id": session_info.session_id
                    }
                )

                # Mark session as suspicious
                self.suspicious_sessions.add(session_info.session_id)

        # Check for impossible travel (if we had geolocation)
        # This would check if the user could physically travel between locations

        return False  # Don't block for now, just monitor

    async def get_session_statistics(self) -> Dict[str, Any]:
        """Get session statistics for monitoring."""
        now = datetime.now(timezone.utc)

        active_sessions = len(self.sessions)
        suspicious_sessions = len(self.suspicious_sessions)

        # Count sessions by age
        session_ages = [(now - s.created_at).total_seconds() / 3600 for s in self.sessions.values()]

        return {
            "active_sessions": active_sessions,
            "suspicious_sessions": suspicious_sessions,
            "unique_users": len(self.user_sessions),
            "unique_ips": len(self.ip_sessions),
            "average_session_age_hours": sum(session_ages) / len(session_ages) if session_ages else 0,
            "sessions_created_last_hour": len([
                s for s in self.sessions.values()
                if (now - s.created_at).total_seconds() < 3600
            ])
        }


# Global session manager instance
session_manager = SessionManager()


# Session dependency for FastAPI
async def get_current_session(request: Request) -> Optional[SessionInfo]:
    """FastAPI dependency to get current session."""
    session_id = request.cookies.get("session_id")
    if not session_id:
        return None

    return await session_manager.validate_session(session_id, request)


async def require_session(request: Request) -> SessionInfo:
    """FastAPI dependency that requires a valid session."""
    session_info = await get_current_session(request)
    if not session_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid session required"
        )
    return session_info


# Session cleanup task (should be run periodically)
async def cleanup_sessions_task():
    """Background task to clean up expired sessions."""
    try:
        cleaned_count = await session_manager.cleanup_expired_sessions()
        if cleaned_count > 0:
            logger.info(f"Session cleanup completed: {cleaned_count} sessions removed")
    except Exception as e:
        logger.error(f"Session cleanup failed: {e}")


# Session management utilities
async def invalidate_user_sessions(user_id: int, except_session: Optional[str] = None) -> int:
    """Invalidate all sessions for a user (e.g., after password change)."""
    return await session_manager.destroy_all_user_sessions(user_id, except_session)


async def block_device(device_fingerprint: str, reason: str = "security_violation"):
    """Block a device from creating new sessions."""
    session_manager.blocked_devices.add(device_fingerprint)

    # Destroy existing sessions from this device
    sessions_to_destroy = [
        sid for sid, session in session_manager.sessions.items()
        if session.device_fingerprint == device_fingerprint
    ]

    for session_id in sessions_to_destroy:
        await session_manager.destroy_session(session_id, f"device_blocked_{reason}")

    logger.warning(f"Device {device_fingerprint} blocked: {reason}")


async def unblock_device(device_fingerprint: str):
    """Unblock a previously blocked device."""
    session_manager.blocked_devices.discard(device_fingerprint)
    logger.info(f"Device {device_fingerprint} unblocked")


def get_session_info(session_id: str) -> Optional[SessionInfo]:
    """Get session information by ID."""
    return session_manager.sessions.get(session_id)
