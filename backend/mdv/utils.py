from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .models import AuditLog, User


def parse_actor_id(claims: dict) -> Optional[int]:
    sub = claims.get("sub")
    try:
        return int(sub)
    except Exception:
        return None


async def audit(db: AsyncSession, actor_id: Optional[int], action: str, entity: str, entity_id: int, before: Optional[dict] = None, after: Optional[dict] = None) -> None:
    entry = AuditLog(actor_id=actor_id, action=action, entity=entity, entity_id=entity_id, before=before, after=after)
    db.add(entry)
