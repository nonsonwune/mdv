from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from mdv.db import get_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    Session = get_session_factory()
    async with Session() as session:
        yield session
