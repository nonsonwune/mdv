from __future__ import annotations

import os
from arq.connections import RedisSettings


class WorkerSettings:
    functions = [
        "backend.worker.worker.expire_reservations",
        "backend.worker.worker.send_email",
    ]
    redis_settings = RedisSettings.from_dsn(os.getenv("REDIS_URL", "redis://localhost:6379/0"))

