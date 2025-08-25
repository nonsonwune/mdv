#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT_DIR"

# Load env safely
set +u
set -a
. ./.env
set +a
set -u

: "${JWT_SECRET:?JWT_SECRET missing}"

# Choose python (prefer venv, fallback to system)
PY="$ROOT_DIR/.venv/bin/python"
if [ ! -x "$PY" ]; then
  PY="python3"
fi

# Ensure admin exists and capture id
ADMIN_ID=$($PY - <<'PY'
import asyncio
from sqlalchemy import select
from backend.mdv.db import session_scope
from backend.mdv.models import User, Role
async def main():
    async with session_scope() as db:
        res = await db.execute(select(User).where(User.email == 'admin@local'))
        u = res.scalar_one_or_none()
        if not u:
            u = User(name='Admin', email='admin@local', role=Role.admin, active=True)
            db.add(u)
            await db.flush()
        print(u.id)
asyncio.run(main())
PY
)

# Issue a short-lived admin JWT and print it
export ADMIN_ID
$PY - <<'PY'
from datetime import datetime, timedelta, timezone
import os
from jose import jwt
sub=os.environ['ADMIN_ID']
secret=os.environ['JWT_SECRET']
claims={'sub': sub, 'role':'admin', 'iat': datetime.now(timezone.utc), 'exp': datetime.now(timezone.utc)+timedelta(minutes=60)}
print(jwt.encode(claims, secret, algorithm='HS256'))
PY

