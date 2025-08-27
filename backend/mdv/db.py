from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator, AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData

from .config import settings

# NOTE: Using psycopg3 binary driver; ensure DATABASE_URL starts with postgresql+psycopg

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


_engine: AsyncEngine | None = None
_SessionFactory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        # Enhanced connection pool settings for production reliability
        pool_kwargs = {
            "pool_pre_ping": True,  # Verify connections before use
            "pool_recycle": 3600,   # Recycle connections after 1 hour
        }

        is_sqlite = settings.database_url.startswith("sqlite+aiosqlite")

        # Pool tuning only applies to non-SQLite backends
        if not is_sqlite:
            if settings.env == "production":
                pool_kwargs.update({
                    "pool_size": 20,
                    "max_overflow": 10,
                    "pool_timeout": 30,
                    "echo_pool": False,
                })
            else:
                pool_kwargs.update({
                    "pool_size": 5,
                    "max_overflow": 5,
                    "echo": settings.env == "development",
                })
        
        _engine = create_async_engine(
            settings.database_url,
            **pool_kwargs
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _SessionFactory
    if _SessionFactory is None:
        _SessionFactory = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _SessionFactory


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    session = get_session_factory()()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


# FastAPI dependency for injecting an AsyncSession
async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    Session = get_session_factory()
    async with Session() as session:
        yield session

