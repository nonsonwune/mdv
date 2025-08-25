#!/usr/bin/env python
"""Initialize database tables for local development."""

import asyncio
import sys
import os
sys.path.insert(0, '/Users/mac/Repository/mdv')

from sqlalchemy.ext.asyncio import create_async_engine
from backend.mdv.models import Base
from backend.mdv.config import settings

async def init_db():
    """Create all database tables."""
    # Use the DATABASE_URL from environment or settings
    db_url = os.environ.get('DATABASE_URL', 'sqlite+aiosqlite:///./mdv_dev.db')
    
    print(f"Creating database tables with URL: {db_url}")
    
    engine = create_async_engine(db_url, echo=True)
    
    async with engine.begin() as conn:
        # Drop all tables first (for clean start in development)
        await conn.run_sync(Base.metadata.drop_all)
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
    
    await engine.dispose()
    print("Database tables created successfully!")

if __name__ == "__main__":
    asyncio.run(init_db())
