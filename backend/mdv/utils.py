from __future__ import annotations

from datetime import datetime, date, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .models import AuditLog, User


def _make_json_safe(value: Any) -> Any:
    """Recursively convert values to JSON-serializable types.

    - Decimal -> float
    - datetime/date -> isoformat string
    - Enum -> enum.value
    - dict/list/tuple/set -> recurse
    """
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        # Ensure timezone-aware datetimes are preserved as ISO strings
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {k: _make_json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [
            _make_json_safe(v) for v in (list(value) if not isinstance(value, list) else value)
        ]
    return value


def parse_actor_id(claims: dict) -> Optional[int]:
    sub = claims.get("sub")
    try:
        return int(sub)
    except Exception:
        return None


async def audit(db: AsyncSession, actor_id: Optional[int], action: str, entity: str, entity_id: int, before: Optional[dict] = None, after: Optional[dict] = None) -> None:
    safe_before = _make_json_safe(before) if before is not None else None
    safe_after = _make_json_safe(after) if after is not None else None
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        before=safe_before,
        after=safe_after,
    )
    db.add(entry)
