"""
Comprehensive Audit Logging System for MDV E-commerce Platform

This module provides audit logging functionality to track all user activities
across the entire application for compliance, security, and operational monitoring.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Union, List
from contextlib import asynccontextmanager

from fastapi import Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert
from sqlalchemy.exc import SQLAlchemyError

from .models import AuditLog, AuditAction, AuditEntity, AuditStatus, User
from .db import session_scope
import logging

logger = logging.getLogger(__name__)


class AuditContext:
    """Context manager for audit logging that tracks request-level information."""
    
    def __init__(self):
        self.request_id: Optional[str] = None
        self.session_id: Optional[str] = None
        self.ip_address: Optional[str] = None
        self.user_agent: Optional[str] = None
        self.actor_id: Optional[int] = None
        self.actor_role: Optional[str] = None
        self.actor_email: Optional[str] = None
    
    def set_request_context(self, request: Request, actor: Optional[User] = None):
        """Set request context from FastAPI request object."""
        self.request_id = str(uuid.uuid4())
        self.ip_address = self._get_client_ip(request)
        self.user_agent = request.headers.get("user-agent")
        
        # Extract session ID from cookies or headers
        self.session_id = request.cookies.get("session_id") or request.headers.get("x-session-id")
        
        if actor:
            self.actor_id = actor.id
            self.actor_role = actor.role.value if actor.role else None
            self.actor_email = actor.email
    
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
    """Service for creating and managing audit log entries."""
    
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
                "metadata": metadata,
                "created_at": datetime.now(timezone.utc)
            }
            
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
    async def log_authentication(
        action: AuditAction,
        user_id: Optional[int] = None,
        email: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[int]:
        """Log authentication events."""
        return await AuditService.log_event(
            action=action,
            entity=AuditEntity.USER,
            entity_id=user_id,
            status=AuditStatus.SUCCESS if success else AuditStatus.FAILURE,
            error_message=error_message,
            metadata={
                **(metadata or {}),
                "email": email,
                "authentication_event": True
            }
        )
    
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
