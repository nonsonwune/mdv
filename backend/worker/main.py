"""
ARQ Worker Configuration
Handles background tasks like expiring reservations and sending emails
"""
from __future__ import annotations

import os
from typing import Any
from arq import cron
from arq.connections import RedisSettings
from worker.worker import expire_reservations, send_email


# Redis connection settings
redis_settings = RedisSettings.from_dsn(
    os.getenv("REDIS_URL", "redis://localhost:6379")
)


class WorkerSettings:
    """
    ARQ Worker Settings
    """
    redis_settings = redis_settings
    
    # Define the functions the worker can run
    functions = [
        expire_reservations,
        send_email,
    ]
    
    # Cron jobs - expire reservations every 5 minutes
    cron_jobs = [
        cron(expire_reservations, minute={0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55}),
    ]
    
    # Worker configuration
    max_jobs = 10
    job_timeout = 300  # 5 minutes
    keep_result = 3600  # Keep results for 1 hour
    
    # Optional: Configure health check
    health_check_interval = 30
    health_check_key = "arq:health-check"


async def startup(ctx: dict[str, Any]) -> None:
    """
    Startup function called when worker starts
    """
    print("Worker starting up...")
    # You can initialize connections or resources here if needed
    

async def shutdown(ctx: dict[str, Any]) -> None:
    """
    Shutdown function called when worker stops
    """
    print("Worker shutting down...")
    # Clean up resources here if needed
