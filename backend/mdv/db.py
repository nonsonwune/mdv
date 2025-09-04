from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncIterator, AsyncGenerator, Dict, Any
from enum import Enum
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData, event
from sqlalchemy.pool import Pool
from sqlalchemy.exc import SQLAlchemyError

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

# Connection pool monitoring
logger = logging.getLogger(__name__)
pool_metrics = {
    "connections_created": 0,
    "connections_closed": 0,
    "connections_checked_out": 0,
    "connections_checked_in": 0,
    "pool_exhausted_events": 0,
    "connection_errors": 0,
}


class CircuitBreakerState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing fast
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreaker:
    """Circuit breaker for database connections."""
    failure_threshold: int = 5
    recovery_timeout: int = 60  # seconds
    half_open_max_calls: int = 3

    state: CircuitBreakerState = field(default=CircuitBreakerState.CLOSED)
    failure_count: int = field(default=0)
    last_failure_time: float = field(default=0)
    half_open_calls: int = field(default=0)

    def can_execute(self) -> bool:
        """Check if operation can be executed."""
        current_time = time.time()

        if self.state == CircuitBreakerState.CLOSED:
            return True
        elif self.state == CircuitBreakerState.OPEN:
            if current_time - self.last_failure_time >= self.recovery_timeout:
                self.state = CircuitBreakerState.HALF_OPEN
                self.half_open_calls = 0
                logger.info("Circuit breaker transitioning to HALF_OPEN")
                return True
            return False
        elif self.state == CircuitBreakerState.HALF_OPEN:
            return self.half_open_calls < self.half_open_max_calls

        return False

    def record_success(self) -> None:
        """Record successful operation."""
        if self.state == CircuitBreakerState.HALF_OPEN:
            self.half_open_calls += 1
            if self.half_open_calls >= self.half_open_max_calls:
                self.state = CircuitBreakerState.CLOSED
                self.failure_count = 0
                logger.info("Circuit breaker transitioning to CLOSED")
        elif self.state == CircuitBreakerState.CLOSED:
            self.failure_count = 0

    def record_failure(self) -> None:
        """Record failed operation."""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.state == CircuitBreakerState.HALF_OPEN:
            self.state = CircuitBreakerState.OPEN
            logger.warning("Circuit breaker transitioning to OPEN from HALF_OPEN")
        elif self.state == CircuitBreakerState.CLOSED and self.failure_count >= self.failure_threshold:
            self.state = CircuitBreakerState.OPEN
            logger.warning(f"Circuit breaker transitioning to OPEN after {self.failure_count} failures")


# Global circuit breaker instance
db_circuit_breaker = CircuitBreaker()


def setup_pool_monitoring(engine: AsyncEngine) -> None:
    """Set up connection pool event listeners for monitoring."""

    @event.listens_for(engine.sync_engine.pool, "connect")
    def on_connect(dbapi_conn, connection_record):
        pool_metrics["connections_created"] += 1
        logger.debug(f"New database connection created. Total: {pool_metrics['connections_created']}")

    @event.listens_for(engine.sync_engine.pool, "checkout")
    def on_checkout(dbapi_conn, connection_record, connection_proxy):
        pool_metrics["connections_checked_out"] += 1
        logger.debug(f"Connection checked out. Active: {pool_metrics['connections_checked_out'] - pool_metrics['connections_checked_in']}")

    @event.listens_for(engine.sync_engine.pool, "checkin")
    def on_checkin(dbapi_conn, connection_record):
        pool_metrics["connections_checked_in"] += 1
        logger.debug(f"Connection checked in. Active: {pool_metrics['connections_checked_out'] - pool_metrics['connections_checked_in']}")

    @event.listens_for(engine.sync_engine.pool, "close")
    def on_close(dbapi_conn, connection_record):
        pool_metrics["connections_closed"] += 1
        logger.debug(f"Connection closed. Total closed: {pool_metrics['connections_closed']}")

    @event.listens_for(engine.sync_engine.pool, "invalidate")
    def on_invalidate(dbapi_conn, connection_record, exception):
        pool_metrics["connection_errors"] += 1
        logger.warning(f"Connection invalidated due to error: {exception}")


def get_pool_status() -> Dict[str, Any]:
    """Get current connection pool status and metrics."""
    if _engine is None:
        return {"error": "Engine not initialized"}

    pool = _engine.sync_engine.pool

    return {
        "pool_size": pool.size(),
        "checked_out_connections": pool.checkedout(),
        "overflow_connections": pool.overflow(),
        "checked_in_connections": pool.checkedin(),
        "metrics": pool_metrics.copy(),
        "pool_status": {
            "size": pool.size(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "checked_in": pool.checkedin(),
            "active_connections": pool_metrics["connections_checked_out"] - pool_metrics["connections_checked_in"],
        },
        "circuit_breaker": {
            "state": db_circuit_breaker.state.value,
            "failure_count": db_circuit_breaker.failure_count,
            "last_failure_time": db_circuit_breaker.last_failure_time,
            "can_execute": db_circuit_breaker.can_execute(),
        }
    }


def get_database_health() -> Dict[str, Any]:
    """Get comprehensive database health status."""
    pool_status = get_pool_status()

    # Determine overall health
    is_healthy = (
        db_circuit_breaker.state == CircuitBreakerState.CLOSED and
        pool_status.get("checked_out_connections", 0) < pool_status.get("pool_size", 0) * 0.8
    )

    return {
        "healthy": is_healthy,
        "status": "healthy" if is_healthy else "degraded",
        "pool": pool_status,
        "timestamp": time.time(),
    }


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        # Enhanced connection pool settings for production reliability
        pool_kwargs = {
            "pool_pre_ping": True,  # Verify connections before use
            "pool_recycle": 3600,   # Recycle connections after 1 hour
            "pool_reset_on_return": "commit",  # Reset connections on return
        }

        # Transform DATABASE_URL for asyncpg driver
        database_url = settings.database_url
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        is_sqlite = database_url.startswith("sqlite+aiosqlite")

        # Pool tuning only applies to non-SQLite backends
        if not is_sqlite:
            if settings.env == "production":
                # Production-optimized settings for high concurrency
                pool_kwargs.update({
                    "pool_size": 25,        # Base pool size for 100+ concurrent users
                    "max_overflow": 15,     # Additional connections during peak load
                    "pool_timeout": 60,     # Longer timeout for high-load scenarios
                    "echo_pool": False,     # Disable pool logging in production
                    "pool_recycle": 1800,   # Recycle connections every 30 minutes
                })
            elif settings.env == "staging":
                # Staging environment with moderate load
                pool_kwargs.update({
                    "pool_size": 15,
                    "max_overflow": 10,
                    "pool_timeout": 45,
                    "echo_pool": True,      # Enable pool logging for debugging
                })
            else:
                # Development environment
                pool_kwargs.update({
                    "pool_size": 5,
                    "max_overflow": 5,
                    "pool_timeout": 30,
                    "echo": settings.env == "development",
                    "echo_pool": True,      # Enable pool logging for debugging
                })
        
        _engine = create_async_engine(
            database_url,
            **pool_kwargs
        )

        # Set up connection pool monitoring
        setup_pool_monitoring(_engine)

        logger.info(f"Database engine initialized with pool_size={pool_kwargs.get('pool_size', 'default')}, "
                   f"max_overflow={pool_kwargs.get('max_overflow', 'default')}")

    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _SessionFactory
    if _SessionFactory is None:
        _SessionFactory = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _SessionFactory


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    """Database session with circuit breaker protection."""
    if not db_circuit_breaker.can_execute():
        logger.error("Database circuit breaker is OPEN - failing fast")
        raise SQLAlchemyError("Database circuit breaker is OPEN")

    session = get_session_factory()()
    try:
        yield session
        await session.commit()
        db_circuit_breaker.record_success()
    except Exception as e:
        await session.rollback()
        db_circuit_breaker.record_failure()
        logger.error(f"Database operation failed: {e}")
        raise
    finally:
        await session.close()


# FastAPI dependency for injecting an AsyncSession
async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency with circuit breaker protection."""
    if not db_circuit_breaker.can_execute():
        logger.error("Database circuit breaker is OPEN - failing fast")
        raise SQLAlchemyError("Database circuit breaker is OPEN")

    Session = get_session_factory()
    async with Session() as session:
        try:
            yield session
            db_circuit_breaker.record_success()
        except Exception as e:
            db_circuit_breaker.record_failure()
            logger.error(f"Database session failed: {e}")
            raise

