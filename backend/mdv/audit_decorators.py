"""
Audit Decorators and High-Level Event Tracking

This module provides decorators and utilities for easy integration of audit logging
into existing API endpoints and business logic.
"""

from __future__ import annotations

import functools
import inspect
from typing import Any, Callable, Dict, Optional, TypeVar, Union

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from .audit import AuditService, audit_context
from .models import AuditAction, AuditEntity, AuditStatus, User

F = TypeVar('F', bound=Callable[..., Any])


def audit_endpoint(
    action: AuditAction,
    entity: AuditEntity,
    entity_id_param: Optional[str] = None,
    capture_request: bool = True,
    capture_response: bool = True,
    exclude_fields: Optional[list[str]] = None
):
    """
    Decorator to automatically audit API endpoint calls.
    
    Args:
        action: The audit action being performed
        entity: The entity type being acted upon
        entity_id_param: Parameter name that contains the entity ID
        capture_request: Whether to capture request data
        capture_response: Whether to capture response data
        exclude_fields: Fields to exclude from audit logs (for sensitive data)
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract entity ID if specified
            entity_id = None
            if entity_id_param and entity_id_param in kwargs:
                entity_id = kwargs[entity_id_param]
            
            # Capture request data
            request_data = None
            if capture_request:
                request_data = _sanitize_data(kwargs, exclude_fields)
            
            try:
                # Execute the original function
                result = await func(*args, **kwargs)
                
                # Capture response data
                response_data = None
                if capture_response and result is not None:
                    response_data = _sanitize_data(
                        result.dict() if hasattr(result, 'dict') else result,
                        exclude_fields
                    )
                
                # Log successful operation
                await AuditService.log_event(
                    action=action,
                    entity=entity,
                    entity_id=entity_id,
                    before=request_data if action in [AuditAction.UPDATE, AuditAction.DELETE] else None,
                    after=response_data if action in [AuditAction.CREATE, AuditAction.UPDATE] else None,
                    status=AuditStatus.SUCCESS,
                    metadata={
                        "endpoint": func.__name__,
                        "request_data": request_data if not capture_response else None
                    }
                )
                
                return result
                
            except Exception as e:
                # Log failed operation
                await AuditService.log_event(
                    action=action,
                    entity=entity,
                    entity_id=entity_id,
                    status=AuditStatus.FAILURE,
                    error_message=str(e),
                    metadata={
                        "endpoint": func.__name__,
                        "request_data": request_data,
                        "error_type": type(e).__name__
                    }
                )
                
                # Re-raise the exception
                raise
        
        return wrapper
    return decorator


def audit_data_change(
    entity: AuditEntity,
    action: AuditAction = AuditAction.UPDATE,
    entity_id_param: str = "id",
    get_before_func: Optional[Callable] = None
):
    """
    Decorator to audit data changes with before/after state capture.
    
    Args:
        entity: The entity type being modified
        action: The audit action (CREATE, UPDATE, DELETE)
        entity_id_param: Parameter name containing entity ID
        get_before_func: Function to get the "before" state
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            entity_id = kwargs.get(entity_id_param)
            
            # Capture before state
            before_state = None
            if get_before_func and entity_id:
                try:
                    before_state = await get_before_func(entity_id)
                except Exception:
                    # Don't fail if we can't get before state
                    pass
            
            try:
                # Execute the function
                result = await func(*args, **kwargs)
                
                # Capture after state
                after_state = None
                if result and hasattr(result, 'dict'):
                    after_state = result.dict()
                elif isinstance(result, dict):
                    after_state = result
                
                # Log the change
                await AuditService.log_data_change(
                    action=action,
                    entity=entity,
                    entity_id=entity_id,
                    before=before_state,
                    after=after_state,
                    metadata={"function": func.__name__}
                )
                
                return result
                
            except Exception as e:
                # Log failed operation
                await AuditService.log_event(
                    action=action,
                    entity=entity,
                    entity_id=entity_id,
                    status=AuditStatus.FAILURE,
                    error_message=str(e),
                    metadata={
                        "function": func.__name__,
                        "error_type": type(e).__name__
                    }
                )
                raise
        
        return wrapper
    return decorator


class AuditEventTracker:
    """High-level event tracking for complex business operations."""
    
    def __init__(self, session: Optional[AsyncSession] = None):
        self.session = session
        self.events: list[Dict[str, Any]] = []
    
    async def track_order_lifecycle(self, order_id: int, action: str, details: Dict[str, Any]):
        """Track order lifecycle events."""
        await AuditService.log_event(
            action=AuditAction.ORDER_STATUS_CHANGE,
            entity=AuditEntity.ORDER,
            entity_id=order_id,
            metadata={
                "lifecycle_action": action,
                "details": details,
                "timestamp": details.get("timestamp")
            },
            session=self.session
        )
    
    async def track_payment_event(self, order_id: int, payment_data: Dict[str, Any], success: bool):
        """Track payment processing events."""
        await AuditService.log_event(
            action=AuditAction.PAYMENT_STATUS_CHANGE,
            entity=AuditEntity.ORDER,
            entity_id=order_id,
            status=AuditStatus.SUCCESS if success else AuditStatus.FAILURE,
            metadata={
                "payment_method": payment_data.get("method"),
                "amount": payment_data.get("amount"),
                "currency": payment_data.get("currency"),
                "payment_ref": payment_data.get("reference"),
                "gateway": payment_data.get("gateway", "paystack")
            },
            session=self.session
        )
    
    async def track_inventory_movement(self, variant_id: int, movement_type: str, quantity: int, reason: str):
        """Track inventory movements."""
        await AuditService.log_event(
            action=AuditAction.INVENTORY_UPDATE,
            entity=AuditEntity.INVENTORY,
            entity_id=variant_id,
            metadata={
                "movement_type": movement_type,  # "in", "out", "adjustment"
                "quantity": quantity,
                "reason": reason,
                "absolute_change": abs(quantity)
            },
            session=self.session
        )
    
    async def track_user_activity(self, user_id: int, activity: str, details: Dict[str, Any]):
        """Track general user activities."""
        # Map activity to appropriate action
        action_mapping = {
            "profile_update": AuditAction.UPDATE,
            "password_change": AuditAction.PASSWORD_CHANGE,
            "cart_add": AuditAction.CART_ADD,
            "cart_remove": AuditAction.CART_REMOVE,
            "review_create": AuditAction.REVIEW_CREATE,
            "review_update": AuditAction.REVIEW_UPDATE
        }
        
        action = action_mapping.get(activity, AuditAction.UPDATE)
        entity = AuditEntity.USER if activity in ["profile_update", "password_change"] else AuditEntity.CART
        
        await AuditService.log_event(
            action=action,
            entity=entity,
            entity_id=user_id,
            metadata={
                "activity": activity,
                "details": details
            },
            session=self.session
        )


def _sanitize_data(data: Any, exclude_fields: Optional[list[str]] = None) -> Dict[str, Any]:
    """Sanitize data for audit logging by removing sensitive fields."""
    if not data:
        return {}
    
    if not isinstance(data, dict):
        return {"value": str(data)}
    
    exclude_fields = exclude_fields or []
    
    # Default sensitive fields to exclude
    default_excludes = [
        "password", "password_hash", "token", "secret", "key",
        "credit_card", "cvv", "ssn", "social_security"
    ]
    
    all_excludes = set(exclude_fields + default_excludes)
    
    sanitized = {}
    for key, value in data.items():
        if key.lower() in all_excludes:
            sanitized[key] = "[REDACTED]"
        elif isinstance(value, dict):
            sanitized[key] = _sanitize_data(value, exclude_fields)
        else:
            sanitized[key] = value
    
    return sanitized


# Context manager for batch audit operations
class AuditBatch:
    """Context manager for batching multiple audit events."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.events: list[Dict[str, Any]] = []
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # Commit all events in batch
        if self.events:
            try:
                for event_data in self.events:
                    await AuditService.log_event(**event_data, session=self.session)
            except Exception as e:
                # Log the batch failure but don't raise
                import logging
                logging.error(f"Failed to commit audit batch: {e}")
    
    async def add_event(self, **kwargs):
        """Add an event to the batch."""
        self.events.append(kwargs)


# Utility functions for common audit patterns
async def audit_bulk_operation(
    action: AuditAction,
    entity: AuditEntity,
    entity_ids: list[int],
    metadata: Optional[Dict[str, Any]] = None
):
    """Audit bulk operations on multiple entities."""
    await AuditService.log_event(
        action=action,
        entity=entity,
        metadata={
            **(metadata or {}),
            "bulk_operation": True,
            "entity_count": len(entity_ids),
            "entity_ids": entity_ids[:100]  # Limit to first 100 for performance
        }
    )


async def audit_permission_change(user_id: int, old_role: str, new_role: str, changed_by: int):
    """Audit role/permission changes."""
    await AuditService.log_event(
        action=AuditAction.ROLE_CHANGE,
        entity=AuditEntity.USER,
        entity_id=user_id,
        before={"role": old_role},
        after={"role": new_role},
        metadata={
            "changed_by": changed_by,
            "permission_change": True
        }
    )
