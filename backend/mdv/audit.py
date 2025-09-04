"""
Comprehensive Audit Logging System for MDV E-commerce Platform

This module provides audit logging functionality to track all user activities
across the entire application for compliance, security, and operational monitoring.
"""

from __future__ import annotations

import json
import uuid
import hashlib
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Union, List, Set
from contextlib import asynccontextmanager
from collections import defaultdict, deque
from dataclasses import dataclass, asdict

from fastapi import Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, and_, desc
from sqlalchemy.exc import SQLAlchemyError

from .models import AuditLog, AuditAction, AuditEntity, AuditStatus, User, Role
from .db import session_scope
import logging

logger = logging.getLogger(__name__)


@dataclass
class SecurityEvent:
    """Security-related event for enhanced monitoring."""
    event_type: str
    severity: str  # low, medium, high, critical
    actor_id: Optional[int]
    ip_address: Optional[str]
    user_agent: Optional[str]
    details: Dict[str, Any]
    timestamp: datetime

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class SecurityMonitor:
    """Monitor for security-related events and anomalies."""

    def __init__(self):
        self.failed_logins: Dict[str, deque] = defaultdict(deque)
        self.suspicious_activities: Dict[str, List[SecurityEvent]] = defaultdict(list)
        self.blocked_ips: Set[str] = set()
        self.high_risk_users: Set[int] = set()

    def record_failed_login(self, ip_address: str, user_email: str, details: Dict[str, Any]):
        """Record failed login attempt."""
        now = datetime.now(timezone.utc)
        self.failed_logins[ip_address].append(now)

        # Keep only last hour
        cutoff = now - timedelta(hours=1)
        while self.failed_logins[ip_address] and self.failed_logins[ip_address][0] < cutoff:
            self.failed_logins[ip_address].popleft()

        # Check for brute force
        if len(self.failed_logins[ip_address]) >= 5:
            self.record_security_event(
                "brute_force_attempt",
                "high",
                None,
                ip_address,
                details.get("user_agent"),
                {"email": user_email, "attempt_count": len(self.failed_logins[ip_address])}
            )

    def record_security_event(
        self,
        event_type: str,
        severity: str,
        actor_id: Optional[int],
        ip_address: Optional[str],
        user_agent: Optional[str],
        details: Dict[str, Any]
    ):
        """Record a security event."""
        event = SecurityEvent(
            event_type=event_type,
            severity=severity,
            actor_id=actor_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
            timestamp=datetime.now(timezone.utc)
        )

        key = ip_address or f"user_{actor_id}"
        self.suspicious_activities[key].append(event)

        # Log critical events immediately
        if severity == "critical":
            logger.critical(f"Critical security event: {event_type} from {ip_address}")
        elif severity == "high":
            logger.warning(f"High severity security event: {event_type} from {ip_address}")

    def is_suspicious_ip(self, ip_address: str) -> bool:
        """Check if IP address has suspicious activity."""
        return ip_address in self.suspicious_activities

    def is_high_risk_user(self, user_id: int) -> bool:
        """Check if user is flagged as high risk."""
        return user_id in self.high_risk_users


# Global security monitor
security_monitor = SecurityMonitor()


class AuditContext:
    """Enhanced context manager for audit logging with security monitoring."""

    def __init__(self):
        self.request_id: Optional[str] = None
        self.session_id: Optional[str] = None
        self.ip_address: Optional[str] = None
        self.user_agent: Optional[str] = None
        self.actor_id: Optional[int] = None
        self.actor_role: Optional[str] = None
        self.actor_email: Optional[str] = None
        self.request_start_time: Optional[datetime] = None
        self.request_path: Optional[str] = None
        self.request_method: Optional[str] = None
        self.correlation_id: Optional[str] = None
        self.security_context: Dict[str, Any] = {}
    
    def set_request_context(self, request: Request, actor: Optional[User] = None):
        """Set enhanced request context from FastAPI request object."""
        self.request_id = str(uuid.uuid4())
        self.correlation_id = request.headers.get("x-correlation-id", self.request_id)
        self.ip_address = self._get_client_ip(request)
        self.user_agent = request.headers.get("user-agent")
        self.request_start_time = datetime.now(timezone.utc)
        self.request_path = str(request.url.path)
        self.request_method = request.method

        # Extract session ID from cookies or headers
        self.session_id = request.cookies.get("session_id") or request.headers.get("x-session-id")

        # Security context
        self.security_context = {
            "is_suspicious_ip": security_monitor.is_suspicious_ip(self.ip_address or ""),
            "referer": request.headers.get("referer"),
            "origin": request.headers.get("origin"),
            "content_type": request.headers.get("content-type"),
            "content_length": request.headers.get("content-length"),
        }

        if actor:
            self.actor_id = actor.id
            self.actor_role = actor.role.value if actor.role else None
            self.actor_email = actor.email
            self.security_context["is_high_risk_user"] = security_monitor.is_high_risk_user(actor.id)
    
    def _get_client_ip(self, request: Request) -> Optional[str]:
        """Extract client IP address considering proxies."""
        # Check for forwarded headers (common in production with load balancers)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return None


# Global audit context (thread-local would be better in production)
audit_context = AuditContext()


class AuditService:
    """Enhanced service for creating and managing audit log entries with security monitoring."""

    # Cache for recent audit entries to detect patterns
    _recent_entries: deque = deque(maxlen=1000)
    _pattern_cache: Dict[str, List[datetime]] = defaultdict(list)
    
    @staticmethod
    async def log_event(
        action: AuditAction,
        entity: AuditEntity,
        entity_id: Optional[int] = None,
        before: Optional[Dict[str, Any]] = None,
        after: Optional[Dict[str, Any]] = None,
        status: AuditStatus = AuditStatus.SUCCESS,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        actor_id: Optional[int] = None,
        session: Optional[AsyncSession] = None
    ) -> Optional[int]:
        """
        Create an audit log entry.
        
        Args:
            action: The action being performed
            entity: The entity being acted upon
            entity_id: ID of the specific entity instance
            before: State before the action
            after: State after the action
            status: Success/failure status
            error_message: Error details if action failed
            metadata: Additional context information
            actor_id: Override actor ID (uses context if not provided)
            session: Database session (creates new if not provided)
        
        Returns:
            ID of created audit log entry, or None if logging failed
        """
        try:
            # Use provided actor_id or fall back to context
            final_actor_id = actor_id or audit_context.actor_id
            
            # Compute changes if both before and after are provided
            changes = None
            if before is not None and after is not None:
                changes = AuditService._compute_changes(before, after)

            # Enhanced metadata with security context
            enhanced_metadata = {
                **(metadata or {}),
                "request_duration_ms": AuditService._get_request_duration(),
                "security_context": audit_context.security_context,
                "correlation_id": audit_context.correlation_id,
                "request_path": audit_context.request_path,
                "request_method": audit_context.request_method,
            }

            audit_data = {
                "actor_id": final_actor_id,
                "actor_role": audit_context.actor_role,
                "actor_email": audit_context.actor_email,
                "action": action,
                "entity": entity,
                "entity_id": entity_id,
                "before": before,
                "after": after,
                "changes": changes,
                "ip_address": audit_context.ip_address,
                "user_agent": audit_context.user_agent,
                "session_id": audit_context.session_id,
                "request_id": audit_context.request_id,
                "status": status,
                "error_message": error_message,
                "audit_metadata": enhanced_metadata,
                "created_at": datetime.now(timezone.utc)
            }

            # Check for suspicious patterns
            AuditService._analyze_audit_pattern(audit_data)

            # Add to recent entries cache
            AuditService._recent_entries.append(audit_data)
            
            if session:
                # Use provided session
                result = await session.execute(
                    insert(AuditLog).values(**audit_data).returning(AuditLog.id)
                )
                return result.scalar_one()
            else:
                # Create new session
                async with session_scope() as db_session:
                    result = await db_session.execute(
                        insert(AuditLog).values(**audit_data).returning(AuditLog.id)
                    )
                    await db_session.commit()
                    return result.scalar_one()
                    
        except SQLAlchemyError as e:
            logger.error(f"Failed to create audit log: {e}")
            # Don't raise - audit logging should not break application flow
            return None
        except Exception as e:
            logger.error(f"Unexpected error in audit logging: {e}")
            return None
    
    @staticmethod
    def _compute_changes(before: Dict[str, Any], after: Dict[str, Any]) -> Dict[str, Any]:
        """Compute the differences between before and after states."""
        changes = {}
        
        # Find all keys that exist in either before or after
        all_keys = set(before.keys()) | set(after.keys())
        
        for key in all_keys:
            before_val = before.get(key)
            after_val = after.get(key)
            
            if before_val != after_val:
                changes[key] = {
                    "from": before_val,
                    "to": after_val
                }
        
        return changes

    @staticmethod
    def _get_request_duration() -> Optional[float]:
        """Calculate request duration in milliseconds."""
        if audit_context.request_start_time:
            duration = datetime.now(timezone.utc) - audit_context.request_start_time
            return duration.total_seconds() * 1000
        return None

    @staticmethod
    def _analyze_audit_pattern(audit_data: Dict[str, Any]):
        """Analyze audit patterns for suspicious activity."""
        actor_id = audit_data.get("actor_id")
        ip_address = audit_data.get("ip_address")
        action = audit_data.get("action")

        if not actor_id and not ip_address:
            return

        # Create pattern key
        pattern_key = f"{actor_id or 'anon'}:{ip_address}:{action.value if hasattr(action, 'value') else action}"

        # Record pattern
        now = datetime.now(timezone.utc)
        AuditService._pattern_cache[pattern_key].append(now)

        # Keep only last hour
        cutoff = now - timedelta(hours=1)
        AuditService._pattern_cache[pattern_key] = [
            t for t in AuditService._pattern_cache[pattern_key] if t > cutoff
        ]

        # Check for suspicious patterns
        pattern_count = len(AuditService._pattern_cache[pattern_key])

        # Detect rapid repeated actions
        if pattern_count >= 20:  # 20 same actions in an hour
            security_monitor.record_security_event(
                "rapid_repeated_actions",
                "medium",
                actor_id,
                ip_address,
                audit_data.get("user_agent"),
                {
                    "action": str(action),
                    "count": pattern_count,
                    "pattern_key": pattern_key
                }
            )

        # Detect privilege escalation attempts
        if action in [AuditAction.UPDATE, AuditAction.DELETE] and audit_data.get("entity") == AuditEntity.USER:
            if actor_id != audit_data.get("entity_id"):  # Acting on different user
                security_monitor.record_security_event(
                    "privilege_escalation_attempt",
                    "high",
                    actor_id,
                    ip_address,
                    audit_data.get("user_agent"),
                    {
                        "target_user_id": audit_data.get("entity_id"),
                        "action": str(action)
                    }
                )
    
    @staticmethod
    async def log_authentication(
        action: AuditAction,
        user_id: Optional[int] = None,
        email: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[int]:
        """Enhanced authentication event logging with security monitoring."""

        # Record security events for failed logins
        if not success and action == AuditAction.LOGIN_FAILED:
            security_monitor.record_failed_login(
                audit_context.ip_address or "unknown",
                email or "unknown",
                {
                    "user_agent": audit_context.user_agent,
                    "error_message": error_message,
                    "metadata": metadata
                }
            )

        # Enhanced metadata for authentication events
        auth_metadata = {
            **(metadata or {}),
            "email": email,
            "authentication_event": True,
            "login_method": "password",  # Could be extended for 2FA, OAuth, etc.
            "client_fingerprint": AuditService._generate_client_fingerprint(),
            "geolocation": AuditService._get_geolocation_info(),
        }

        return await AuditService.log_event(
            action=action,
            entity=AuditEntity.USER,
            entity_id=user_id,
            status=AuditStatus.SUCCESS if success else AuditStatus.FAILURE,
            error_message=error_message,
            metadata=auth_metadata
        )

    @staticmethod
    def _generate_client_fingerprint() -> str:
        """Generate a client fingerprint for tracking."""
        components = [
            audit_context.user_agent or "",
            audit_context.ip_address or "",
            # Could add more components like screen resolution, timezone, etc.
        ]
        fingerprint_data = "|".join(components)
        return hashlib.sha256(fingerprint_data.encode()).hexdigest()[:16]

    @staticmethod
    def _get_geolocation_info() -> Optional[Dict[str, str]]:
        """Get geolocation information for IP address."""
        # In production, this would integrate with a geolocation service
        # For now, return placeholder
        if audit_context.ip_address:
            return {
                "ip": audit_context.ip_address,
                "country": "Unknown",
                "city": "Unknown"
            }
        return None

    @staticmethod
    async def log_security_event(
        event_type: str,
        severity: str,
        details: Dict[str, Any],
        actor_id: Optional[int] = None
    ) -> Optional[int]:
        """Log security-related events."""
        return await AuditService.log_event(
            action=AuditAction.SECURITY_EVENT,
            entity=AuditEntity.SYSTEM,
            status=AuditStatus.SUCCESS,
            metadata={
                "security_event": True,
                "event_type": event_type,
                "severity": severity,
                "details": details
            },
            actor_id=actor_id
        )

    @staticmethod
    async def log_permission_check(
        resource: str,
        permission: str,
        granted: bool,
        user_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> Optional[int]:
        """Log permission checks for access control auditing."""
        return await AuditService.log_event(
            action=AuditAction.PERMISSION_CHECK,
            entity=AuditEntity.SYSTEM,
            entity_id=user_id,
            status=AuditStatus.SUCCESS if granted else AuditStatus.FAILURE,
            metadata={
                "permission_check": True,
                "resource": resource,
                "permission": permission,
                "granted": granted,
                **(details or {})
            }
        )

    @staticmethod
    async def log_data_access(
        entity: AuditEntity,
        entity_id: Optional[int],
        access_type: str,
        sensitive_data: bool = False,
        data_classification: str = "internal",
        details: Optional[Dict[str, Any]] = None
    ) -> Optional[int]:
        """Log data access events for compliance."""
        return await AuditService.log_event(
            action=AuditAction.READ,
            entity=entity,
            entity_id=entity_id,
            metadata={
                "data_access": True,
                "access_type": access_type,
                "sensitive_data": sensitive_data,
                "data_classification": data_classification,
                **(details or {})
            }
        )

    @staticmethod
    async def log_system_event(
        event_type: str,
        component: str,
        details: Dict[str, Any],
        status: AuditStatus = AuditStatus.SUCCESS
    ) -> Optional[int]:
        """Log system-level events."""
        return await AuditService.log_event(
            action=AuditAction.SYSTEM_EVENT,
            entity=AuditEntity.SYSTEM,
            status=status,
            metadata={
                "system_event": True,
                "event_type": event_type,
                "component": component,
                "details": details
            }
        )

    @staticmethod
    async def get_audit_trail(
        entity: AuditEntity,
        entity_id: int,
        limit: int = 100,
        session: Optional[AsyncSession] = None
    ) -> List[Dict[str, Any]]:
        """Get audit trail for a specific entity."""
        try:
            query = (
                select(AuditLog)
                .where(
                    and_(
                        AuditLog.entity == entity,
                        AuditLog.entity_id == entity_id
                    )
                )
                .order_by(desc(AuditLog.created_at))
                .limit(limit)
            )

            if session:
                result = await session.execute(query)
            else:
                async with session_scope() as db_session:
                    result = await db_session.execute(query)

            audit_logs = result.scalars().all()

            return [
                {
                    "id": log.id,
                    "action": log.action.value,
                    "actor_id": log.actor_id,
                    "actor_email": log.actor_email,
                    "actor_role": log.actor_role,
                    "before": log.before,
                    "after": log.after,
                    "changes": log.changes,
                    "status": log.status.value,
                    "error_message": log.error_message,
                    "metadata": log.audit_metadata,
                    "ip_address": log.ip_address,
                    "user_agent": log.user_agent,
                    "created_at": log.created_at.isoformat()
                }
                for log in audit_logs
            ]

        except Exception as e:
            logger.error(f"Failed to retrieve audit trail: {e}")
            return []

    @staticmethod
    async def get_security_events(
        severity: Optional[str] = None,
        hours: int = 24,
        limit: int = 100
    ) -> List[SecurityEvent]:
        """Get recent security events."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        events = []
        for ip_events in security_monitor.suspicious_activities.values():
            for event in ip_events:
                if event.timestamp > cutoff:
                    if not severity or event.severity == severity:
                        events.append(event)

        # Sort by timestamp (newest first) and limit
        events.sort(key=lambda x: x.timestamp, reverse=True)
        return events[:limit]
    
    @staticmethod
    async def log_data_change(
        action: AuditAction,
        entity: AuditEntity,
        entity_id: int,
        before: Dict[str, Any],
        after: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
        session: Optional[AsyncSession] = None
    ) -> Optional[int]:
        """Log data modification events."""
        return await AuditService.log_event(
            action=action,
            entity=entity,
            entity_id=entity_id,
            before=before,
            after=after,
            metadata=metadata,
            session=session
        )
    
    @staticmethod
    async def log_system_event(
        action: AuditAction,
        description: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[int]:
        """Log system-level events."""
        return await AuditService.log_event(
            action=action,
            entity=AuditEntity.SYSTEM,
            metadata={
                **(metadata or {}),
                "description": description,
                "system_event": True
            }
        )


class AuditMiddleware:
    """FastAPI middleware for automatic audit logging."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # Skip audit logging for certain paths
        if self._should_skip_audit(request.url.path):
            await self.app(scope, receive, send)
            return
        
        # Set up audit context
        # Note: We'll need to get the current user from the request
        # This will be integrated with the authentication system
        audit_context.set_request_context(request)
        
        # Continue with request processing
        await self.app(scope, receive, send)
    
    def _should_skip_audit(self, path: str) -> bool:
        """Determine if a path should be excluded from audit logging."""
        skip_paths = [
            "/health",
            "/metrics",
            "/docs",
            "/openapi.json",
            "/favicon.ico",
            "/static/",
            "/_internal/"
        ]
        
        return any(path.startswith(skip_path) for skip_path in skip_paths)


# Convenience functions for common audit operations
async def audit_login(user: User, success: bool = True, error_message: Optional[str] = None):
    """Audit user login attempt."""
    return await AuditService.log_authentication(
        action=AuditAction.LOGIN if success else AuditAction.LOGIN_FAILED,
        user_id=user.id if success else None,
        email=user.email,
        success=success,
        error_message=error_message
    )


async def audit_logout(user: User):
    """Audit user logout."""
    return await AuditService.log_authentication(
        action=AuditAction.LOGOUT,
        user_id=user.id,
        email=user.email
    )


async def audit_order_change(order_id: int, before: Dict, after: Dict, action: AuditAction = AuditAction.UPDATE):
    """Audit order modifications."""
    return await AuditService.log_data_change(
        action=action,
        entity=AuditEntity.ORDER,
        entity_id=order_id,
        before=before,
        after=after
    )


async def audit_product_change(product_id: int, before: Dict, after: Dict, action: AuditAction = AuditAction.UPDATE):
    """Audit product modifications."""
    return await AuditService.log_data_change(
        action=action,
        entity=AuditEntity.PRODUCT,
        entity_id=product_id,
        before=before,
        after=after
    )


async def audit_inventory_change(variant_id: int, before: Dict, after: Dict, action: AuditAction = AuditAction.INVENTORY_UPDATE):
    """Audit inventory modifications."""
    return await AuditService.log_data_change(
        action=action,
        entity=AuditEntity.INVENTORY,
        entity_id=variant_id,
        before=before,
        after=after
    )
