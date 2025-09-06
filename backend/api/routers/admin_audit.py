"""
Admin Audit Log Management API

Provides endpoints for viewing, searching, and managing audit logs
with proper access controls and filtering capabilities.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from mdv.auth import require_roles
from mdv.models import Role
from mdv.models import AuditLog, AuditAction, AuditEntity, AuditStatus, User
from mdv.db import get_async_db

router = APIRouter(prefix="/api/admin/audit", tags=["Admin Audit"])


# Pydantic models for API responses
class AuditLogResponse(BaseModel):
    id: int
    actor_id: Optional[int]
    actor_role: Optional[str]
    actor_email: Optional[str]
    action: str
    entity: str
    entity_id: Optional[int]
    before: Optional[Dict[str, Any]]
    after: Optional[Dict[str, Any]]
    changes: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    user_agent: Optional[str]
    session_id: Optional[str]
    request_id: Optional[str]
    status: str
    error_message: Optional[str]
    audit_metadata: Optional[Dict[str, Any]]
    created_at: datetime
    
    # Actor details
    actor_name: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    logs: List[AuditLogResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class AuditStatsResponse(BaseModel):
    total_events: int
    events_today: int
    events_this_week: int
    events_this_month: int
    failed_events: int
    top_actions: List[Dict[str, Any]]
    top_entities: List[Dict[str, Any]]
    top_actors: List[Dict[str, Any]]


class AuditSearchRequest(BaseModel):
    query: Optional[str] = None
    actor_id: Optional[int] = None
    action: Optional[str] = None
    entity: Optional[str] = None
    entity_id: Optional[int] = None
    status: Optional[str] = None
    ip_address: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=50, ge=1, le=1000)


@router.get("/logs", response_model=AuditLogListResponse)
async def get_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=1000),
    actor_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    entity: Optional[str] = Query(None),
    entity_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    ip_address: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_roles(Role.admin)),
    db: AsyncSession = Depends(get_async_db)
):
    """Get audit logs with filtering and pagination. Admin access only."""
    
    # Build query
    query = select(AuditLog).options(selectinload(AuditLog.actor))
    
    # Apply filters
    filters = []
    
    if actor_id:
        filters.append(AuditLog.actor_id == actor_id)
    
    if action:
        filters.append(AuditLog.action == action)
    
    if entity:
        filters.append(AuditLog.entity == entity)
    
    if entity_id:
        filters.append(AuditLog.entity_id == entity_id)
    
    if status:
        filters.append(AuditLog.status == status)
    
    if ip_address:
        filters.append(AuditLog.ip_address == ip_address)
    
    if date_from:
        filters.append(AuditLog.created_at >= date_from)
    
    if date_to:
        filters.append(AuditLog.created_at <= date_to)
    
    if search:
        # Search in multiple fields
        search_filters = [
            AuditLog.actor_email.ilike(f"%{search}%"),
            AuditLog.error_message.ilike(f"%{search}%"),
            AuditLog.ip_address.ilike(f"%{search}%"),
            func.cast(AuditLog.audit_metadata, str).ilike(f"%{search}%")
        ]
        filters.append(or_(*search_filters))
    
    if filters:
        query = query.where(and_(*filters))
    
    # Order by created_at descending
    query = query.order_by(desc(AuditLog.created_at))
    
    # Get total count
    count_query = select(func.count()).select_from(AuditLog)
    if filters:
        count_query = count_query.where(and_(*filters))
    
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)
    
    # Execute query
    result = await db.execute(query)
    logs = result.scalars().all()
    
    # Convert to response format
    log_responses = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "actor_id": log.actor_id,
            "actor_role": log.actor_role,
            "actor_email": log.actor_email,
            "action": log.action.value,
            "entity": log.entity.value,
            "entity_id": log.entity_id,
            "before": log.before,
            "after": log.after,
            "changes": log.changes,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "session_id": log.session_id,
            "request_id": log.request_id,
            "status": log.status.value,
            "error_message": log.error_message,
            "audit_metadata": log.audit_metadata,
            "created_at": log.created_at,
            "actor_name": log.actor.name if log.actor else None
        }
        log_responses.append(AuditLogResponse(**log_dict))
    
    total_pages = (total + per_page - 1) // per_page
    
    return AuditLogListResponse(
        logs=log_responses,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.get("/logs/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: int,
    current_user: User = Depends(require_roles(Role.admin)),
    db: AsyncSession = Depends(get_async_db)
):
    """Get a specific audit log entry. Admin access only."""
    
    query = select(AuditLog).options(selectinload(AuditLog.actor)).where(AuditLog.id == log_id)
    result = await db.execute(query)
    log = result.scalar_one_or_none()
    
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit log not found"
        )
    
    log_dict = {
        "id": log.id,
        "actor_id": log.actor_id,
        "actor_role": log.actor_role,
        "actor_email": log.actor_email,
        "action": log.action.value,
        "entity": log.entity.value,
        "entity_id": log.entity_id,
        "before": log.before,
        "after": log.after,
        "changes": log.changes,
        "ip_address": log.ip_address,
        "user_agent": log.user_agent,
        "session_id": log.session_id,
        "request_id": log.request_id,
        "status": log.status.value,
        "error_message": log.error_message,
        "audit_metadata": log.audit_metadata,
        "created_at": log.created_at,
        "actor_name": log.actor.name if log.actor else None
    }
    
    return AuditLogResponse(**log_dict)


@router.get("/stats", response_model=AuditStatsResponse)
async def get_audit_stats(
    current_user: User = Depends(require_roles(Role.admin)),
    db: AsyncSession = Depends(get_async_db)
):
    """Get audit log statistics. Admin access only."""
    
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # Total events
    total_query = select(func.count()).select_from(AuditLog)
    total_result = await db.execute(total_query)
    total_events = total_result.scalar()
    
    # Events today
    today_query = select(func.count()).select_from(AuditLog).where(AuditLog.created_at >= today)
    today_result = await db.execute(today_query)
    events_today = today_result.scalar()
    
    # Events this week
    week_query = select(func.count()).select_from(AuditLog).where(AuditLog.created_at >= week_ago)
    week_result = await db.execute(week_query)
    events_this_week = week_result.scalar()
    
    # Events this month
    month_query = select(func.count()).select_from(AuditLog).where(AuditLog.created_at >= month_ago)
    month_result = await db.execute(month_query)
    events_this_month = month_result.scalar()
    
    # Failed events
    failed_query = select(func.count()).select_from(AuditLog).where(AuditLog.status == AuditStatus.FAILURE)
    failed_result = await db.execute(failed_query)
    failed_events = failed_result.scalar()
    
    # Top actions
    top_actions_query = (
        select(AuditLog.action, func.count().label('count'))
        .group_by(AuditLog.action)
        .order_by(desc('count'))
        .limit(10)
    )
    top_actions_result = await db.execute(top_actions_query)
    top_actions = [{"action": row[0].value, "count": row[1]} for row in top_actions_result.all()]
    
    # Top entities
    top_entities_query = (
        select(AuditLog.entity, func.count().label('count'))
        .group_by(AuditLog.entity)
        .order_by(desc('count'))
        .limit(10)
    )
    top_entities_result = await db.execute(top_entities_query)
    top_entities = [{"entity": row[0].value, "count": row[1]} for row in top_entities_result.all()]
    
    # Top actors
    top_actors_query = (
        select(AuditLog.actor_email, func.count().label('count'))
        .where(AuditLog.actor_email.is_not(None))
        .group_by(AuditLog.actor_email)
        .order_by(desc('count'))
        .limit(10)
    )
    top_actors_result = await db.execute(top_actors_query)
    top_actors = [{"actor": row[0], "count": row[1]} for row in top_actors_result.all()]
    
    return AuditStatsResponse(
        total_events=total_events,
        events_today=events_today,
        events_this_week=events_this_week,
        events_this_month=events_this_month,
        failed_events=failed_events,
        top_actions=top_actions,
        top_entities=top_entities,
        top_actors=top_actors
    )


@router.post("/events")
async def receive_frontend_events(
    events: Dict[str, List[Dict[str, Any]]],
    db: AsyncSession = Depends(get_async_db)
):
    """Receive audit events from frontend."""

    # This endpoint receives events from the frontend audit tracker
    # Store them as audit logs for comprehensive tracking

    from mdv.audit import AuditService

    stored_count = 0
    for event in events.get("events", []):
        try:
            # Map frontend event to audit log
            action_str = event.get("action", "UNKNOWN")
            entity_str = event.get("entity", "SYSTEM")

            # Convert string enums to actual enums
            try:
                action = AuditAction(action_str)
            except ValueError:
                action = AuditAction.PAGE_VIEW  # Default fallback

            try:
                entity = AuditEntity(entity_str)
            except ValueError:
                entity = AuditEntity.SYSTEM  # Default fallback

            await AuditService.log_event(
                action=action,
                entity=entity,
                entity_id=event.get("entityId"),
                metadata={
                    **event.get("metadata", {}),
                    "source": "frontend",
                    "original_action": action_str,
                    "original_entity": entity_str
                },
                session=db
            )
            stored_count += 1
        except Exception as e:
            # Log error but don't fail the entire batch
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to store frontend audit event: {e}")

    await db.commit()

    return {"status": "received", "count": len(events.get("events", [])), "stored": stored_count}


@router.get("/actions")
async def get_audit_actions(
    current_user: User = Depends(require_roles(Role.admin))
):
    """Get list of available audit actions for filtering. Admin access only."""
    
    return [{"value": action.value, "label": action.value} for action in AuditAction]


@router.get("/entities")
async def get_audit_entities(
    current_user: User = Depends(require_roles(Role.admin))
):
    """Get list of available audit entities for filtering. Admin access only."""
    
    return [{"value": entity.value, "label": entity.value} for entity in AuditEntity]
