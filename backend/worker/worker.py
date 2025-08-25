from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import and_, select

from backend.mdv.db import session_scope
from backend.mdv.models import Reservation, ReservationStatus


async def expire_reservations(ctx) -> None:
    now = datetime.now(timezone.utc)
    async with session_scope() as db:
        await db.execute(
            Reservation.__table__.update()
            .where(and_(Reservation.status == ReservationStatus.active, Reservation.expires_at < now))
            .values(status=ReservationStatus.expired)
        )
    print(f"[worker] expired reservations @ {now.isoformat()}")


async def send_email(ctx, to_email: str, subject: str, html: str) -> None:
    # TODO: integrate with mdv.emailer
    print(f"[worker] send_email -> {to_email} ({subject})")

